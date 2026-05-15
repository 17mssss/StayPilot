/**
 * reports.js — Relevés mensuels propriétaires
 *
 * GET  /api/reports/list/:proprietaireId             → liste des 12 derniers mois avec statut
 * GET  /api/reports/pdf/:proprietaireId/:month       → télécharger (ou générer) le PDF
 * POST /api/reports/generate/:proprietaireId/:month  → générer à la demande (+ email optionnel)
 */

const express  = require('express');
const supabase = require('../config/supabase');
const { authenticate, validateUUID } = require('../middleware/auth');
const { getOrGenerateReport, generateAndStoreReport, sendReportByEmail } = require('../services/pdfReports');

const router = express.Router();
router.use(authenticate);

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

function monthLabel(month) {
  const [year, m] = month.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${year}`;
}

function last12Months() {
  const months = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return months;
}

// ── GET /api/reports/list/:proprietaireId ─────────────────────────────────────
// Retourne les 12 derniers mois avec leur statut (généré ou non).
router.get('/list/:proprietaireId', async (req, res, next) => {
  try {
    const { proprietaireId } = req.params;
    if (!validateUUID(proprietaireId)) {
      return res.status(400).json({ success: false, error: 'ID propriétaire invalide' });
    }

    const { data: prop } = await supabase
      .from('proprietaires')
      .select('id, nom')
      .eq('id', proprietaireId)
      .eq('client_id', req.clientId)
      .maybeSingle();

    if (!prop) {
      return res.status(404).json({ success: false, error: 'Propriétaire introuvable' });
    }

    const months = last12Months();

    const { data: existing } = await supabase
      .from('reports')
      .select('id, month, sent_at, created_at')
      .eq('client_id', req.clientId)
      .eq('proprietaire_id', proprietaireId)
      .in('month', months);

    const existingMap = {};
    (existing ?? []).forEach(r => { existingMap[r.month] = r; });

    const list = months.map(month => ({
      month,
      label:     monthLabel(month),
      generated: !!existingMap[month],
      sent_at:   existingMap[month]?.sent_at   ?? null,
      id:        existingMap[month]?.id         ?? null,
    }));

    res.json({ success: true, data: list });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/reports/pdf/:proprietaireId/:month ────────────────────────────────
// Retourne le PDF (depuis le cache ou généré à la volée).
router.get('/pdf/:proprietaireId/:month', async (req, res, next) => {
  try {
    const { proprietaireId, month } = req.params;

    if (!validateUUID(proprietaireId)) {
      return res.status(400).json({ success: false, error: 'ID propriétaire invalide' });
    }
    if (!MONTH_RE.test(month)) {
      return res.status(400).json({ success: false, error: 'Format du mois invalide (attendu : YYYY-MM)' });
    }

    const { buffer, proprietaire } = await getOrGenerateReport(req.clientId, proprietaireId, month);

    const safeName = (proprietaire?.nom ?? 'proprietaire')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    const filename = `releve-${month}-${safeName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/reports/generate/:proprietaireId/:month ─────────────────────────
// Génère (ou régénère) le relevé. Envoie par email si send_email=true dans le body.
router.post('/generate/:proprietaireId/:month', async (req, res, next) => {
  try {
    const { proprietaireId, month } = req.params;
    const { send_email = false }    = req.body;

    if (!validateUUID(proprietaireId)) {
      return res.status(400).json({ success: false, error: 'ID propriétaire invalide' });
    }
    if (!MONTH_RE.test(month)) {
      return res.status(400).json({ success: false, error: 'Format du mois invalide (attendu : YYYY-MM)' });
    }

    let emailed  = false;
    let skipped  = false;

    if (send_email) {
      const result = await sendReportByEmail(req.clientId, proprietaireId, month);
      emailed  = result.sent    ?? false;
      skipped  = result.skipped ?? false;
    } else {
      await generateAndStoreReport(req.clientId, proprietaireId, month);
    }

    res.json({
      success: true,
      data: {
        month,
        label:   monthLabel(month),
        emailed,
        skipped,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
