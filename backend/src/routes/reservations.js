const express = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── DTO helpers ───────────────────────────────────────────────────────────────
/** Traduit le statut FR → EN */
function mapStatutEN(statut) {
  switch (statut) {
    case 'confirmee':  return 'confirmed';
    case 'annulee':    return 'cancelled';
    case 'en_attente': return 'pending';
    case 'en_cours':   return 'checked_in';
    default:           return statut ?? 'confirmed';
  }
}

/** DB (FR) → API (EN) */
function toDto(r) {
  if (!r) return null;
  return {
    id: r.id,
    logement_id: r.logement_id,
    property_name: r.logements?.nom ?? null,
    superhote_id: r.superhote_id,
    platform: r.plateforme || 'airbnb',
    guest_name: r.voyageur_nom,
    guest_email: r.voyageur_email,
    guest_phone: r.voyageur_telephone,
    check_in: r.checkin,
    check_out: r.checkout,
    status: mapStatutEN(r.statut),
    guests_count: r.nb_voyageurs,
    total_price: r.montant_total,
    created_at: r.created_at,
  };
}

// GET /api/reservations
router.get('/', async (req, res, next) => {
  try {
    const { logement_id, status, limit = 50, page = 1 } = req.query;

    const { data: logements } = await supabase
      .from('logements')
      .select('id')
      .eq('client_id', req.clientId);

    const logementIds = logements?.map((l) => l.id) ?? [];
    if (logementIds.length === 0) return res.json({ success: true, data: [], total: 0 });

    let query = supabase
      .from('reservations')
      .select('*, logements(nom)', { count: 'exact' })
      .in('logement_id', logementIds)
      .order('checkin', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (logement_id) query = query.eq('logement_id', logement_id);
    if (status) query = query.eq('statut', status);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data.map(toDto), total: count, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, logements(nom, client_id)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: 'Réservation introuvable' });
    if (data.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }

    res.json({ success: true, data: toDto(data) });
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id/messages
router.get('/:id/messages', async (req, res, next) => {
  try {
    const { data: resa } = await supabase
      .from('reservations')
      .select('id, logements(client_id)')
      .eq('id', req.params.id)
      .single();

    if (!resa || resa.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Accès interdit' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('reservation_id', req.params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Map to English fields
    const mapped = (data || []).map((m) => ({
      id: m.id,
      reservation_id: m.reservation_id,
      direction: m.direction === 'entrant' ? 'inbound' : 'outbound',
      channel: m.canal,
      content: m.contenu,
      sent_at: m.created_at,
      status: m.statut,
      genere_par_ia: m.genere_par_ia,
      valide: m.valide,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
