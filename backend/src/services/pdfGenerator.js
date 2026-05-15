/**
 * pdfGenerator.js
 * Génère les PDF de facturation StayPilot avec pdfkit.
 *
 * Structure identique à la facture de référence (Cruz Prestige / Abby) :
 *   ▸ Titre "Facture / commission / N°" (en orange #e8611a)
 *   ▸ Bloc émetteur (gauche) + destinataire (droite)
 *   ▸ Dates d'émission et d'exigibilité (label orange, valeur noir)
 *   ▸ Tableau 8 colonnes :
 *       # | Désignation (2 lignes : dates + "Prestation de service") |
 *       Unité | Quantité | Prix u. HT | TVA | Montant HT | Montant TTC
 *   ▸ Bas de page : Conditions de paiement (gauche) + Totaux HT/TVA/TTC (droite)
 *   ▸ Pied : société gauche + "1/1" droite
 */

const PDFDocument = require('pdfkit');

// ── Palette StayPilot ─────────────────────────────────────────────────────────
const ORANGE = '#e8611a';
const DARK   = '#1a1b1e';
const GRAY   = '#6b7280';
const BORDER = '#e5e7eb';
const WHITE  = '#ffffff';

// ── Dimensions A4 ─────────────────────────────────────────────────────────────
const M       = 50;                    // margin
const PAGE_W  = 595.28;
const PAGE_H  = 841.89;
const CNTW    = PAGE_W - M * 2;       // 495.28

// ── 8 colonnes — total = 495 ──────────────────────────────────────────────────
const COLS = [
  { header: '#',                          w: 18,  align: 'center' },
  { header: 'Désignation et description', w: 170, align: 'left'   },
  { header: 'Unité',                      w: 42,  align: 'center' },
  { header: 'Quantité',                   w: 44,  align: 'center' },
  { header: 'Prix u. HT',                 w: 65,  align: 'right'  },
  { header: 'TVA',                        w: 35,  align: 'center' },
  { header: 'Montant HT',                 w: 60,  align: 'right'  },
  { header: 'Montant TTC',                w: 61,  align: 'right'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(Number(n)) + ' €';
};

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return String(d); }
};

const fmtRange = (ci, co) => {
  try {
    const d1 = new Date(ci), d2 = new Date(co);
    const m1 = d1.toLocaleDateString('fr-FR', { month: 'short' });
    const m2 = d2.toLocaleDateString('fr-FR', { month: 'short' });
    const y2 = d2.getFullYear();
    if (d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()) {
      return `${d1.getDate()} - ${d2.getDate()} ${m2} ${y2}`;
    }
    return `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2} ${y2}`;
  } catch { return '—'; }
};

const toBuffer = (doc) => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on('data', c => chunks.push(c));
  doc.on('end',  () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
  doc.end();
});

// ── Tableau header ────────────────────────────────────────────────────────────
function tableHeader(doc, y) {
  doc.rect(M, y, CNTW, 20).fill(DARK);
  let x = M;
  COLS.forEach(col => {
    doc.fontSize(7.5).fillColor(WHITE).font('Helvetica-Bold')
       .text(col.header, x + 3, y + 6, { width: col.w - 6, align: col.align, lineBreak: false });
    x += col.w;
  });
  return y + 20;
}

