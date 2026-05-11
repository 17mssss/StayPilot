-- ── Table invoices ────────────────────────────────────────────────────────────
-- Stocke les factures générées depuis l'interface StayPilot Admin.
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,                          -- user.id Supabase Auth
  invoice_number  VARCHAR(50) NOT NULL,                   -- ex: SP-2026-001
  type            VARCHAR(50) DEFAULT 'commission',       -- commission | sejour
  recipient_data  TEXT,                                   -- JSON stringifié { nom, email, adresse }
  rows_data       TEXT,                                   -- JSON stringifié []
  total_ht        DECIMAL(10,2) DEFAULT 0,
  tva_amount      DECIMAL(10,2) DEFAULT 0,
  total_ttc       DECIMAL(10,2) DEFAULT 0,
  pdf_url         TEXT,                                   -- URL S3 si configuré
  pdf_data        TEXT,                                   -- PDF en base64 si pas de S3
  status          VARCHAR(20) DEFAULT 'generated',        -- generated | sent | paid
  sent_to         VARCHAR(255),                           -- email destinataire si envoyée
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour accélérer les requêtes par client
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Commentaire
COMMENT ON TABLE invoices IS 'Factures générées par StayPilot Admin';
