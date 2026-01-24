-- =====================================================
-- FIX COMPLET : Erreurs 406 sur user_profiles et user_progress
-- =====================================================
-- Ce script résout définitivement les erreurs 406 en :
-- 1. Créant les tables si elles n'existent pas
-- 2. Désactivant temporairement RLS pour permettre la création
-- 3. Créant les politiques RLS correctes
-- 4. Réactivant RLS

-- ÉTAPE 1 : DIAGNOSTIC INITIAL
DO $$
DECLARE
  has_user_profiles BOOLEAN;
  has_user_progress BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC INITIAL';
  RAISE NOTICE '========================================';
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) INTO has_user_profiles;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress'
  ) INTO has_user_progress;
  
  RAISE NOTICE 'user_profiles existe: %', has_user_profiles;
  RAISE NOTICE 'user_progress existe: %', has_user_progress;
END $$;

-- ÉTAPE 2 : CRÉER LES TABLES SI N'EXISTENT PAS
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  birthdate DATE,
  school_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- ÉTAPE 3 : DÉSACTIVER TEMPORAIREMENT RLS POUR PERMETTRE LA CONFIGURATION
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 4 : SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE 'Suppression des anciennes politiques...';
  
  -- Supprimer toutes les politiques sur user_profiles
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles CASCADE', policy_record.policyname);
    RAISE NOTICE 'Politique supprimée: user_profiles.%', policy_record.policyname;
  END LOOP;
  
  -- Supprimer toutes les politiques sur user_progress
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_progress CASCADE', policy_record.policyname);
    RAISE NOTICE 'Politique supprimée: user_progress.%', policy_record.policyname;
  END LOOP;
END $$;

-- ÉTAPE 5 : RÉACTIVER RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 6 : CRÉER LES POLITIQUES RLS POUR user_profiles
-- INSERT : Permettre aux utilisateurs authentifiés de créer leur propre profil
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Permettre aux utilisateurs authentifiés de lire leur propre profil
CREATE POLICY "Users can select own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Permettre aux utilisateurs authentifiés de mettre à jour leur propre profil
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ÉTAPE 7 : CRÉER LES POLITIQUES RLS POUR user_progress
-- INSERT : Permettre aux utilisateurs authentifiés de créer leur propre progression
CREATE POLICY "Users can insert own progress"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Permettre aux utilisateurs authentifiés de lire leur propre progression
CREATE POLICY "Users can select own progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Permettre aux utilisateurs authentifiés de mettre à jour leur propre progression
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
  profile_rls_enabled BOOLEAN;
  progress_rls_enabled BOOLEAN;
BEGIN
  -- Compter les politiques
  SELECT COUNT(*) INTO profile_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_profiles';
  
  SELECT COUNT(*) INTO progress_policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'user_progress';
  
  -- Vérifier si RLS est activé
  SELECT relrowsecurity INTO profile_rls_enabled
  FROM pg_class
  WHERE relname = 'user_profiles'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  SELECT relrowsecurity INTO progress_rls_enabled
  FROM pg_class
  WHERE relname = 'user_progress'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONFIGURATION TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'user_profiles:';
  RAISE NOTICE '  - RLS activé: %', profile_rls_enabled;
  RAISE NOTICE '  - Politiques: %', profile_policies_count;
  RAISE NOTICE 'user_progress:';
  RAISE NOTICE '  - RLS activé: %', progress_rls_enabled;
  RAISE NOTICE '  - Politiques: %', progress_policies_count;
  RAISE NOTICE '========================================';
  
  IF profile_policies_count < 3 OR progress_policies_count < 3 THEN
    RAISE WARNING '⚠️ Certaines politiques sont manquantes. Vérifiez les résultats ci-dessous.';
  END IF;
END $$;

-- Afficher les colonnes des tables
SELECT 
  'user_profiles' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

SELECT 
  'user_progress' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Afficher toutes les politiques actives
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
ORDER BY tablename, policyname;

-- Vérifier l'état RLS des tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
ORDER BY tablename;
