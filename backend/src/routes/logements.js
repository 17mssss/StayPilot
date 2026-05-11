const express = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── DTO helpers ───────────────────────────────────────────────────────────────
/** DB (FR) → API (EN) */
function toDto(l) {
  if (!l) return null;
  const canaux = l.canaux || {};
  const canauxArray = [
    canaux.sms && 'SMS',
    canaux.email && 'Email',
    canaux.whatsapp && 'WhatsApp',
  ].filter(Boolean);

  return {
    id:              l.id,
    client_id:       l.client_id,
    name:            l.nom,
    autopilot:       l.autopilote ?? false,
    canaux:          canauxArray,
    api_key:         l.superhote_api_key,
    property_key:    l.superhote_property_key,
    // Channel manager multi-provider
    channel_manager: l.channel_manager ?? null,
    cm_api_key:      l.cm_api_key ?? null,
    cm_account_id:   l.cm_account_id ?? null,
    created_at:      l.created_at,
  };
}

/** API (EN) → DB (FR) */
function fromDto(body) {
  const result = {};
  if (body.name !== undefined)          result.nom = body.name;
  if (body.autopilot !== undefined)     result.autopilote = body.autopilot;
  if (body.api_key !== undefined)       result.superhote_api_key = body.api_key;
  if (body.property_key !== undefined)  result.superhote_property_key = body.property_key;
  // Channel manager fields
  if (body.channel_manager !== undefined) result.channel_manager = body.channel_manager || null;
  if (body.cm_api_key !== undefined)      result.cm_api_key = body.cm_api_key || null;
  if (body.cm_account_id !== undefined)   result.cm_account_id = body.cm_account_id || null;
  if (body.canaux !== undefined) {
    const arr = Array.isArray(body.canaux) ? body.canaux.map((c) => c.toLowerCase()) : [];
    result.canaux = {
      sms:      arr.includes('sms'),
      email:    arr.includes('email'),
      whatsapp: arr.includes('whatsapp'),
    };
  }
  return result;
}

// ── Schémas Zod ───────────────────────────────────────────────────────────────
const LogementSchema = z.object({
  name:            z.string().min(1),
  api_key:         z.string().optional(),
  property_key:    z.string().optional(),
  canaux:          z.array(z.string()).optional(),
  autopilot:       z.boolean().optional(),
  channel_manager: z.enum(['smoobu', 'hostaway', 'lodgify', 'superhote', '']).optional(),
  cm_api_key:      z.string().optional(),
  cm_account_id:   z.string().optional(),
});

// GET /api/logements/owners — Liste des propriétaires (clients Supabase Auth)
// DOIT être défini avant /:id pour ne pas être capturé comme paramètre.
router.get('/owners', async (req, res, next) => {
  try {
    // Retourne les utilisateurs de la table clients.
    // En production, les propriétaires sont des users Supabase Auth distincts.
    const { data, error } = await supabase
      .from('clients')
      .select('id, email, nom, plan, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = (data ?? []).map((c) => ({
      id:               c.id,
      email:            c.email,
      nom:              c.nom,
      name:             c.nom,
      plan:             c.plan,
      created_at:       c.created_at,
      properties_count: null,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/logements
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('logements')
      .select('*')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data.map(toDto) });
  } catch (err) {
    next(err);
  }
});

// GET /api/logements/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data, error } = await supabase
      .from('logements')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: 'Logement introuvable' });
    res.json({ success: true, data: toDto(data) });
  } catch (err) {
    next(err);
  }
});

// POST /api/logements
router.post('/', async (req, res, next) => {
  try {
    const body = LogementSchema.parse(req.body);
    const dbFields = fromDto(body);

    const { data, error } = await supabase
      .from('logements')
      .insert({ ...dbFields, client_id: req.clientId })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: toDto(data) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// PUT /api/logements/:id (alias PATCH — compatibilité frontend)
router.put('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const body = LogementSchema.partial().parse(req.body);
    const dbFields = fromDto(body);

    const { data: existing } = await supabase
      .from('logements').select('id')
      .eq('id', req.params.id).eq('client_id', req.clientId).single();
    if (!existing) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { data, error } = await supabase
      .from('logements').update(dbFields).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, data: toDto(data) });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// PATCH /api/logements/:id
router.patch('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const body = LogementSchema.partial().parse(req.body);
    const dbFields = fromDto(body);

    const { data: existing } = await supabase
      .from('logements')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { data, error } = await supabase
      .from('logements')
      .update(dbFields)
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

// DELETE /api/logements/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: existing } = await supabase
      .from('logements')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { error } = await supabase.from('logements').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/logements/:id/autopilote
router.patch('/:id/autopilote', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { actif } = z.object({ actif: z.boolean() }).parse(req.body);

    const { data: existing } = await supabase
      .from('logements')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Logement introuvable' });

    const { data, error } = await supabase
      .from('logements')
      .update({ autopilote: actif })
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

module.exports = router;
