/**
 * notifications.js — Notifications propriétaires (envoyées par l'admin)
 *
 * GET    /api/notifications                 → liste des notifs (admin: toutes, owner: les siennes)
 * GET    /api/notifications/count           → nombre de non-lues du propriétaire courant
 * POST   /api/notifications                 → créer une notif (admin → propriétaire)
 * PATCH  /api/notifications/:id/read        → marquer une notif comme lue
 * PATCH  /api/notifications/read-all        → marquer toutes comme lues (pour un propriétaire)
 * DELETE /api/notifications/:id             → supprimer une notif (admin)
 */

const express  = require('express');
const { z }    = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const NotifSchema = z.object({
  proprietaire_id: z.string().uuid('UUID invalide'),
  type:  z.enum(['info', 'new_reservation', 'cancellation', 'payment', 'document', 'message']).default('info'),
  title: z.string().min(1, 'Titre requis').max(255),
  body:  z.string().optional(),
});

// ── GET /api/notifications ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { proprietaire_id, unread_only, page = '1', limit = '30' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('owner_notifications')
      .select('*', { count: 'exact' })
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (proprietaire_id) query = query.eq('proprietaire_id', proprietaire_id);
    if (unread_only === 'true') query = query.eq('is_read', false);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data ?? [], total: count ?? 0, page: parseInt(page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/notifications/count ──────────────────────────────────────────────
router.get('/count', async (req, res, next) => {
  try {
    const { proprietaire_id } = req.query;

    let query = supabase
      .from('owner_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', req.clientId)
      .eq('is_read', false);

    if (proprietaire_id) query = query.eq('proprietaire_id', proprietaire_id);

    const { count, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: { count: count ?? 0 } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/notifications ───────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = NotifSchema.parse(req.body);

    const { data, error } = await supabase
      .from('owner_notifications')
      .insert({
        client_id:       req.clientId,
        proprietaire_id: body.proprietaire_id,
        type:            body.type,
        title:           body.title,
        body:            body.body || null,
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

// ── PATCH /api/notifications/read-all ─────────────────────────────────────────
// Doit être défini AVANT /:id pour éviter le conflit de route
router.patch('/read-all', async (req, res, next) => {
  try {
    const { proprietaire_id } = req.query;

    let query = supabase
      .from('owner_notifications')
      .update({ is_read: true })
      .eq('client_id', req.clientId)
      .eq('is_read', false);

    if (proprietaire_id) query = query.eq('proprietaire_id', proprietaire_id);

    const { error } = await query;
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────
router.patch('/:id/read', async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('owner_notifications')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Notification introuvable' });

    const { data, error } = await supabase
      .from('owner_notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('owner_notifications')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Notification introuvable' });

    const { error } = await supabase
      .from('owner_notifications')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
