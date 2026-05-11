const twilio = require('twilio');

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error('TWILIO_ACCOUNT_SID et TWILIO_AUTH_TOKEN requis');
    }
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

/**
 * Normalise un numéro de téléphone en format E.164.
 * Gère les numéros français : 06/07 → +336/+337
 */
function toE164(number) {
  const clean = number.replace(/[\s\-\.]/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('00')) return '+' + clean.slice(2);
  if (clean.startsWith('0')) return '+33' + clean.slice(1); // France
  return '+' + clean;
}

/**
 * Envoie un SMS via Twilio.
 * @param {string} to — numéro (format libre, converti en E.164)
 * @param {string} body — contenu du message
 */
async function sendSMS(to, body) {
  const c = getClient();
  const toFormatted = toE164(to);
  const message = await c.messages.create({
    body,
    from: process.env.TWILIO_PHONE_SMS,
    to: toFormatted,
  });
  console.log(`[TWILIO] SMS envoyé à ${to} — SID: ${message.sid}`);
  return message;
}

/**
 * Envoie un message WhatsApp via Twilio.
 * @param {string} to — numéro au format E.164 (+33612345678)
 * @param {string} body — contenu du message
 */
async function sendWhatsApp(to, body) {
  const c = getClient();
  // Twilio WhatsApp : préfixe "whatsapp:" obligatoire
  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const message = await c.messages.create({
    body,
    from: process.env.TWILIO_PHONE_WHATSAPP,
    to: toWhatsApp,
  });
  console.log(`[TWILIO] WhatsApp envoyé à ${to} — SID: ${message.sid}`);
  return message;
}

module.exports = { sendSMS, sendWhatsApp };
