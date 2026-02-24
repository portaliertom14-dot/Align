-- Statut global du seed des modules IA (mini_sim + test_secteur) pour l'utilisateur.
-- L'app lit modules_seed_status pour afficher "Préparation…" ou débloquer les modules.
-- Idempotent.
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS modules_seed_status text NOT NULL DEFAULT 'idle';
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS modules_seed_started_at timestamptz;
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS modules_seed_done_at timestamptz;
