/**
 * sync.js — Routes de synchronisation channel managers
 *
 * POST /api/sync/trigger              → lancer un sync manuel (tous les logements ou un seul)
 * GET  /api/sync/status               → état du dernier sync par logement
 * POST /api/sync/test-connection      → tester les credentials d'un provider
 *
 * Webhooks (sans auth JWT, appelés par les channel managers) :
 * POST /webhook/smoobu                → push réservation Smoobu
 * POST /webhook/hostaway              → push réservation Hostaway
 * POST /webhook/lodgify               → push réservation Lodgify
 */

const express  = require('express');
const { z }    = require('zod');
const supabase  = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { syncLogement, pollAll, upsertReservation } = require('../services/syncManager');
const smoobu   = require('../services/smoobu');
const hostaway = require('../services/hostaway');
const lodgify  = require('../services/lodgify');
const { programmerMessages } = require('../services/scheduler');

const router = express.Router();

// ── POST /api/sync/trigger ─────────────────────────────────────────────────────
router.post('/trigger', authenticate, async (req, res, next) => {
  try {
    const { logement_id } = req.body;

    if (logement_id) {
      // Sync d'un seul logement
      const { data: logement } = await supabase
        .from('logements')
        .select('id, nom, channel_manager, cm_api_key, cm_account_id, client_id')
        .eq('id', logement_id)
        .eq('client_id', req.clientId)
        .single();

      if (!logement) return res.status(404).json({ success: false, error: 'Logement introuvable' });
      const result = await syncLogement(logement);
      return res.json({ success: true, data: result });
    }

    // Sync de tous les logements du client
    const { data: logements } = await supabase
      .from('logements')
      .select('id, nom, channel_manager, cm_api_key, cm_account_id')
      .eq('client_id', req.clientId)
      .not('channel_manager', 'is', null)
      .not('cm_api_key', 'is', null);

    const results = [];
    for (const l of (logements ?? [])) {
      const r = await syncLogement(l);
      results.push({ logement: l.nom, ...r });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/sync/status ───────────────────────────────────────────────────────
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const { data: logements } = await supabase
      .from('logements')
      .select('id, nom, channel_manager')
      .eq('client_id', req.clientId);

    const results = [];
    for (const l of (logements ?? [])) {
      const { data: lastLog } = await supabase
        .from('sync_logs')
        .select('action, statut, details, created_at')
        .eq('logement_id', l.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      results.push({
        logement_id:  l.id,
        nom:          l.nom,
        provider:     l.channel_manager,
        last_sync:    lastLog?.created_at ?? null,
        last_status:  lastLog?.statut ?? null,
        last_details: lastLog?.details ?? null,
      });
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/sync/test-connection ───────────────────────────────────────────
router.post('/test-connection', authenticate, async (req, res, next) => {
  try {
    const { provider, api_key, account_id } = z.object({
      provider:   z.enum(['smoobu', 'hostaway', 'lodgify']),
      api_key:    z.string().min(1),
      account_id: z.string().optional(),
    }).parse(req.body);

    let result;
    switch (provider) {
      case 'smoobu':
        result = await smoobu.testConnection(api_key);
        break;
      case 'hostaway':
        if (!account_id) return res.status(400).json({ success: false, error: 'account_id requis pour Hostaway' });
        result = await hostaway.testConnection(account_id, api_key);
        break;
      case 'lodgify':
        result = await lodgify.testConnection(api_key);
        break;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOKS — pas d'auth JWT, appelés directement par les channel managers
// ═══════════════════════════════════════════════════════════════════════════════

const webhookRouter = express.Router();

// ── Utilitaire : trouver le logement par external_id du channel manager ───────
async function findLogement(clientId, cmPropertyId) {
  if (cmPropertyId) {
    const { data } = await supabase
      .from('logements')
      .select('id, nom, channel_manager, cm_api_key, cm_account_id')
      .eq('cm_account_id', String(cmPropertyId))
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

// ── POST /webhook/smoobu ──────────────────────────────────────────────────────
webhookRouter.post('/smoobu', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WEBHOOK/SMOOBU] Reçu:', JSON.stringify(body).slice(0, 200));

    // Smoobu envoie { type: "booking", data: { booking: {...} } }
    const booking    = body?.data?.booking ?? body?.booking ?? body;
    const propertyId = booking?.apartment?.id ?? booking?.property_id;

    const logement = await findLogement(null, propertyId);
    if (!logement) {
      console.warn('[WEBHOOK/SMOOBU] Logement non trouvé pour property_id:', propertyId);
      return res.json({ received: true, warning: 'logement_not_found' });
    }

    const normalized = smoobu.normalize(booking, logement.id);
    const result     = await upsertReservation(normalized);

    res.json({ received: true, action: result?.action ?? 'ignored' });
  } catch (err) {
    console.error('[WEBHOOK/SMOOBU] Erreur:', err.message);
    res.status(500).json({ received: false, error: err.message });
  }
});

// ── POST /webhook/hostaway ────────────────────────────────────────────────────
webhookRouter.post('/hostaway', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WEBHOOK/HOSTAWAY] Reçu:', JSON.stringify(body).slice(0, 200));

    // Hostaway envoie { event: "reservation.created", data: {...} }
    const booking    = body?.data ?? body;
    const propertyId = booking?.listingId ?? booking?.property_id;

    const logement = await findLogement(null, propertyId);
    if (!logement) {
      console.warn('[WEBHOOK/HOSTAWAY] Logement non trouvé pour listingId:', propertyId);
      return res.json({ received: true, warning: 'logement_not_found' });
    }

    const normalized = hostaway.normalize(booking, logement.id);
    const result     = await upsertReservation(normalized);

    res.json({ received: true, action: result?.action ?? 'ignored' });
  } catch (err) {
    console.error('[WEBHOOK/HOSTAWAY] Erreur:', err.message);
    res.status(500).json({ received: false, error: err.message });
  }
});

// ── POST /webhook/lodgify ─────────────────────────────────────────────────────
webhookRouter.post('/lodgify', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WEBHOOK/LODGIFY] Reçu:', JSON.stringify(body).slice(0, 200));

    const booking    = body?.reservation ?? body?.data ?? body;
    const propertyId = booking?.property_id ?? booking?.propertyId;

    const logement = await findLogement(null, propertyId);
    if (!logement) {
      console.warn('[WEBHOOK/LODGIFY] Logement non trouvé pour property_id:', propertyId);
      return res.json({ received: true, warning: 'logement_not_found' });
    }

    const normalized = lodgify.normalize(booking, logement.id);
    const result     = await upsertReservation(normalized);

    res.json({ received: true, action: result?.action ?? 'ignored' });
  } catch (err) {
    console.error('[WEBHOOK/LODGIFY] Erreur:', err.message);
    res.status(500).json({ received: false, error: err.message });
  }
});

module.exports = { router, webhookRouter };
