-- Flag: modules IA pré-générés (seed one-shot)
-- true = seed déjà fait, warmup ne déclenche jamais l'IA

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS ai_seed_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.user_profiles.ai_seed_completed IS 'Modules IA seedés (30 modules) — one-shot à la fin onboarding';
