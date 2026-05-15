-- ── Migration 006 : Table channels pour le Channel Manager iCal ────────────────
-- Chaque channel représente un calendrier iCal d'une plateforme (Airbnb, Booking.com, etc.)
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS channels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logement_id    UUID NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL,   -- dénormalisé depuis logements pour contrôle d'accès rapide
  name           VARCHAR(100) NOT NULL,
  type           VARCHAR(50) NOT NULL,  -- 'airbnb' | 'booking' | 'vrbo' | 'autre'
  ical_url       TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Accès par logement (liste des channels d'un bien)
CREATE INDEX IF NOT EXISTS idx_channels_logement_id ON channels(logement_id);
-- Accès par client (contrôle d'accès multi-tenant)
CREATE INDEX IF NOT EXISTS idx_channels_client_id   ON channels(client_id);
-- Filtre rapide sur les channels actifs pour le cron
CREATE INDEX IF NOT EXISTS idx_channels_active       ON channels(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE channels IS 'Channels iCal du Channel Manager — un channel = une plateforme (Airbnb, Booking.com, etc.) par logement';
COMMENT ON COLUMN channels.client_id      IS 'Dénormalisé depuis logements pour éviter une jointure sur chaque vérification d''accès';
COMMENT ON COLUMN channels.type           IS 'Plateforme source : airbnb | booking | vrbo | autre';
COMMENT ON COLUMN channels.ical_url       IS 'URL iCal publique fournie par la plateforme';
COMMENT ON COLUMN channels.last_synced_at IS 'Horodatage de la dernière synchronisation réussie';
