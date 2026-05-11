-- ── Table proprietaires ────────────────────────────────────────────────────────
-- Stocke les propriétaires de biens gérés par la conciergerie.
-- Chaque propriétaire est lié à un ou plusieurs logements (logement_ids).
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS proprietaires (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,                        -- user.id Supabase Auth (admin)
  nom             VARCHAR(255) NOT NULL,
  email           VARCHAR(255),
  adresse         TEXT,
  logement_ids    JSONB DEFAULT '[]',                   -- UUID[] des logements associés
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proprietaires_client_id ON proprietaires(client_id);
CREATE INDEX IF NOT EXISTS idx_proprietaires_nom       ON proprietaires(nom);

COMMENT ON TABLE proprietaires IS 'Propriétaires des biens gérés — liés aux logements via logement_ids';
