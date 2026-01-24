-- =====================================================
-- TOUTES LES MIGRATIONS COMBINÉES - À EXÉCUTER EN UNE FOIS
-- Date : 2026-01-20
-- Description : Contient toutes les migrations nécessaires dans le bon ordre
-- =====================================================

-- =====================================================
-- MIGRATION 1 : fix_user_profiles_schema.sql
-- =====================================================

-- ÉTAPE 1 : Supprimer les anciennes policies (pour éviter les conflits)
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

-- ÉTAPE 2 : Supprimer les anciens index
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_progress_user_id;

-- ÉTAPE 3 : Renommer les colonnes PRIMARY KEY (seulement si elles existent)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN user_id TO id;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_progress RENAME COLUMN user_id TO id;
  END IF;
END $$;

-- ÉTAPE 4 : Ajouter les colonnes manquantes à user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS school_level TEXT;

-- =====================================================
-- MIGRATION 2 : add_chapter_columns.sql
-- =====================================================

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS current_module_in_chapter INTEGER DEFAULT 0;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS chapter_history JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_progress.current_module_in_chapter IS 'Index du module actuel dans le chapitre en cours';
COMMENT ON COLUMN user_progress.completed_modules_in_chapter IS 'Liste des modules complétés dans le chapitre actuel';
COMMENT ON COLUMN user_progress.chapter_history IS 'Historique des chapitres complétés avec leurs données';

-- =====================================================
-- MIGRATION 3 : add_onboarding_columns.sql
-- =====================================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS has_started_onboarding BOOLEAN DEFAULT false;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS has_completed_sector_quiz BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);

COMMENT ON COLUMN user_profiles.has_started_onboarding IS 'Indique si l''utilisateur a commencé l''onboarding';
COMMENT ON COLUMN user_profiles.first_name IS 'Prénom de l''utilisateur';
COMMENT ON COLUMN user_profiles.last_name IS 'Nom de famille de l''utilisateur';
COMMENT ON COLUMN user_profiles.username IS 'Nom d''utilisateur unique';
COMMENT ON COLUMN user_progress.has_completed_sector_quiz IS 'Indique si l''utilisateur a terminé le quiz secteur';

-- =====================================================
-- MIGRATION 4 : fix_rls_policies.sql (LA PLUS IMPORTANTE)
-- =====================================================

-- Activer RLS sur user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- DROP toutes les anciennes policies
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Créer les nouvelles policies pour user_profiles

CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Activer RLS sur user_progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_progress;

-- Créer les nouvelles policies pour user_progress

CREATE POLICY "Users can view their own progress"
  ON user_progress
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own progress"
  ON user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own progress"
  ON user_progress
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Recréer les index
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_progress_id ON user_progress(id);

-- Commentaires finaux
COMMENT ON POLICY "Users can insert their own profile" ON user_profiles IS 'Permet aux utilisateurs de créer leur propre profil lors de la première connexion';
COMMENT ON POLICY "Users can insert their own progress" ON user_progress IS 'Permet aux utilisateurs de créer leur propre progression lors de la première connexion';

-- =====================================================
-- FIN DES MIGRATIONS - TOUT EST CONFIGURÉ !
-- =====================================================
