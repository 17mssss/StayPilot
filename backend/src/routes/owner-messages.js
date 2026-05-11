/**
 * owner-messages.js — Messagerie admin ↔ propriétaire
 *
 * GET    /api/owner-messages?proprietaire_id=X   → thread de messages
 * POST   /api/owner-messages                     → envoyer un message
 * PATCH  /api/owner-messages/read?proprietaire_id=X → marquer tout lu (côté destinataire)
 * GET    /api/owner-messages/unread-count         → nb messages non lus (admin: tous, owner: siens)
 */

const express  = require('express');
const { z }    = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const MessageSchema = z.object({
  proprietaire_id: z.string().uuid('UUID invalide'),
  content:         z.string().min(1, 'Contenu requis'),
  direction:       z.enum(['admin_to_owner', 'owner_to_admin']).default('admin_to_owner'),
  attachments:     z.array(z.any()).optional().default([]),
});

// ── GET /api/owner-messages/unread-count ──────────────────────────────────────
// Défini avant /:id pour éviter conflits
router.get('/unread-count', async (req, res, next) => {
  try {
    const { proprietaire_id, direction } = req.query;

    let query = supabase
      .from('owner_messages')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', req.clientId)
      .eq('is_read', false);

    if (proprietaire_id) query = query.eq('proprietaire_id', proprietaire_id);
    if (direction) query = query.eq('direction', direction);

    const { count, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: { count: count ?? 0 } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner-messages?proprietaire_id=X ────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { proprietaire_id, page = '1', limit = '50' } = req.query;
    if (!proprietaire_id) {
      return res.status(400).json({ success: false, error: 'proprietaire_id requis' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await supabase
      .from('owner_messages')
      .select('*', { count: 'exact' })
      .eq('client_id', req.clientId)
      .eq('proprietaire_id', proprietaire_id)
      .order('created_at', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;
    res.json({ success: true, data: data ?? [], total: count ?? 0 });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner-messages ──────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = MessageSchema.parse(req.body);

    const { data, error } = await supabase
      .from('owner_messages')
      .insert({
        client_id:       req.clientId,
        proprietaire_id: body.proprietaire_id,
        direction:       body.direction,
        content:         body.content,
        attachments:     body.attachments,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── PATCH /api/owner-messages/read?proprietaire_id=X&direction=X ─────────────
// Marque tous les messages d'un thread (filtrés par direction) comme lus
router.patch('/read', async (req, res, next) => {
  try {
    const { proprietaire_id, direction } = req.query;
    if (!proprietaire_id) {
      return res.status(400).json({ success: false, error: 'proprietaire_id requis' });
    }

    let query = supabase
      .from('owner_messages')
      .update({ is_read: true })
      .eq('client_id', req.clientId)
      .eq('proprietaire_id', proprietaire_id)
      .eq('is_read', false);

    if (direction) query = query.eq('direction', direction);

    const { error } = await query;
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
