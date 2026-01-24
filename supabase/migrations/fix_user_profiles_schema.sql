-- =====================================================
-- MIGRATION : Corriger le schéma user_profiles et user_progress
-- Date : 2026-01-20
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
-- Vérifier et renommer user_id en id pour user_profiles
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE user_profiles RENAME COLUMN user_id TO id;
  END IF;
END $$;

-- Vérifier et renommer user_id en id pour user_progress
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

-- ÉTAPE 5 : Recréer les policies avec les bons noms de colonnes
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = id);

-- ÉTAPE 6 : Recréer les index avec les bons noms
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_progress_id ON user_progress(id);
