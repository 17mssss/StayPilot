/**
 * seed.js — Peuple la base Supabase avec des données de test réalistes.
 * Usage : node src/scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CLIENT_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@staypilot-test.fr';

async function seed() {
  console.log('\n🌱 StayPilot — Seed de la base de données\n');

  // ── 1. Client ─────────────────────────────────────────────────────────────
  console.log('1/6 Upsert client...');
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .upsert({ email: CLIENT_EMAIL, nom: 'Ma Conciergerie Test', plan: 'pro' }, { onConflict: 'email' })
    .select()
    .single();

  if (clientError) { console.error('❌ Client:', clientError.message); process.exit(1); }
  console.log(`   ✅ Client : ${client.nom} (${client.id})`);

  const clientId = client.id;

  // ── 2. Logements ──────────────────────────────────────────────────────────
  console.log('2/6 Logements...');
  const logementsData = [
    {
      client_id: clientId,
      nom: 'Studio Montmartre',
      canaux: { sms: true, email: true, whatsapp: false },
      autopilote: true,
      superhote_property_key: null,
      superhote_api_key: null,
    },
    {
      client_id: clientId,
      nom: 'Appartement Marais',
      canaux: { sms: false, email: true, whatsapp: true },
      autopilote: false,
      superhote_property_key: null,
      superhote_api_key: null,
    },
  ];

  const { data: logements, error: logementsError } = await supabase
    .from('logements')
    .upsert(logementsData, { onConflict: 'id', ignoreDuplicates: false })
    .select();

  if (logementsError) { console.error('❌ Logements:', logementsError.message); process.exit(1); }

  // Récupérer les logements existants si déjà créés
  const { data: allLogements } = await supabase
    .from('logements')
    .select('*')
    .eq('client_id', clientId)
    .limit(2);

  const logement1 = allLogements?.[0];
  const logement2 = allLogements?.[1];
  console.log(`   ✅ ${allLogements?.length} logements`);

  if (!logement1 || !logement2) {
    console.error('❌ Impossible de récupérer les logements');
    process.exit(1);
  }

  // ── 3. Réservations ───────────────────────────────────────────────────────
  console.log('3/6 Réservations...');
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };

  const reservationsData = [
    // Réservation en cours
    {
      logement_id: logement1.id,
      superhote_id: 'SIM-001',
      voyageur_nom: 'Sophie Martin',
      voyageur_email: process.env.TEST_EMAIL || 'voyageur1@example.com',
      voyageur_telephone: process.env.TEST_PHONE || '+33600000001',
      checkin: fmt(addDays(today, -1)),
      checkout: fmt(addDays(today, 2)),
      statut: 'confirmee',
    },
    // Réservation à venir (dans 3 jours)
    {
      logement_id: logement1.id,
      superhote_id: 'SIM-002',
      voyageur_nom: 'Thomas Dupont',
      voyageur_email: process.env.TEST_EMAIL || 'voyageur2@example.com',
      voyageur_telephone: process.env.TEST_PHONE || '+33600000002',
      checkin: fmt(addDays(today, 3)),
      checkout: fmt(addDays(today, 7)),
      statut: 'confirmee',
    },
    // Réservation passée
    {
      logement_id: logement2.id,
      superhote_id: 'SIM-003',
      voyageur_nom: 'Emma Wilson',
      voyageur_email: process.env.TEST_EMAIL || 'voyageur3@example.com',
      voyageur_telephone: process.env.TEST_PHONE || '+33600000003',
      checkin: fmt(addDays(today, -10)),
      checkout: fmt(addDays(today, -7)),
      statut: 'confirmee',
    },
    // Réservation future lointaine
    {
      logement_id: logement2.id,
      superhote_id: 'SIM-004',
      voyageur_nom: 'Lucas Bernard',
      voyageur_email: process.env.TEST_EMAIL || 'voyageur4@example.com',
      voyageur_telephone: process.env.TEST_PHONE || '+33600000004',
      checkin: fmt(addDays(today, 14)),
      checkout: fmt(addDays(today, 18)),
      statut: 'confirmee',
    },
  ];

  // Upsert par superhote_id
  for (const r of reservationsData) {
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('superhote_id', r.superhote_id)
      .single();

    if (!existing) {
      const { error } = await supabase.from('reservations').insert(r);
      if (error) console.warn(`   ⚠️  Réservation ${r.superhote_id}: ${error.message}`);
    }
  }

  const { data: allResas } = await supabase
    .from('reservations')
    .select('*')
    .eq('logement_id', logement1.id);

  const resa1 = allResas?.[0];
  console.log(`   ✅ 4 réservations créées/existantes`);

  // ── 4. Templates ──────────────────────────────────────────────────────────
  console.log('4/6 Templates de messages...');
  const templatesData = [
    {
      client_id: clientId,
      nom: 'Bienvenue J-2',
      declencheur: 'j-2',
      canal: 'email',
      sujet: 'Votre séjour à {{nom_logement}} dans 2 jours !',
      contenu: `Bonjour {{prenom_voyageur}},

Votre séjour à {{nom_logement}} commence dans 2 jours (le {{date_checkin}}).

Voici quelques informations utiles :
• Adresse : {{adresse_logement}}
• Code d'accès : {{code_acces}}
• WiFi : {{wifi_nom}} / {{wifi_mdp}}

N'hésitez pas à nous contacter pour toute question.

À très bientôt !
L'équipe StayPilot`,
      actif: true,
      delai_heures: 0,
    },
    {
      client_id: clientId,
      nom: 'Instructions check-in',
      declencheur: 'checkin',
      canal: 'sms',
      sujet: null,
      contenu: `Bonjour {{prenom_voyageur}} ! Bienvenue à {{nom_logement}}. Code d'accès : {{code_acces}}. WiFi : {{wifi_nom}} / {{wifi_mdp}}. Bon séjour ! 🏠`,
      actif: true,
      delai_heures: 0,
    },
    {
      client_id: clientId,
      nom: 'Rappel check-out',
      declencheur: 'checkout',
      canal: 'sms',
      sujet: null,
      contenu: `Bonjour {{prenom_voyageur}}, votre départ de {{nom_logement}} est aujourd'hui. Merci de laisser les clés sur la table. Nous espérons vous revoir ! ✨`,
      actif: true,
      delai_heures: 0,
    },
    {
      client_id: clientId,
      nom: 'Demande d\'avis J+1',
      declencheur: 'j+1',
      canal: 'email',
      sujet: 'Comment s\'est passé votre séjour ?',
      contenu: `Bonjour {{prenom_voyageur}},

Nous espérons que votre séjour à {{nom_logement}} s'est bien passé !

Votre avis nous aide à nous améliorer. Pourriez-vous prendre 2 minutes pour laisser un commentaire sur Airbnb ?

Merci et à bientôt !
L'équipe StayPilot`,
      actif: true,
      delai_heures: 24,
    },
  ];

  for (const t of templatesData) {
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('client_id', clientId)
      .eq('nom', t.nom)
      .single();

    if (!existing) {
      const { error } = await supabase.from('templates').insert(t);
      if (error) console.warn(`   ⚠️  Template "${t.nom}": ${error.message}`);
    }
  }
  console.log(`   ✅ 4 templates créés/existants`);

  // ── 5. Messages de test ───────────────────────────────────────────────────
  console.log('5/6 Messages de test...');
  if (resa1) {
    const messagesData = [
      {
        reservation_id: resa1.id,
        direction: 'sortant',
        canal: 'email',
        contenu: 'Bonjour Sophie ! Votre séjour commence demain. Code d\'accès : 1234#. WiFi : StayPilot_Guest / welcome2026. Bon séjour !',
        statut: 'envoye',
        genere_par_ia: false,
        valide: true,
      },
      {
        reservation_id: resa1.id,
        direction: 'entrant',
        canal: 'sms',
        contenu: 'Bonjour, est-ce que je peux arriver plus tôt ? Vers 13h ?',
        statut: 'envoye',
        genere_par_ia: false,
        valide: false,
      },
      {
        reservation_id: resa1.id,
        direction: 'sortant',
        canal: 'sms',
        contenu: 'Bonjour Sophie ! Bien sûr, vous pouvez arriver à partir de 14h. N\'hésitez pas si vous avez d\'autres questions 😊',
        statut: 'envoye',
        genere_par_ia: true,
        valide: true,
      },
    ];

    for (const m of messagesData) {
      const { error } = await supabase.from('messages').insert(m);
      if (error) console.warn(`   ⚠️  Message: ${error.message}`);
    }
    console.log(`   ✅ 3 messages de test`);
  } else {
    console.log('   ⚠️  Pas de réservation disponible pour les messages');
  }

  // ── 6. Résumé ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed terminé avec succès !\n');
  console.log('─────────────────────────────────────────');
  console.log(`Client admin    : ${CLIENT_EMAIL}`);
  console.log(`Logements       : ${allLogements?.length}`);
  console.log(`Réservations    : 4`);
  console.log(`Templates       : 4`);
  console.log(`Messages        : 3`);
  console.log('─────────────────────────────────────────');
  console.log('\n➡️  Créer le compte dans Supabase Auth :');
  console.log(`   app.supabase.com → Authentication → Users → "Add user"`);
  console.log(`   Email: ${CLIENT_EMAIL} | Password: Test1234!`);
  console.log('\n');
}

seed().catch((err) => {
  console.error('❌ Erreur fatale:', err.message);
  process.exit(1);
});
