-- =====================================================
-- DIAGNOSTIC ET CORRECTION DES TABLES
-- =====================================================
-- Ce script vérifie quelles tables existent et les crée si nécessaire
-- avec les bonnes politiques RLS

-- ÉTAPE 1 : DIAGNOSTIC - Vérifier quelles tables existent
DO $$
DECLARE
  has_user_profiles BOOLEAN;
  has_profiles BOOLEAN;
  has_user_progress BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC DES TABLES';
  RAISE NOTICE '========================================';
  
  -- Vérifier user_profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) INTO has_user_profiles;
  
  -- Vérifier profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO has_profiles;
  
  -- Vérifier user_progress
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress'
  ) INTO has_user_progress;
  
  RAISE NOTICE 'user_profiles existe: %', has_user_profiles;
  RAISE NOTICE 'profiles existe: %', has_profiles;
  RAISE NOTICE 'user_progress existe: %', has_user_progress;
END $$;

-- ÉTAPE 2 : CRÉER user_profiles SI N'EXISTE PAS
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  birthdate DATE,
  school_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÉTAPE 3 : CRÉER user_progress SI N'EXISTE PAS
CREATE TABLE IF NOT EXISTS public.user_progress (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  niveau INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  etoiles INTEGER DEFAULT 0,
  active_direction TEXT,
  active_serie TEXT,
  active_metier TEXT,
  active_module TEXT,
  current_chapter INTEGER DEFAULT 1,
  current_lesson INTEGER DEFAULT 1,
  current_module_index INTEGER DEFAULT 0,
  completed_levels INTEGER[] DEFAULT '{}',
  quiz_answers JSONB DEFAULT '{}',
  metier_quiz_answers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÉTAPE 4 : ACTIVER RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 5 : SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Supprimer toutes les politiques sur user_profiles
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
  END LOOP;
  
  -- Supprimer toutes les politiques sur user_progress
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_progress', policy_record.policyname);
  END LOOP;
END $$;

-- ÉTAPE 6 : CRÉER LES POLITIQUES RLS POUR user_profiles
-- INSERT : Les utilisateurs authentifiés peuvent créer leur propre profil
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Les utilisateurs authentifiés peuvent lire leur propre profil
CREATE POLICY "Users can select own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Les utilisateurs authentifiés peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ÉTAPE 7 : CRÉER LES POLITIQUES RLS POUR user_progress
-- INSERT : Les utilisateurs authentifiés peuvent créer leur propre progression
CREATE POLICY "Users can insert own progress"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Les utilisateurs authentifiés peuvent lire leur propre progression
CREATE POLICY "Users can select own progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Les utilisateurs authentifiés peuvent mettre à jour leur propre progression
CREATE POLICY "Users can update own progress"
ON public.user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ÉTAPE 8 : VÉRIFICATION FINALE
DO $$
DECLARE
  profile_policies_count INTEGER;
  progress_policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_profiles';
  
  SELECT COUNT(*) INTO progress_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_progress';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ TABLES ET POLITIQUES CRÉÉES';
  RAISE NOTICE 'user_profiles: % politique(s)', profile_policies_count;
  RAISE NOTICE 'user_progress: % politique(s)', progress_policies_count;
  RAISE NOTICE '========================================';
END $$;

-- Afficher les colonnes des tables créées
SELECT 
  'user_profiles' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

SELECT 
  'user_progress' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Afficher les politiques actives
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
ORDER BY tablename, policyname;
