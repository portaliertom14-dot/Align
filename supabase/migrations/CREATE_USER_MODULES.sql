-- =====================================================
-- Table user_modules : un module par (user_id, chapter_id, module_index)
-- module_index 0 = apprentissage, 1 = mini_simulation_metier, 2 = test_secteur
-- Remplie par seed-modules (edge) ; client lit uniquement (SELECT).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_modules (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id INTEGER NOT NULL CHECK (chapter_id >= 1 AND chapter_id <= 10),
  module_index INTEGER NOT NULL CHECK (module_index >= 0 AND module_index <= 2),
  type TEXT NOT NULL CHECK (type IN ('apprentissage', 'mini_simulation_metier', 'test_secteur')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'error')),
  payload JSONB,
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, chapter_id, module_index)
);

CREATE INDEX IF NOT EXISTS idx_user_modules_user_status
  ON public.user_modules(user_id, status);

COMMENT ON TABLE public.user_modules IS 'Modules par utilisateur (seed + edge) ; lecture seule côté client.';

-- RLS : l'utilisateur ne peut que SELECT ses propres lignes. INSERT/UPDATE réservés au service role (edge).
ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_modules_select_own ON public.user_modules;
CREATE POLICY user_modules_select_own
  ON public.user_modules FOR SELECT
  USING (auth.uid() = user_id);

-- Pas de policy INSERT/UPDATE pour le client : les edges utilisent service_role.
