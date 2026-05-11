/**
 * invoices.js
 * Flow facturation StayPilot :
 *   POST /api/invoices/parse      → upload + parse Excel/CSV → prévisualisation
 *   POST /api/invoices/generate   → génération PDF depuis données parsées
 *   POST /api/invoices/:id/send   → envoi email + stockage S3
 *   GET  /api/invoices            → historique des factures (depuis Supabase)
 *   GET  /api/invoices/:id/download → télécharger le PDF
 */

const express    = require('express');
const multer     = require('multer');
const { z }      = require('zod');
const supabase   = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { parseFile }    = require('../services/fileParser');
const { generateInvoicePDF, generateInvoiceNumber, generateRelevePDF } = require('../services/pdfGenerator');
const { sendEmail }    = require('../services/sendgrid');
const { uploadBuffer } = require('../services/s3');

const router = express.Router();
router.use(authenticate);

// ── Helper : enregistre automatiquement le destinataire comme propriétaire ────
// Si un propriétaire avec le même nom (insensible à la casse) existe déjà,
// on met à jour son email/adresse s'ils étaient manquants.
async function upsertProprietaire(clientId, recipient) {
  if (!recipient?.nom?.trim()) return;
  try {
    const { data: existing } = await supabase
      .from('proprietaires')
      .select('id, email, adresse')
      .eq('client_id', clientId)
      .ilike('nom', recipient.nom.trim())
      .maybeSingle();

    if (existing) {
      // Compléter email/adresse s'ils manquaient
      const updates = {};
      if (!existing.email   && recipient.email)   updates.email   = recipient.email;
      if (!existing.adresse && recipient.adresse) updates.adresse = recipient.adresse;
      if (Object.keys(updates).length > 0) {
        await supabase.from('proprietaires').update(updates).eq('id', existing.id);
      }
    } else {
      await supabase.from('proprietaires').insert({
        client_id:    clientId,
        nom:          recipient.nom.trim(),
        email:        recipient.email   || null,
        adresse:      recipient.adresse || null,
        logement_ids: [],
      });
    }
  } catch (e) {
    // Non bloquant — on log mais on ne fail pas la requête principale
    console.warn('[PROPRIETAIRES] Upsert échoué:', e.message);
  }
}

/**
 * Vérifie les magic bytes du buffer pour confirmer le type réel du fichier.
 * Protège contre les fichiers malveillants renommés en .xlsx ou .csv.
 *
 * XLSX/XLS/ODS sont des archives ZIP → magic bytes: PK (0x50 0x4B)
 * CSV est du texte brut → vérification que le contenu est lisible UTF-8
 */
function checkMagicBytes(buffer, originalname) {
  if (!buffer || buffer.length < 4) {
    throw new Error('Fichier vide ou trop petit pour être valide.');
  }

  const isXlsx = originalname.match(/\.(xlsx|xls)$/i);
  const isCsv  = originalname.match(/\.csv$/i);

  if (isXlsx) {
    // XLSX = ZIP → magic bytes PK (0x50 0x4B 0x03 0x04)
    const isPK = buffer[0] === 0x50 && buffer[1] === 0x4B;
    if (!isPK) {
      throw new Error('Le fichier Excel fourni n\'est pas un fichier XLSX valide (signature binaire incorrecte).');
    }
  } else if (isCsv) {
    // CSV = texte — vérifier que les 256 premiers octets sont du texte lisible
    const sample = buffer.slice(0, 256).toString('utf8');
    // Détecter des bytes nuls qui indiqueraient du binaire
    if (sample.includes('\0')) {
      throw new Error('Le fichier CSV contient des données binaires non attendues.');
    }
  }
}

// Multer : fichiers en mémoire (max 5 MB)
// Note : la validation du type MIME déclaré par le client est un premier filtre
// mais elle peut être contournée. La vérification des magic bytes ci-dessous
// est le vrai contrôle de sécurité (effectuée après l'upload dans la route /parse).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
      'application/octet-stream', // certains clients envoient ce MIME générique pour .xlsx
    ];
    const allowedExt = /\.(xlsx|csv|xls)$/i;
    if (allowedMimes.includes(file.mimetype) || allowedExt.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez Excel (.xlsx) ou CSV.'));
    }
  },
});

