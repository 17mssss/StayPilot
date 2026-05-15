/**
 * icalSync.js — Synchronisation iCal multi-plateformes (Channel Manager)
 *
 * Flux pour chaque channel :
 *   1. Fetch de l'URL iCal (HTTP GET avec timeout)
 *   2. Parsing des VEVENT (uid, dtstart, dtend, summary, status)
 *   3. Normalisation en objet réservation compatible avec upsertReservation()
 *   4. Upsert idempotent dans la table reservations (via external_id + provider)
 *   5. Mise à jour de channels.last_synced_at
 *   6. Log dans sync_logs
 *
 * Cron : toutes les heures (0 * * * *)
 */

const ical    = require('node-ical');
const cron    = require('node-cron');
const supabase = require('../config/supabase');
const { upsertReservation } = require('./syncManager');

// Timeout pour les requêtes HTTP iCal (certaines plateformes sont lentes)
const ICAL_FETCH_TIMEOUT_MS = 15_000;

// ── Utilitaires ───────────────────────────────────────────────────────────────

/**
 * Convertit un objet Date (retourné par node-ical) en chaîne 'YYYY-MM-DD'.
 * node-ical retourne des Date JS pour tous les types d'événements, y compris
 * les événements "all-day" (date sans heure) courants sur Airbnb et Booking.com.
 */
function toDateStr(d) {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  // toISOString() retourne toujours UTC — on prend uniquement la partie date
  return date.toISOString().split('T')[0];
}

/**
 * Normalise un VEVENT iCal en objet compatible avec upsertReservation().
 *
 * Points d'attention iCal :
 * - Airbnb : DTSTART = check-in, DTEND = check-out (all-day events)
 *   SUMMARY peut valoir "Reserved", "Airbnb (Not available)", ou être absent
 * - Booking.com : même convention, SUMMARY parfois avec nom réel
 * - STATUS:CANCELLED → statut 'annulee'
 *
 * Le provider est préfixé 'ical_' pour distinguer des channels API (smoobu, etc.)
 * et éviter les collisions sur l'index unique (external_id, provider).
 */
function normalizeIcalEvent(event, logementId, channelType) {
  // On ne traite que les VEVENT (pas VTIMEZONE, VALARM, etc.)
  if (event.type !== 'VEVENT') return null;

  // UID obligatoire : c'est la clé d'idempotence de l'upsert
  if (!event.uid) return null;

  const checkin  = toDateStr(event.start);
  const checkout = toDateStr(event.end);

  if (!checkin || !checkout) return null;
  // Sanity check : une réservation ne peut pas avoir checkin ≥ checkout
  if (checkin >= checkout) return null;

  // STATUS:CANCELLED → annulee ; tout le reste (CONFIRMED, absent) → confirmee
  const icalStatus = (event.status ?? '').toUpperCase();
  const statut = icalStatus === 'CANCELLED' ? 'annulee' : 'confirmee';

  // SUMMARY : on le conserve tel quel pour garder le contexte
  // Ex : "Reserved", "Airbnb (Not available)", "CLOSED - Booking.com"
  const summary = (event.summary ?? '').trim();
  const voyageurNom = summary || 'Réservation iCal';

  return {
    logement_id:  logementId,
    external_id:  String(event.uid),
    // Préfixe 'ical_' pour isolation dans l'index unique reservations(external_id, provider)
    provider:     `ical_${channelType}`,
    plateforme:   channelType,   // 'airbnb' | 'booking' | 'vrbo' | 'autre'
    voyageur_nom: voyageurNom,
    checkin,
    checkout,
    statut,
  };
}

// ── Fetch + parsing ───────────────────────────────────────────────────────────

/**
 * Récupère et parse un calendrier iCal depuis une URL publique.
 * Applique un timeout manuel car node-ical n'en fournit pas nativement.
 *
 * @param {string} url  URL iCal publique
 * @returns {Promise<object[]>}  Tableau de VEVENT parsés
 */
