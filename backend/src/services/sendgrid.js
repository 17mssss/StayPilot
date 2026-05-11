const sgMail = require('@sendgrid/mail');

let initialized = false;

function getMailer() {
  if (!initialized) {
    if (!process.env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY requis');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    initialized = true;
  }
  return sgMail;
}

/**
 * Envoie un email via SendGrid.
 * @param {string} to — adresse email destinataire
 * @param {string} subject — sujet
 * @param {string} text — contenu texte (plain)
 * @param {string} [html] — contenu HTML optionnel
 */
async function sendEmail(to, subject, text, html = null, attachments = []) {
  const mailer = getMailer();

  const msg = {
    to,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM || 'noreply@staypilot.fr',
      name:  process.env.SENDGRID_FROM_NAME  || 'StayPilot',
    },
    subject,
    text,
    ...(html        ? { html }        : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  };

  const [response] = await mailer.send(msg);
  console.log(`[SENDGRID] Email envoyé à ${to} — Status: ${response.statusCode}`);
  return response;
}

/**
 * Envoie un email HTML depuis un template.
 */
async function sendEmailHtml(to, subject, html) {
  return sendEmail(to, subject, html.replace(/<[^>]+>/g, ''), html);
}

module.exports = { sendEmail, sendEmailHtml };
