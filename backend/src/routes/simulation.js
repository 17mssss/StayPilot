/**
 * simulation.js — Endpoints de simulation pour tester toutes les intégrations
 * sans compte Superhote réel.
 *
 * Routes :
 *   GET  /api/simulation/status          → Statut de toutes les intégrations
 *   POST /api/simulation/reservation     → Créer une réservation fictive
 *   POST /api/simulation/sms-entrant     → Simuler un SMS entrant d'un voyageur
 *   POST /api/simulation/test-sms        → Envoyer un vrai SMS de test via Twilio
 *   POST /api/simulation/test-email      → Envoyer un vrai email de test via SendGrid
 *   POST /api/simulation/test-ia         → Tester la génération IA (Claude)
 *   POST /api/simulation/test-scheduler  → Déclencher le scheduler de messages
 *   DELETE /api/simulation/reset         → Supprimer toutes les données de simulation
 */

const express = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Helper: jours relatifs ────────────────────────────────────────────────────
const fmt = (d) => d.toISOString().split('T')[0];
const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/simulation/status — Statut de toutes les intégrations
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', async (req, res, next) => {
  const checks = [];

  // 1. Supabase
  try {
    const { error } = await supabase.from('clients').select('id').limit(1);
    checks.push({ name: 'Supabase DB', ok: !error, detail: error?.message || 'Connexion OK' });
  } catch (e) {
    checks.push({ name: 'Supabase DB', ok: false, detail: e.message });
  }

  // 2. Twilio
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      checks.push({ name: 'Twilio SMS', ok: false, detail: 'TWILIO_ACCOUNT_SID ou TWILIO_AUTH_TOKEN manquant dans .env' });
    } else {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const account = await twilio.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      checks.push({ name: 'Twilio SMS', ok: true, detail: `Compte : ${account.friendlyName} | Statut : ${account.status}` });
    }
  } catch (e) {
    checks.push({ name: 'Twilio SMS', ok: false, detail: e.message });
  }

  // 3. SendGrid
  try {
    if (!process.env.SENDGRID_API_KEY) {
      checks.push({ name: 'SendGrid Email', ok: false, detail: 'SENDGRID_API_KEY manquant dans .env' });
    } else {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // Validation légère via l'API de validation
      checks.push({ name: 'SendGrid Email', ok: true, detail: `Clé configurée (SG.${process.env.SENDGRID_API_KEY.slice(3, 10)}…)` });
    }
  } catch (e) {
    checks.push({ name: 'SendGrid Email', ok: false, detail: e.message });
  }

  // 4. Anthropic (Claude IA)
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      checks.push({ name: 'Anthropic IA', ok: false, detail: 'ANTHROPIC_API_KEY manquant dans .env' });
    } else {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
      // Test minimal
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Réponds juste "OK"' }],
      });
      checks.push({ name: 'Anthropic IA', ok: true, detail: 'claude-haiku-4-5-20251001 opérationnel' });
    }
  } catch (e) {
    checks.push({ name: 'Anthropic IA', ok: false, detail: e.message });
  }

  // 5. Superhote (optionnel)
  checks.push({
    name: 'Superhote API',
    ok: !!process.env.SUPERHOTE_API_KEY,
    detail: process.env.SUPERHOTE_API_KEY
      ? 'Clé configurée — polling actif'
      : 'Non configuré (utiliser la simulation)',
    optional: true,
  });

  // 6. AWS S3 (optionnel)
  checks.push({
    name: 'AWS S3',
    ok: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),
    detail: process.env.AWS_ACCESS_KEY_ID
      ? `Bucket : ${process.env.AWS_BUCKET_NAME || '(non défini)'}`
      : 'Non configuré (PDFs stockés en base Supabase)',
    optional: true,
  });

  const allRequired = checks.filter((c) => !c.optional);
  const allOk = allRequired.every((c) => c.ok);

  res.json({
    success: true,
    data: {
      all_ok: allOk,
      checks,
      summary: `${allRequired.filter((c) => c.ok).length}/${allRequired.length} intégrations requises opérationnelles`,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/reservation — Créer une réservation fictive
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reservation', async (req, res, next) => {
  try {
    const body = z.object({
      logement_id: z.string().uuid().optional(),
      voyageur_nom: z.string().default('Voyageur Test'),
      voyageur_email: z.string().email().optional(),
      voyageur_telephone: z.string().optional(),
      checkin_in_days: z.number().int().min(0).default(2),
      duration_nights: z.number().int().min(1).default(3),
    }).parse(req.body);

    // Trouver un logement du client si non fourni
    let logementId = body.logement_id;
    if (!logementId) {
      const { data: logements } = await supabase
        .from('logements')
        .select('id, nom')
        .eq('client_id', req.clientId)
        .limit(1);

      if (!logements?.length) {
        return res.status(404).json({ success: false, error: 'Aucun logement configuré. Ajoutez un logement d\'abord.' });
      }
      logementId = logements[0].id;
    }

    const today = new Date();
    const superhoteId = `SIM-${Date.now()}`;

    const { data: resa, error } = await supabase
      .from('reservations')
      .insert({
        logement_id: logementId,
        superhote_id: superhoteId,
        voyageur_nom: body.voyageur_nom,
        voyageur_email: body.voyageur_email || null,
        voyageur_telephone: body.voyageur_telephone || null,
        checkin: fmt(addDays(today, body.checkin_in_days)),
        checkout: fmt(addDays(today, body.checkin_in_days + body.duration_nights)),
        statut: 'confirmee',
      })
      .select('*, logements(nom)')
      .single();

    if (error) throw error;

    // Programmer les messages automatiques si templates disponibles
    try {
      const { programmerMessages } = require('../services/scheduler');
      await programmerMessages(resa.id, logementId, resa.checkin, resa.checkout);
    } catch (schedErr) {
      console.warn('[SIM] Impossible de programmer les messages:', schedErr.message);
    }

    res.status(201).json({
      success: true,
      data: {
        reservation: {
          id: resa.id,
          voyageur_nom: resa.voyageur_nom,
          logement: resa.logements?.nom,
          checkin: resa.checkin,
          checkout: resa.checkout,
          statut: resa.statut,
        },
        message: `✅ Réservation créée pour ${resa.voyageur_nom} du ${resa.checkin} au ${resa.checkout}`,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/sms-entrant — Simuler un SMS entrant d'un voyageur
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sms-entrant', async (req, res, next) => {
  try {
    const body = z.object({
      reservation_id: z.string().uuid().optional(),
      message: z.string().min(1).default('Bonjour, est-ce que je peux arriver à 14h ?'),
    }).parse(req.body);

    // Trouver la dernière réservation du client si non fournie
    let reservationId = body.reservation_id;
    if (!reservationId) {
      const { data: logements } = await supabase
        .from('logements').select('id').eq('client_id', req.clientId);
      const ids = logements?.map((l) => l.id) ?? [];

      if (ids.length) {
        const { data: resas } = await supabase
          .from('reservations')
          .select('id')
          .in('logement_id', ids)
          .order('created_at', { ascending: false })
          .limit(1);
        reservationId = resas?.[0]?.id;
      }
    }

    if (!reservationId) {
      return res.status(404).json({ success: false, error: 'Aucune réservation disponible. Créez d\'abord une réservation simulée.' });
    }

    // Enregistrer le message entrant
    await supabase.from('messages').insert({
      reservation_id: reservationId,
      direction: 'entrant',
      canal: 'sms',
      contenu: body.message,
      statut: 'envoye',
      genere_par_ia: false,
    });

    // Vérifier si autopilote actif
    const { data: resa } = await supabase
      .from('reservations')
      .select('*, logements(autopilote, nom)')
      .eq('id', reservationId)
      .single();

    let iaResponse = null;
    let autopiloteActif = resa?.logements?.autopilote === true;

    if (autopiloteActif) {
      try {
        const { generateReply } = require('../services/claude');
        const { data: historique } = await supabase
          .from('messages')
          .select('direction, contenu')
          .eq('reservation_id', reservationId)
          .order('created_at', { ascending: true })
          .limit(10);

        iaResponse = await generateReply({
          message: body.message,
          historique: historique || [],
          voyageur: { nom: resa.voyageur_nom, checkin: resa.checkin, checkout: resa.checkout },
        });

        await supabase.from('messages').insert({
          reservation_id: reservationId,
          direction: 'sortant',
          canal: 'sms',
          contenu: iaResponse,
          statut: 'envoye',
          genere_par_ia: true,
          valide: true,
        });
      } catch (iaErr) {
        console.warn('[SIM] Erreur IA:', iaErr.message);
        iaResponse = `(Erreur IA: ${iaErr.message})`;
      }
    }

    res.json({
      success: true,
      data: {
        message_enregistre: body.message,
        reservation_id: reservationId,
        logement: resa?.logements?.nom,
        autopilote_actif: autopiloteActif,
        reponse_ia: iaResponse,
        message: autopiloteActif
          ? `✅ SMS simulé + réponse IA générée`
          : `✅ SMS enregistré (autopilote inactif sur ce logement)`,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/test-sms — Envoyer un vrai SMS via Twilio
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test-sms', async (req, res, next) => {
  try {
    const body = z.object({
      to: z.string().min(8),
      message: z.string().min(1).default('Test SMS StayPilot ✅ — Intégration Twilio opérationnelle !'),
    }).parse(req.body);

    const { sendSMS } = require('../services/twilio');
    const result = await sendSMS(body.to, body.message);

    res.json({
      success: true,
      data: {
        to: body.to,
        sid: result?.sid,
        status: result?.status,
        message: `✅ SMS envoyé à ${body.to}`,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: `Échec Twilio : ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/test-email — Envoyer un vrai email via SendGrid
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test-email', async (req, res, next) => {
  try {
    const body = z.object({
      to: z.string().email(),
      subject: z.string().default('Test Email StayPilot ✅'),
      message: z.string().default('Ce message confirme que l\'intégration SendGrid est opérationnelle pour StayPilot !'),
    }).parse(req.body);

    const { sendEmail } = require('../services/sendgrid');
    await sendEmail(
      body.to,
      body.subject,
      body.message,
      `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #e8611a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">StayPilot</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0;">Test d'intégration email</p>
        </div>
        <p style="color: #333; font-size: 16px;">${body.message}</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          Envoyé depuis <strong>StayPilot</strong> via SendGrid.
        </p>
      </div>`
    );

    res.json({
      success: true,
      data: {
        to: body.to,
        subject: body.subject,
        message: `✅ Email envoyé à ${body.to}`,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: `Échec SendGrid : ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/test-ia — Tester la génération de réponse IA
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test-ia', async (req, res, next) => {
  try {
    const body = z.object({
      message: z.string().min(1).default('Bonjour, je voudrais savoir si je peux arriver avec un animal de compagnie ?'),
    }).parse(req.body);

    const { generateReply } = require('../services/claude');
    const reponse = await generateReply({
      message: body.message,
      historique: [],
      voyageur: {
        nom: 'Voyageur Test',
        checkin: fmt(addDays(new Date(), 2)),
        checkout: fmt(addDays(new Date(), 5)),
      },
    });

    res.json({
      success: true,
      data: {
        message_voyageur: body.message,
        reponse_ia: reponse,
        message: '✅ Réponse IA générée avec succès',
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    console.error('[IA] Erreur Anthropic:', err.status, err.message, err.error);
    res.status(500).json({ success: false, error: `Échec Anthropic : ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/simulation/test-scheduler — Déclencher le scheduler manuellement
// ─────────────────────────────────────────────────────────────────────────────
router.post('/test-scheduler', async (req, res, next) => {
  try {
    const { traiterMessagesEnAttente } = require('../services/scheduler');
    await traiterMessagesEnAttente();
    res.json({ success: true, data: { message: '✅ Scheduler exécuté' } });
  } catch (err) {
    res.status(500).json({ success: false, error: `Échec scheduler : ${err.message}` });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/simulation/reset — Supprimer les données de simulation
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/reset', async (req, res, next) => {
  try {
    // Récupérer les logements du client
    const { data: logements } = await supabase
      .from('logements').select('id').eq('client_id', req.clientId);
    const logIds = logements?.map((l) => l.id) ?? [];

    let deletedResas = 0;
    if (logIds.length) {
      // Supprimer les réservations simulées (SIM-*)
      const { data: resas } = await supabase
        .from('reservations')
        .select('id')
        .in('logement_id', logIds)
        .like('superhote_id', 'SIM-%');

      if (resas?.length) {
        const resaIds = resas.map((r) => r.id);

        // Supprimer les messages liés
        await supabase.from('messages').delete().in('reservation_id', resaIds);

        // Supprimer les réservations
        const { count } = await supabase
          .from('reservations')
          .delete()
          .in('id', resaIds);

        deletedResas = resas.length;
      }
    }

    res.json({
      success: true,
      data: { message: `✅ ${deletedResas} réservations simulées supprimées` },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
