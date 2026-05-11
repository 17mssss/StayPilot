-- ── Table documents ───────────────────────────────────────────────────────────
-- Stocke les documents partagés avec les propriétaires (contrats, avenants…).
-- Exécuter dans Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL,                          -- user.id Supabase Auth (admin qui uploade)
  owner_email  TEXT,                                   -- email du propriétaire destinataire (optionnel)
  category     VARCHAR(50) DEFAULT 'other',            -- contract | amendment | annex | other
  title        TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_url     TEXT,                                   -- URL Supabase Storage si configuré
  file_data    TEXT,                                   -- fichier encodé base64 si pas de storage
  file_mime    TEXT DEFAULT 'application/octet-stream',
  file_size    INT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_client   ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_active   ON documents(client_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_documents_owner    ON documents(owner_email) WHERE owner_email IS NOT NULL;

COMMENT ON TABLE documents IS 'Documents partagés avec les propriétaires via StayPilot';
