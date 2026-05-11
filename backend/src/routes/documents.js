/**
 * documents.js — Gestion des documents propriétaires
 *
 * GET    /api/documents                  → liste des documents du client
 * POST   /api/documents                  → upload d'un document (multipart)
 * GET    /api/documents/:id/download     → télécharger un document (blob)
 * DELETE /api/documents/:id             → désactiver un document
 */

const express = require('express');
const multer  = require('multer');
const supabase = require('../config/supabase');
const { authenticate } = require('../middleware/auth');
const { uploadBuffer }  = require('../services/s3');

const router = express.Router();
router.use(authenticate);

// Multer : fichiers en mémoire (max 20 Mo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non supporté. Utilisez PDF, Word, JPG ou PNG.'));
    }
  },
});

/** Détermine la catégorie depuis le nom du fichier */
function guessCategory(filename = '') {
  const lower = filename.toLowerCase();
  if (lower.includes('contrat') || lower.includes('contract')) return 'contract';
  if (lower.includes('avenant') || lower.includes('amendment')) return 'amendment';
  if (lower.includes('annexe') || lower.includes('annex'))      return 'annex';
  return 'other';
}

// ── GET /api/documents ────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { category, owner_email } = req.query;

    let query = supabase
      .from('documents')
      .select('id, category, title, file_name, file_url, file_size, file_mime, owner_email, created_at')
      .eq('client_id', req.clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category)    query = query.eq('category', category);
    if (owner_email) query = query.eq('owner_email', owner_email);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data ?? [] });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/documents ───────────────────────────────────────────────────────
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Fichier manquant' });
    }

    const title       = req.body.title ?? req.file.originalname.replace(/\.[^.]+$/, '');
    const category    = req.body.category ?? guessCategory(req.file.originalname);
    const ownerEmail  = req.body.owner_email ?? null;

    // Tenter upload S3 (si configuré)
    let fileUrl  = null;
    let fileData = null;

    try {
      const key = `documents/${req.clientId}/${Date.now()}-${req.file.originalname}`;
      fileUrl = await uploadBuffer(req.file.buffer, key, req.file.mimetype);
    } catch {
      // S3 non configuré → stocker en base64 en base
      fileData = req.file.buffer.toString('base64');
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        client_id:  req.clientId,
        owner_email: ownerEmail,
        category,
        title,
        file_name:  req.file.originalname,
        file_url:   fileUrl,
        file_data:  fileData,
        file_mime:  req.file.mimetype,
        file_size:  req.file.size,
        is_active:  true,
      })
      .select('id, category, title, file_name, file_url, file_size, file_mime, owner_email, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.name === 'MulterError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

// ── GET /api/documents/:id/download ──────────────────────────────────────────
router.get('/:id/download', async (req, res, next) => {
  try {
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .eq('is_active', true)
      .single();

    if (error || !doc) {
      return res.status(404).json({ success: false, error: 'Document introuvable' });
    }

    // Si URL externe (S3), rediriger
    if (doc.file_url) {
      return res.redirect(doc.file_url);
    }

    // Sinon, servir depuis base64
    if (doc.file_data) {
      const buffer = Buffer.from(doc.file_data, 'base64');
      res.set('Content-Type', doc.file_mime ?? 'application/octet-stream');
      res.set('Content-Disposition', `attachment; filename="${doc.file_name}"`);
      res.set('Content-Length', buffer.length);
      return res.send(buffer);
    }

    res.status(404).json({ success: false, error: 'Fichier non disponible' });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('id', req.params.id)
      .eq('client_id', req.clientId)
      .single();

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Document introuvable' });
    }

    // Soft delete
    const { error } = await supabase
      .from('documents')
      .update({ is_active: false })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