// ── Tableau ligne de données ──────────────────────────────────────────────────
function tableRow(doc, idx, item, y) {
  const H = 30;
  const ht  = Number(item.commissionHT || 0);
  const ttc = parseFloat((ht * 1.20).toFixed(2));
  const label = fmtRange(item.checkin, item.checkout);

  doc.rect(M, y, CNTW, H).fill(WHITE);
  doc.moveTo(M, y + H).lineTo(M + CNTW, y + H).strokeColor(BORDER).lineWidth(0.5).stroke();

  const cells = [
    { text: String(idx + 1),  align: 'center' },
    { text: label,            align: 'left',  sub: item.voyageur ? `${item.voyageur} — Prestation de service` : 'Prestation de service' },
    { text: 'unité',          align: 'center' },
    { text: '1',              align: 'center' },
    { text: fmt(ht),          align: 'right'  },
    { text: '20%',            align: 'center' },
    { text: fmt(ht),          align: 'right'  },
    { text: fmt(ttc),         align: 'right'  },
  ];

  let x = M;
  cells.forEach((cell, i) => {
    const col = COLS[i];
    if (cell.sub) {
      doc.fontSize(8).fillColor(DARK).font('Helvetica-Bold')
         .text(cell.text, x + 3, y + 6, { width: col.w - 6, align: cell.align, lineBreak: false });
      doc.fontSize(7).fillColor(GRAY).font('Helvetica')
         .text(cell.sub, x + 3, y + 17, { width: col.w - 6, align: 'left', lineBreak: false });
    } else {
      doc.fontSize(8).fillColor(DARK).font('Helvetica')
         .text(cell.text, x + 3, y + (H - 8) / 2, { width: col.w - 6, align: cell.align, lineBreak: false });
    }
    if (i < cells.length - 1) {
      doc.moveTo(x + col.w, y).lineTo(x + col.w, y + H).strokeColor(BORDER).lineWidth(0.5).stroke();
    }
    x += col.w;
  });

  return y + H;
}

// ═══════════════════════════════════════════════════════════════════════════════
// generateInvoicePDF
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} data
 * @param {string} data.invoiceNumber
 * @param {string} data.type              'commission' | 'sejour'
 * @param {object} data.recipient         { nom, email, adresse? }
 * @param {Array}  data.rows              rows parsées par fileParser
 * @param {number} data.totalHT
 * @param {number} data.tvaAmount
 * @param {number} data.totalTTC
 * @returns {Promise<Buffer>}
 */
