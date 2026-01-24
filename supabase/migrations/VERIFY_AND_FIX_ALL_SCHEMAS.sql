-- =====================================================
-- VÉRIFIER ET CORRIGER TOUS LES SCHÉMAS
-- =====================================================
-- Ce script vérifie user_profiles et user_progress et corrige les incohérences

-- =====================================================
-- PARTIE 1 : VÉRIFIER user_profiles
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DE user_profiles';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Ajouter user_id à user_profiles si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN user_id UUID;
    UPDATE public.user_profiles SET user_id = id WHERE user_id IS NULL;
    
    RAISE NOTICE '✅ Colonne user_id ajoutée à user_profiles';
  ELSE
    RAISE NOTICE '✅ user_profiles.user_id existe déjà';
  END IF;
END $$;

-- =====================================================
-- PARTIE 2 : VÉRIFIER user_progress
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION DE user_progress';
  RAISE NOTICE '========================================';
END $$;

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Ajouter user_id à user_progress si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.user_progress ADD COLUMN user_id UUID;
    UPDATE public.user_progress SET user_id = id WHERE user_id IS NULL;
    
    RAISE NOTICE '✅ Colonne user_id ajoutée à user_progress';
  ELSE
    RAISE NOTICE '✅ user_progress.user_id existe déjà';
  END IF;
END $$;

-- =====================================================
-- PARTIE 3 : SUPPRIMER TOUS LES TRIGGERS PROBLÉMATIQUES
-- =====================================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPPRESSION DES TRIGGERS SUR auth.users';
  RAISE NOTICE '========================================';
  
  FOR trigger_record IN 
    SELECT tgname, tgrelid::regclass as table_name
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass 
    AND tgname NOT LIKE 'pg_%'
    AND tgname NOT LIKE 'RI_%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s CASCADE', 
                   trigger_record.tgname, 
                   trigger_record.table_name);
    RAISE NOTICE 'Supprimé : %', trigger_record.tgname;
  END LOOP;
END $$;

-- Supprimer les fonctions de trigger
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_user_profile() CASCADE;

-- =====================================================
-- PARTIE 4 : RLS POLICIES SIMPLIFIÉES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONFIGURATION DES RLS POLICIES';
  RAISE NOTICE '========================================';
END $$;

-- user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_profiles;
CREATE POLICY "Allow insert for authenticated users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow select for own profile" ON public.user_profiles;
CREATE POLICY "Allow select for own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow update for own profile" ON public.user_profiles;
CREATE POLICY "Allow update for own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- user_progress
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_progress;
CREATE POLICY "Allow insert for authenticated users"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Allow select for own progress" ON public.user_progress;
CREATE POLICY "Allow select for own progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Allow update for own progress" ON public.user_progress;
CREATE POLICY "Allow update for own progress"
ON public.user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- =====================================================
-- PARTIE 5 : VÉRIFICATION FINALE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VÉRIFICATION FINALE';
  RAISE NOTICE '========================================';
END $$;

-- Compter les triggers restants sur auth.users
SELECT COUNT(*) as remaining_triggers
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
AND tgname NOT LIKE 'pg_%'
AND tgname NOT LIKE 'RI_%';

-- Afficher les policies actives
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
ORDER BY tablename, policyname;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT TERMINÉ';
  RAISE NOTICE '========================================';
END $$;
