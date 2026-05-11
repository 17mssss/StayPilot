const cron = require('node-cron');
const axios = require('axios');
const supabase = require('../config/supabase');
const { programmerMessages } = require('./scheduler');

/**
 * Service Superhote — polling toutes les 15 minutes
 * Détecte les nouvelles réservations et les insère en base.
 */

async function pollSuperhote() {
  console.log('[SUPERHOTE] Début du polling…');

  try {
    // Récupérer tous les logements avec une clé API Superhote configurée
    const { data: logements, error } = await supabase
      .from('logements')
      .select('id, nom, superhote_property_key, superhote_api_key')
      .not('superhote_api_key', 'is', null)
      .not('superhote_property_key', 'is', null);

    if (error) throw error;
    if (!logements?.length) {
      console.log('[SUPERHOTE] Aucun logement avec clé API configurée.');
      return;
    }

    for (const logement of logements) {
      await pollLogement(logement);
    }
  } catch (err) {
    console.error('[SUPERHOTE] Erreur polling global:', err.message);
  }
}

async function pollLogement(logement) {
  try {
    // Appel API Superhote – endpoint réservations
    const response = await axios.get(
      `https://app.superhote.com/api/reservations`,
      {
        headers: {
          'X-Api-Key': logement.superhote_api_key,
          'Content-Type': 'application/json',
        },
        params: {
          property_key: logement.superhote_property_key,
          // Récupérer les 30 derniers jours + 1 an à venir
          date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          date_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        timeout: 10_000,
      }
    );

    const reservations = response.data?.reservations ?? response.data ?? [];
    let nouvelles = 0;

    for (const resa of reservations) {
      const superhoteId = String(resa.id || resa.reservation_id);

      // Idempotence — vérifier si déjà en base
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('superhote_id', superhoteId)
        .single();

      if (existing) continue;

      // Insérer la nouvelle réservation
      const { data: newResa, error: insertError } = await supabase
        .from('reservations')
        .insert({
          logement_id: logement.id,
          superhote_id: superhoteId,
          voyageur_nom: resa.guest_name || resa.voyageur_nom || 'Voyageur',
          voyageur_email: resa.guest_email || resa.voyageur_email || null,
          voyageur_telephone: resa.guest_phone || resa.voyageur_telephone || null,
          checkin: resa.check_in || resa.checkin,
          checkout: resa.check_out || resa.checkout,
          statut: 'confirmee',
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[SUPERHOTE] Erreur insertion réservation ${superhoteId}:`, insertError.message);
        continue;
      }

      // Programmer les messages automatiques
      await programmerMessages(
        newResa.id,
        logement.id,
        newResa.checkin,
        newResa.checkout
      );

      nouvelles++;
      console.log(`[SUPERHOTE] Nouvelle réservation créée: ${newResa.id} (${logement.nom})`);
    }

    if (nouvelles > 0) {
      // Logger le sync
      await supabase.from('sync_logs').insert({
        logement_id: logement.id,
        action: 'poll_superhote',
        statut: 'success',
        details: { nouvelles_reservations: nouvelles },
      }).catch(() => {}); // ne pas bloquer si la table n'existe pas
    }
  } catch (err) {
    console.error(`[SUPERHOTE] Erreur logement ${logement.nom}:`, err.message);
    if (err.response?.status === 401) {
      console.warn(`[SUPERHOTE] Clé API invalide pour ${logement.nom}`);
    }
  }
}

function startPolling() {
  // Exécution immédiate au démarrage
  pollSuperhote();

  // Puis toutes les 15 minutes
  cron.schedule('*/15 * * * *', () => {
    pollSuperhote();
  });

  console.log('[SUPERHOTE] Polling démarré (toutes les 15 min)');
}

module.exports = { startPolling, pollSuperhote, pollLogement };
