/**
 * syncManager.js — Synchronisation unifiée multi channel manager
 *
 * Supporte : smoobu | hostaway | lodgify | superhote
 *
 * Utilisé par :
 *   - Le cron toutes les 15 min (polling automatique)
 *   - La route POST /api/sync/trigger (déclenchement manuel depuis l'UI)
 *   - Les webhooks (push temps réel depuis chaque plateforme)
 */

const cron    = require('node-cron');
const supabase = require('../config/supabase');
const { programmerMessages } = require('./scheduler');

const smoobu  = require('./smoobu');
const hostaway = require('./hostaway');
const lodgify  = require('./lodgify');

// ── Fenêtre de sync : 30 jours passés + 1 an à venir ─────────────────────────
function dateWindow() {
  const from = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0];
  const to   = new Date(Date.now() + 365 * 86_400_000).toISOString().split('T')[0];
  return { from, to };
}

// ── Sauvegarder une réservation normalisée (idempotent) ───────────────────────
async function upsertReservation(normalized) {
  if (!normalized.external_id || !normalized.logement_id) return null;

  // Vérifier si elle existe déjà (external_id + provider)
  const { data: existing } = await supabase
    .from('reservations')
    .select('id, statut')
    .eq('external_id', normalized.external_id)
    .eq('provider',    normalized.provider)
    .maybeSingle();

  if (existing) {
    // Mettre à jour le statut si annulée
    if (normalized.statut === 'annulee' && existing.statut !== 'annulee') {
      await supabase
        .from('reservations')
        .update({ statut: 'annulee' })
        .eq('id', existing.id);
    }
    return { action: 'existing', id: existing.id };
  }

  // Insérer la nouvelle réservation
  const { data: newResa, error } = await supabase
    .from('reservations')
    .insert(normalized)
    .select()
    .single();

  if (error) {
    console.error(`[SYNC] Erreur insertion (${normalized.provider}):`, error.message);
    return null;
  }

  // Programmer les messages automatiques si confirmée
  if (normalized.statut !== 'annulee') {
    await programmerMessages(
      newResa.id,
      normalized.logement_id,
      newResa.checkin,
      newResa.checkout
    ).catch(() => {});
  }

  return { action: 'created', id: newResa.id };
}

// ── Logger le résultat du sync ────────────────────────────────────────────────
async function logSync(logementId, provider, action, statut, details = {}) {
  await supabase.from('sync_logs').insert({
    logement_id: logementId,
    action:      `sync_${provider}_${action}`,
    statut,
    details,
  }).catch(() => {});
}

// ── Sync SMOOBU pour un logement ──────────────────────────────────────────────
async function syncSmoobu(logement) {
  const { from, to } = dateWindow();
  const apiKey       = logement.cm_api_key;
  const propertyId   = logement.cm_account_id ?? null;

  let bookings;
  try {
    bookings = await smoobu.getReservations(apiKey, from, to, propertyId);
  } catch (err) {
    console.error(`[SMOOBU] Erreur ${logement.nom}:`, err.message);
    await logSync(logement.id, 'smoobu', 'poll', 'error', { error: err.message });
    return { created: 0, errors: 1 };
  }

  let created = 0;
  for (const b of bookings) {
    const normalized = smoobu.normalize(b, logement.id);
    const result     = await upsertReservation(normalized);
    if (result?.action === 'created') created++;
  }

  if (created > 0) {
    await logSync(logement.id, 'smoobu', 'poll', 'success', { bookings: bookings.length, created });
    console.log(`[SMOOBU] ${logement.nom} — ${created} nouvelle(s) réservation(s)`);
  }

  return { created, total: bookings.length };
}

// ── Sync HOSTAWAY pour un logement ───────────────────────────────────────────
async function syncHostaway(logement) {
  const { from, to } = dateWindow();
  const accountId    = logement.cm_account_id;
  const apiKey       = logement.cm_api_key;

  let bookings;
  try {
    bookings = await hostaway.getReservations(accountId, apiKey, from, to);
  } catch (err) {
    console.error(`[HOSTAWAY] Erreur ${logement.nom}:`, err.message);
    await logSync(logement.id, 'hostaway', 'poll', 'error', { error: err.message });
    return { created: 0, errors: 1 };
  }

  let created = 0;
  for (const b of bookings) {
    const normalized = hostaway.normalize(b, logement.id);
    const result     = await upsertReservation(normalized);
    if (result?.action === 'created') created++;
  }

  if (created > 0) {
    await logSync(logement.id, 'hostaway', 'poll', 'success', { bookings: bookings.length, created });
    console.log(`[HOSTAWAY] ${logement.nom} — ${created} nouvelle(s) réservation(s)`);
  }

  return { created, total: bookings.length };
}

// ── Sync LODGIFY pour un logement ─────────────────────────────────────────────
async function syncLodgify(logement) {
  const { from, to } = dateWindow();
  const apiKey       = logement.cm_api_key;
  const propertyId   = logement.cm_account_id ?? null;

  let bookings;
  try {
    bookings = await lodgify.getReservations(apiKey, from, to, propertyId);
  } catch (err) {
    console.error(`[LODGIFY] Erreur ${logement.nom}:`, err.message);
    await logSync(logement.id, 'lodgify', 'poll', 'error', { error: err.message });
    return { created: 0, errors: 1 };
  }

  let created = 0;
  for (const b of bookings) {
    const normalized = lodgify.normalize(b, logement.id);
    const result     = await upsertReservation(normalized);
    if (result?.action === 'created') created++;
  }

  if (created > 0) {
    await logSync(logement.id, 'lodgify', 'poll', 'success', { bookings: bookings.length, created });
    console.log(`[LODGIFY] ${logement.nom} — ${created} nouvelle(s) réservation(s)`);
  }

  return { created, total: bookings.length };
}

// ── Dispatch selon le provider ────────────────────────────────────────────────
async function syncLogement(logement) {
  const provider = (logement.channel_manager ?? '').toLowerCase();
  switch (provider) {
    case 'smoobu':   return syncSmoobu(logement);
    case 'hostaway': return syncHostaway(logement);
    case 'lodgify':  return syncLodgify(logement);
    default:
      return { created: 0, skipped: true, reason: `Provider inconnu: ${provider}` };
  }
}

// ── Polling global — tous les logements configurés ────────────────────────────
async function pollAll() {
  console.log('[SYNC] Démarrage du polling multi-channel…');

  const { data: logements, error } = await supabase
    .from('logements')
    .select('id, nom, channel_manager, cm_api_key, cm_account_id')
    .not('channel_manager', 'is', null)
    .not('cm_api_key', 'is', null);

  if (error) { console.error('[SYNC] Erreur chargement logements:', error.message); return; }
  if (!logements?.length) { console.log('[SYNC] Aucun logement avec channel manager configuré.'); return; }

  let totalCreated = 0;
  for (const l of logements) {
    const result = await syncLogement(l);
    totalCreated += result.created ?? 0;
  }

  console.log(`[SYNC] Polling terminé — ${totalCreated} nouvelle(s) réservation(s) au total`);
}

// ── Démarrer le cron (toutes les 15 min) ─────────────────────────────────────
function startSyncManager() {
  pollAll(); // exécution immédiate au démarrage

  cron.schedule('*/15 * * * *', () => {
    pollAll();
  });

  console.log('[SYNC] SyncManager démarré (polling toutes les 15 min)');
}

module.exports = {
  startSyncManager,
  pollAll,
  syncLogement,
  upsertReservation,
};
