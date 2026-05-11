const Anthropic = require('@anthropic-ai/sdk');

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY requis');
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Génère une réponse IA pour un message entrant d'un voyageur.
 *
 * @param {object} params
 * @param {string} params.message — Le message reçu du voyageur
 * @param {Array}  params.historique — Historique [{direction, contenu}]
 * @param {object} params.voyageur — { nom, checkin, checkout }
 * @returns {Promise<string>} Texte de la réponse générée
 */
async function generateReply({ message, historique = [], voyageur = {} }) {
  const claude = getClient();

  const systemPrompt = `Tu es un assistant concierge professionnel pour des locations Airbnb.
Tu réponds aux messages des voyageurs de façon courtoise, concise et utile en français.
Ton rôle : accueil chaleureux, informations sur le logement, résolution de problèmes simples.
Ne donne JAMAIS d'informations sensibles (codes d'accès) par ce canal non sécurisé.
Réponds toujours en moins de 3 phrases, de façon naturelle et humaine.

Contexte réservation :
- Voyageur : ${voyageur.nom || 'Voyageur'}
- Check-in : ${voyageur.checkin || 'à confirmer'}
- Check-out : ${voyageur.checkout || 'à confirmer'}`;

  // Construire l'historique au format messages Anthropic
  const messages = [];

  // Ajouter l'historique (max 8 messages pour ne pas dépasser le contexte)
  const historiqueRecent = historique.slice(-8);
  for (const msg of historiqueRecent) {
    messages.push({
      role: msg.direction === 'sortant' ? 'assistant' : 'user',
      content: msg.contenu,
    });
  }

  // Ajouter le message actuel
  messages.push({ role: 'user', content: message });

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001', // Rapide et économique pour les réponses temps-réel
    max_tokens: 300,
    system: systemPrompt,
    messages,
  });

  const reponse = response.content[0]?.text || 'Je reviens vers vous dans les plus brefs délais.';
  console.log(`[CLAUDE] Réponse générée pour message: "${message.slice(0, 50)}…"`);
  return reponse;
}

/**
 * Génère un résumé de séjour personnalisé pour un voyageur.
 */
async function generateCheckinMessage({ voyageur, logement }) {
  const claude = getClient();

  const response = await claude.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Génère un message de bienvenue pour ${voyageur.nom} qui arrive le ${voyageur.checkin}
dans "${logement.nom}". Message chaleureux, professionnel, en français. 3-4 phrases max.`,
    }],
  });

  return response.content[0]?.text || '';
}

module.exports = { generateReply, generateCheckinMessage };
