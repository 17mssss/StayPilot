const express = require('express');
const { z } = require('zod');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── DTO helpers ───────────────────────────────────────────────────────────────
/** DB (FR) → API (EN) */
function toDto(t) {
  if (!t) return null;
  return {
    id: t.id,
    client_id: t.client_id,
    name: t.nom,
    trigger: t.declencheur,
    channel: t.canal,
    subject: t.sujet,
    body: t.contenu,
    delay_hours: t.delai_heures ?? 0,
    is_active: t.actif !== false,
    created_at: t.created_at,
  };
}

/** API (EN) → DB (FR) */
function fromDto(body) {
  const result = {};
  if (body.name !== undefined)        result.nom = body.name;
  if (body.trigger !== undefined)     result.declencheur = body.trigger;
  if (body.channel !== undefined)     result.canal = body.channel;
  if (body.subject !== undefined)     result.sujet = body.subject;
  if (body.body !== undefined)        result.contenu = body.body;
  if (body.delay_hours !== undefined) result.delai_heures = body.delay_hours;
  if (body.is_active !== undefined)   result.actif = body.is_active;
  return result;
}

// ── Schéma Zod ────────────────────────────────────────────────────────────────
const TemplateSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.string().min(1).max(100),
  channel: z.enum(['sms', 'email', 'whatsapp', 'platform']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(5000),
  delay_hours: z.number().int().min(0).max(8760).default(0), // max 1 an
  is_active: z.boolean().default(true),
});

// GET /api/templates
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('client_id', req.clientId)
      .order('declencheur');

    if (error) throw error;
    res.json({ success: true, data: data.map(toDto) });
  } catch (err) {
    next(err);
  }
});

// GET /api/templates/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: 'Template introuvable' });
    res.json({ success: true, data: toDto(data) });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates
router.post('/', async (req, res, next) => {
  try {
    const body = TemplateSchema.parse(req.body);
    const dbFields = fromDto(body);

    const { data, error } = await supabase
      .from('templates')
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

// PATCH /api/templates/:id
router.patch('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const body = TemplateSchema.partial().parse(req.body);
    const dbFields = fromDto(body);

    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Template introuvable' });

    const { data, error } = await supabase
      .from('templates')
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

// DELETE /api/templates/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) return res.status(404).json({ success: false, error: 'Template introuvable' });

    const { error } = await supabase.from('templates').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates/:id/preview — Prévisualisation avec variables fictives
router.post('/:id/preview', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!template) return res.status(404).json({ success: false, error: 'Template introuvable' });

    const variables = {
      prenom_voyageur: 'Jean',
      nom_logement: 'Appartement Montmartre',
      date_checkin: '15 avril 2026',
      date_checkout: '18 avril 2026',
      adresse_logement: '12 rue de la Paix, Paris',
      code_acces: '1234#',
      wifi_nom: 'StayPilot_Guest',
      wifi_mdp: 'welcome2026',
    };

    let preview = template.contenu || '';
    for (const [key, val] of Object.entries(variables)) {
      preview = preview.replaceAll(`{{${key}}}`, val);
    }

    res.json({ success: true, data: { preview } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
