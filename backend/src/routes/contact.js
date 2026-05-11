const express = require('express');
const sgMail = require('@sendgrid/mail');
const router = express.Router();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ── Sanitisation XSS ──────────────────────────────────────────────────────────
// Empêche l'injection HTML/JS dans les templates email
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Validation manuelle des inputs contact ────────────────────────────────────
function validateContactInput({ name, email, phone, message }) {
  const errors = [];

  // name : requis, max 100 chars
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Nom requis');
  } else if (name.trim().length > 100) {
    errors.push('Nom trop long (max 100 caractères)');
  }

  // email : requis, format valide, max 254 chars
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
    errors.push('Adresse email invalide');
  } else if (email.trim().length > 254) {
    errors.push('Email trop long (max 254 caractères)');
  }

  // phone : optionnel, max 20 chars
  if (phone && String(phone).trim().length > 20) {
    errors.push('Téléphone trop long (max 20 caractères)');
  }

  // message : optionnel, max 5000 chars
  if (message && String(message).trim().length > 5000) {
    errors.push('Message trop long (max 5000 caractères)');
  }

  return errors;
}

// POST /api/contact — formulaire demande de démo
router.post('/', async (req, res) => {
  // Trim des inputs avant validation
  const name    = String(req.body.name    || '').trim();
  const email   = String(req.body.email   || '').trim();
  const phone   = String(req.body.phone   || '').trim();
  const message = String(req.body.message || '').trim();

  // Validation
  const validationErrors = validateContactInput({ name, email, phone, message });
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: validationErrors[0], errors: validationErrors });
  }

  // Sanitisation XSS avant injection dans le HTML de l'email
  const safeName    = escapeHtml(name);
  const safeEmail   = escapeHtml(email);
  const safePhone   = escapeHtml(phone);
  const safeMessage = escapeHtml(message);

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@staypilot.cc';

  try {
    await sgMail.send({
      from: { name: 'StayPilot Contact', email: fromEmail },
      to: fromEmail,
      replyTo: safeEmail,
      subject: `Nouvelle demande de démo — ${safeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f97316;">Nouvelle demande de démo StayPilot</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold; color: #666;">Nom</td><td style="padding: 8px;">${safeName}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">Email</td><td style="padding: 8px;"><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>
            <tr><td style="padding: 8px; font-weight: bold; color: #666;">Téléphone</td><td style="padding: 8px;">${safePhone || '—'}</td></tr>
            <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">Biens gérés</td><td style="padding: 8px;">${safeMessage || '—'}</td></tr>
          </table>
          <p style="margin-top: 24px; color: #888; font-size: 12px;">
            Envoyé depuis staypilot.cc — Réponds directement à cet email pour contacter ${safeName}.
          </p>
        </div>
      `,
    });

    res.json({ success: true, message: 'Demande envoyée avec succès' });
  } catch (err) {
    console.error('Erreur envoi email contact:', err);
    res.status(500).json({ error: 'Erreur lors de l\'envoi' });
  }
});

module.exports = router;
