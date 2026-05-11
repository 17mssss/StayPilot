/**
 * pricing-dynamique.js — Routes gestion des règles de pricing dynamique
 *
 * GET    /api/pricing-dynamique        → liste des règles du client
 * POST   /api/pricing-dynamique        → créer une règle
 * PATCH  /api/pricing-dynamique/:id    → modifier une règle
 * DELETE /api/pricing-dynamique/:id    → supprimer une règle
 */

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/pricing-dynamique ────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('pricing_dynamique')
      .select('*')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/pricing-dynamique ───────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const {
      logement_id,
      nom,
      type,
      date_debut,
      date_fin,
      taux_ajustement,
      actif = true,
    } = req.body;

    if (!nom || !type || taux_ajustement == null) {
      return res.status(400).json({ success: false, error: 'Champs requis : nom, type, taux_ajustement' });
    }

    const TYPES_VALIDES = ['saisonnier', 'occupation', 'dernier_moment'];
    if (!TYPES_VALIDES.includes(type)) {
      return res.status(400).json({ success: false, error: `Type invalide. Valeurs acceptées : ${TYPES_VALIDES.join(', ')}` });
    }

    const regle = {
      id:               uuidv4(),
      client_id:        req.clientId,
      logement_id:      logement_id ?? null,
      nom,
      type,
      date_debut:       date_debut ?? null,
      date_fin:         date_fin   ?? null,
      taux_ajustement:  parseFloat(taux_ajustement),
      actif:            Boolean(actif),
      created_at:       new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pricing_dynamique')
      .insert(regle)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/pricing-dynamique/:id ─────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Vérifier que la règle appartient bien au client
    const { data: existing, error: fetchErr } = await supabase
      .from('pricing_dynamique')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, error: 'Règle introuvable' });
    }

    const allowed = ['nom', 'logement_id', 'type', 'date_debut', 'date_fin', 'taux_ajustement', 'actif'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à modifier' });
    }

    const { data, error } = await supabase
      .from('pricing_dynamique')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/pricing-dynamique/:id ────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('pricing_dynamique')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, error: 'Règle introuvable' });
    }

    const { error } = await supabase
      .from('pricing_dynamique')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
