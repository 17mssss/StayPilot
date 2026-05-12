-- ═══════════════════════════════════════════════════════════════
-- CleanPilot — Gestion des équipes de ménage
-- À exécuter dans Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Profil de la conciergerie (un par compte admin)
CREATE TABLE IF NOT EXISTS public.concierge_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name  TEXT        NOT NULL DEFAULT '',
  concierge_code TEXT       UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Équipes de ménage (une équipe peut avoir plusieurs agents)
CREATE TABLE IF NOT EXISTS public.cleaning_teams (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name   TEXT        NOT NULL,
  team_code   TEXT        UNIQUE NOT NULL,
  concierge_id UUID       REFERENCES public.concierge_profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agents de ménage (demandes d'accès)
CREATE TABLE IF NOT EXISTS public.cleaning_agents (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  full_name     TEXT        NOT NULL DEFAULT '',
  team_id       UUID        REFERENCES public.cleaning_teams(id),
  concierge_id  UUID        REFERENCES public.concierge_profiles(id),
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'declined')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── RLS ──────────────────────────────────────────────────────────

ALTER TABLE public.concierge_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_teams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_agents    ENABLE ROW LEVEL SECURITY;

-- concierge_profiles : lecture publique (pour recherche par code), écriture propriétaire
CREATE POLICY "concierge_profiles_select" ON public.concierge_profiles
  FOR SELECT USING (true);

CREATE POLICY "concierge_profiles_insert" ON public.concierge_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "concierge_profiles_update" ON public.concierge_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- cleaning_teams : lecture publique, insertion libre (agents qui créent leur équipe)
CREATE POLICY "teams_select" ON public.cleaning_teams
  FOR SELECT USING (true);

CREATE POLICY "teams_insert" ON public.cleaning_teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teams_update" ON public.cleaning_teams
  FOR UPDATE USING (
    concierge_id IN (
      SELECT id FROM public.concierge_profiles WHERE user_id = auth.uid()
    )
  );

-- cleaning_agents : agent voit son propre enregistrement,
-- concierge voit tous les agents de sa conciergerie
CREATE POLICY "agents_select" ON public.cleaning_agents
  FOR SELECT USING (
    auth.uid() = user_id
    OR concierge_id IN (
      SELECT id FROM public.concierge_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agents_insert" ON public.cleaning_agents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "agents_update" ON public.cleaning_agents
  FOR UPDATE USING (
    auth.uid() = user_id
    OR concierge_id IN (
      SELECT id FROM public.concierge_profiles WHERE user_id = auth.uid()
    )
  );

-- ── Index ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cleaning_agents_concierge ON public.cleaning_agents(concierge_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_agents_team      ON public.cleaning_agents(team_id);
CREATE INDEX IF NOT EXISTS idx_cleaning_teams_concierge  ON public.cleaning_teams(concierge_id);
