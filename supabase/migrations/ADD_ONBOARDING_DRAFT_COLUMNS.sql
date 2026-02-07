-- Colonnes pour le transfert du brouillon d'onboarding (réponses pré-connexion)
-- Exécuter dans Supabase SQL Editor si besoin

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_future_feeling TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_discovery_source TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_open_reason TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_school_level TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_has_ideas TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_clarify_goal TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_dob TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_version TEXT;
