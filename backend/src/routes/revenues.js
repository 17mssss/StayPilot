/**
 * revenues.js — Routes calcul revenus depuis les réservations
 *
 * GET /api/revenues/monthly?year=X        → revenus bruts/nets par mois
 * GET /api/revenues/by-property?year=X    → revenus par logement
 * GET /api/revenues/summary               → KPIs globaux (tous temps)
 */

const express  = require('express');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Taux de commission par défaut (peut être surchargé par CLIENT_COMMISSION_RATE dans .env)
const getCommissionRate = () => {
  const rate = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20');
  return isNaN(rate) ? 0.20 : rate / 100;
};

/** Récupère les IDs de logements du client courant */
async function getLogementIds(clientId) {
  const { data, error } = await supabase
    .from('logements')
    .select('id')
    .eq('client_id', clientId);

  if (error) throw error;
  return (data ?? []).map((l) => l.id);
}

// ── GET /api/revenues/monthly?year=X ─────────────────────────────────────────
// Retourne les revenus par mois pour l'année demandée.
// Format : [{ month: 'YYYY-MM', gross, net, reservations }]
router.get('/monthly', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10);
    if (isNaN(year)) return res.status(400).json({ success: false, error: 'Paramètre year invalide' });

    const logementIds = await getLogementIds(req.clientId);
    if (logementIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const startDate = `${year}-01-01`;
    const endDate   = `${year}-12-31`;

    const { data, error } = await supabase
      .from('reservations')
      .select('checkin, montant_total, statut')
      .in('logement_id', logementIds)
      .gte('checkin', startDate)
      .lte('checkin', endDate)
      .neq('statut', 'annulee');

    if (error) throw error;

    const commissionRate = getCommissionRate();

    // Agréger par mois
    const monthly = {};
    (data ?? []).forEach((r) => {
      const month = r.checkin?.slice(0, 7); // 'YYYY-MM'
      if (!month) return;
      if (!monthly[month]) monthly[month] = { month, gross: 0, net: 0, reservations: 0 };
      const gross = parseFloat(r.montant_total ?? 0);
      monthly[month].gross        += gross;
      monthly[month].net          += gross * (1 - commissionRate);
      monthly[month].reservations += 1;
    });

    // Arrondir et trier
    const result = Object.values(monthly)
      .map((m) => ({
        ...m,
        gross: Math.round(m.gross * 100) / 100,
        net:   Math.round(m.net   * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/revenues/by-property?year=X ─────────────────────────────────────
// Retourne les revenus agrégés par logement pour l'année demandée.
// Format : [{ id, name, reservations, occupied_nights, total_nights, gross }]
router.get('/by-property', async (req, res, next) => {
  try {
    const year = parseInt(req.query.year ?? new Date().getFullYear(), 10);
    if (isNaN(year)) return res.status(400).json({ success: false, error: 'Paramètre year invalide' });

    const { data: logements, error: logementsErr } = await supabase
      .from('logements')
      .select('id, nom')
      .eq('client_id', req.clientId);

    if (logementsErr) throw logementsErr;
    if (!logements?.length) return res.json({ success: true, data: [] });

    const logementIds = logements.map((l) => l.id);
    const startDate   = `${year}-01-01`;
    const endDate     = `${year}-12-31`;

    const { data, error } = await supabase
      .from('reservations')
      .select('logement_id, checkin, checkout, montant_total, statut')
      .in('logement_id', logementIds)
      .gte('checkin', startDate)
      .lte('checkin', endDate)
      .neq('statut', 'annulee');

    if (error) throw error;

    const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const totalNightsInYear = isLeapYear(year) ? 366 : 365;

    // Agréger par logement
    const byProp = {};
    logements.forEach((l) => {
      byProp[l.id] = {
        id:              l.id,
        name:            l.nom,
        reservations:    0,
        occupied_nights: 0,
        total_nights:    totalNightsInYear,
        gross:           0,
      };
    });

    (data ?? []).forEach((r) => {
      if (!byProp[r.logement_id]) return;
      const gross  = parseFloat(r.montant_total ?? 0);
      const nights = Math.max(
        0,
        Math.round(
          (new Date(r.checkout).getTime() - new Date(r.checkin).getTime()) / 86400000
        )
      );
      byProp[r.logement_id].reservations    += 1;
      byProp[r.logement_id].occupied_nights += nights;
      byProp[r.logement_id].gross           += gross;
    });

    const result = Object.values(byProp).map((p) => ({
      ...p,
      gross: Math.round(p.gross * 100) / 100,
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/revenues/summary ─────────────────────────────────────────────────
// KPIs globaux : total brut, total net, taux d'occupation moyen cette année.
router.get('/summary', async (req, res, next) => {
  try {
    const year = new Date().getFullYear();
    const logementIds = await getLogementIds(req.clientId);
    if (logementIds.length === 0) {
      return res.json({ success: true, data: { gross: 0, net: 0, reservations: 0, occupancy: 0 } });
    }

    const { data, error } = await supabase
      .from('reservations')
      .select('checkin, checkout, montant_total, statut')
      .in('logement_id', logementIds)
      .gte('checkin', `${year}-01-01`)
      .lte('checkin', `${year}-12-31`)
      .neq('statut', 'annulee');

    if (error) throw error;

    const commissionRate = getCommissionRate();
    let gross           = 0;
    let occupiedNights  = 0;

    (data ?? []).forEach((r) => {
      gross += parseFloat(r.montant_total ?? 0);
      const n = Math.max(
        0,
        Math.round((new Date(r.checkout).getTime() - new Date(r.checkin).getTime()) / 86400000)
      );
      occupiedNights += n;
    });

    const isLeapYear   = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const totalNights  = (isLeapYear(year) ? 366 : 365) * logementIds.length;
    const occupancy    = totalNights > 0 ? Math.min(100, Math.round((occupiedNights / totalNights) * 100)) : 0;

    res.json({
      success: true,
      data: {
        gross:        Math.round(gross  * 100) / 100,
        net:          Math.round(gross  * (1 - commissionRate) * 100) / 100,
        commission:   Math.round(gross  * commissionRate * 100) / 100,
        reservations: data?.length ?? 0,
        occupancy,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/revenues/export-csv ─────────────────────────────────────────────
// Génère un CSV comptable de toutes les factures/revenus du client.
// Headers CSV : Date,Logement,Montant HT,TVA,Montant TTC,Statut
router.get('/export-csv', async (req, res, next) => {
  try {
    const logementIds = await getLogementIds(req.clientId);

    // Récupérer les infos des logements pour le label
    const { data: logements } = await supabase
      .from('logements')
      .select('id, nom')
      .eq('client_id', req.clientId);
    const logementMap = {};
    (logements ?? []).forEach((l) => { logementMap[l.id] = l.nom ?? l.id; });

    const commissionRate = getCommissionRate();
    const TVA_RATE       = 0.20;

    let reservations = [];
    if (logementIds.length > 0) {
      const { data, error } = await supabase
        .from('reservations')
        .select('checkin, checkout, montant_total, statut, logement_id')
        .in('logement_id', logementIds)
        .order('checkin', { ascending: false });

      if (error) throw error;
      reservations = data ?? [];
    }

    // Construire les lignes CSV
    const escapeCell = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const fmt2 = (n) => (Math.round((n ?? 0) * 100) / 100).toFixed(2);

    const headers = ['Date', 'Logement', 'Montant HT', 'TVA', 'Montant TTC', 'Statut'];
    const rows = reservations.map((r) => {
      const montantBrut = parseFloat(r.montant_total ?? 0);
      const commissionHT = montantBrut * commissionRate;
      const tvaAmount    = commissionHT * TVA_RATE;
      const totalTTC     = commissionHT + tvaAmount;
      const logementNom  = logementMap[r.logement_id] ?? r.logement_id ?? '—';
      const date         = r.checkin ? r.checkin.slice(0, 10) : '—';
      const statut       = r.statut ?? 'confirmee';

      return [date, logementNom, fmt2(commissionHT), fmt2(tvaAmount), fmt2(totalTTC), statut]
        .map(escapeCell)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\r\n');

    // Nom du fichier avec YYYY-MM du mois courant
    const now      = new Date();
    const yyyyMM   = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const filename = `export-comptable-${yyyyMM}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM UTF-8 pour Excel (Windows)
    res.send('﻿' + csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
