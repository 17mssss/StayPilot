/**
 * livrets.js — Livrets d'accueil QR Code
 *
 * GET    /api/livrets              → liste des livrets (par client_id)
 * POST   /api/livrets              → créer un livret
 * PATCH  /api/livrets/:id          → modifier un livret
 * DELETE /api/livrets/:id          → supprimer un livret
 * GET    /api/livrets/public/:slug → accès public sans auth
 */

const express = require('express');
const { z }   = require('zod');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function toKebabCase(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '')     // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, '-')             // Espaces → tirets
    .replace(/-+/g, '-');             // Tirets multiples → un seul
}

function randomChars(n = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < n; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateSlug(titre) {
  return `${toKebabCase(titre)}-${randomChars(6)}`;
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────

const LivretSchema = z.object({
  logement_id:      z.string().uuid().optional().nullable(),
  titre:            z.string().min(1, 'Titre requis').max(200),
  wifi_nom:         z.string().max(100).optional().nullable(),
  wifi_mdp:         z.string().max(100).optional().nullable(),
  code_acces:       z.string().max(100).optional().nullable(),
  reglement:        z.string().max(5000).optional().nullable(),
  checkin_info:     z.string().max(3000).optional().nullable(),
  checkout_info:    z.string().max(3000).optional().nullable(),
  recommandations:  z.string().max(5000).optional().nullable(),
  contact_urgence:  z.string().max(500).optional().nullable(),
});

// ── GET /api/livrets/public/:slug — SANS auth ─────────────────────────────────
// IMPORTANT: Cette route doit être enregistrée AVANT router.use(authenticate)
router.get('/public/:slug', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('livrets')
      .select('id, titre, logement_id, wifi_nom, wifi_mdp, code_acces, reglement, checkin_info, checkout_info, recommandations, contact_urgence, slug')
      .eq('slug', req.params.slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Livret introuvable' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── Toutes les routes suivantes nécessitent l'authentification ────────────────
router.use(authenticate);

// ── GET /api/livrets ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { logement_id } = req.query;

    let query = supabase
      .from('livrets')
      .select('*, logements(nom)')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (logement_id) query = query.eq('logement_id', logement_id);

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data ?? []).map((l) => ({
      ...l,
      property_name: l.logements?.nom ?? null,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/livrets ─────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = LivretSchema.parse(req.body);
    const slug = generateSlug(body.titre);

    const { data, error } = await supabase
      .from('livrets')
      .insert({ client_id: req.clientId, ...body, slug })
      .select('*, logements(nom)')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: { ...data, property_name: data.logements?.nom ?? null },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── PATCH /api/livrets/:id ────────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const body = LivretSchema.partial().parse(req.body);

    const { data: existing } = await supabase
      .from('livrets')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Livret introuvable' });

    const allowed = ['logement_id', 'titre', 'wifi_nom', 'wifi_mdp', 'code_acces', 'reglement', 'checkin_info', 'checkout_info', 'recommandations', 'contact_urgence'];
    const updates = {};
    allowed.forEach((k) => { if (body[k] !== undefined) updates[k] = body[k]; });

    const { data, error } = await supabase
      .from('livrets')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, logements(nom)')
      .single();

    if (error) throw error;

    res.json({ success: true, data: { ...data, property_name: data.logements?.nom ?? null } });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── DELETE /api/livrets/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: existing } = await supabase
      .from('livrets')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Livret introuvable' });

    const { error } = await supabase.from('livrets').delete().eq('id', req.params.id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
