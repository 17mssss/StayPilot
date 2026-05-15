/**
 * investisseurs.js — Portail Investisseur Enterprise
 *
 * Routes authentifiées (JWT) :
 *   POST   /api/investisseurs           → créer un portail investisseur
 *   GET    /api/investisseurs           → liste des portails du client
 *   GET    /api/investisseurs/:id       → détails d'un portail
 *   DELETE /api/investisseurs/:id       → supprimer un portail
 *   POST   /api/investisseurs/:id/token → générer/renouveler le token d'accès
 *
 * Routes publiques (pas de JWT) — exportées via portailRouter :
 *   GET    /api/portail/:token          → données du portail via token
 */

const express  = require('express');
const crypto   = require('crypto');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');
const { sendEmail } = require('../services/sendgrid');

// ── Helpers ───────────────────────────────────────────────────────────────────

const getCommissionRate = () => {
  const rate = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20');
  return isNaN(rate) ? 0.20 : rate / 100;
};

/** Calcule les nuits entre checkin et checkout */
function nightsBetween(checkin, checkout) {
  return Math.max(
    0,
    Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000)
  );
}

// ── Router authentifié ────────────────────────────────────────────────────────
const router = express.Router();
router.use(authenticate);

// POST /api/investisseurs — créer un portail investisseur
router.post('/', async (req, res, next) => {
  try {
    const { nom, email, logement_ids } = req.body;

    if (!nom || !Array.isArray(logement_ids) || logement_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'nom et logement_ids (non vide) sont requis' });
    }

    // Vérifier que les logements appartiennent bien au client courant
    const { data: logements, error: logementsErr } = await supabase
      .from('logements')
      .select('id')
      .eq('client_id', req.clientId)
      .in('id', logement_ids);

    if (logementsErr) throw logementsErr;
    if (!logements?.length) {
      return res.status(400).json({ success: false, error: 'Aucun logement valide trouvé pour ce client' });
    }

    const validIds = logements.map((l) => l.id);

    const { data, error } = await supabase
      .from('investisseurs')
      .insert({
        client_id:    req.clientId,
        nom,
        email:        email || null,
        logement_ids: validIds,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET /api/investisseurs — liste des portails du client
router.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('investisseurs')
      .select('*')
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/investisseurs/:id — détails d'un portail
router.get('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    const { data, error } = await supabase
      .from('investisseurs')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Portail introuvable' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/investisseurs/:id — supprimer un portail
router.delete('/:id', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    const { error } = await supabase
      .from('investisseurs')
      .delete()
      .eq('id', req.params.id)
      .eq('client_id', req.clientId);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/investisseurs/:id/token — générer/renouveler le token d'accès
router.post('/:id/token', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    const newToken   = crypto.randomUUID();
    const expiresAt  = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('investisseurs')
      .update({
        access_token:     newToken,
        token_expires_at: expiresAt,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .select('access_token, token_expires_at')
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Portail introuvable' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── Router public (portail) ───────────────────────────────────────────────────
const portailRouter = express.Router();

async function buildPortailData(token) {
  // 1. Trouver l'investisseur par token (actif + non expiré)
  const { data: inv, error: invErr } = await supabase
    .from('investisseurs')
    .select('*')
    .eq('access_token', token)
    .eq('is_active', true)
    .single();

  if (invErr || !inv) return null;
  if (new Date(inv.token_expires_at) < new Date()) return null;

  const logementIds = inv.logement_ids ?? [];

  // 2. Infos de la conciergerie (pour le branding) — optionnel
  let clientInfo = null;
  try {
    const { data } = await supabase
      .from('parametres')
      .select('company_name, logo_url')
      .eq('client_id', inv.client_id)
      .single();
    clientInfo = data;
  } catch (_) { /* table absente ou aucune donnée — branding générique */ }

  if (!logementIds.length) {
    return {
      investisseur: { id: inv.id, nom: inv.nom, email: inv.email },
      client:       clientInfo,
      logements:    [],
      monthly:      [],
      summary:      { net_month: 0, gross_month: 0, reservations_month: 0, occupancy_month: 0, ytd_gross: 0, ytd_net: 0, occupancy_ytd: 0 },
    };
  }

  // 3. Logements
  const { data: logements } = await supabase
    .from('logements')
    .select('id, nom, adresse, type')
    .in('id', logementIds);

  // 4. Réservations des 6 derniers mois
  const now          = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const startDate6m = sixMonthsAgo.toISOString().slice(0, 10);
  const todayStr    = now.toISOString().slice(0, 10);

  const { data: reservations } = await supabase
    .from('reservations')
    .select('logement_id, checkin, checkout, montant_total, statut')
    .in('logement_id', logementIds)
    .gte('checkin', startDate6m)
    .lte('checkin', todayStr)
    .neq('statut', 'annulee');

  const commissionRate = getCommissionRate();
  const currentMonth   = now.toISOString().slice(0, 7); // 'YYYY-MM'
  const daysInMonth    = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // 5. KPI par logement (mois courant)
  const byLogement = {};
  (logements ?? []).forEach((l) => {
    byLogement[l.id] = {
      id:                 l.id,
      nom:                l.nom,
      adresse:            l.adresse ?? null,
      type:               l.type ?? null,
      reservations_count: 0,
      gross:              0,
      net:                0,
      occupied_nights:    0,
      commission_pct:     Math.round(commissionRate * 100),
    };
  });

  (reservations ?? [])
    .filter((r) => r.checkin?.startsWith(currentMonth))
    .forEach((r) => {
      if (!byLogement[r.logement_id]) return;
      const gross  = parseFloat(r.montant_total ?? 0);
      const nights = nightsBetween(r.checkin, r.checkout);
      byLogement[r.logement_id].reservations_count += 1;
      byLogement[r.logement_id].gross              += gross;
      byLogement[r.logement_id].net                += gross * (1 - commissionRate);
      byLogement[r.logement_id].occupied_nights    += nights;
    });

  const logementsData = Object.values(byLogement).map((l) => ({
    ...l,
    gross:           Math.round(l.gross * 100) / 100,
    net:             Math.round(l.net   * 100) / 100,
    taux_occupation: daysInMonth > 0
      ? Math.min(100, Math.round((l.occupied_nights / daysInMonth) * 100))
      : 0,
  }));

  // 6. Évolution mensuelle sur 6 mois
  const monthly = {};
  (reservations ?? []).forEach((r) => {
    const month = r.checkin?.slice(0, 7);
    if (!month) return;
    if (!monthly[month]) monthly[month] = { month, gross: 0, net: 0, reservations: 0 };
    const gross = parseFloat(r.montant_total ?? 0);
    monthly[month].gross        += gross;
    monthly[month].net          += gross * (1 - commissionRate);
    monthly[month].reservations += 1;
  });

  const monthlyData = Object.values(monthly)
    .map((m) => ({
      ...m,
      gross: Math.round(m.gross * 100) / 100,
      net:   Math.round(m.net   * 100) / 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 7. YTD (depuis 1er janvier de l'année courante)
  const yearStart = `${now.getFullYear()}-01-01`;
  const { data: ytdRes } = await supabase
    .from('reservations')
    .select('montant_total, checkin, checkout')
    .in('logement_id', logementIds)
    .gte('checkin', yearStart)
    .lte('checkin', todayStr)
    .neq('statut', 'annulee');

  let ytdGross          = 0;
  let ytdOccupiedNights = 0;
  (ytdRes ?? []).forEach((r) => {
    ytdGross          += parseFloat(r.montant_total ?? 0);
    ytdOccupiedNights += nightsBetween(r.checkin, r.checkout);
  });

  const totalOccupiedNightsMonth  = logementsData.reduce((s, l) => s + l.occupied_nights, 0);
  const totalPossibleNightsMonth  = daysInMonth * logementIds.length;
  const occupancyMonth = totalPossibleNightsMonth > 0
    ? Math.min(100, Math.round((totalOccupiedNightsMonth / totalPossibleNightsMonth) * 100))
    : 0;

  const ytdDays               = Math.ceil((now.getTime() - new Date(yearStart).getTime()) / 86400000);
  const totalPossibleNightsYTD = ytdDays * logementIds.length;
  const occupancyYTD = totalPossibleNightsYTD > 0
    ? Math.min(100, Math.round((ytdOccupiedNights / totalPossibleNightsYTD) * 100))
    : 0;

  return {
    investisseur: { id: inv.id, nom: inv.nom, email: inv.email },
    client:       clientInfo,
    logements:    logementsData,
    monthly:      monthlyData,
    summary: {
      net_month:          Math.round(logementsData.reduce((s, l) => s + l.net,   0) * 100) / 100,
      gross_month:        Math.round(logementsData.reduce((s, l) => s + l.gross, 0) * 100) / 100,
      reservations_month: logementsData.reduce((s, l) => s + l.reservations_count, 0),
      occupancy_month:    occupancyMonth,
      ytd_gross:          Math.round(ytdGross * 100) / 100,
      ytd_net:            Math.round(ytdGross * (1 - commissionRate) * 100) / 100,
      occupancy_ytd:      occupancyYTD,
    },
  };
}

// GET /api/portail/:token — données publiques du portail via token
portailRouter.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token manquant' });
    }

    const data = await buildPortailData(token);
    if (!data) {
      return res.status(404).json({ success: false, error: 'Portail introuvable ou lien expiré' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/investisseurs/:id/send-report ───────────────────────────────────
router.post('/:id/send-report', async (req, res, next) => {
  try {
    if (!validateUUID(req.params.id)) {
      return res.status(400).json({ success: false, error: 'ID invalide' });
    }

    const { data: inv } = await supabase
      .from('investisseurs')
      .select('name, email, access_token')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!inv) return res.status(404).json({ success: false, error: 'Investisseur introuvable' });
    if (!inv.email) return res.status(400).json({ success: false, error: 'Email de l\'investisseur non renseigné' });

    const portalUrl = inv.access_token
      ? `${process.env.FRONTEND_ADMIN_URL ?? 'https://frontend-admin-neon-nine-six.vercel.app'}/portail/${inv.access_token}`
      : null;

    const subject = `Votre rapport investisseur — ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    const text = `Bonjour ${inv.name},\n\nVotre rapport mensuel est disponible.\n${portalUrl ? `\nAccéder à votre espace : ${portalUrl}` : ''}\n\nCordialement,\nVotre conciergerie`;
    const html = `<p>Bonjour <strong>${inv.name}</strong>,</p>
      <p>Votre rapport mensuel est disponible.</p>
      ${portalUrl ? `<p><a href="${portalUrl}" style="background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Accéder à mon espace investisseur</a></p>` : ''}
      <p>Cordialement,<br>Votre conciergerie</p>`;

    await sendEmail(inv.email, subject, text, html);
    res.json({ success: true, message: `Rapport envoyé à ${inv.email}` });
  } catch (err) {
    if (err.message?.includes('SENDGRID')) {
      return res.status(503).json({ success: false, error: 'SendGrid non configuré. Ajoutez SENDGRID_API_KEY dans vos paramètres.' });
    }
    next(err);
  }
});

module.exports = { investisseursRouter: router, portailRouter };
