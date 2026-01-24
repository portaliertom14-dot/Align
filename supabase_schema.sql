-- =====================================================
-- SCHÉMA SUPABASE POUR ALIGN APP
-- =====================================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  birthdate DATE,
  school_level TEXT,
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
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
  -- Colonnes pour le système de chapitres
  current_module_in_chapter INTEGER DEFAULT 0,
  completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb,
  chapter_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_profiles
-- Les utilisateurs peuvent voir et modifier uniquement leur propre profil
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Politiques RLS pour user_progress
-- Les utilisateurs peuvent voir et modifier uniquement leur propre progression
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = id);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_progress_id ON user_progress(id);