async function generateInvoicePDF(data) {
  const {
    invoiceNumber,
    type          = 'commission',
    recipient     = {},
    rows          = [],
    totalHT,
    tvaAmount,
    totalTTC,
  } = data;

  const companyName  = process.env.CLIENT_NAME    || 'StayPilot';
  const companyEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@staypilot.cc';
  const companyPhone = process.env.CLIENT_PHONE   || '';
  const companyAddr  = process.env.CLIENT_ADDRESS || '';
  const companySiret = process.env.CLIENT_SIRET   || '';

  const emissionDate = new Date();
  const dueDate      = new Date(emissionDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  let y = M;

  // ── Titre ──────────────────────────────────────────────────────────────────
  doc.fontSize(26).fillColor(ORANGE).font('Helvetica-Bold')
     .text('Facture', M, y, { lineBreak: false });
  y += 32;

  doc.fontSize(13).fillColor(ORANGE).font('Helvetica-Bold')
     .text(type, M, y, { lineBreak: false });
  y += 22;

  doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
     .text(`N° ${invoiceNumber}`, M, y, { lineBreak: false });
  y += 28;

  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 15;

  // ── Émetteur / Destinataire ────────────────────────────────────────────────
  const RX = M + Math.round(CNTW * 0.55);
  const bY = y;

  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(companyName, M, bY, { lineBreak: false });
  let eY = bY + 15;
  [companyEmail, companyPhone, ...companyAddr.split('\n'), companySiret ? `N° SIRET : ${companySiret}` : '']
    .filter(Boolean)
    .forEach(l => {
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(l, M, eY, { lineBreak: false });
      eY += 13;
    });

  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(recipient.nom || '—', RX, bY, { lineBreak: false });
  let rY = bY + 15;
  [recipient.email, recipient.adresse].filter(Boolean).forEach(l => {
    doc.fontSize(9).fillColor(DARK).font('Helvetica').text(l, RX, rY, { lineBreak: false });
    rY += 13;
  });

  y = Math.max(eY, rY) + 15;
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 15;

  // ── Dates ─────────────────────────────────────────────────────────────────
  const DL = 210;
  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text("Date d'émission", M, y, { width: DL, lineBreak: false });
  doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
     .text(fmtDate(emissionDate), M + DL, y, { lineBreak: false });
  y += 16;

  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text("Date d'exigibilité du paiement", M, y, { width: DL, lineBreak: false });
  doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
     .text(fmtDate(dueDate), M + DL, y, { lineBreak: false });
  y += 22;

  // ── Tableau ───────────────────────────────────────────────────────────────
  const tableY = y;
  y = tableHeader(doc, y);
  rows.forEach((row, idx) => { y = tableRow(doc, idx, row, y); });
  doc.rect(M, tableY, CNTW, y - tableY).strokeColor(BORDER).lineWidth(0.8).stroke();
  y += 22;

  // ── Conditions de paiement + Totaux ───────────────────────────────────────
  const TX  = M + Math.round(CNTW * 0.52);
  const TLW = 110;
  const TVW = 90;

  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text('Conditions de paiement', M, y);
  let cY = y + 18;
  doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text('Délai de paiement', M, cY);
  cY += 13;
  doc.fontSize(9).fillColor(DARK).font('Helvetica').text('30 jours', M, cY);
  cY += 18;
  doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold').text('Pénalité de retard', M, cY);
  cY += 13;
  doc.fontSize(9).fillColor(DARK).font('Helvetica').text('3 fois le taux légal', M, cY);

  const totals = [
    { label: 'Total HT',  value: fmt(totalHT),    bold: false },
    { label: 'TVA',       value: fmt(tvaAmount),  bold: false },
    { label: 'Dont 20%',  value: fmt(tvaAmount),  bold: false },
    { label: 'Total TTC', value: fmt(totalTTC),   bold: true  },
  ];
  let tY = y;
  totals.forEach(({ label, value, bold }) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    doc.fontSize(9).fillColor(DARK).font(font)
       .text(label, TX, tY, { width: TLW, align: 'left', lineBreak: false });
    doc.fontSize(bold ? 10 : 9).fillColor(bold ? ORANGE : DARK).font(font)
       .text(value, TX + TLW, tY, { width: TVW, align: 'right', lineBreak: false });
    tY += 18;
  });

  // ── Pied de page ──────────────────────────────────────────────────────────
  const footerY = PAGE_H - 38;
  doc.moveTo(M, footerY - 8).lineTo(PAGE_W - M, footerY - 8)
     .strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text(companyName, M, footerY, { lineBreak: false });
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('1/1', PAGE_W - M - 20, footerY, { width: 20, align: 'right', lineBreak: false });

  return toBuffer(doc);
}

/**
 * Génère un numéro de facture unique : SP-YYYY-NNN
 */
