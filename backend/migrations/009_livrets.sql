-- ── Livrets d'accueil QR Code ─────────────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor
-- RLS hint: activer RLS et ajouter une policy WHERE client_id = auth.uid()::text
-- Note: la route publique GET /api/livrets/public/:slug ne nécessite pas d'auth

CREATE TABLE IF NOT EXISTS livrets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        TEXT NOT NULL,
  logement_id      UUID REFERENCES logements(id) ON DELETE SET NULL,
  titre            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,   -- identifiant URL pour accès public QR (généré côté backend)
  wifi_nom         TEXT,
  wifi_mdp         TEXT,
  code_acces       TEXT,
  reglement        TEXT,
  checkin_info     TEXT,
  checkout_info    TEXT,
  recommandations  TEXT,
  contact_urgence  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livrets_client   ON livrets(client_id);
CREATE INDEX IF NOT EXISTS idx_livrets_logement ON livrets(client_id, logement_id);
-- idx_livrets_slug est couvert par la contrainte UNIQUE sur slug
