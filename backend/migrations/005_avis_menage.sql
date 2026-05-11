-- ── avis voyageurs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL,
  reservation_id  UUID REFERENCES reservations(id) ON DELETE SET NULL,
  logement_id     UUID REFERENCES logements(id) ON DELETE SET NULL,
  guest_name      TEXT,
  platform        TEXT DEFAULT 'airbnb',
  rating          INT CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  date_avis       DATE DEFAULT CURRENT_DATE,
  reponse_admin   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avis_client    ON avis(client_id);
CREATE INDEX IF NOT EXISTS idx_avis_logement  ON avis(logement_id, client_id);
CREATE INDEX IF NOT EXISTS idx_avis_rating    ON avis(client_id, rating);
CREATE INDEX IF NOT EXISTS idx_avis_platform  ON avis(client_id, platform);

-- ── tâches de ménage ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menage_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL,
  reservation_id  UUID REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  logement_id     UUID REFERENCES logements(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done')),
  notes           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menage_client      ON menage_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_menage_status      ON menage_tasks(client_id, status);
CREATE INDEX IF NOT EXISTS idx_menage_reservation ON menage_tasks(reservation_id);
