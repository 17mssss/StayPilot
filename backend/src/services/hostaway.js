/**
 * hostaway.js — Intégration Hostaway Channel Manager
 * Docs : https://api.hostaway.com/documentation
 *
 * Auth   : OAuth2 client_credentials → Bearer token
 * Base   : https://api.hostaway.com/v1
 */

const axios = require('axios');

const BASE      = 'https://api.hostaway.com/v1';
const TOKEN_URL = 'https://api.hostaway.com/v1/accessTokens';

// Cache token en mémoire (expire après 1h)
const _tokenCache = new Map(); // accountId → { token, expiresAt }

// ── OAuth2 : obtenir un access token ─────────────────────────────────────────
async function getAccessToken(accountId, apiKey) {
  const cached = _tokenCache.get(accountId);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const resp = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     String(accountId),
      client_secret: apiKey,
      scope:         'general',
    }),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
    }
  );

  const token    = resp.data.access_token;
  const expiresIn = resp.data.expires_in ?? 3600;
  _tokenCache.set(accountId, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

// ── Client HTTP ───────────────────────────────────────────────────────────────
function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 15_000,
  });
}

// ── Récupérer les réservations ────────────────────────────────────────────────
/**
 * @param {string} accountId
 * @param {string} apiKey
 * @param {string} from   YYYY-MM-DD
 * @param {string} to     YYYY-MM-DD
 */
async function getReservations(accountId, apiKey, from, to) {
  const token = await getAccessToken(accountId, apiKey);
  const resp  = await client(token).get('/reservations', {
    params: {
      dateType:  'arrivalDate',
      startDate: from,
      endDate:   to,
      limit:     100,
      offset:    0,
      sortOrder: 'arrivalDate',
    },
  });
  return resp.data?.result ?? [];
}

// ── Récupérer les logements Hostaway ─────────────────────────────────────────
async function getListings(accountId, apiKey) {
  const token = await getAccessToken(accountId, apiKey);
  const resp  = await client(token).get('/listings', { params: { limit: 100 } });
  return resp.data?.result ?? [];
}

// ── Mapper une réservation Hostaway → format interne StayPilot ───────────────
function normalize(booking, logementId) {
  return {
    logement_id:        logementId,
    external_id:        String(booking.id),
    provider:           'hostaway',
    voyageur_nom:       [booking.guestFirstName, booking.guestLastName].filter(Boolean).join(' ') || 'Voyageur',
    voyageur_email:     booking.guestEmail      ?? null,
    voyageur_telephone: booking.guestPhone      ?? null,
    checkin:            booking.arrivalDate,
    checkout:           booking.departureDate,
    montant_total:      booking.totalPrice      ?? null,
    nb_voyageurs:       booking.numberOfGuests  ?? null,
    statut:             mapStatus(booking.status),
    plateforme:         mapChannel(booking.channelName ?? booking.source),
  };
}

function mapStatus(status) {
  const s = (status ?? '').toLowerCase();
  if (s === 'cancelled' || s === 'canceled') return 'annulee';
  if (s === 'inquiry' || s === 'awaiting_payment') return 'en_attente';
  return 'confirmee';
}

function mapChannel(source) {
  if (!source) return 'hostaway';
  const s = source.toLowerCase();
  if (s.includes('airbnb'))  return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('vrbo') || s.includes('homeaway')) return 'abritel';
  if (s.includes('direct') || s.includes('website')) return 'direct';
  return source;
}

// ── Vérifier la connectivité ──────────────────────────────────────────────────
async function testConnection(accountId, apiKey) {
  try {
    const token = await getAccessToken(accountId, apiKey);
    const resp  = await client(token).get('/listings', { params: { limit: 1 } });
    return { ok: true, listings: resp.data?.result?.length ?? 0 };
  } catch (err) {
    return { ok: false, error: err.response?.data?.message ?? err.message };
  }
}

module.exports = { getAccessToken, getReservations, getListings, normalize, testConnection };
