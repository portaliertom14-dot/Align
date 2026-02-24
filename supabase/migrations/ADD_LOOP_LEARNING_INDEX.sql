-- Loop chapitre 10 (apprentissage infini) : index de rotation.
-- Idempotent : safe to run multiple times.
ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS loop_learning_index integer NOT NULL DEFAULT 0;
