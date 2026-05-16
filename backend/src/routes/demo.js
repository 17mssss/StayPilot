/**
 * demo.js — Génération et validation de tokens démo
 *
 * GET /api/demo/token
 *   - Accepte optionnellement un token existant en header "X-Demo-Token"
 *   - Si valide et non expiré : renvoie le même token + temps restant
 *   - Sinon : génère un nouveau token valide 48h
 *
 * Le token est un payload JSON signé HMAC-SHA256 (base64url).
 * Il est ensuite préfixé "demo_" dans le header Authorization côté frontend.
 */

const express = require('express');
const crypto  = require('crypto');
const router  = express.Router();

const DEMO_CLIENT_ID = 'a0000000-0000-0000-0000-000000000001';
const DEMO_DURATION_MS = 48 * 60 * 60 * 1000; // 48 heures

function getSecret() {
  return process.env.DEMO_JWT_SECRET || 'staypilot-demo-secret-changeme';
}

function signToken(clientId, expiresAt) {
  const payload = JSON.stringify({ demo: true, client_id: clientId, expires_at: expiresAt });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig  = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString());
    if (!payload.demo || payload.client_id !== DEMO_CLIENT_ID) return null;
    if (Date.now() > payload.expires_at) return null;
    return payload;
  } catch {
    return null;
  }
}

// GET /api/demo/token
router.get('/token', (req, res) => {
  // Essayer de réutiliser un token existant
  const existing = req.headers['x-demo-token'];
  if (existing) {
    const payload = verifyToken(existing);
    if (payload) {
      const remaining_ms = payload.expires_at - Date.now();
      return res.json({
        success: true,
        data: {
          token:      existing,
          expires_at: payload.expires_at,
          remaining_ms,
          client_id:  DEMO_CLIENT_ID,
          renewed:    false,
        },
      });
    }
  }

  // Générer un nouveau token 48h
  const expiresAt = Date.now() + DEMO_DURATION_MS;
  const token = signToken(DEMO_CLIENT_ID, expiresAt);

  res.json({
    success: true,
    data: {
      token,
      expires_at: expiresAt,
      remaining_ms: DEMO_DURATION_MS,
      client_id: DEMO_CLIENT_ID,
      renewed: true,
    },
  });
});

module.exports = { router, verifyToken, DEMO_CLIENT_ID };
