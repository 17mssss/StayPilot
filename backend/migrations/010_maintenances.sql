-- ── Maintenances ──────────────────────────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor
-- RLS hint: activer RLS et ajouter une policy WHERE client_id = auth.uid()::text

CREATE TABLE IF NOT EXISTS maintenances (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         TEXT NOT NULL,
  logement_id       UUID NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  titre             TEXT NOT NULL,
  description       TEXT,
  priorite          TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('faible', 'normale', 'urgente')),
  statut            TEXT NOT NULL DEFAULT 'a_faire' CHECK (statut IN ('a_faire', 'en_cours', 'termine')),
  prestataire       TEXT,
  cout_estime       NUMERIC(10,2),
  date_signalement  DATE DEFAULT CURRENT_DATE,
  date_resolution   DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()   -- mis à jour manuellement par PATCH (statut → termine auto-pose date_resolution)
);

CREATE INDEX IF NOT EXISTS idx_maintenances_client   ON maintenances(client_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_logement ON maintenances(client_id, logement_id);
CREATE INDEX IF NOT EXISTS idx_maintenances_statut   ON maintenances(client_id, statut);
CREATE INDEX IF NOT EXISTS idx_maintenances_priorite ON maintenances(client_id, priorite);