async function fetchAndParseIcal(url) {
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout après ${ICAL_FETCH_TIMEOUT_MS}ms`)),
      ICAL_FETCH_TIMEOUT_MS
    )
  );

  // fromURL retourne un objet { uid: event, ... } — on extrait les valeurs
  const data = await Promise.race([ical.async.fromURL(url), timeout]);

  return Object.values(data).filter((e) => e.type === 'VEVENT');
}

// ── Sync d'un channel ─────────────────────────────────────────────────────────

/**
 * Synchronise un channel iCal : fetch → parse → upsert réservations.
 *
 * @param {object} channel  Enregistrement de la table channels
 * @returns {{ synced: number, created: number, errors: number }}
 */
async function syncChannel(channel) {
  let events;

  try {
    events = await fetchAndParseIcal(channel.ical_url);
  } catch (err) {
    const urlShort = channel.ical_url.slice(0, 60);
    console.error(`[ICAL] Erreur fetch "${channel.name}" (${urlShort}…) :`, err.message);

    await logSync(channel.logement_id, channel.type, 'fetch', 'error', {
      channel_id: channel.id,
      error:      err.message,
    });

    return { synced: 0, created: 0, errors: 1 };
  }

  let created  = 0;
  let errCount = 0;

  for (const event of events) {
    const normalized = normalizeIcalEvent(event, channel.logement_id, channel.type);
    if (!normalized) continue;

    try {
      const result = await upsertReservation(normalized);
      if (result?.action === 'created') created++;
    } catch (err) {
      console.error(`[ICAL] Erreur upsert uid=${event.uid} :`, err.message);
      errCount++;
    }
  }

  // Horodater la sync côté channel (best-effort, ne bloque pas)
  await supabase
    .from('channels')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', channel.id)
    .catch(() => {});

  if (created > 0) {
    console.log(
      `[ICAL] "${channel.name}" — ${created} nouvelle(s) réservation(s) sur ${events.length} événements`
    );
  }

  await logSync(channel.logement_id, channel.type, 'sync', errCount ? 'error' : 'success', {
    channel_id: channel.id,
    total:      events.length,
    created,
    errors:     errCount,
  });

  return { synced: events.length, created, errors: errCount };
}

// ── Détection de conflits ─────────────────────────────────────────────────────

/**
 * Détecte les conflits de dates pour un logement après une sync.
 * Deux réservations sont en conflit si leurs périodes se chevauchent :
 *   a.checkin < b.checkout  ET  a.checkout > b.checkin
 *
 * @param {string} logementId
 * @returns {Promise<Array>}  Paires de réservations en conflit
 */
async function detectConflicts(logementId) {
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, checkin, checkout, plateforme, voyageur_nom, provider')
    .eq('logement_id', logementId)
    .eq('statut', 'confirmee')
    .order('checkin');

  if (!reservations?.length) return [];

  const conflicts = [];

  // O(n²) — volume par logement reste faible (< 200 réservations/an)
  for (let i = 0; i < reservations.length; i++) {
    for (let j = i + 1; j < reservations.length; j++) {
      const a = reservations[i];
      const b = reservations[j];

      if (a.checkin < b.checkout && a.checkout > b.checkin) {
        conflicts.push({
          reservation_a: { id: a.id, checkin: a.checkin, checkout: a.checkout, plateforme: a.plateforme },
          reservation_b: { id: b.id, checkin: b.checkin, checkout: b.checkout, plateforme: b.plateforme },
        });
      }
    }
  }

  return conflicts;
}

// ── Sync d'un logement (tous ses channels) ────────────────────────────────────

/**
 * Synchronise tous les channels actifs d'un logement et détecte les conflits.
 *
 * @param {string} logementId
 * @returns {{ synced: number, created: number, conflicts: Array, errors: Array }}
 */
async function syncLogementChannels(logementId) {
  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('logement_id', logementId)
    .eq('is_active', true);

  if (error || !channels?.length) {
    return { synced: 0, created: 0, conflicts: [], errors: [] };
  }

  let totalSynced  = 0;
  let totalCreated = 0;
  const errors     = [];

  for (const ch of channels) {
    const result = await syncChannel(ch);
    totalSynced  += result.synced;
    totalCreated += result.created;
    if (result.errors > 0) errors.push({ channel: ch.name, errors: result.errors });
  }

  const conflicts = await detectConflicts(logementId);

  if (conflicts.length > 0) {
    console.warn(`[ICAL] ${conflicts.length} conflit(s) de dates détecté(s) pour logement ${logementId}`);
  }

  return {
    synced:    totalSynced,
    created:   totalCreated,
    conflicts,
    errors,
  };
}

// ── Log sync_logs ─────────────────────────────────────────────────────────────

async function logSync(logementId, provider, action, statut, details = {}) {
  await supabase.from('sync_logs').insert({
    logement_id: logementId,
    action:      `ical_${provider}_${action}`,
    statut,
    details,
  }).catch(() => {});
}

// ── Cron global (toutes les heures) ──────────────────────────────────────────

/**
 * Sync globale de tous les channels iCal actifs, appelée par le cron.
 */
async function syncAllIcalChannels() {
  console.log('[ICAL CRON] Démarrage sync globale iCal…');

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('[ICAL CRON] Erreur chargement channels :', error.message);
    return;
  }

  if (!channels?.length) {
    console.log('[ICAL CRON] Aucun channel iCal actif.');
    return;
  }

  let totalCreated = 0;

  for (const ch of channels) {
    const result = await syncChannel(ch);
    totalCreated += result.created ?? 0;
  }

  console.log(`[ICAL CRON] Sync terminée — ${totalCreated} nouvelle(s) réservation(s)`);
}

/**
 * Démarre le cron horaire.
 * Appelle syncAllIcalChannels() immédiatement au démarrage, puis toutes les heures.
 */
function startIcalCron() {
  syncAllIcalChannels(); // exécution immédiate

  cron.schedule('0 * * * *', () => {
    syncAllIcalChannels();
  });

  console.log('[ICAL] IcalCron démarré (sync toutes les heures)');
}

module.exports = {
  startIcalCron,
  syncChannel,
  syncLogementChannels,
  detectConflicts,
};
