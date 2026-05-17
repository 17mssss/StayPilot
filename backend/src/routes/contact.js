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

  // Expéditeur vérifié SendGrid (doit correspondre à un sender vérifié dans SendGrid)
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'madoumsypro@gmail.com';
  // Destinataire des notifications (là où tu reçois les demandes de démo)
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL || fromEmail;

  try {
    await sgMail.send({
      from: { name: 'StayPilot', email: fromEmail },
      to: notifyEmail,
      replyTo: { name: safeName, email: safeEmail },
      subject: `🔔 Nouvelle demande de démo — ${safeName}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <div style="background: #EA580C; padding: 24px 28px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="background: rgba(255,255,255,0.2); border-radius: 8px; width: 36px; height: 36px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; color: white; font-size: 16px;">S</div>
              <span style="color: white; font-weight: 700; font-size: 18px;">StayPilot</span>
            </div>
            <h2 style="color: white; margin: 14px 0 4px; font-size: 20px;">🔔 Nouvelle demande de démo</h2>
            <p style="color: rgba(255,255,255,0.75); margin: 0; font-size: 13px;">Reçue le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <!-- Body -->
          <div style="padding: 24px 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600; width: 130px;">👤 Nom</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-weight: 600;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600;">📧 Email</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;"><a href="mailto:${safeEmail}" style="color: #EA580C;">${safeEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-weight: 600;">📞 Téléphone</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; color: #111827;">${safePhone ? `<a href="tel:${safePhone}" style="color:#EA580C;">${safePhone}</a>` : '—'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-weight: 600;">🏘️ Biens gérés</td>
                <td style="padding: 10px 0; color: #111827;">${safeMessage || '—'}</td>
              </tr>
            </table>

            <div style="margin-top: 20px; background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 14px 16px; font-size: 13px; color: #92400E;">
              <strong>Action à faire :</strong> appelle ${safeName}${safePhone ? ` au ${safePhone}` : ''}, puis génère son lien démo avec :<br/>
              <code style="background: white; padding: 2px 6px; border-radius: 4px; margin-top: 6px; display: inline-block; font-size: 12px;">node generate-link.js "${safeName}" 7</code>
            </div>
          </div>
          <!-- Footer -->
          <div style="padding: 14px 28px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;">
            Formulaire de contact — staypilot.cc · Répondre à cet email contacte directement ${safeName}
          </div>
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
