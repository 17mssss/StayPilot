-- Migration 011 — Portail Investisseur Enterprise
-- Portails d'accès tokenisés pour les investisseurs/propriétaires institutionnels

CREATE TABLE investisseurs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  nom VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  logement_ids UUID[] NOT NULL DEFAULT '{}',
  access_token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  token_expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 year'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_investisseurs_client ON investisseurs(client_id);
CREATE INDEX idx_investisseurs_token  ON investisseurs(access_token);
