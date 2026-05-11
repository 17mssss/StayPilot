const express = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');
const { sendSMS, sendWhatsApp } = require('../services/twilio');
const { sendEmail } = require('../services/sendgrid');

const router = express.Router();
router.use(authenticate);

// ── DTO helper ────────────────────────────────────────────────────────────────
function toDto(m) {
  if (!m) return null;
  return {
    id: m.id,
    reservation_id: m.reservation_id,
    direction: m.direction === 'entrant' ? 'inbound' : 'outbound',
    channel: m.canal,
    content: m.contenu,
    sent_at: m.created_at,
    status: m.statut,
    genere_par_ia: m.genere_par_ia,
    valide: m.valide,
    // Nested reservation info (for conversation list)
    guest_name: m.reservations?.voyageur_nom,
    property_name: m.reservations?.logements?.nom,
    reservation_id_ref: m.reservation_id,
  };
}

// GET /api/messages — Inbox du client
router.get('/', async (req, res, next) => {
  try {
    const { canal, limit = 50, page = 1 } = req.query;

    const { data: logements } = await supabase
      .from('logements')
      .select('id')
      .eq('client_id', req.clientId);

    const logementIds = logements?.map((l) => l.id) ?? [];
    if (logementIds.length === 0) return res.json({ success: true, data: [] });

    const { data: reservationIds } = await supabase
      .from('reservations')
      .select('id')
      .in('logement_id', logementIds);

    const resaIds = reservationIds?.map((r) => r.id) ?? [];
    if (resaIds.length === 0) return res.json({ success: true, data: [] });

    let query = supabase
      .from('messages')
      .select('*, reservations(voyageur_nom, voyageur_email, logements(nom))', { count: 'exact' })
      .in('reservation_id', resaIds)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (canal) query = query.eq('canal', canal);

    const { data, error, count } = await query;
    if (error) throw error;

    // Build conversation list: group by reservation, take latest message
    const convMap = new Map();
    for (const m of data || []) {
      const key = m.reservation_id;
      if (!convMap.has(key)) {
        convMap.set(key, {
          id: m.reservation_id,
          reservation_id: m.reservation_id,
          guest_name: m.reservations?.voyageur_nom ?? 'Voyageur',
          property_name: m.reservations?.logements?.nom ?? null,
          last_message: m.contenu,
          last_message_at: m.created_at,
          unread_count: 0,
        });
      }
    }

    res.json({ success: true, data: Array.from(convMap.values()), total: count });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/send — Envoi manuel d'un message
router.post('/send', async (req, res, next) => {
  try {
    const body = z.object({
      reservation_id: z.string().uuid(),
      canal: z.enum(['sms', 'email', 'whatsapp']).optional(),
      channel: z.enum(['sms', 'email', 'whatsapp']).optional(), // alias EN
      contenu: z.string().min(1).max(5000).optional(),
      content: z.string().min(1).max(5000).optional(),          // alias EN
      sujet: z.string().max(200).optional(),
    }).parse(req.body);

    const canal = body.canal || body.channel || 'sms';
    const contenu = body.contenu || body.content;
    if (!contenu) return res.status(400).json({ success: false, error: 'content requis' });

    const { data: resa } = await supabase
      .from('reservations')
      .select('*, logements(client_id, canaux)')
      .eq('id', body.reservation_id)
      .single();

    if (!resa || resa.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }

    let envoye = false;
    try {
      if (canal === 'sms' && resa.voyageur_telephone) {
        await sendSMS(resa.voyageur_telephone, contenu);
        envoye = true;
      } else if (canal === 'whatsapp' && resa.voyageur_telephone) {
        await sendWhatsApp(resa.voyageur_telephone, contenu);
        envoye = true;
      } else if (canal === 'email' && resa.voyageur_email) {
        await sendEmail(resa.voyageur_email, body.sujet || 'Message de votre hôte', contenu);
        envoye = true;
      }
    } catch (sendErr) {
      console.error(`[SEND] Échec envoi ${canal}:`, sendErr.message);
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        reservation_id: body.reservation_id,
        direction: 'sortant',
        canal,
        contenu,
        statut: envoye ? 'envoye' : 'erreur',
        genere_par_ia: false,
        valide: true,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: toDto(message) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// PATCH /api/messages/:id/valider — Valide (et envoie) ou rejette une suggestion IA
router.patch('/:id/valider', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { valide } = z.object({ valide: z.boolean() }).parse(req.body);

    const { data: msg } = await supabase
      .from('messages')
      .select('*, reservations(voyageur_telephone, voyageur_email, logements(client_id, canaux))')
      .eq('id', req.params.id)
      .single();

    if (!msg || msg.reservations?.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }

    let statut = msg.statut;

    // Si validation → envoyer réellement le message
    if (valide) {
      const resa = msg.reservations;
      const canal = msg.canal;
      try {
        if (canal === 'sms' && resa?.voyageur_telephone) {
          await sendSMS(resa.voyageur_telephone, msg.contenu);
          statut = 'envoye';
        } else if (canal === 'whatsapp' && resa?.voyageur_telephone) {
          await sendWhatsApp(resa.voyageur_telephone, msg.contenu);
          statut = 'envoye';
        } else if (canal === 'email' && resa?.voyageur_email) {
          await sendEmail(resa.voyageur_email, 'Message de votre hôte', msg.contenu);
          statut = 'envoye';
        }
      } catch (sendErr) {
        console.error('[VALIDER] Échec envoi:', sendErr.message);
        statut = 'erreur';
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ valide, statut })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: toDto(data) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// DELETE /api/messages/:id — Supprime une suggestion rejetée
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: msg } = await supabase
      .from('messages')
      .select('reservation_id, direction, genere_par_ia, contenu, canal, reservations(logements(client_id))')
      .eq('id', req.params.id)
      .single();

    if (!msg || msg.reservations?.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }
    if (!msg.genere_par_ia) {
      return res.status(400).json({ success: false, error: 'Seules les suggestions IA peuvent être supprimées' });
    }

    await supabase.from('messages').delete().eq('id', req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/messages/:reservationId/regenerate — Régénère une suggestion IA
router.post('/:reservationId/regenerate', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.reservationId)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    // Vérifier accès
    const { data: resa } = await supabase
      .from('reservations')
      .select('*, logements(client_id, canaux)')
      .eq('id', req.params.reservationId)
      .single();

    if (!resa || resa.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }

    // Dernier message entrant pour régénérer une réponse
    const { data: historique } = await supabase
      .from('messages')
      .select('direction, contenu')
      .eq('reservation_id', req.params.reservationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const lastInbound = [...(historique || [])].reverse().find((m) => m.direction === 'entrant');
    if (!lastInbound) {
      return res.status(400).json({ success: false, error: 'Aucun message entrant pour régénérer' });
    }

    const { generateReply } = require('../services/claude');
    const reponse = await generateReply({
      message: lastInbound.contenu,
      historique: historique || [],
      voyageur: { nom: resa.voyageur_nom, checkin: resa.checkin, checkout: resa.checkout },
    });

    const canal = req.body.canal || resa.logements?.canaux?.sms ? 'sms' : 'email';

    const { data: newMsg, error } = await supabase
      .from('messages')
      .insert({
        reservation_id: req.params.reservationId,
        direction: 'sortant',
        canal,
        contenu: reponse,
        statut: 'en_attente',
        genere_par_ia: true,
        valide: null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: toDto(newMsg) });
  } catch (err) { next(err); }
});

// POST /api/messages/trigger-scheduler — Déclenché par n8n (workflow 2)
router.post('/trigger-scheduler', async (req, res, next) => {
  try {
    const { traiterMessagesEnAttente } = require('../services/scheduler');
    await traiterMessagesEnAttente();
    res.json({ success: true, message: 'Scheduler déclenché' });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/incoming — Réception message entrant (n8n workflow 3)
router.post('/incoming', async (req, res, next) => {
  try {
    const { reservation_id, canal, contenu, content } = req.body;
    const messageContent = contenu || content;

    if (!reservation_id || !messageContent) {
      return res.status(400).json({ success: false, error: 'reservation_id et content requis' });
    }

    await supabase.from('messages').insert({
      reservation_id,
      direction: 'entrant',
      canal: canal || 'sms',
      contenu: messageContent,
      statut: 'envoye',
      genere_par_ia: false,
    });

    const { data: resa } = await supabase
      .from('reservations')
      .select('*, logements(autopilote, client_id)')
      .eq('id', reservation_id)
      .single();

    const autopiloteActif = resa?.logements?.autopilote === true;

    // Dans tous les cas, générer une suggestion IA
    try {
      const { generateReply } = require('../services/claude');
      const { data: historique } = await supabase
        .from('messages')
        .select('direction, contenu')
        .eq('reservation_id', reservation_id)
        .order('created_at', { ascending: true })
        .limit(10);

      const reponse = await generateReply({
        message: messageContent,
        historique: historique || [],
        voyageur: {
          nom:      resa.voyageur_nom,
          checkin:  resa.checkin,
          checkout: resa.checkout,
        },
      });

      if (autopiloteActif) {
        // Autopilote ON → envoi direct sans validation
        await supabase.from('messages').insert({
          reservation_id,
          direction: 'sortant',
          canal: canal || 'sms',
          contenu: reponse,
          statut: 'envoye',
          genere_par_ia: true,
          valide: true,
        });
        if ((canal === 'sms' || !canal) && resa.voyageur_telephone) {
          const { sendSMS: sms } = require('../services/twilio');
          await sms(resa.voyageur_telephone, reponse).catch(console.error);
        }
        return res.json({ success: true, action: 'reponse_ia_envoyee' });
      } else {
        // Autopilote OFF → suggestion en attente de validation admin
        await supabase.from('messages').insert({
          reservation_id,
          direction: 'sortant',
          canal: canal || 'sms',
          contenu: reponse,
          statut: 'en_attente',
          genere_par_ia: true,
          valide: null,
        });
        return res.json({ success: true, action: 'suggestion_ia_creee' });
      }
    } catch (iaErr) {
      console.error('[INCOMING] Erreur génération IA:', iaErr.message);
    }

    res.json({ success: true, action: 'message_enregistre' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
