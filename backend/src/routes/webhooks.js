const express = require('express');
const supabase = require('../config/supabase');
const { generateReply } = require('../services/claude');
const { sendSMS, sendWhatsApp } = require('../services/twilio');
const { sendEmail } = require('../services/sendgrid');
const { programmerMessages } = require('../services/scheduler');
const { validateTwilioSignature, validateWebhookSecret } = require('../middleware/webhookAuth');

const router = express.Router();

/**
 * POST /webhook/message-entrant
 * Appelé par n8n quand un message est reçu du voyageur.
 * Protégé par X-Webhook-Secret.
 */
router.post('/message-entrant', validateWebhookSecret, async (req, res) => {
  try {
    const { reservation_id, canal, contenu, from } = req.body;

    if (!reservation_id || !contenu) {
      return res.status(400).json({ success: false, error: 'reservation_id et contenu requis' });
    }

    // 1. Enregistrer le message entrant
    await supabase.from('messages').insert({
      reservation_id,
      direction: 'entrant',
      canal: canal || 'sms',
      contenu,
      statut: 'envoye',
      genere_par_ia: false,
    });

    // 2. Récupérer la réservation + logement pour savoir si autopilote actif
    const { data: resa } = await supabase
      .from('reservations')
      .select('*, logements(autopilote, canaux, client_id)')
      .eq('id', reservation_id)
      .single();

    if (!resa) return res.json({ success: true, action: 'message_enregistre' });

    const autopiloteActif = resa.logements?.autopilote === true;

    if (autopiloteActif) {
      // 3. Récupérer l'historique pour le contexte IA
      const { data: historique } = await supabase
        .from('messages')
        .select('direction, contenu, created_at')
        .eq('reservation_id', reservation_id)
        .order('created_at', { ascending: true })
        .limit(10);

      // 4. Générer la réponse avec Claude
      const reponse = await generateReply({
        message: contenu,
        historique: historique ?? [],
        voyageur: {
          nom: resa.voyageur_nom,
          checkin: resa.checkin,
          checkout: resa.checkout,
        },
      });

      // 5. Enregistrer la réponse IA (valide=true car autopilote)
      await supabase.from('messages').insert({
        reservation_id,
        direction: 'sortant',
        canal: canal || 'sms',
        contenu: reponse,
        statut: 'en_attente',
        genere_par_ia: true,
        valide: true,
      });

      // 6. Envoyer la réponse
      let envoye = false;
      try {
        if ((canal === 'sms' || !canal) && resa.voyageur_telephone) {
          await sendSMS(resa.voyageur_telephone, reponse);
          envoye = true;
        } else if (canal === 'whatsapp' && resa.voyageur_telephone) {
          await sendWhatsApp(resa.voyageur_telephone, reponse);
          envoye = true;
        } else if (canal === 'email' && resa.voyageur_email) {
          await sendEmail(resa.voyageur_email, 'Réponse de votre hôte', reponse);
          envoye = true;
        }
      } catch (sendErr) {
        console.error('[WEBHOOK] Erreur envoi réponse IA:', sendErr.message);
      }

      // 7. Mettre à jour le statut
      await supabase
        .from('messages')
        .update({ statut: envoye ? 'envoye' : 'erreur' })
        .eq('reservation_id', reservation_id)
        .eq('genere_par_ia', true)
        .eq('statut', 'en_attente');

      return res.json({ success: true, action: 'reponse_ia_envoyee', reponse });
    }

    // Autopilote désactivé → notifier le concierge
    res.json({ success: true, action: 'notification_concierge' });
  } catch (err) {
    console.error('[WEBHOOK] Erreur message-entrant:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /webhook/superhote
 * Appelé par n8n quand une nouvelle réservation est détectée dans Superhote.
 * Protégé par X-Webhook-Secret.
 */
router.post('/superhote', validateWebhookSecret, async (req, res) => {
  try {
    const {
      logement_id,
      superhote_id,
      voyageur_nom,
      voyageur_email,
      voyageur_telephone,
      checkin,
      checkout,
    } = req.body;

    if (!logement_id || !checkin || !checkout) {
      return res.status(400).json({ success: false, error: 'logement_id, checkin, checkout requis' });
    }

    // Idempotence : ignorer si superhote_id déjà connu
    if (superhote_id) {
      const { data: existing } = await supabase
        .from('reservations')
        .select('id')
        .eq('superhote_id', superhote_id)
        .single();

      if (existing) {
        return res.json({ success: true, action: 'deja_existante', id: existing.id });
      }
    }

    // Créer la réservation
    const { data: resa, error } = await supabase
      .from('reservations')
      .insert({
        logement_id,
        superhote_id,
        voyageur_nom,
        voyageur_email,
        voyageur_telephone,
        checkin,
        checkout,
        statut: 'confirmee',
      })
      .select()
      .single();

    if (error) throw error;

    // Programmer les messages automatiques selon les templates actifs
    await programmerMessages(resa.id, logement_id, checkin, checkout);

    res.status(201).json({ success: true, action: 'reservation_creee', data: resa });
  } catch (err) {
    console.error('[WEBHOOK] Erreur superhote:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /webhook/twilio/sms
 * Réception SMS entrant depuis Twilio (TwiML callback).
 * Protégé par validation de signature HMAC Twilio.
 * Note: urlencoded doit être parsé AVANT validateTwilioSignature (Twilio signe les params form)
 */
router.post('/twilio/sms', express.urlencoded({ extended: false }), validateTwilioSignature, async (req, res) => {
  try {
    const { From, Body } = req.body;
    if (!From || !Body) return res.status(400).send('');

    // Trouver la réservation associée au numéro
    const { data: resa } = await supabase
      .from('reservations')
      .select('id')
      .eq('voyageur_telephone', From)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (resa) {
      // Réutiliser le webhook message-entrant en interne
      await fetch(`http://localhost:${process.env.PORT || 3000}/webhook/message-entrant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_id: resa.id, canal: 'sms', contenu: Body, from: From }),
      });
    }

    // Réponse TwiML vide (pas de réponse immédiate)
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  } catch (err) {
    console.error('[WEBHOOK] Erreur twilio/sms:', err.message);
    res.set('Content-Type', 'text/xml');
    res.send('<Response></Response>');
  }
});

module.exports = router;
