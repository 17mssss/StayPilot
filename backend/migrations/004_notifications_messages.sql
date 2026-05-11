-- Migration 004 — Notifications propriétaires + Messagerie admin↔propriétaire

-- ── Notifications propriétaires ───────────────────────────────────────────────
-- Notifications envoyées par l'admin vers un propriétaire (nouvelle résa, paiement, document, etc.)
CREATE TABLE IF NOT EXISTS owner_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    TEXT NOT NULL,            -- tenant (client conciergerie)
  proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL DEFAULT 'info',
                                         -- info | new_reservation | cancellation | payment | document | message
  title        VARCHAR(255) NOT NULL,
  body         TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_notifs_client_prop
  ON owner_notifications (client_id, proprietaire_id, is_read, created_at DESC);

-- ── Messagerie admin ↔ propriétaire ──────────────────────────────────────────
-- Thread de messages entre la conciergerie (admin) et un propriétaire donné.
-- direction = 'admin_to_owner' | 'owner_to_admin'
CREATE TABLE IF NOT EXISTS owner_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       TEXT NOT NULL,
  proprietaire_id UUID REFERENCES proprietaires(id) ON DELETE CASCADE,
  direction       VARCHAR(20) NOT NULL DEFAULT 'admin_to_owner',
  content         TEXT NOT NULL,
  attachments     JSONB NOT NULL DEFAULT '[]',
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_messages_client_prop
  ON owner_messages (client_id, proprietaire_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_owner_messages_unread
  ON owner_messages (client_id, proprietaire_id, is_read)
  WHERE is_read = FALSE;
