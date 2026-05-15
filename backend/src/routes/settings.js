/**
 * settings.js — Paramètres & clés API de la conciergerie
 *
 * GET  /api/settings  → récupérer les paramètres (sans les secrets en clair)
 * POST /api/settings  → sauvegarder les paramètres
 */

const express  = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Champs sensibles : on masque la valeur si elle existe (affiche "••••••••")
const SECRET_FIELDS = ['sendgrid_api_key', 'twilio_auth_token', 'superhote_api_key', 'anthropic_api_key', 'whatsapp_token'];

// ── GET /api/settings ─────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('concierge_settings')
      .select('*')
      .eq('client_id', req.clientId)
      .maybeSingle();

    if (error) throw error;

    if (!data) return res.json({ success: true, data: {} });

    // Masquer les valeurs sensibles
    const safe = { ...data };
    for (const field of SECRET_FIELDS) {
      if (safe[field]) safe[field] = '••••••••';
    }
    delete safe.id;
    delete safe.client_id;
    delete safe.created_at;
    delete safe.updated_at;

    res.json({ success: true, data: safe });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/settings ────────────────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const allowed = [
      'sendgrid_api_key', 'sendgrid_from_email', 'sendgrid_from_name',
      'twilio_account_sid', 'twilio_auth_token', 'twilio_from_number',
      'superhote_api_key',
      'anthropic_api_key',
      'whatsapp_token', 'whatsapp_phone_id',
      'airbnb_client_id', 'airbnb_client_secret',
      'booking_api_key', 'booking_property_id',
      'stripe_link_pro', 'stripe_link_business', 'stripe_link_enterprise',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== '••••••••') {
        // Ne pas écraser avec la valeur masquée
        updates[key] = req.body[key] || null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'Aucune modification' });
    }

    // Upsert
    const { error } = await supabase
      .from('concierge_settings')
      .upsert({ client_id: req.clientId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'client_id' });

    if (error) throw error;

    // Mettre à jour les variables d'environnement runtime si disponibles
    // (utile si le backend tourne en mémoire longue durée)
    if (updates.sendgrid_api_key)   process.env.SENDGRID_API_KEY   = updates.sendgrid_api_key;
    if (updates.sendgrid_from_email) process.env.SENDGRID_FROM_EMAIL = updates.sendgrid_from_email;
    if (updates.sendgrid_from_name) process.env.SENDGRID_FROM_NAME = updates.sendgrid_from_name;
    if (updates.twilio_account_sid) process.env.TWILIO_ACCOUNT_SID = updates.twilio_account_sid;
    if (updates.twilio_auth_token)  process.env.TWILIO_AUTH_TOKEN  = updates.twilio_auth_token;
    if (updates.twilio_from_number) process.env.TWILIO_FROM        = updates.twilio_from_number;
    if (updates.anthropic_api_key)  process.env.ANTHROPIC_API_KEY  = updates.anthropic_api_key;

    res.json({ success: true, message: 'Paramètres sauvegardés' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
