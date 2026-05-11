/**
 * menage.js — Gestion des tâches de ménage
 *
 * GET   /api/menage                        → liste des tâches (checkout à venir + statuts persistés)
 * PATCH /api/menage/:reservationId/status  → mettre à jour le statut d'une tâche
 * GET   /api/menage/stats                  → stats du jour (total, pending, in_progress, done)
 */

const express = require('express');
const { z }   = require('zod');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/menage/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Logements du client
    const { data: logements } = await supabase
      .from('logements').select('id').eq('client_id', req.clientId);
    const ids = (logements ?? []).map((l) => l.id);
    if (!ids.length) return res.json({ success: true, data: { total: 0, pending: 0, in_progress: 0, done: 0 } });

    // Réservations avec checkout aujourd'hui ou dans les 7 prochains jours
    const endOfWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const { data: resas } = await supabase
      .from('reservations')
      .select('id')
      .in('logement_id', ids)
      .neq('statut', 'annulee')
      .gte('checkout', today)
      .lte('checkout', endOfWeek);

    const resaIds = (resas ?? []).map((r) => r.id);

    const { data: tasks } = await supabase
      .from('menage_tasks')
      .select('status')
      .eq('client_id', req.clientId)
      .in('reservation_id', resaIds);

    const counts = { total: resaIds.length, pending: 0, in_progress: 0, done: 0 };
    const taskMap = Object.fromEntries((tasks ?? []).map((t) => [t.reservation_id, t.status]));
    resaIds.forEach((id) => {
      const s = taskMap[id] ?? 'pending';
      counts[s] = (counts[s] ?? 0) + 1;
    });

    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/menage ───────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { filter = 'week' } = req.query; // today | week | all
    const today = new Date().toISOString().split('T')[0];
    const endOfWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // Logements du client
    const { data: logements } = await supabase
      .from('logements').select('id').eq('client_id', req.clientId);
    const ids = (logements ?? []).map((l) => l.id);
    if (!ids.length) return res.json({ success: true, data: [] });

    // Réservations avec checkout >= today
    let query = supabase
      .from('reservations')
      .select('id, logement_id, voyageur_nom, checkout, checkin, logements(nom)')
      .in('logement_id', ids)
      .neq('statut', 'annulee')
      .gte('checkout', today)
      .order('checkout', { ascending: true });

    if (filter === 'today') query = query.eq('checkout', today);
    else if (filter === 'week') query = query.lte('checkout', endOfWeek);

    const { data: resas, error: resaErr } = await query;
    if (resaErr) throw resaErr;

    if (!resas?.length) return res.json({ success: true, data: [] });

    // Statuts persistés
    const resaIds = resas.map((r) => r.id);
    const { data: tasks } = await supabase
      .from('menage_tasks')
      .select('reservation_id, status, notes')
      .eq('client_id', req.clientId)
      .in('reservation_id', resaIds);

    const taskMap = Object.fromEntries((tasks ?? []).map((t) => [t.reservation_id, t]));

    // Prochain check-in par logement (pour afficher l'urgence)
    const logementIds = [...new Set(resas.map((r) => r.logement_id))];
    const { data: nextCheckins } = await supabase
      .from('reservations')
      .select('logement_id, checkin')
      .in('logement_id', logementIds)
      .neq('statut', 'annulee')
      .gt('checkin', today)
      .order('checkin', { ascending: true });

    // Map logement → prochain checkin
    const nextCheckinMap = {};
    (nextCheckins ?? []).forEach((r) => {
      if (!nextCheckinMap[r.logement_id]) nextCheckinMap[r.logement_id] = r.checkin;
    });

    const data = resas.map((r) => ({
      reservation_id: r.id,
      guest_name:     r.voyageur_nom,
      property:       r.logements?.nom ?? 'Logement',
      checkout:       r.checkout,
      checkin_next:   nextCheckinMap[r.logement_id] ?? null,
      status:         taskMap[r.id]?.status ?? 'pending',
      notes:          taskMap[r.id]?.notes ?? null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/menage/:reservationId/status ───────────────────────────────────
router.patch('/:reservationId/status', async (req, res, next) => {
  try {
    const { status, notes } = z.object({
      status: z.enum(['pending', 'in_progress', 'done']),
      notes:  z.string().optional().nullable(),
    }).parse(req.body);

    const reservationId = req.params.reservationId;

    // Vérifier que la réservation appartient au client
    const { data: resa } = await supabase
      .from('reservations')
      .select('id, logement_id, logements(client_id)')
      .eq('id', reservationId)
      .single();

    if (!resa || resa.logements?.client_id !== req.clientId) {
      return res.status(403).json({ success: false, error: 'Réservation introuvable' });
    }

    const updates = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) updates.notes = notes;

    // Upsert (crée ou met à jour)
    const { data, error } = await supabase
      .from('menage_tasks')
      .upsert({
        client_id:      req.clientId,
        reservation_id: reservationId,
        logement_id:    resa.logement_id,
        ...updates,
      }, { onConflict: 'reservation_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

module.exports = router;
