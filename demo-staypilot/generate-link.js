#!/usr/bin/env node
/**
 * StayPilot — Générateur de liens démo (CLI)
 *
 * Usage:
 *   node generate-link.js "Thomas Wagner"
 *   node generate-link.js "Thomas Wagner" 7        # expire dans 7 jours (défaut: 3)
 *   node generate-link.js "Thomas Wagner" 30       # expire dans 30 jours
 *
 * Nécessite Node.js 18+ (Web Crypto natif)
 */

const DEMO_BASE_URL = 'https://demo.staypilot.cc/index.html';
const SECRET = 'SP-DEMO-2026-staypilot-x9k2m';   // ← même clé dans generate.html / index.html

async function hmacSign(message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Buffer.from(sig).toString('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const name = args[0];
  const days = parseInt(args[1] || '3', 10);

  if (!name) {
    console.error('\n❌ Erreur : entrez un nom de prospect.\n');
    console.error('  Usage : node generate-link.js "Prénom Nom" [jours]\n');
    console.error('  Exemples :');
    console.error('    node generate-link.js "Thomas Wagner"');
    console.error('    node generate-link.js "Marie Dupont" 7\n');
    process.exit(1);
  }

  if (isNaN(days) || days < 1 || days > 90) {
    console.error('\n❌ Erreur : la durée doit être entre 1 et 90 jours.\n');
    process.exit(1);
  }

  const exp = Math.floor(Date.now() / 1000) + days * 86400;
  const sig = await hmacSign(`${name}:${exp}`);
  const url = `${DEMO_BASE_URL}?p=${encodeURIComponent(name)}&exp=${exp}&sig=${sig}`;

  const expDate = new Date(exp * 1000).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  console.log('\n✅ Lien démo généré !\n');
  console.log(`  Prospect  : ${name}`);
  console.log(`  Expire le : ${expDate} (${days} jours)\n`);
  console.log('  🔗 ' + url + '\n');
}

main().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
