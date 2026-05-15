-- ── CRM Voyageurs ─────────────────────────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor
-- RLS hint: activer RLS et ajouter une policy WHERE client_id = auth.uid()::text

CREATE TABLE IF NOT EXISTS crm_voyageurs (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id             TEXT NOT NULL,
  nom                   TEXT NOT NULL,
  email                 TEXT,
  telephone             TEXT,
  nationalite           TEXT,
  nb_sejours            INT DEFAULT 0,
  montant_total         NUMERIC(10,2) DEFAULT 0,
  tags                  JSONB DEFAULT '[]',
  notes                 TEXT,
  premiere_reservation  DATE,
  derniere_reservation  DATE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Unicité email par client (évite les doublons sur upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_email_unique
  ON crm_voyageurs(client_id, email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_client        ON crm_voyageurs(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_email         ON crm_voyageurs(client_id, email);
CREATE INDEX IF NOT EXISTS idx_crm_derniere_resa ON crm_voyageurs(client_id, derniere_reservation DESC NULLS LAST);
