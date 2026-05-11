-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 004 : Double authentification par appareil
-- Appliquer dans Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Appareils de confiance ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trusted_devices (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id     TEXT        NOT NULL,                        -- UUID généré côté client (localStorage)
  device_label  TEXT,                                        -- "iPhone · Safari", "MacBook · Chrome"
  ip_address    TEXT,                                        -- IP au moment de la validation
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_id)
);

-- Index pour les lookups fréquents (check à chaque login)
CREATE INDEX IF NOT EXISTS trusted_devices_user_device_idx
  ON trusted_devices(user_id, device_id);

-- Row Level Security
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne peut voir/modifier que ses propres appareils
CREATE POLICY "trusted_devices_owner" ON trusted_devices
  FOR ALL USING (auth.uid() = user_id);

-- ── 2. Codes OTP temporaires ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT        NOT NULL,   -- device_id qui attend validation
  code        TEXT        NOT NULL,   -- 6 chiffres hashés (bcrypt) côté backend
  expires_at  TIMESTAMPTZ NOT NULL,   -- now() + 10 minutes
  used        BOOLEAN     NOT NULL DEFAULT false,
  attempts    INT         NOT NULL DEFAULT 0,  -- anti-brute force (max 5)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index sur user_id + device_id pour retrouver le code actif rapidement
CREATE INDEX IF NOT EXISTS otp_codes_lookup_idx
  ON otp_codes(user_id, device_id, used, expires_at);

-- RLS : accessible uniquement via le service role (backend)
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- ── 3. Nettoyage automatique des codes expirés (cron Supabase ou pg_cron) ─────
-- À activer dans Supabase Dashboard > Database > Extensions > pg_cron
-- SELECT cron.schedule('cleanup-otp', '*/30 * * * *',
--   $$DELETE FROM otp_codes WHERE expires_at < now() - INTERVAL '1 hour'$$);
