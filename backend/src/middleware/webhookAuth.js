/**
 * webhookAuth.js
 * Middleware de sécurité pour les webhooks entrants.
 *
 * - validateTwilioSignature : valide la signature HMAC Twilio (webhooks SMS/WhatsApp)
 * - validateWebhookSecret   : valide le header X-Webhook-Secret pour les webhooks internes
 */

const crypto = require('crypto');
const twilio = require('twilio');

/**
 * Valide la signature Twilio sur les requêtes webhook SMS/WhatsApp.
 * Utilise twilio.validateRequest() conforme aux specs Twilio.
 * https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
function validateTwilioSignature(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error('[WEBHOOK-AUTH] TWILIO_AUTH_TOKEN manquant — requête Twilio rejetée');
    return res.status(403).json({ success: false, error: 'Configuration webhook manquante' });
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    console.warn('[WEBHOOK-AUTH] Signature Twilio absente — requête rejetée');
    return res.status(403).json({ success: false, error: 'Signature Twilio manquante' });
  }

  // L'URL exacte utilisée par Twilio doit correspondre (protocole + host + path)
  const backendUrl = process.env.BACKEND_URL || `https://${req.headers.host}`;
  const url = `${backendUrl}${req.originalUrl}`;

  // En production Twilio envoie les paramètres en application/x-www-form-urlencoded
  const params = req.body || {};

  const isValid = twilio.validateRequest(authToken, signature, url, params);

  if (!isValid) {
    console.warn(`[WEBHOOK-AUTH] Signature Twilio invalide pour ${url} — requête rejetée`);
    return res.status(403).json({ success: false, error: 'Signature invalide' });
  }

  next();
}

/**
 * Valide le header X-Webhook-Secret pour les webhooks internes (n8n, Superhote, etc.).
 * Utilise crypto.timingSafeEqual pour éviter les attaques par timing.
 */
function validateWebhookSecret(req, res, next) {
  const expected = process.env.WEBHOOK_SECRET;

  if (!expected) {
    // En production, le secret DOIT être configuré
    if (process.env.NODE_ENV === 'production') {
      console.error('[WEBHOOK-AUTH] WEBHOOK_SECRET non configuré en production — requête rejetée');
      return res.status(403).json({ success: false, error: 'Configuration webhook manquante' });
    }
    // En dev/staging, on avertit mais on laisse passer
    console.warn('[WEBHOOK-AUTH] WEBHOOK_SECRET non configuré — validation désactivée (dev uniquement)');
    return next();
  }

  const provided = req.headers['x-webhook-secret'];
  if (!provided) {
    console.warn('[WEBHOOK-AUTH] Header X-Webhook-Secret absent — requête rejetée');
    return res.status(403).json({ success: false, error: 'Header X-Webhook-Secret manquant' });
  }

  // Comparaison timing-safe pour prévenir les attaques par oracle temporel
  try {
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(provided, 'utf8');

    // Les buffers doivent avoir la même longueur pour timingSafeEqual
    if (expectedBuf.length !== providedBuf.length) {
      console.warn('[WEBHOOK-AUTH] Secret invalide (longueur incorrecte) — requête rejetée');
      return res.status(403).json({ success: false, error: 'Secret invalide' });
    }

    if (!crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      console.warn('[WEBHOOK-AUTH] Secret invalide — requête rejetée');
      return res.status(403).json({ success: false, error: 'Secret invalide' });
    }
  } catch {
    return res.status(403).json({ success: false, error: 'Secret invalide' });
  }

  next();
}

module.exports = { validateTwilioSignature, validateWebhookSecret };