// ── GET /api/invoices — Historique ────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const from = (page - 1) * limit;
    const to   = page * limit - 1;

    const { data, error, count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('client_id', req.clientId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    res.json({ success: true, data: data || [], total: count || 0 });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/invoices/:id/download — Télécharger PDF ─────────────────────────
router.get('/:id/download', async (req, res, next) => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (error || !invoice) return res.status(404).json({ success: false, error: 'Facture introuvable' });

    if (invoice.pdf_data) {
      // PDF stocké en base (base64)
      const buffer = Buffer.from(invoice.pdf_data, 'base64');
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
      return res.send(buffer);
    }

    if (invoice.pdf_url) {
      return res.redirect(invoice.pdf_url);
    }

    // Regénérer à la volée si les données sont disponibles
    if (invoice.rows_data) {
      const rows = JSON.parse(invoice.rows_data);
      const buffer = await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        type:          invoice.type || 'commission',
        recipient:     JSON.parse(invoice.recipient_data || '{}'),
        rows,
        totalHT:  invoice.total_ht,
        tvaAmount: invoice.tva_amount,
        totalTTC:  invoice.total_ttc,
      });
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', `attachment; filename="${invoice.invoice_number}.pdf"`);
      return res.send(buffer);
    }

    res.status(404).json({ success: false, error: 'PDF non disponible' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/invoices/parse — Upload + Parse ─────────────────────────────────
router.post('/parse', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Fichier manquant' });

    // Vérification des magic bytes (type réel du fichier)
    try {
      checkMagicBytes(req.file.buffer, req.file.originalname);
    } catch (magicErr) {
      return res.status(400).json({ success: false, error: magicErr.message });
    }

    const { rows, columns, errors } = parseFile(req.file.buffer, req.file.mimetype);

    // Calculer les totaux
    const totalHT   = rows.reduce((s, r) => s + (r.commissionHT || 0), 0);
    const tvaAmount = parseFloat((totalHT * 0.20).toFixed(2));
    const totalTTC  = parseFloat((totalHT + tvaAmount).toFixed(2));

    res.json({
      success: true,
      data: {
        rows,
        columns,
        errors,
        summary: {
          lignes:    rows.length,
          totalHT:   parseFloat(totalHT.toFixed(2)),
          tvaAmount,
          totalTTC,
        },
      },
    });
  } catch (err) {
    if (err.name === 'MulterError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// ── POST /api/invoices/generate — Générer PDF ─────────────────────────────────
router.post('/generate', async (req, res, next) => {
  try {
    const body = z.object({
      rows:      z.array(z.any()).min(1),
      recipient: z.object({
        nom:     z.string().optional(),
        email:   z.string().email().optional(),
        adresse: z.string().optional(),
      }).optional().default({}),
      type:      z.string().optional().default('commission'),
    }).parse(req.body);

    // Calculer les totaux depuis les lignes
    const totalHT   = parseFloat(body.rows.reduce((s, r) => s + (Number(r.commissionHT) || 0), 0).toFixed(2));
    const tvaAmount = parseFloat((totalHT * 0.20).toFixed(2));
    const totalTTC  = parseFloat((totalHT + tvaAmount).toFixed(2));

    // Séquence de numérotation
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', req.clientId);

    const invoiceNumber = generateInvoiceNumber((count || 0) + 1);

    // Génération PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber,
      type:      body.type,
      recipient: body.recipient,
      rows:      body.rows,
      totalHT,
      tvaAmount,
      totalTTC,
    });

    // Tenter upload S3
    const pdfUrl = await uploadBuffer(
      pdfBuffer,
      `invoices/${invoiceNumber}.pdf`,
      'application/pdf'
    );

    // Sauvegarder en base (PDF en base64 si pas de S3)
    const invoiceData = {
      client_id:      req.clientId,
      invoice_number: invoiceNumber,
      type:           body.type,
      recipient_data: JSON.stringify(body.recipient),
      rows_data:      JSON.stringify(body.rows),
      total_ht:       totalHT,
      tva_amount:     tvaAmount,
      total_ttc:      totalTTC,
      pdf_url:        pdfUrl,
      pdf_data:       pdfUrl ? null : pdfBuffer.toString('base64'),
      status:         'generated',
    };

    const { data: savedInvoice, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) {
      console.error('[INVOICES] Erreur sauvegarde:', error.message);
    }

    // Enregistrer automatiquement le destinataire comme propriétaire
    await upsertProprietaire(req.clientId, body.recipient);

    // Retourner le PDF directement pour preview
    res.set('Content-Type', 'application/pdf');
    res.set('X-Invoice-Number', invoiceNumber);
    res.set('X-Invoice-Id', savedInvoice?.id || '');
    res.send(pdfBuffer);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── POST /api/invoices/:id/send — Envoyer par email ───────────────────────────
router.post('/:id/send', async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (error || !invoice) return res.status(404).json({ success: false, error: 'Facture introuvable' });

    // Récupérer le PDF
    let pdfBuffer;
    if (invoice.pdf_data) {
      pdfBuffer = Buffer.from(invoice.pdf_data, 'base64');
    } else if (invoice.rows_data) {
      pdfBuffer = await generateInvoicePDF({
        invoiceNumber: invoice.invoice_number,
        type:          invoice.type || 'commission',
        recipient:     JSON.parse(invoice.recipient_data || '{}'),
        rows:          JSON.parse(invoice.rows_data),
        totalHT:       invoice.total_ht,
        tvaAmount:     invoice.tva_amount,
        totalTTC:      invoice.total_ttc,
      });
    } else {
      return res.status(400).json({ success: false, error: 'PDF non disponible pour cet envoi' });
    }

    const clientName = process.env.CLIENT_NAME || 'StayPilot';
    await sendEmail(
      email,
      `Facture ${invoice.invoice_number} — ${clientName}`,
      `Bonjour,\n\nVeuillez trouver en pièce jointe votre facture ${invoice.invoice_number}.\n\nCordialement,\n${clientName}`,
      null,
      [{
        content:     pdfBuffer.toString('base64'),
        filename:    `${invoice.invoice_number}.pdf`,
        type:        'application/pdf',
        disposition: 'attachment',
      }]
    );

    // Mettre à jour le statut
    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_to: email })
      .eq('id', req.params.id);

    res.json({ success: true, message: `Facture envoyée à ${email}` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── POST /api/invoices/sync-proprietaires — Import rétroactif ────────────────
// Parcourt toutes les factures du client et enregistre les destinataires
// qui ne sont pas encore dans la table proprietaires.
router.post('/sync-proprietaires', async (req, res, next) => {
  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('recipient_data')
      .eq('client_id', req.clientId);

    if (error) throw error;

    let created = 0;
    let updated = 0;

    for (const inv of (invoices ?? [])) {
      let recip = null;
      try {
        recip = typeof inv.recipient_data === 'string'
          ? JSON.parse(inv.recipient_data)
          : inv.recipient_data;
      } catch { continue; }

      if (!recip?.nom?.trim()) continue;

      const { data: existing } = await supabase
        .from('proprietaires')
        .select('id, email, adresse')
        .eq('client_id', req.clientId)
        .ilike('nom', recip.nom.trim())
        .maybeSingle();

      if (existing) {
        const updates = {};
        if (!existing.email   && recip.email)   updates.email   = recip.email;
        if (!existing.adresse && recip.adresse) updates.adresse = recip.adresse;
        if (Object.keys(updates).length > 0) {
          await supabase.from('proprietaires').update(updates).eq('id', existing.id);
          updated++;
        }
      } else {
        await supabase.from('proprietaires').insert({
          client_id:    req.clientId,
          nom:          recip.nom.trim(),
          email:        recip.email   || null,
          adresse:      recip.adresse || null,
          logement_ids: [],
        });
        created++;
      }
    }

    res.json({ success: true, data: { created, updated, total: (invoices ?? []).length } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/invoices/releve — Réservations d'un propriétaire sur un mois ────
router.get('/releve', async (req, res, next) => {
  try {
    const { proprietaire_id, mois, annee } = z.object({
      proprietaire_id: z.string().uuid(),
      mois:            z.coerce.number().int().min(1).max(12),
      annee:           z.coerce.number().int().min(2000).max(2100),
    }).parse(req.query);

    // Récupérer le propriétaire
    const { data: prop, error: propErr } = await supabase
      .from('proprietaires')
      .select('logement_ids, nom, email, adresse')
      .eq('id', proprietaire_id)
      .eq('client_id', req.clientId)
      .single();

    if (propErr || !prop) {
      return res.status(404).json({ success: false, error: 'Propriétaire introuvable' });
    }

    const commRate   = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20') / 100;
    const logementIds = Array.isArray(prop.logement_ids) ? prop.logement_ids : [];

    // Dates de début et fin du mois
    const startDate = `${annee}-${String(mois).padStart(2, '0')}-01`;
    const lastDay   = new Date(annee, mois, 0).getDate();
    const endDate   = `${annee}-${String(mois).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    let mapped = [];

    if (logementIds.length > 0) {
      // ── Voie 1 : Réservations depuis la table reservations (logements liés) ──
      const { data: reservations, error: resErr } = await supabase
        .from('reservations')
        .select('id, voyageur_nom, logements(nom), checkin, checkout, montant_total, statut')
        .in('logement_id', logementIds)
        .or(`and(checkin.gte.${startDate},checkin.lte.${endDate}),and(checkout.gte.${startDate},checkout.lte.${endDate})`)
        .neq('statut', 'cancelled')
        .order('checkin', { ascending: true });

      if (resErr) throw resErr;

      mapped = (reservations ?? []).map((r) => {
        const montant      = Number(r.montant_total ?? 0);
        const commissionHT = parseFloat((montant * commRate).toFixed(2));
        return {
          id:               r.id,
          voyageur:         r.voyageur_nom ?? null,
          logement:         r.logements?.nom ?? null,
          checkin:          r.checkin,
          checkout:         r.checkout,
          montant,
          commission_ht:    commissionHT,
          net_proprietaire: parseFloat((montant - commissionHT).toFixed(2)),
        };
      });
    }

    // ── Voie 2 (toujours) : lignes des factures manuelles pour ce propriétaire ──
    // Cherche dans toutes les factures dont recipient_data.nom correspond au propriétaire
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, rows_data, recipient_data')
      .eq('client_id', req.clientId)
      .neq('type', 'releve_mensuel'); // ne pas inclure les relevés déjà générés

    const invoiceRows = [];
    for (const inv of (invoices ?? [])) {
      // Vérifier que le destinataire correspond au propriétaire
      let recip = null;
      try {
        recip = typeof inv.recipient_data === 'string'
          ? JSON.parse(inv.recipient_data) : inv.recipient_data;
      } catch { continue; }

      if (!recip?.nom || recip.nom.trim().toLowerCase() !== prop.nom.trim().toLowerCase()) continue;

      // Extraire les lignes et filtrer celles du mois demandé
      let rows = [];
      try {
        rows = typeof inv.rows_data === 'string'
          ? JSON.parse(inv.rows_data) : (inv.rows_data ?? []);
      } catch { continue; }

      for (const row of rows) {
        const checkin  = row.checkin  ?? row.checkin  ?? null;
        const checkout = row.checkout ?? row.checkout ?? null;

        // Vérifier que checkin ou checkout tombe dans le mois
        const ciInMonth = checkin  && checkin  >= startDate && checkin  <= endDate;
        const coInMonth = checkout && checkout >= startDate && checkout <= endDate;
        if (!ciInMonth && !coInMonth) continue;

        // Éviter les doublons avec voie 1 (même voyageur + mêmes dates)
        const isDuplicate = mapped.some(
          (m) => m.voyageur === (row.voyageur ?? null) &&
                 m.checkin  === checkin &&
                 m.checkout === checkout
        );
        if (isDuplicate) continue;

        const montant      = Number(row.montant ?? 0);
        const commissionHT = Number(row.commissionHT ?? row.commission_ht ?? parseFloat((montant * commRate).toFixed(2)));
        invoiceRows.push({
          id:               `inv-${inv.id}-${invoiceRows.length}`,
          voyageur:         row.voyageur ?? null,
          logement:         row.logement ?? null,
          checkin,
          checkout,
          montant,
          commission_ht:    parseFloat(commissionHT.toFixed(2)),
          net_proprietaire: parseFloat((montant - commissionHT).toFixed(2)),
          _source:          'invoice', // info debug
        });
      }
    }

    const allRows = [...mapped, ...invoiceRows]
      .sort((a, b) => (a.checkin ?? '').localeCompare(b.checkin ?? ''));

    res.json({ success: true, data: { reservations: allRows, proprietaire: prop } });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── POST /api/invoices/generate-releve — PDF relevé mensuel propriétaire ─────
router.post('/generate-releve', async (req, res, next) => {
  try {
    const body = z.object({
      proprietaire: z.object({
        nom:     z.string().min(1),
        email:   z.string().email().optional().or(z.literal('')),
        adresse: z.string().optional(),
      }),
      mois:         z.number().int().min(1).max(12),
      annee:        z.number().int().min(2000).max(2100),
      reservations: z.array(z.object({
        voyageur:         z.string().nullable().optional(),
        logement:         z.string().nullable().optional(),
        checkin:          z.string().nullable().optional(),
        checkout:         z.string().nullable().optional(),
        montant:          z.number().nullable().optional(),
        commission_ht:    z.number().nullable().optional(),
        net_proprietaire: z.number().nullable().optional(),
      })).min(1),
    }).parse(req.body);

    const commRate = parseFloat(process.env.CLIENT_COMMISSION_RATE ?? '20');

    const totalBrut        = parseFloat(body.reservations.reduce((s, r) => s + (r.montant ?? 0), 0).toFixed(2));
    const totalCommission  = parseFloat(body.reservations.reduce((s, r) => s + (r.commission_ht ?? 0), 0).toFixed(2));
    const totalNet         = parseFloat(body.reservations.reduce((s, r) => s + (r.net_proprietaire ?? 0), 0).toFixed(2));

    // Numéro de séquence
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', req.clientId);

    const invoiceNumber = generateInvoiceNumber((count || 0) + 1);

    const pdfBuffer = await generateRelevePDF({
      invoiceNumber,
      proprietaire: body.proprietaire,
      mois:         body.mois,
      annee:        body.annee,
      reservations: body.reservations,
      totalBrut,
      totalCommission,
      totalNet,
    });

    // Tenter upload S3
    const pdfUrl = await uploadBuffer(
      pdfBuffer,
      `releves/${invoiceNumber}.pdf`,
      'application/pdf'
    );

    // Sauvegarder en base
    const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const { data: savedInvoice, error: saveErr } = await supabase
      .from('invoices')
      .insert({
        client_id:      req.clientId,
        invoice_number: invoiceNumber,
        type:           'releve_mensuel',
        recipient_data: JSON.stringify(body.proprietaire),
        rows_data:      JSON.stringify(body.reservations),
        total_ht:       totalNet,      // net propriétaire comme montant principal
        tva_amount:     0,
        total_ttc:      totalNet,
        pdf_url:        pdfUrl,
        pdf_data:       pdfUrl ? null : pdfBuffer.toString('base64'),
        status:         'generated',
      })
      .select()
      .single();

    if (saveErr) {
      console.error('[RELEVE] Erreur sauvegarde:', saveErr.message);
    }

    // Enregistrer automatiquement le propriétaire
    await upsertProprietaire(req.clientId, body.proprietaire);

    res.set('Content-Type', 'application/pdf');
    res.set('X-Invoice-Number', invoiceNumber);
    res.set('X-Invoice-Id', savedInvoice?.id || '');
    res.send(pdfBuffer);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

// ── POST /api/invoices/send-direct — Envoyer PDF blob par email (sans DB) ─────
router.post('/send-direct', async (req, res, next) => {
  try {
    const body = z.object({
      email:         z.string().email(),
      subject:       z.string().optional().default('Votre facture StayPilot'),
      pdfBase64:     z.string().min(1),
      invoiceNumber: z.string().optional().default('facture'),
    }).parse(req.body);

    const pdfBuffer = Buffer.from(body.pdfBase64, 'base64');
    const clientName = process.env.CLIENT_NAME || 'StayPilot';

    await sendEmail(
      body.email,
      body.subject,
      `Bonjour,\n\nVeuillez trouver en pièce jointe votre facture ${body.invoiceNumber}.\n\nCordialement,\n${clientName}`,
      null,
      [{
        content:     body.pdfBase64,
        filename:    `${body.invoiceNumber}.pdf`,
        type:        'application/pdf',
        disposition: 'attachment',
      }]
    );

    res.json({ success: true, message: `Facture envoyée à ${body.email}` });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ success: false, error: err.errors });
    next(err);
  }
});

module.exports = router;
