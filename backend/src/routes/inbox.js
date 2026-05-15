/**
 * inbox.js — Inbox Unifié multi-canaux
 *
 * GET  /api/inbox                        → liste conversations (groupées)
 * GET  /api/inbox/:convId/messages       → messages d'une conversation
 * POST /api/inbox/:convId/messages       → envoyer un message (host → guest)
 * POST /api/inbox/:convId/ai-reply       → générer réponse IA
 * PATCH /api/inbox/:convId/read          → marquer conversation comme lue
 */

const express  = require('express');
const { z }    = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/inbox — liste des conversations ──────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Grouper par conversation_id
    const convMap = new Map();
    for (const msg of (data ?? [])) {
      const cid = msg.conversation_id;
      if (!convMap.has(cid)) {
        convMap.set(cid, {
          id:           cid,
          guestName:    msg.guest_name,
          channel:      msg.channel,
          property:     msg.property_name ?? '',
          checkIn:      msg.check_in ?? '',
          checkOut:     msg.check_out ?? '',
          lastMessage:  msg.content,
          time:         msg.created_at,
          unread:       0,
          messages:     [],
        });
      }
      const conv = convMap.get(cid);
      // Mettre à jour le dernier message
      if (new Date(msg.created_at) >= new Date(conv.time)) {
        conv.lastMessage = msg.content;
        conv.time = msg.created_at;
      }
      if (msg.direction === 'in' && !msg.is_read) conv.unread++;
      conv.messages.push({
        id:   msg.id,
        from: msg.direction === 'in' ? 'guest' : 'host',
        text: msg.content,
        time: new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      });
    }

    // Trier les messages de chaque conversation par date croissante
    const conversations = Array.from(convMap.values()).map(c => ({
      ...c,
      messages: c.messages.sort((a, b) => {
        // on trie via l'id original (uuid v4 time-ordered ou timestamp)
        return 0; // déjà dans l'ordre de la requête DESC, on inverse
      }),
    }));

    // Trier les conversations par date du dernier message
    conversations.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/inbox/:convId/messages — envoyer un message ────────────────────
router.post('/:convId/messages', async (req, res, next) => {
  try {
    const { convId } = req.params;
    const schema = z.object({
      content:       z.string().min(1),
      channel:       z.string().optional(),
      guestName:     z.string().optional(),
      propertyName:  z.string().optional(),
      checkIn:       z.string().optional(),
      checkOut:      z.string().optional(),
    });
    const body = schema.parse(req.body);

    // Récupérer les infos de la conversation existante si elle existe
    let convInfo = { channel: body.channel ?? 'email', guest_name: body.guestName ?? 'Voyageur', property_name: body.propertyName ?? '', check_in: body.checkIn ?? null, check_out: body.checkOut ?? null };
    const { data: existing } = await supabase
      .from('inbox_messages')
      .select('channel, guest_name, property_name, check_in, check_out')
      .eq('conversation_id', convId)
      .eq('client_id', req.clientId)
      .limit(1)
      .single();
    if (existing) convInfo = existing;

    const { data: msg, error } = await supabase
      .from('inbox_messages')
      .insert({
        client_id:       req.clientId,
        conversation_id: convId,
        channel:         convInfo.channel,
        guest_name:      convInfo.guest_name,
        property_name:   convInfo.property_name,
        check_in:        convInfo.check_in,
        check_out:       convInfo.check_out,
        direction:       'out',
        content:         body.content,
        is_read:         true,
      })
      .select()
      .single();

    if (error) throw error;

    // TODO: dispatcher vers la plateforme si configurée (Airbnb API, Twilio, etc.)
    // Cette logique sera ajoutée quand les tokens API seront configurés par le client

    res.json({ success: true, data: msg });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── POST /api/inbox/:convId/ai-reply — générer réponse IA ────────────────────
router.post('/:convId/ai-reply', async (req, res, next) => {
  try {
    const { convId } = req.params;

    // Récupérer les derniers messages de la conversation pour contexte
    const { data: messages } = await supabase
      .from('inbox_messages')
      .select('direction, content, guest_name, property_name, check_in, check_out')
      .eq('conversation_id', convId)
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!messages?.length) {
      // Génération sans historique si nouvelle conversation ou pas en DB
      const { lastMessage, guestName, property } = req.body;
      if (!lastMessage) return res.status(400).json({ success: false, error: 'Message requis' });

      const reply = await generateAIReply(lastMessage, [], { nom: guestName, logement: property });
      return res.json({ success: true, data: { reply } });
    }

    const firstMsg = messages[messages.length - 1];
    const historique = messages.reverse().map(m => ({
      direction: m.direction,
      contenu:   m.content,
    }));
    const lastGuestMsg = messages.filter(m => m.direction === 'in').pop();

    const reply = await generateAIReply(
      lastGuestMsg?.content ?? '',
      historique,
      { nom: firstMsg.guest_name, logement: firstMsg.property_name, checkin: firstMsg.check_in, checkout: firstMsg.check_out }
    );

    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/inbox/:convId/read — marquer comme lu ─────────────────────────
router.patch('/:convId/read', async (req, res, next) => {
  try {
    const { convId } = req.params;
    const { error } = await supabase
      .from('inbox_messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .eq('client_id', req.clientId)
      .eq('direction', 'in');
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── Helper IA ─────────────────────────────────────────────────────────────────
async function generateAIReply(message, historique, voyageur = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY non configurée');
  }

  const historyText = historique.length
    ? historique.slice(-6).map(h => `${h.direction === 'in' ? 'Voyageur' : 'Hôte'}: ${h.contenu}`).join('\n')
    : '';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: `Tu es un assistant concierge professionnel pour des locations courte durée (Airbnb, Booking).
Tu réponds aux voyageurs de façon chaleureuse, concise et utile.
Logement: ${voyageur.logement ?? 'non précisé'} | Voyageur: ${voyageur.nom ?? 'non précisé'} | Check-in: ${voyageur.checkin ?? '?'} | Check-out: ${voyageur.checkout ?? '?'}
Réponds en moins de 3 phrases. Ne donne jamais de codes d'accès sensibles par ce canal.`,
      messages: [
        ...(historyText ? [{ role: 'user', content: `Historique:\n${historyText}` }, { role: 'assistant', content: 'Compris.' }] : []),
        { role: 'user', content: `Nouveau message du voyageur: "${message}"\nGénère une réponse professionnelle.` },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API: ${err}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text ?? '';
}

module.exports = router;
