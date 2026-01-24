-- =====================================================
-- SCHÉMA SUPABASE POUR ALIGN APP (VERSION FINALE)
-- =====================================================
-- Ce schéma crée les tables, policies et triggers
-- Si vous avez des erreurs "already exists", exécutez d'abord le script de nettoyage
-- ou supprimez manuellement les policies/triggers existants

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  prenom TEXT,
  nom TEXT,
  username TEXT,
  avatar_url TEXT,
  description TEXT,
  secteur_favori TEXT,
  metier_favori TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de progression et gamification
CREATE TABLE IF NOT EXISTS user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  niveau INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  etoiles INTEGER DEFAULT 0,
  module_index_actuel INTEGER DEFAULT 0,
  modules_completes JSONB DEFAULT '[]'::jsonb,
  quetes_completes JSONB DEFAULT '[]'::jsonb,
  progression_quetes JSONB DEFAULT '{}'::jsonb,
  -- Champs supplémentaires pour compatibilité avec le code existant
  activeDirection TEXT,
  activeSerie TEXT,
  activeMetier TEXT,
  activeModule TEXT DEFAULT 'mini_simulation_metier',
  currentChapter INTEGER DEFAULT 1,
  currentLesson INTEGER DEFAULT 1,
  completedLevels JSONB DEFAULT '[]'::jsonb,
  quizAnswers JSONB DEFAULT '{}'::jsonb,
  metierQuizAnswers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NETTOYAGE : Supprimer les policies existantes si nécessaire
-- =====================================================
-- Exécutez cette section UNIQUEMENT si vous avez des erreurs "already exists"
-- Décommentez les lignes suivantes si nécessaire :

-- DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
-- DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
-- DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

-- =====================================================
-- POLITIQUES RLS POUR user_profiles
-- =====================================================

-- Politique pour SELECT (lecture)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON user_profiles FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Politique pour INSERT (insertion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON user_profiles FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Politique pour UPDATE (mise à jour)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON user_profiles FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- =====================================================
-- POLITIQUES RLS POUR user_progress
-- =====================================================

-- Politique pour SELECT (lecture)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress' 
    AND policyname = 'Users can view own progress'
  ) THEN
    CREATE POLICY "Users can view own progress"
      ON user_progress FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Politique pour INSERT (insertion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress' 
    AND policyname = 'Users can insert own progress'
  ) THEN
    CREATE POLICY "Users can insert own progress"
      ON user_progress FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Politique pour UPDATE (mise à jour)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress' 
    AND policyname = 'Users can update own progress'
  ) THEN
    CREATE POLICY "Users can update own progress"
      ON user_progress FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

-- =====================================================
-- FONCTION ET TRIGGER POUR CRÉATION AUTOMATIQUE
-- =====================================================

-- Fonction qui crée le profil et la progression pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (user_id, email, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Créer la progression utilisateur
  INSERT INTO public.user_progress (
    user_id,
    niveau,
    xp,
    etoiles,
    module_index_actuel,
    modules_completes,
    quetes_completes,
    progression_quetes,
    activeModule,
    currentChapter,
    currentLesson,
    completedLevels,
    quizAnswers,
    metierQuizAnswers
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    'mini_simulation_metier',
    1,
    1,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger (avec vérification)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;















