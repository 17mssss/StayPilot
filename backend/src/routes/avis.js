/**
 * avis.js — Avis voyageurs
 *
 * GET    /api/avis          → liste paginée (filtres: logement_id, platform, rating, search)
 * POST   /api/avis          → créer un avis
 * PATCH  /api/avis/:id      → modifier (rating, comment, reponse_admin)
 * DELETE /api/avis/:id      → supprimer
 */

const express = require('express');
const { z }   = require('zod');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const AvisSchema = z.object({
  reservation_id: z.string().uuid().optional().nullable(),
  logement_id:    z.string().uuid().optional().nullable(),
  guest_name:     z.string().min(1, 'Nom requis').max(100),
  platform:       z.enum(['airbnb', 'booking', 'abritel', 'google', 'other']).default('airbnb'),
  rating:         z.number().int().min(1).max(5),
  comment:        z.string().max(5000).optional().nullable(),
  date_avis:      z.string().optional().nullable(),
  reponse_admin:  z.string().max(2000).optional().nullable(),
});

// ── GET /api/avis ─────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { logement_id, platform, rating, search, page = 1, limit = 50 } = req.query;

    let query = supabase
      .from('avis')
      .select('*, logements(nom)', { count: 'exact' })
      .eq('client_id', req.clientId)
      .order('date_avis', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (logement_id) query = query.eq('logement_id', logement_id);
    if (platform)    query = query.eq('platform', platform);
    if (rating)      query = query.eq('rating', Number(rating));
    if (search)      query = query.ilike('guest_name', `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const mapped = (data ?? []).map((a) => ({
      ...a,
      property_name: a.logements?.nom ?? null,
    }));

    res.json({ success: true, data: mapped, total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/avis ────────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = AvisSchema.parse(req.body);

    // Si reservation_id fourni, vérifier appartenance
    if (body.reservation_id) {
      const { data: resa } = await supabase
        .from('reservations')
        .select('id, logements(client_id)')
        .eq('id', body.reservation_id)
        .single();
      if (!resa || resa.logements?.client_id !== req.clientId) {
        return res.status(403).json({ success: false, error: 'Réservation introuvable' });
      }
      if (!body.logement_id) body.logement_id = resa.logement_id ?? null;
    }

    const { data, error } = await supabase
      .from('avis')
      .insert({ client_id: req.clientId, ...body })
      .select('*, logements(nom)')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: { ...data, property_name: data.logements?.nom ?? null } });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── PATCH /api/avis/:id ───────────────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const body = AvisSchema.partial().parse(req.body);

    const { data: existing } = await supabase
      .from('avis')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Avis introuvable' });

    const updates = {};
    const allowed = ['guest_name', 'platform', 'rating', 'comment', 'date_avis', 'reponse_admin', 'logement_id'];
    allowed.forEach((k) => { if (body[k] !== undefined) updates[k] = body[k]; });

    const { data, error } = await supabase
      .from('avis')
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

// ── POST /api/avis/:id/generate-response ─────────────────────────────────────
router.post('/:id/generate-response', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    // 1. Récupère l'avis depuis Supabase
    const { data: avis, error: avisErr } = await supabase
      .from('avis')
      .select('id, guest_name, rating, comment')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (avisErr || !avis) {
      return res.status(404).json({ success: false, error: 'Avis introuvable' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ success: false, error: 'Clé API Anthropic non configurée' });
    }

    // 2. Appelle Claude via fetch
    const prompt = `Génère une réponse professionnelle et chaleureuse à cet avis Airbnb. Note: ${avis.rating}/5. Commentaire: '${avis.comment ?? '(aucun commentaire)'}'. Voyageur: ${avis.guest_name}. Réponds uniquement avec le texte, max 120 mots, en français.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error('[generate-response] Claude API error:', errBody);
      return res.status(502).json({ success: false, error: 'Erreur lors de la génération IA' });
    }

    const claudeData = await claudeRes.json();
    const generated = claudeData?.content?.[0]?.text ?? '';

    // 4. Retourne { response: texte }
    res.json({ success: true, data: { response: generated } });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/avis/:id ──────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: existing } = await supabase
      .from('avis')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Avis introuvable' });

    const { error } = await supabase.from('avis').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
