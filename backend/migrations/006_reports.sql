-- ── Relevés mensuels propriétaires ──────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       TEXT NOT NULL,
  proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE SET NULL,
  month           VARCHAR(7) NOT NULL,    -- format YYYY-MM (ex: 2026-04)
  pdf_data        TEXT,                   -- PDF encodé en base64 (fallback si S3 non configuré)
  pdf_path        TEXT,                   -- URL S3 si configuré
  sent_at         TIMESTAMPTZ,            -- date d'envoi email
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index unique partiel (exclut les lignes avec proprietaire_id NULL après suppression)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique
  ON reports(client_id, proprietaire_id, month)
  WHERE proprietaire_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_client         ON reports(client_id, proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_reports_proprietaire   ON reports(proprietaire_id);
