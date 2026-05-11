/**
 * smoobu.js — Intégration Smoobu Channel Manager
 * Docs : https://docs.smoobu.com/
 *
 * Auth   : header Api-Key
 * Base   : https://login.smoobu.com/api
 */

const axios = require('axios');

const BASE = 'https://login.smoobu.com/api';

// ── Client HTTP ───────────────────────────────────────────────────────────────
function client(apiKey) {
  return axios.create({
    baseURL: BASE,
    headers: {
      'Api-Key': apiKey,
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  });
}

// ── Récupérer les réservations ────────────────────────────────────────────────
/**
 * @param {string} apiKey
 * @param {string} from  YYYY-MM-DD
 * @param {string} to    YYYY-MM-DD
 * @param {number} [propertyId]  filtre optionnel par propriété
 */
async function getReservations(apiKey, from, to, propertyId = null) {
  const params = {
    from,
    to,
    pageSize: 100,
    page: 1,
    showCancellation: 1, // inclure les annulations
  };
  if (propertyId) params['apartments[0]'] = propertyId;

  const resp = await client(apiKey).get('/reservations', { params });
  return resp.data?.bookings ?? [];
}

// ── Récupérer les logements Smoobu (pour affichage dans l'UI) ─────────────────
async function getProperties(apiKey) {
  const resp = await client(apiKey).get('/apartments');
  return resp.data?.apartments ?? [];
}

// ── Mapper une réservation Smoobu → format interne StayPilot ─────────────────
function normalize(booking, logementId) {
  const prenom = booking.firstname ?? '';
  const nom    = booking.lastname  ?? '';
  return {
    logement_id:        logementId,
    external_id:        String(booking.id),
    provider:           'smoobu',
    voyageur_nom:       [prenom, nom].filter(Boolean).join(' ') || 'Voyageur',
    voyageur_email:     booking.email           ?? null,
    voyageur_telephone: booking.phone           ?? null,
    checkin:            booking.arrival,
    checkout:           booking.departure,
    montant_total:      booking.price           ?? null,
    nb_voyageurs:       (booking.adults ?? 0) + (booking.children ?? 0) || null,
    statut:             mapStatus(booking.type),
    plateforme:         mapChannel(booking.channel?.name),
  };
}

function mapStatus(type) {
  if (type === 'cancellation' || type === 'blocked') return 'annulee';
  return 'confirmee';
}

function mapChannel(name) {
  if (!name) return 'smoobu';
  const n = name.toLowerCase();
  if (n.includes('airbnb'))  return 'airbnb';
  if (n.includes('booking')) return 'booking';
  if (n.includes('vrbo') || n.includes('abritel')) return 'abritel';
  return name;
}

// ── Vérifier la connectivité (test de la clé API) ─────────────────────────────
async function testConnection(apiKey) {
  try {
    const resp = await client(apiKey).get('/me');
    return { ok: true, user: resp.data };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message ?? err.message };
  }
}

module.exports = { getReservations, getProperties, normalize, testConnection };
