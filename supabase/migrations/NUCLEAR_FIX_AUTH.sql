-- =====================================================
-- NUCLEAR FIX : TOUT SUPPRIMER ET RECONSTRUIRE
-- =====================================================
-- Ce script supprime TOUT ce qui peut causer des problèmes
-- et reconstruit proprement le schéma

-- PARTIE 1 : SUPPRIMER TOUS LES TRIGGERS ET FONCTIONS
-- =====================================================

-- Supprimer tous les triggers sur auth.users (sauf système)
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
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
  END LOOP;
END $$;

-- Supprimer toutes les fonctions qui contiennent "user" ou "profile" dans le nom
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace
    AND (proname LIKE '%user%' OR proname LIKE '%profile%' OR proname LIKE '%auth%')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                   func_record.proname, 
                   func_record.args);
  END LOOP;
END $$;

-- PARTIE 2 : RECONSTRUIRE user_profiles
-- =====================================================

-- Désactiver temporairement RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', 
                   policy_record.policyname);
  END LOOP;
END $$;

-- Ajouter user_id si n'existe pas
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- S'assurer que id est la PK
ALTER TABLE public.user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_pkey CASCADE;

ALTER TABLE public.user_profiles 
ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);

-- Créer les nouvelles policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_insert_own"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "authenticated_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "authenticated_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- PARTIE 3 : RECONSTRUIRE user_progress
-- =====================================================

-- Désactiver temporairement RLS
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les policies
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_progress', 
                   policy_record.policyname);
  END LOOP;
END $$;

-- Ajouter user_id si n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- S'assurer que id est la PK
ALTER TABLE public.user_progress 
DROP CONSTRAINT IF EXISTS user_progress_pkey CASCADE;

ALTER TABLE public.user_progress 
ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);

-- Créer les nouvelles policies
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_insert_own"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "authenticated_select_own"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "authenticated_update_own"
ON public.user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- PARTIE 4 : VÉRIFICATION
-- =====================================================

-- Compter les triggers sur auth.users
SELECT 
  'Triggers on auth.users' as check_type,
  COUNT(*) as count
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
AND tgname NOT LIKE 'pg_%'
AND tgname NOT LIKE 'RI_%'

UNION ALL

-- Compter les fonctions personnalisées
SELECT 
  'Custom functions with user/profile' as check_type,
  COUNT(*) as count
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
AND (proname LIKE '%user%' OR proname LIKE '%profile%' OR proname LIKE '%auth%')

UNION ALL

-- Vérifier les colonnes
SELECT 
  'Columns in user_profiles' as check_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')

UNION ALL

SELECT 
  'Columns in user_progress' as check_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
AND column_name IN ('id', 'user_id');
