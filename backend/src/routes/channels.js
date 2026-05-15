/**
 * channels.js — Routes Channel Manager (iCal)
 *
 * GET    /api/channels               ?logement_id=  → liste les channels d'un logement
 * POST   /api/channels               body           → créer un channel
 * POST   /api/channels/sync/:id                     → déclencher une sync manuelle (AVANT /:id)
 * PUT    /api/channels/:id           body           → modifier un channel
 * DELETE /api/channels/:id                          → supprimer un channel
 */

const express = require('express');
const { z }   = require('zod');
const supabase  = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { syncLogementChannels } = require('../services/icalSync');

const router = express.Router();
router.use(authenticate);

// ── Helpers ────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (s) => UUID_RE.test(s);

function toDto(ch) {
  return {
    id:             ch.id,
    logement_id:    ch.logement_id,
    name:           ch.name,
    type:           ch.type,
    ical_url:       ch.ical_url,
    is_active:      ch.is_active,
    last_synced_at: ch.last_synced_at,
    created_at:     ch.created_at,
    logement_nom:   ch.logements?.nom ?? null,
  };
}

/** Vérifie que le logement appartient au client authentifié */
async function getLogementForClient(logementId, clientId) {
  if (!isUUID(logementId)) return null;
  const { data } = await supabase
    .from('logements')
    .select('id, nom')
    .eq('id', logementId)
    .eq('client_id', clientId)
    .single();
  return data;
}

// ── GET /api/channels?logement_id=xxx ─────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const { logement_id } = req.query;
    if (!logement_id) {
      return res.status(400).json({ success: false, error: 'logement_id requis' });
    }

    const logement = await getLogementForClient(logement_id, req.clientId);
    if (!logement) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { data: channels, error } = await supabase
      .from('channels')
      .select('*, logements(nom)')
      .eq('logement_id', logement_id)
      .order('created_at');

    if (error) throw error;
    res.json({ success: true, data: (channels ?? []).map(toDto) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/channels/sync/:logementId ───────────────────────────────────────
// Déclaré AVANT /:id pour éviter que 'sync' soit interprété comme un UUID

router.post('/sync/:logementId', async (req, res, next) => {
  try {
    const { logementId } = req.params;

    const logement = await getLogementForClient(logementId, req.clientId);
    if (!logement) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const result = await syncLogementChannels(logementId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/channels ─────────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      logement_id: z.string().uuid(),
      name:        z.string().min(1).max(100),
      type:        z.enum(['airbnb', 'booking', 'vrbo', 'autre']),
      ical_url:    z.string().url().max(2000),
      is_active:   z.boolean().optional().default(true),
    });

    const body = schema.parse(req.body);

    const logement = await getLogementForClient(body.logement_id, req.clientId);
    if (!logement) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { data: channel, error } = await supabase
      .from('channels')
      .insert({
        logement_id: body.logement_id,
        client_id:   req.clientId,
        name:        body.name,
        type:        body.type,
        ical_url:    body.ical_url,
        is_active:   body.is_active,
      })
      .select('*, logements(nom)')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: toDto(channel) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── PUT /api/channels/:id ──────────────────────────────────────────────────────

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'ID invalide' });

    const schema = z.object({
      name:      z.string().min(1).max(100).optional(),
      type:      z.enum(['airbnb', 'booking', 'vrbo', 'autre']).optional(),
      ical_url:  z.string().url().max(2000).optional(),
      is_active: z.boolean().optional(),
    });

    const body = schema.parse(req.body);

    // Vérifier la propriété du channel via client_id (évite de faire une jointure)
    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Channel introuvable' });

    const { data: updated, error } = await supabase
      .from('channels')
      .update(body)
      .eq('id', id)
      .select('*, logements(nom)')
      .single();

    if (error) throw error;
    res.json({ success: true, data: toDto(updated) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── DELETE /api/channels/:id ──────────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'ID invalide' });

    const { data: existing } = await supabase
      .from('channels')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Channel introuvable' });

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, data: { deleted: id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
