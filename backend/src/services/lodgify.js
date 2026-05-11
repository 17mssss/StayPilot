/**
 * lodgify.js — Intégration Lodgify Channel Manager
 * Docs : https://docs.lodgify.com/reference
 *
 * Auth   : header X-ApiKey
 * Base   : https://api.lodgify.com
 */

const axios = require('axios');

const BASE = 'https://api.lodgify.com';

// ── Client HTTP ───────────────────────────────────────────────────────────────
function client(apiKey) {
  return axios.create({
    baseURL: BASE,
    headers: {
      'X-ApiKey': apiKey,
      'Content-Type': 'application/json',
    },
    timeout: 15_000,
  });
}

// ── Récupérer les réservations ────────────────────────────────────────────────
/**
 * @param {string} apiKey
 * @param {string} from   YYYY-MM-DD
 * @param {string} to     YYYY-MM-DD
 * @param {number} [propertyId]
 */
async function getReservations(apiKey, from, to, propertyId = null) {
  const params = {
    periodFrom:   from,
    periodTo:     to,
    includeCount: false,
    page:         1,
    size:         100,
  };
  if (propertyId) params.propertyId = propertyId;

  const resp = await client(apiKey).get('/v2/reservations', { params });
  return resp.data?.items ?? resp.data ?? [];
}

// ── Récupérer les propriétés Lodgify ─────────────────────────────────────────
async function getProperties(apiKey) {
  const resp = await client(apiKey).get('/v2/properties');
  return resp.data?.items ?? resp.data ?? [];
}

// ── Récupérer les disponibilités ─────────────────────────────────────────────
async function getAvailability(apiKey, propertyId, from, to) {
  const resp = await client(apiKey).get(`/v2/availability/${propertyId}`, {
    params: { startDate: from, endDate: to },
  });
  return resp.data ?? null;
}

// ── Mapper une réservation Lodgify → format interne StayPilot ────────────────
function normalize(booking, logementId) {
  const guest = booking.guest ?? {};
  return {
    logement_id:        logementId,
    external_id:        String(booking.id),
    provider:           'lodgify',
    voyageur_nom:       guest.name ?? ([guest.first_name, guest.last_name].filter(Boolean).join(' ') || 'Voyageur'),
    voyageur_email:     guest.email ?? null,
    voyageur_telephone: guest.phone ?? guest.phone_number ?? null,
    checkin:            booking.arrival   ?? booking.date_arrival,
    checkout:           booking.departure ?? booking.date_departure,
    montant_total:      booking.total_amount ?? booking.price ?? null,
    nb_voyageurs:       booking.guest_count  ?? booking.people_count ?? null,
    statut:             mapStatus(booking.status),
    plateforme:         mapChannel(booking.source ?? booking.channel_name),
  };
}

function mapStatus(status) {
  const s = (status ?? '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled' || s === 'declined') return 'annulee';
  if (s === 'inquiry' || s === 'pending' || s === 'tentative')   return 'en_attente';
  return 'confirmee';
}

function mapChannel(source) {
  if (!source) return 'lodgify';
  const s = source.toLowerCase();
  if (s.includes('airbnb'))          return 'airbnb';
  if (s.includes('booking'))         return 'booking';
  if (s.includes('vrbo') || s.includes('homeaway') || s.includes('abritel')) return 'abritel';
  if (s.includes('direct') || s.includes('website') || s.includes('lodgify')) return 'direct';
  return source;
}

// ── Vérifier la connectivité ──────────────────────────────────────────────────
async function testConnection(apiKey) {
  try {
    const resp = await client(apiKey).get('/v2/properties', { params: { size: 1 } });
    return { ok: true, properties: resp.data?.count ?? 0 };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message ?? err.message };
  }
}

module.exports = { getReservations, getProperties, getAvailability, normalize, testConnection };
