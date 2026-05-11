/**
 * fileParser.js
 * Parse un fichier Excel (.xlsx) ou CSV en tableau de lignes normalisées.
 * Utilisé par le module invoices pour l'import de données de facturation.
 */

const XLSX = require('xlsx');

/**
 * Parse un Buffer (Excel ou CSV) et retourne un tableau d'objets.
 * Les colonnes attendues (insensibles à la casse, avec alias) :
 *   voyageur / guest / nom
 *   email
 *   telephone / phone
 *   logement / property / bien
 *   checkin / check_in / arrivee / arrival
 *   checkout / check_out / depart / departure
 *   montant / amount / total / prix
 *   commission / taux
 *
 * @param {Buffer} buffer
 * @param {string} [mimetype] — 'application/vnd.openxmlformats...' ou 'text/csv'
 * @returns {{ rows: Array, columns: string[], errors: string[] }}
 */
function parseFile(buffer, mimetype = '') {
  const errors = [];

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (err) {
    throw new Error(`Impossible de lire le fichier : ${err.message}`);
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Fichier vide ou sans feuille de calcul');

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,         // tout en string pour éviter les problèmes de type
    dateNF: 'yyyy-mm-dd',
  });

  if (rawRows.length === 0) {
    return { rows: [], columns: [], errors: ['Aucune donnée trouvée dans le fichier'] };
  }

  // Colonnes détectées
  const columns = Object.keys(rawRows[0]);

  // Normalisation des lignes
  const rows = rawRows.map((raw, idx) => {
    const row = normalizeRow(raw);
    row._index = idx + 2; // numéro de ligne dans le fichier (2 = première ligne après en-têtes)

    // Validation basique
    if (!row.montant && row.montant !== 0) {
      errors.push(`Ligne ${row._index} : montant manquant`);
    }
    if (!row.checkin) {
      errors.push(`Ligne ${row._index} : date de check-in manquante`);
    }
    if (!row.checkout) {
      errors.push(`Ligne ${row._index} : date de check-out manquante`);
    }

    return row;
  });

  return { rows, columns, errors };
}

/**
 * Normalise une ligne brute en objet standardisé.
 */
function normalizeRow(raw) {
  const find = (aliases) => {
    for (const alias of aliases) {
      for (const key of Object.keys(raw)) {
        if (key.toLowerCase().replace(/[\s_-]/g, '').includes(alias.replace(/[\s_-]/g, ''))) {
          const val = raw[key];
          return val !== undefined && val !== '' ? String(val).trim() : null;
        }
      }
    }
    return null;
  };

  const parseAmount = (str) => {
    if (!str) return null;
    const cleaned = String(str).replace(/[^\d,.-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const parseDate = (str) => {
    if (!str) return null;
    // Formats acceptés : YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
    const s = String(str).trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // DD/MM/YYYY ou DD-MM-YYYY
    const m = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    // Essai avec new Date()
    try {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch {}
    return null;
  };

  const montantRaw    = find(['montant', 'amount', 'total', 'prix', 'price']);
  const commissionRaw = find(['commission', 'taux', 'rate', 'comm']);
  const checkinRaw    = find(['checkin', 'check_in', 'arrivee', 'arrival', 'debut', 'from']);
  const checkoutRaw   = find(['checkout', 'check_out', 'depart', 'departure', 'fin', 'to']);

  const montant    = parseAmount(montantRaw);
  const commission = parseAmount(commissionRaw);
  const checkin    = parseDate(checkinRaw);
  const checkout   = parseDate(checkoutRaw);

  // Calcul commission HT si non fournie
  const commRate   = commission != null ? commission : parseFloat(process.env.CLIENT_COMMISSION_RATE || '20');
  const commHT     = montant != null ? parseFloat((montant * commRate / 100).toFixed(2)) : null;
  const tvaAmount  = commHT != null ? parseFloat((commHT * 0.20).toFixed(2)) : null;
  const totalTTC   = commHT != null && tvaAmount != null ? parseFloat((commHT + tvaAmount).toFixed(2)) : null;

  return {
    voyageur:    find(['voyageur', 'guest', 'nom', 'name', 'client']),
    email:       find(['email', 'mail', 'courriel']),
    telephone:   find(['telephone', 'phone', 'tel', 'mobile']),
    logement:    find(['logement', 'property', 'bien', 'appartement', 'location', 'titre', 'title']),
    checkin,
    checkout,
    montant,
    commissionRate: commRate,
    commissionHT:   commHT,
    tvaAmount,
    totalTTC,
  };
}

/**
 * Retourne les colonnes disponibles d'un fichier sans parser toutes les lignes.
 */
function detectColumns(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', sheetRows: 2 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.length > 0 ? Object.keys(rows[0]) : [];
}

module.exports = { parseFile, detectColumns };
