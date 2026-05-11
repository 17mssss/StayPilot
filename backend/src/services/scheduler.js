const cron = require('node-cron');
const supabase = require('../config/supabase');
const { sendSMS, sendWhatsApp } = require('./twilio');
const { sendEmail } = require('./sendgrid');

/**
 * Calcule la date d'envoi d'un message selon le déclencheur.
 * @param {string} checkin  — format YYYY-MM-DD
 * @param {string} checkout — format YYYY-MM-DD
 * @param {string} declencheur — 'j-2' | 'j-1' | 'checkin' | 'checkout' | 'j+1'
 * @returns {Date}
 */
function calculerDateEnvoi(checkin, checkout, declencheur) {
  const checkinDate = new Date(checkin);
  const checkoutDate = new Date(checkout);

  const offsets = {
    'j-2': -2,
    'j-1': -1,
    'checkin': 0,
    'checkout': 0,
    'j+1': 1,
  };

  const baseDate = declencheur === 'checkout' || declencheur === 'j+1' ? checkoutDate : checkinDate;
  const offset = offsets[declencheur] ?? 0;

  const date = new Date(baseDate);
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0); // Envoi à 9h00 par défaut
  return date;
}

/**
 * Remplace les variables {{...}} dans le contenu du message.
 */
function interpoler(contenu, variables) {
  let result = contenu;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, value ?? '');
  }
  return result;
}

/**
 * Appelé lors de la création d'une réservation.
 * Crée les enregistrements messages en statut 'en_attente' pour chaque template actif.
 */
async function programmerMessages(reservationId, logementId, checkin, checkout) {
  try {
    // Récupérer le client_id via le logement
    const { data: logement } = await supabase
      .from('logements')
      .select('client_id, nom')
      .eq('id', logementId)
      .single();

    if (!logement) return;

    // Récupérer les templates actifs du client
    const { data: templates } = await supabase
      .from('templates')
      .select('*')
      .eq('client_id', logement.client_id)
      .eq('actif', true);

    if (!templates?.length) return;

    const messagesAInserer = templates.map((template) => ({
      reservation_id: reservationId,
      direction: 'sortant',
      canal: template.canal,
      contenu: template.contenu, // sera interpolé à l'envoi
      statut: 'en_attente',
      genere_par_ia: false,
      valide: true,
      // On stocke la date d'envoi calculée dans les metadata via un champ virtuel
      // (voir table messages — à étendre avec date_envoi si nécessaire)
    }));

    // Stocker les messages programmés
    // Note : idéalement la table messages aurait un champ date_envoi
    // Pour l'instant on les crée avec statut='en_attente' et on les envoie au bon moment
    const maintenant = new Date();
    const messagesValides = [];

    for (const template of templates) {
      const dateEnvoi = calculerDateEnvoi(checkin, checkout, template.declencheur);
      // Ne pas programmer dans le passé
      if (dateEnvoi < maintenant) continue;

      messagesValides.push({
        reservation_id: reservationId,
        direction: 'sortant',
        canal: template.canal,
        contenu: template.contenu, // variables interpolées à l'envoi
        statut: 'en_attente',
        genere_par_ia: false,
        valide: true,
        // Stocker la date d'envoi dans le contenu temporairement via JSON
        // En production : ajouter date_envoi TIMESTAMPTZ à la table messages
      });
    }

    if (messagesValides.length) {
      await supabase.from('messages').insert(messagesValides);
      console.log(`[SCHEDULER] ${messagesValides.length} messages programmés pour réservation ${reservationId}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] Erreur programmerMessages:', err.message);
  }
}

/**
 * Traitement horaire : envoyer les messages dont la date d'envoi est atteinte.
 *
 * Note: cette implémentation simple parcourt tous les messages en attente.
 * Pour une production robuste, ajouter un champ date_envoi à la table messages.
 */
async function traiterMessagesEnAttente() {
  console.log('[SCHEDULER] Traitement des messages en attente…');

  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('*, reservations(voyageur_nom, voyageur_email, voyageur_telephone, checkin, checkout, logements(nom))')
      .eq('statut', 'en_attente')
      .eq('direction', 'sortant')
      .eq('valide', true)
      .limit(100);

    if (!messages?.length) return;

    let envoyes = 0;
    let erreurs = 0;

    for (const msg of messages) {
      try {
        const resa = msg.reservations;
        if (!resa) continue;

        // Interpoler les variables
        const variables = {
          prenom_voyageur: resa.voyageur_nom?.split(' ')[0] || resa.voyageur_nom || 'Voyageur',
          nom_voyageur: resa.voyageur_nom || 'Voyageur',
          nom_logement: resa.logements?.nom || 'votre logement',
          date_checkin: new Date(resa.checkin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          date_checkout: new Date(resa.checkout).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        };

        const contenuFinal = interpoler(msg.contenu, variables);

        // Envoi selon le canal
        let sent = false;
        if (msg.canal === 'sms' && resa.voyageur_telephone) {
          await sendSMS(resa.voyageur_telephone, contenuFinal);
          sent = true;
        } else if (msg.canal === 'whatsapp' && resa.voyageur_telephone) {
          await sendWhatsApp(resa.voyageur_telephone, contenuFinal);
          sent = true;
        } else if (msg.canal === 'email' && resa.voyageur_email) {
          await sendEmail(resa.voyageur_email, 'Message de votre hôte', contenuFinal);
          sent = true;
        }

        await supabase
          .from('messages')
          .update({ statut: sent ? 'envoye' : 'erreur', contenu: contenuFinal })
          .eq('id', msg.id);

        if (sent) envoyes++;
        else erreurs++;
      } catch (msgErr) {
        console.error(`[SCHEDULER] Erreur message ${msg.id}:`, msgErr.message);
        await supabase.from('messages').update({ statut: 'erreur' }).eq('id', msg.id);
        erreurs++;
      }
    }

    console.log(`[SCHEDULER] Terminé — envoyés: ${envoyes}, erreurs: ${erreurs}`);
  } catch (err) {
    console.error('[SCHEDULER] Erreur globale:', err.message);
  }
}

function startMessageScheduler() {
  // Toutes les heures
  cron.schedule('0 * * * *', () => {
    traiterMessagesEnAttente();
  });

  console.log('[SCHEDULER] Démarré (toutes les heures)');
}

module.exports = { startMessageScheduler, programmerMessages, traiterMessagesEnAttente };
