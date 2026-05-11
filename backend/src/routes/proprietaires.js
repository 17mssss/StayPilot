/**
 * proprietaires.js
 * Gestion des propriétaires de biens pour la génération des relevés mensuels.
 *
 * GET    /api/proprietaires           → liste des propriétaires du client
 * POST   /api/proprietaires           → créer un propriétaire
 * PATCH  /api/proprietaires/:id       → modifier (nom, email, adresse, logement_ids)
 * DELETE /api/proprietaires/:id       → supprimer
 */

const express = require('express');
const { z }   = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const ProprietaireSchema = z.object({
  nom:          z.string().min(1, 'Le nom est requis'),
  email:        z.string().email().optional().or(z.literal('')),
  adresse:      z.string().optional(),
  logement_ids: z.array(z.string().uuid()).optional().default([]),
});

// ── GET /api/proprietaires ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('proprietaires')
      .select('id, nom, email, adresse, logement_ids, created_at')
      .eq('client_id', req.clientId)
      .order('nom', { ascending: true });

    if (error) throw error;
    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/proprietaires ───────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = ProprietaireSchema.parse(req.body);

    const { data, error } = await supabase
      .from('proprietaires')
      .insert({
        client_id:    req.clientId,
        nom:          body.nom,
        email:        body.email   || null,
        adresse:      body.adresse || null,
        logement_ids: body.logement_ids,
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

// ── PATCH /api/proprietaires/:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const body = ProprietaireSchema.partial().parse(req.body);

    const { data: existing } = await supabase
      .from('proprietaires')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Propriétaire introuvable' });

    const updates = {};
    if (body.nom          !== undefined) updates.nom          = body.nom;
    if (body.email        !== undefined) updates.email        = body.email || null;
    if (body.adresse      !== undefined) updates.adresse      = body.adresse || null;
    if (body.logement_ids !== undefined) updates.logement_ids = body.logement_ids;

    const { data, error } = await supabase
      .from('proprietaires')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── DELETE /api/proprietaires/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('proprietaires')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Propriétaire introuvable' });

    const { error } = await supabase
      .from('proprietaires')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
