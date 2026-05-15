-- ── Pricing Dynamique ─────────────────────────────────────────────────────────
-- Exécuter dans Supabase → SQL Editor
-- RLS hint: activer RLS et ajouter une policy WHERE client_id = auth.uid()::text

CREATE TABLE IF NOT EXISTS pricing_dynamique (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        TEXT NOT NULL,
  logement_id      UUID REFERENCES logements(id) ON DELETE SET NULL,
  nom              TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('saisonnier', 'occupation', 'dernier_moment')),
  date_debut       DATE,
  date_fin         DATE,
  taux_ajustement  NUMERIC(6,2) NOT NULL,   -- % d'ajustement (positif = hausse, négatif = baisse)
  actif            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pricing_client    ON pricing_dynamique(client_id);
CREATE INDEX IF NOT EXISTS idx_pricing_logement  ON pricing_dynamique(client_id, logement_id);
CREATE INDEX IF NOT EXISTS idx_pricing_type      ON pricing_dynamique(client_id, type);
CREATE INDEX IF NOT EXISTS idx_pricing_actif     ON pricing_dynamique(client_id, actif);
