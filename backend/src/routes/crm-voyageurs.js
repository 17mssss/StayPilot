/**
 * crm-voyageurs.js — Routes CRM Voyageurs
 *
 * GET    /api/crm-voyageurs            → liste des voyageurs (search par nom/email)
 * GET    /api/crm-voyageurs/:id        → détail + historique réservations
 * POST   /api/crm-voyageurs            → créer/mettre à jour un voyageur
 * PATCH  /api/crm-voyageurs/:id        → modifier notes/tags
 */

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── GET /api/crm-voyageurs ────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;

    let query = supabase
      .from('crm_voyageurs')
      .select('*')
      .eq('client_id', req.clientId)
      .order('derniere_reservation', { ascending: false, nullsFirst: false });

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`nom.ilike.%${q}%,email.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/crm-voyageurs/:id ────────────────────────────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: voyageur, error: vErr } = await supabase
      .from('crm_voyageurs')
      .select('*')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (vErr || !voyageur) {
      return res.status(404).json({ success: false, error: 'Voyageur introuvable' });
    }

    // Récupérer l'historique des réservations liées à l'email du voyageur
    const { data: reservations, error: rErr } = await supabase
      .from('reservations')
      .select('id, checkin, checkout, montant_total, statut, logement_id')
      .eq('email_voyageur', voyageur.email)
      .order('checkin', { ascending: false })
      .limit(50);

    if (rErr) {
      // Pas bloquant — on retourne le voyageur sans historique
      console.error('[CRM] Erreur récupération réservations:', rErr.message);
    }

    res.json({
      success: true,
      data: {
        ...voyageur,
        historique: reservations ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/crm-voyageurs ───────────────────────────────────────────────────
// Upsert par email : met à jour si existe, crée sinon
router.post('/', async (req, res, next) => {
  try {
    const {
      nom,
      email,
      telephone,
      nationalite,
      nb_sejours,
      montant_total,
      tags,
      notes,
      premiere_reservation,
      derniere_reservation,
    } = req.body;

    if (!nom) {
      return res.status(400).json({ success: false, error: 'Le champ nom est requis' });
    }

    // Vérifier si un voyageur avec cet email existe déjà
    let existing = null;
    if (email) {
      const { data } = await supabase
        .from('crm_voyageurs')
        .select('id')
        .eq('client_id', req.clientId)
        .eq('email', email)
        .maybeSingle();
      existing = data;
    }

    const voyageurData = {
      client_id:            req.clientId,
      nom,
      email:                email ?? null,
      telephone:            telephone ?? null,
      nationalite:          nationalite ?? null,
      nb_sejours:           nb_sejours != null ? parseInt(nb_sejours, 10) : 0,
      montant_total:        montant_total != null ? parseFloat(montant_total) : 0,
      tags:                 Array.isArray(tags) ? tags : [],
      notes:                notes ?? null,
      premiere_reservation: premiere_reservation ?? null,
      derniere_reservation: derniere_reservation ?? null,
    };

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('crm_voyageurs')
        .update(voyageurData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('crm_voyageurs')
        .insert({ id: uuidv4(), ...voyageurData, created_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.status(existing ? 200 : 201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/crm-voyageurs/:id ──────────────────────────────────────────────
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabase
      .from('crm_voyageurs')
      .select('id')
      .eq('id', id)
      .eq('client_id', req.clientId)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ success: false, error: 'Voyageur introuvable' });
    }

    const allowed = ['nom', 'email', 'telephone', 'nationalite', 'notes', 'tags',
                     'nb_sejours', 'montant_total', 'premiere_reservation', 'derniere_reservation'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à modifier' });
    }

    const { data, error } = await supabase
      .from('crm_voyageurs')
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

module.exports = router;