function generateInvoiceNumber(sequence) {
  const year = new Date().getFullYear();
  return `SP-${year}-${String(sequence).padStart(3, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// generateRelevePDF — Relevé mensuel propriétaire
// ═══════════════════════════════════════════════════════════════════════════════

const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];

/**
 * @param {object} data
 * @param {string} data.invoiceNumber
 * @param {object} data.proprietaire    { nom, email?, adresse? }
 * @param {number} data.mois            1-12
 * @param {number} data.annee
 * @param {Array}  data.reservations    [{ voyageur, logement, checkin, checkout, montant, commission_ht, net_proprietaire }]
 * @param {number} data.totalBrut
 * @param {number} data.totalCommission
 * @param {number} data.totalNet
 * @returns {Promise<Buffer>}
 */
async function generateRelevePDF(data) {
  const {
    invoiceNumber,
    proprietaire  = {},
    mois,
    annee,
    reservations  = [],
    totalBrut,
    totalCommission,
    totalNet,
  } = data;

  const companyName  = process.env.CLIENT_NAME          || 'StayPilot';
  const companyEmail = process.env.SENDGRID_FROM_EMAIL  || 'contact@staypilot.cc';
  const companyAddr  = process.env.CLIENT_ADDRESS       || '';
  const companySiret = process.env.CLIENT_SIRET         || '';
  const commRate     = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20');

  const moisLabel    = `${MOIS_FR[(mois - 1) % 12]} ${annee}`;
  const emissionDate = new Date();

  // ── Colonnes du tableau relevé ───────────────────────────────────────────────
  const RCOLS = [
    { header: '#',               w: 18,  align: 'center' },
    { header: 'Voyageur',        w: 105, align: 'left'   },
    { header: 'Logement',        w: 95,  align: 'left'   },
    { header: 'Check-in',        w: 55,  align: 'center' },
    { header: 'Check-out',       w: 55,  align: 'center' },
    { header: 'Nuits',           w: 28,  align: 'center' },
    { header: 'Montant brut',    w: 60,  align: 'right'  },
    { header: `Comm. ${commRate}%`, w: 48, align: 'right' },
    { header: 'Net propriét.',   w: 60,  align: 'right'  },
  ]; // total = 524 → ajuster si nécessaire

  // ── Recalculer la largeur totale ─────────────────────────────────────────────
  const TOTAL_COL_W = RCOLS.reduce((s, c) => s + c.w, 0);
  const SCALE = CNTW / TOTAL_COL_W;
  const SCALED = RCOLS.map((c) => ({ ...c, w: Math.round(c.w * SCALE) }));

  function releve_tableHeader(doc, y) {
    doc.rect(M, y, CNTW, 20).fill(DARK);
    let x = M;
    SCALED.forEach((col) => {
      doc.fontSize(7).fillColor(WHITE).font('Helvetica-Bold')
         .text(col.header, x + 2, y + 6, { width: col.w - 4, align: col.align, lineBreak: false });
      x += col.w;
    });
    return y + 20;
  }

  function nightsBetween(ci, co) {
    try {
      const d = new Date(co).getTime() - new Date(ci).getTime();
      return Math.max(0, Math.round(d / 86400000));
    } catch { return 0; }
  }

  function releve_tableRow(doc, idx, r, y) {
    const H       = 26;
    const montant = Number(r.montant ?? 0);
    const commHT  = Number(r.commission_ht ?? (montant * commRate / 100));
    const net     = Number(r.net_proprietaire ?? (montant - commHT));
    const nights  = nightsBetween(r.checkin, r.checkout);

    doc.rect(M, y, CNTW, H).fill(idx % 2 === 0 ? WHITE : '#f9fafb');
    doc.moveTo(M, y + H).lineTo(M + CNTW, y + H).strokeColor(BORDER).lineWidth(0.5).stroke();

    const cells = [
      { text: String(idx + 1)      },
      { text: r.voyageur || '—'    },
      { text: r.logement  || '—'   },
      { text: fmtDate(r.checkin)   },
      { text: fmtDate(r.checkout)  },
      { text: nights > 0 ? String(nights) : '—' },
      { text: fmt(montant), bold: false },
      { text: fmt(commHT),  color: ORANGE },
      { text: fmt(net),     bold: true },
    ];

    let x = M;
    cells.forEach((cell, i) => {
      const col  = SCALED[i];
      const align = col.align;
      const color = cell.color || DARK;
      const font  = cell.bold ? 'Helvetica-Bold' : 'Helvetica';
      doc.fontSize(7.5).fillColor(color).font(font)
         .text(cell.text, x + 3, y + (H - 7.5) / 2, { width: col.w - 6, align, lineBreak: false });
      if (i < cells.length - 1) {
        doc.moveTo(x + col.w, y).lineTo(x + col.w, y + H).strokeColor(BORDER).lineWidth(0.5).stroke();
      }
      x += col.w;
    });
    return y + H;
  }

  // ── Génération document ───────────────────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true });
  let y = M;

  // Titre
  doc.fontSize(24).fillColor(ORANGE).font('Helvetica-Bold')
     .text('Relevé mensuel', M, y, { lineBreak: false });
  y += 30;
  doc.fontSize(14).fillColor(DARK).font('Helvetica-Bold')
     .text(moisLabel, M, y, { lineBreak: false });
  y += 20;
  doc.fontSize(10).fillColor(GRAY).font('Helvetica')
     .text(`Réf. ${invoiceNumber}`, M, y, { lineBreak: false });
  y += 22;
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 15;

  // Émetteur / Propriétaire
  const RX = M + Math.round(CNTW * 0.55);
  const bY = y;

  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(companyName, M, bY);
  let eY = bY + 15;
  [companyEmail, ...companyAddr.split('\n'), companySiret ? `N° SIRET : ${companySiret}` : '']
    .filter(Boolean)
    .forEach((l) => {
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(l, M, eY);
      eY += 13;
    });

  doc.fontSize(10).fillColor(DARK).font('Helvetica-Bold').text(proprietaire.nom || '—', RX, bY);
  let rY = bY + 15;
  [proprietaire.email, proprietaire.adresse].filter(Boolean).forEach((l) => {
    doc.fontSize(9).fillColor(DARK).font('Helvetica').text(l, RX, rY);
    rY += 13;
  });

  y = Math.max(eY, rY) + 12;
  doc.moveTo(M, y).lineTo(PAGE_W - M, y).strokeColor(BORDER).lineWidth(0.5).stroke();
  y += 15;

  // Date d'émission
  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text("Date d'émission", M, y, { width: 180, lineBreak: false });
  doc.fontSize(9).fillColor(DARK).font('Helvetica-Bold')
     .text(fmtDate(emissionDate), M + 185, y, { lineBreak: false });
  y += 22;

  // Tableau
  const tableStart = y;
  y = releve_tableHeader(doc, y);
  reservations.forEach((r, i) => { y = releve_tableRow(doc, i, r, y); });
  doc.rect(M, tableStart, CNTW, y - tableStart).strokeColor(BORDER).lineWidth(0.8).stroke();
  y += 25;

  // Totaux
  const TX  = M + Math.round(CNTW * 0.50);
  const TLW = 130;
  const TVW = 100;

  const totalsData = [
    { label: 'Total revenus bruts',            value: fmt(totalBrut),        bold: false },
    { label: `Total commissions HT (${commRate}%)`, value: fmt(totalCommission), bold: false, color: ORANGE },
    { label: 'Net à reverser au propriétaire', value: fmt(totalNet),         bold: true  },
  ];

  let tY = y;
  doc.fontSize(9).fillColor(ORANGE).font('Helvetica-Bold')
     .text('Récapitulatif', M, tY);
  tY += 18;

  totalsData.forEach(({ label, value, bold, color }) => {
    const font = bold ? 'Helvetica-Bold' : 'Helvetica';
    const labelColor = color || (bold ? DARK : GRAY);
    const valueColor = color || (bold ? ORANGE : DARK);
    doc.fontSize(9).fillColor(labelColor).font(font)
       .text(label, TX, tY, { width: TLW, align: 'left', lineBreak: false });
    doc.fontSize(bold ? 11 : 9).fillColor(valueColor).font(bold ? 'Helvetica-Bold' : font)
       .text(value, TX + TLW, tY, { width: TVW, align: 'right', lineBreak: false });
    tY += bold ? 22 : 16;

    if (bold) {
      doc.moveTo(TX, tY - 4).lineTo(TX + TLW + TVW, tY - 4)
         .strokeColor(BORDER).lineWidth(0.5).stroke();
    }
  });

  // Pied de page
  const footerY = PAGE_H - 38;
  doc.moveTo(M, footerY - 8).lineTo(PAGE_W - M, footerY - 8)
     .strokeColor(BORDER).lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text(companyName, M, footerY, { lineBreak: false });
  doc.fontSize(8).fillColor(GRAY).font('Helvetica')
     .text('1/1', PAGE_W - M - 20, footerY, { width: 20, align: 'right', lineBreak: false });

  return toBuffer(doc);
}

module.exports = { generateInvoicePDF, generateInvoiceNumber, generateRelevePDF };
