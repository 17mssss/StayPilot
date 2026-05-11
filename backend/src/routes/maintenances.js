/**
 * maintenances.js — Gestion des interventions de maintenance
 *
 * GET    /api/maintenances          → liste des interventions (filtres : logement_id, statut, priorite)
 * POST   /api/maintenances          → créer une intervention
 * PATCH  /api/maintenances/:id      → modifier statut / priorité / notes
 * DELETE /api/maintenances/:id      → supprimer une intervention
 */

const express  = require('express');
const { z }    = require('zod');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Schémas Zod ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  logement_id:    z.string().uuid(),
  titre:          z.string().min(1).max(255),
  description:    z.string().optional().nullable(),
  priorite:       z.enum(['faible', 'normale', 'urgente']).default('normale'),
  statut:         z.enum(['a_faire', 'en_cours', 'termine']).default('a_faire'),
  prestataire:    z.string().optional().nullable(),
  cout_estime:    z.number().nonnegative().optional().nullable(),
  date_signalement: z.string().optional().nullable(),
  date_resolution:  z.string().optional().nullable(),
});

const patchSchema = z.object({
  titre:           z.string().min(1).max(255).optional(),
  description:     z.string().optional().nullable(),
  priorite:        z.enum(['faible', 'normale', 'urgente']).optional(),
  statut:          z.enum(['a_faire', 'en_cours', 'termine']).optional(),
  prestataire:     z.string().optional().nullable(),
  cout_estime:     z.number().nonnegative().optional().nullable(),
  date_signalement: z.string().optional().nullable(),
  date_resolution:  z.string().optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Au moins un champ requis' });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Vérifie que le logement appartient au client connecté */
async function assertLogementOwnership(logementId, clientId) {
  const { data, error } = await supabase
    .from('logements')
    .select('id')
    .eq('id', logementId)
    .eq('client_id', clientId)
    .single();
  if (error || !data) {
    const err = new Error('Logement introuvable ou accès refusé');
    err.statusCode = 403;
    throw err;
  }
}

/** Vérifie que l'intervention appartient au client connecté */
async function assertMaintenanceOwnership(maintenanceId, clientId) {
  const { data, error } = await supabase
    .from('maintenances')
    .select('id, logement_id')
    .eq('id', maintenanceId)
    .eq('client_id', clientId)
    .single();
  if (error || !data) {
    const err = new Error('Intervention introuvable ou accès refusé');
    err.statusCode = 403;
    throw err;
  }
  return data;
}

// ── GET /api/maintenances ─────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { logement_id, statut, priorite } = req.query;

    let query = supabase
      .from('maintenances')
      .select('*, logements(nom)')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (logement_id) query = query.eq('logement_id', logement_id);
    if (statut)      query = query.eq('statut', statut);
    if (priorite)    query = query.eq('priorite', priorite);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/maintenances ────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    // Vérifier que le logement appartient au client
    await assertLogementOwnership(body.logement_id, req.clientId);

    const payload = {
      id:               uuidv4(),
      client_id:        req.clientId,
      logement_id:      body.logement_id,
      titre:            body.titre,
      description:      body.description ?? null,
      priorite:         body.priorite,
      statut:           body.statut,
      prestataire:      body.prestataire ?? null,
      cout_estime:      body.cout_estime ?? null,
      date_signalement: body.date_signalement ?? new Date().toISOString().split('T')[0],
      date_resolution:  body.date_resolution ?? null,
      created_at:       new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('maintenances')
      .insert(payload)
      .select('*, logements(nom)')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── PATCH /api/maintenances/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const body = patchSchema.parse(req.body);

    // Vérifier la propriété
    await assertMaintenanceOwnership(req.params.id, req.clientId);

    const updates = { ...body, updated_at: new Date().toISOString() };

    // Si on passe au statut "termine" et qu'il n'y a pas encore de date de résolution, on la pose automatiquement
    if (body.statut === 'termine' && !body.date_resolution) {
      updates.date_resolution = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('maintenances')
      .update(updates)
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .select('*, logements(nom)')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── DELETE /api/maintenances/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    await assertMaintenanceOwnership(req.params.id, req.clientId);

    const { error } = await supabase
      .from('maintenances')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', req.clientId);

    if (error) throw error;
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
