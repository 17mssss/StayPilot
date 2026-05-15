/**
 * pdfReports.js — Génération automatique des relevés mensuels propriétaires
 *
 * Fonctions exportées :
 *   buildReportData(clientId, proprietaireId, month)  → données brutes du rapport
 *   generateReportBuffer(clientId, proprietaireId, month)  → Buffer PDF
 *   generateAndStoreReport(clientId, proprietaireId, month) → stocke en DB
 *   getOrGenerateReport(clientId, proprietaireId, month) → depuis cache ou génère
 *   sendReportByEmail(clientId, proprietaireId, month) → génère + envoie email
 *   startReportsCron()  → démarre le job mensuel (1er du mois à 8h)
 */

const cron     = require('node-cron');
const supabase = require('../config/supabase');
const { generateRelevePDF } = require('./pdfGenerator');
const { sendEmail }         = require('./sendgrid');

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

function monthLabel(month) {
  const [year, m] = month.split('-');
  return `${MOIS_FR[parseInt(m, 10) - 1]} ${year}`;
}

function prevMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getCommissionRate() {
  const rate = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20');
  return isNaN(rate) ? 20 : rate;
}

// ── Données du rapport ────────────────────────────────────────────────────────

/**
 * Récupère toutes les données nécessaires à la génération du PDF.
 */
async function buildReportData(clientId, proprietaireId, month) {
  const { data: prop, error: propErr } = await supabase
    .from('proprietaires')
    .select('id, nom, email, adresse, logement_ids')
    .eq('id', proprietaireId)
    .eq('client_id', clientId)
    .single();

  if (propErr || !prop) {
    const err = new Error('Propriétaire introuvable');
    err.statusCode = 404;
    throw err;
  }

  const logementIds = Array.isArray(prop.logement_ids) ? prop.logement_ids : [];

  // Noms des logements
  const logementMap = {};
  if (logementIds.length > 0) {
    const { data: logements } = await supabase
      .from('logements')
      .select('id, nom')
      .in('id', logementIds);
    (logements ?? []).forEach(l => { logementMap[l.id] = l.nom; });
  }

  // Bornes du mois (YYYY-MM-01 → YYYY-MM-DD)
  const [year, m] = month.split('-');
  const startDate = `${month}-01`;
  const lastDay   = new Date(parseInt(year, 10), parseInt(m, 10), 0).getDate();
  const endDate   = `${month}-${String(lastDay).padStart(2, '0')}`;

  let reservations = [];
  if (logementIds.length > 0) {
    const { data, error: resErr } = await supabase
      .from('reservations')
      .select('id, logement_id, voyageur_nom, checkin, checkout, montant_total, statut')
      .in('logement_id', logementIds)
      .gte('checkin', startDate)
      .lte('checkin', endDate)
      .neq('statut', 'annulee')
      .order('checkin', { ascending: true });

    if (resErr) throw resErr;
    reservations = data ?? [];
  }

  const commRate = getCommissionRate();
  let totalBrut = 0, totalCommission = 0, totalNet = 0;

  const rows = reservations.map(r => {
    const montant    = parseFloat(r.montant_total ?? 0);
    const commission = Math.round(montant * commRate) / 100;
    const net        = Math.round((montant - commission) * 100) / 100;
    totalBrut        += montant;
    totalCommission  += commission;
    totalNet         += net;
    return {
      voyageur:         r.voyageur_nom ?? '—',
      logement:         logementMap[r.logement_id] ?? '—',
      checkin:          r.checkin,
      checkout:         r.checkout,
      montant,
      commission_ht:    commission,
      net_proprietaire: net,
    };
  });

  return {
    proprietaire: {
      nom:     prop.nom,
      email:   prop.email   ?? null,
      adresse: prop.adresse ?? null,
    },
    mois:            parseInt(m, 10),
    annee:           parseInt(year, 10),
    reservations:    rows,
    totalBrut:       Math.round(totalBrut        * 100) / 100,
    totalCommission: Math.round(totalCommission  * 100) / 100,
    totalNet:        Math.round(totalNet         * 100) / 100,
  };
}

// ── Génération PDF ────────────────────────────────────────────────────────────

async function generateReportBuffer(clientId, proprietaireId, month) {
  const data = await buildReportData(clientId, proprietaireId, month);

  const invoiceNumber = `REL-${month}-${proprietaireId.slice(0, 6).toUpperCase()}`;

  const buffer = await generateRelevePDF({
    invoiceNumber,
    proprietaire:    data.proprietaire,
    mois:            data.mois,
    annee:           data.annee,
    reservations:    data.reservations,
    totalBrut:       data.totalBrut,
    totalCommission: data.totalCommission,
    totalNet:        data.totalNet,
  });

  return { buffer, proprietaire: data.proprietaire, isEmpty: data.reservations.length === 0 };
}

