-- ── Migration 004 : Support multi channel managers ───────────────────────────
-- Ajoute les colonnes nécessaires à logements et reservations
-- pour supporter Smoobu, Hostaway et Lodgify en plus de Superhote.
-- Exécuter dans Supabase → SQL Editor

-- ── Table logements : nouvelles colonnes channel manager ─────────────────────
ALTER TABLE logements
  ADD COLUMN IF NOT EXISTS channel_manager  VARCHAR(20),   -- 'smoobu' | 'hostaway' | 'lodgify' | 'superhote'
  ADD COLUMN IF NOT EXISTS cm_api_key       TEXT,          -- clé API du channel manager
  ADD COLUMN IF NOT EXISTS cm_account_id    TEXT;          -- account_id ou property_id selon le provider

COMMENT ON COLUMN logements.channel_manager IS 'Channel manager actif : smoobu, hostaway, lodgify ou superhote';
COMMENT ON COLUMN logements.cm_api_key      IS 'Clé API du channel manager sélectionné';
COMMENT ON COLUMN logements.cm_account_id   IS 'Account ID (Hostaway) ou Property ID (Smoobu/Lodgify)';

-- Index pour les requêtes de sync
CREATE INDEX IF NOT EXISTS idx_logements_channel_manager ON logements(channel_manager)
  WHERE channel_manager IS NOT NULL;

-- ── Table reservations : colonnes pour multi-provider ────────────────────────
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS external_id  TEXT,    -- ID unique côté channel manager
  ADD COLUMN IF NOT EXISTS provider     TEXT,    -- 'smoobu' | 'hostaway' | 'lodgify' | 'superhote'
  ADD COLUMN IF NOT EXISTS plateforme   TEXT,    -- 'airbnb' | 'booking' | 'abritel' | 'direct'
  ADD COLUMN IF NOT EXISTS montant_total DECIMAL(10,2);  -- montant total de la réservation

-- Index d'idempotence pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_external_provider
  ON reservations(external_id, provider)
  WHERE external_id IS NOT NULL AND provider IS NOT NULL;

COMMENT ON COLUMN reservations.external_id  IS 'ID de la réservation côté channel manager';
COMMENT ON COLUMN reservations.provider     IS 'Channel manager source : smoobu, hostaway, lodgify, superhote';
COMMENT ON COLUMN reservations.plateforme   IS 'Plateforme de réservation : airbnb, booking, abritel, direct';
COMMENT ON COLUMN reservations.montant_total IS 'Montant total brut de la réservation';

-- ── Table sync_logs : si elle n'existe pas encore ────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logement_id UUID REFERENCES logements(id) ON DELETE CASCADE,
  action      VARCHAR(100),
  statut      VARCHAR(20),      -- 'success' | 'error' | 'warning'
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_logement_id ON sync_logs(logement_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at  ON sync_logs(created_at DESC);

COMMENT ON TABLE sync_logs IS 'Historique des synchronisations channel managers';
