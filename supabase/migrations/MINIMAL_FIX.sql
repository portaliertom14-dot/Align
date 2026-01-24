-- =====================================================
-- MIGRATION MINIMALE - Version ultra-simple qui devrait marcher
-- Date : 2026-01-20
-- =====================================================

-- 1. Désactiver temporairement RLS pour debug
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;

-- 2. Supprimer TOUTES les policies existantes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_progress') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_progress', r.policyname);
    END LOOP;
END $$;

-- 3. S'assurer que les tables existent avec la bonne structure
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    birthdate DATE,
    school_level TEXT,
    first_name TEXT,
    last_name TEXT,
    username TEXT UNIQUE,
    has_started_onboarding BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    niveau INTEGER DEFAULT 1,
    xp BIGINT DEFAULT 0,
    etoiles INTEGER DEFAULT 0,
    current_chapter INTEGER DEFAULT 1,
    current_module_in_chapter INTEGER DEFAULT 0,
    completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb,
    chapter_history JSONB DEFAULT '[]'::jsonb,
    has_completed_sector_quiz BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Créer des policies TRÈS permissives (pour debug)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Permettre aux utilisateurs authentifiés de tout faire sur leur profil
CREATE POLICY "allow_all_authenticated_users_profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "allow_all_authenticated_users_progress"
  ON user_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. Créer les index
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_progress_id ON user_progress(id);

-- =====================================================
-- FIN - Version minimale qui devrait fonctionner
-- =====================================================
