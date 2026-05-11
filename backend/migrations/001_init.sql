-- ============================================================
-- StayPilot — Migration initiale
-- Coller dans Supabase → SQL Editor → Run
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── clients ──────────────────────────────────────────────────
-- Un client = une conciergerie (multi-tenant ready)
CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  nom         TEXT,
  plan        TEXT DEFAULT 'starter',  -- starter | pro | enterprise
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── logements ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              UUID NOT NULL,
  nom                    TEXT NOT NULL,
  autopilote             BOOLEAN DEFAULT FALSE,
  canaux                 JSONB DEFAULT '{"sms": false, "email": true, "whatsapp": false}',
  superhote_api_key      TEXT,
  superhote_property_key TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logements_client ON logements(client_id);

-- ── reservations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logement_id         UUID REFERENCES logements(id) ON DELETE CASCADE,
  superhote_id        TEXT UNIQUE,
  plateforme          TEXT DEFAULT 'airbnb',
  voyageur_nom        TEXT NOT NULL,
  voyageur_email      TEXT,
  voyageur_telephone  TEXT,
  checkin             DATE NOT NULL,
  checkout            DATE NOT NULL,
  statut              TEXT DEFAULT 'confirmee',  -- confirmee | annulee | en_cours | terminee
  nb_voyageurs        INT DEFAULT 1,
  montant_total       DECIMAL(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_logement ON reservations(logement_id);
CREATE INDEX IF NOT EXISTS idx_reservations_checkin  ON reservations(checkin);
CREATE INDEX IF NOT EXISTS idx_reservations_statut   ON reservations(statut);

-- ── messages ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID REFERENCES reservations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL,      -- entrant | sortant
  canal           TEXT NOT NULL,      -- sms | email | whatsapp | platform
  contenu         TEXT NOT NULL,
  statut          TEXT DEFAULT 'envoye',  -- envoye | echec | en_attente
  genere_par_ia   BOOLEAN DEFAULT FALSE,
  valide          BOOLEAN DEFAULT FALSE,
  envoye_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_reservation ON messages(reservation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created     ON messages(created_at);

-- ── templates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL,
  nom           TEXT NOT NULL,
  declencheur   TEXT NOT NULL,   -- j-2 | j-1 | checkin | checkout | j+1 | booking_confirmed | review_request
  canal         TEXT NOT NULL,   -- sms | email | whatsapp | platform
  sujet         TEXT,
  contenu       TEXT NOT NULL,
  delai_heures  INT DEFAULT 0,
  actif         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_client      ON templates(client_id);
CREATE INDEX IF NOT EXISTS idx_templates_declencheur ON templates(declencheur);

-- ── messages_programmes ──────────────────────────────────────
-- Messages planifiés par le scheduler
CREATE TABLE IF NOT EXISTS messages_programmes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  UUID REFERENCES reservations(id) ON DELETE CASCADE,
  template_id     UUID REFERENCES templates(id) ON DELETE SET NULL,
  envoyer_a       TIMESTAMPTZ NOT NULL,
  envoye          BOOLEAN DEFAULT FALSE,
  envoye_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_prog_envoyer ON messages_programmes(envoyer_a) WHERE envoye = FALSE;

-- ============================================================
-- Données de test (optionnel — supprimer en prod)
-- ============================================================

-- Client de démo
INSERT INTO clients (id, email, nom, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@staypilot.fr', 'Ma Conciergerie', 'pro')
ON CONFLICT (email) DO NOTHING;

-- Logement de démo
INSERT INTO logements (client_id, nom, autopilote, canaux)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Appartement Montmartre',
  FALSE,
  '{"sms": true, "email": true, "whatsapp": false}'
)
ON CONFLICT DO NOTHING;