// ── Stockage ──────────────────────────────────────────────────────────────────

/**
 * Génère le PDF et le stocke en base (upsert manuel pour compatibilité index partiel).
 */
async function generateAndStoreReport(clientId, proprietaireId, month) {
  const { buffer, proprietaire, isEmpty } = await generateReportBuffer(clientId, proprietaireId, month);
  const pdfBase64 = buffer.toString('base64');

  // Chercher un rapport existant
  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('client_id', clientId)
    .eq('proprietaire_id', proprietaireId)
    .eq('month', month)
    .maybeSingle();

  let report;
  if (existing) {
    const { data, error } = await supabase
      .from('reports')
      .update({ pdf_data: pdfBase64 })
      .eq('id', existing.id)
      .select('id, month, sent_at, created_at')
      .single();
    if (error) throw error;
    report = data;
  } else {
    const { data, error } = await supabase
      .from('reports')
      .insert({ client_id: clientId, proprietaire_id: proprietaireId, month, pdf_data: pdfBase64 })
      .select('id, month, sent_at, created_at')
      .single();
    if (error) throw error;
    report = data;
  }

  return { report, buffer, proprietaire, isEmpty };
}

/**
 * Retourne le rapport depuis le cache DB ou le génère à la volée.
 */
async function getOrGenerateReport(clientId, proprietaireId, month) {
  const { data: existing } = await supabase
    .from('reports')
    .select('id, pdf_data, sent_at, created_at')
    .eq('client_id', clientId)
    .eq('proprietaire_id', proprietaireId)
    .eq('month', month)
    .maybeSingle();

  if (existing?.pdf_data) {
    return {
      buffer:    Buffer.from(existing.pdf_data, 'base64'),
      fromCache: true,
      report:    existing,
    };
  }

  const result = await generateAndStoreReport(clientId, proprietaireId, month);
  return { ...result, fromCache: false };
}

// ── Envoi email ───────────────────────────────────────────────────────────────

async function sendReportByEmail(clientId, proprietaireId, month) {
  const { report, buffer, proprietaire } = await generateAndStoreReport(clientId, proprietaireId, month);

  if (!proprietaire.email) {
    console.warn(`[REPORTS] Propriétaire ${proprietaireId} sans email — envoi ignoré`);
    return { skipped: true };
  }

  const label       = monthLabel(month);
  const companyName = process.env.CLIENT_NAME || 'StayPilot';
  const safeName    = proprietaire.nom.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename    = `releve-${month}-${safeName}.pdf`;

  await sendEmail(
    proprietaire.email,
    `Votre relevé mensuel ${label} — ${companyName}`,
    `Bonjour ${proprietaire.nom},\n\nVeuillez trouver en pièce jointe votre relevé mensuel de ${label}.\n\nCordialement,\n${companyName}`,
    null,
    [
      {
        content:     buffer.toString('base64'),
        filename,
        type:        'application/pdf',
        disposition: 'attachment',
      },
    ]
  );

  await supabase
    .from('reports')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', report.id);

  console.log(`[REPORTS] Relevé ${month} envoyé à ${proprietaire.email}`);
  return { sent: true, email: proprietaire.email };
}

// ── Cron mensuel ──────────────────────────────────────────────────────────────

function startReportsCron() {
  // 8h00 le 1er de chaque mois
  cron.schedule('0 8 1 * *', async () => {
    const month = prevMonth();
    console.log(`[REPORTS CRON] Génération des relevés pour ${month}...`);

    try {
      const { data: props, error } = await supabase
        .from('proprietaires')
        .select('id, client_id, nom, email');

      if (error) {
        console.error('[REPORTS CRON] Erreur récupération propriétaires :', error.message);
        return;
      }

      let ok = 0, ko = 0, skipped = 0;

      for (const prop of (props ?? [])) {
        try {
          const result = await sendReportByEmail(prop.client_id, prop.id, month);
          result.skipped ? skipped++ : ok++;
        } catch (err) {
          console.error(`[REPORTS CRON] Propriétaire ${prop.id} (${prop.nom}) :`, err.message);
          ko++;
        }
      }

      console.log(`[REPORTS CRON] Terminé — OK: ${ok} | KO: ${ko} | Sans email: ${skipped}`);
    } catch (err) {
      console.error('[REPORTS CRON] Erreur critique :', err.message);
    }
  });

  console.log('[REPORTS CRON] Job mensuel programmé (1er du mois à 8h00)');
}

module.exports = {
  buildReportData,
  generateReportBuffer,
  generateAndStoreReport,
  getOrGenerateReport,
  sendReportByEmail,
  startReportsCron,
};
