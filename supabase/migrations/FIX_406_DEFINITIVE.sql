-- =====================================================
-- FIX DÉFINITIF : Erreurs 406 sur user_profiles et user_progress
-- =====================================================
-- Ce script résout définitivement les erreurs 406 en :
-- 1. Supprimant complètement les tables si elles existent (pour repartir de zéro)
-- 2. Recréant les tables avec la bonne structure
-- 3. Désactivant RLS temporairement
-- 4. Créant les politiques RLS correctes
-- 5. Réactivant RLS
-- 6. Créant des fonctions pour permettre l'accès aux données

-- ÉTAPE 1 : SUPPRIMER COMPLÈTEMENT LES TABLES ET POLITIQUES EXISTANTES
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NETTOYAGE COMPLET';
  RAISE NOTICE '========================================';
  
  -- Supprimer toutes les politiques
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles CASCADE;
  DROP POLICY IF EXISTS "Users can select own profile" ON public.user_profiles CASCADE;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles CASCADE;
  DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress CASCADE;
  DROP POLICY IF EXISTS "Users can select own progress" ON public.user_progress CASCADE;
  DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress CASCADE;
  
  -- Supprimer toutes les autres politiques qui pourraient exister
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('user_profiles', 'user_progress'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', r.policyname, r.tablename);
  END LOOP;
  
  RAISE NOTICE 'Toutes les politiques supprimées';
END $$;

-- Supprimer les tables (CASCADE pour supprimer les dépendances)
DROP TABLE IF EXISTS public.user_progress CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ÉTAPE 2 : CRÉER LES TABLES AVEC LA BONNE STRUCTURE
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  birthdate DATE,
  school_level TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- ÉTAPE 3 : CRÉER DES INDEX POUR AMÉLIORER LES PERFORMANCES
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_progress_id ON public.user_progress(id);

-- ÉTAPE 4 : DÉSACTIVER RLS TEMPORAIREMENT
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress DISABLE ROW LEVEL SECURITY;

-- ÉTAPE 5 : CRÉER LES POLITIQUES RLS POUR user_profiles
-- Ces politiques permettent aux utilisateurs authentifiés d'accéder à leurs propres données

-- INSERT : Permettre aux utilisateurs authentifiés de créer leur propre profil
CREATE POLICY "authenticated_users_insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Permettre aux utilisateurs authentifiés de lire leur propre profil
CREATE POLICY "authenticated_users_select_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Permettre aux utilisateurs authentifiés de mettre à jour leur propre profil
CREATE POLICY "authenticated_users_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ÉTAPE 6 : CRÉER LES POLITIQUES RLS POUR user_progress
-- INSERT : Permettre aux utilisateurs authentifiés de créer leur propre progression
CREATE POLICY "authenticated_users_insert_own_progress"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT : Permettre aux utilisateurs authentifiés de lire leur propre progression
CREATE POLICY "authenticated_users_select_own_progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE : Permettre aux utilisateurs authentifiés de mettre à jour leur propre progression
CREATE POLICY "authenticated_users_update_own_progress"
ON public.user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ÉTAPE 7 : RÉACTIVER RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 8 : CRÉER UNE FONCTION POUR VÉRIFIER L'ACCÈS
CREATE OR REPLACE FUNCTION public.check_user_access(user_id UUID)
RETURNS TABLE (
  can_access_profile BOOLEAN,
  can_access_progress BOOLEAN,
  is_authenticated BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM public.user_profiles WHERE id = user_id) as can_access_profile,
    EXISTS(SELECT 1 FROM public.user_progress WHERE id = user_id) as can_access_progress,
    (auth.uid() = user_id) as is_authenticated;
END;
$$;

-- ÉTAPE 9 : VÉRIFICATION FINALE
DO $$
DECLARE
  profile_policies_count INTEGER;
  progress_policies_count INTEGER;
  profile_rls_enabled BOOLEAN;
  progress_rls_enabled BOOLEAN;
  profile_table_exists BOOLEAN;
  progress_table_exists BOOLEAN;
BEGIN
  -- Vérifier que les tables existent
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) INTO profile_table_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress'
  ) INTO progress_table_exists;
  
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
  RAISE NOTICE '  - Table existe: %', profile_table_exists;
  RAISE NOTICE '  - RLS activé: %', profile_rls_enabled;
  RAISE NOTICE '  - Politiques: %', profile_policies_count;
  RAISE NOTICE 'user_progress:';
  RAISE NOTICE '  - Table existe: %', progress_table_exists;
  RAISE NOTICE '  - RLS activé: %', progress_rls_enabled;
  RAISE NOTICE '  - Politiques: %', progress_policies_count;
  RAISE NOTICE '========================================';
  
  IF NOT profile_table_exists OR NOT progress_table_exists THEN
    RAISE EXCEPTION '❌ Les tables n''ont pas été créées correctement';
  END IF;
  
  IF profile_policies_count < 3 OR progress_policies_count < 3 THEN
    RAISE EXCEPTION '❌ Certaines politiques sont manquantes';
  END IF;
  
  IF NOT profile_rls_enabled OR NOT progress_rls_enabled THEN
    RAISE EXCEPTION '❌ RLS n''est pas activé sur toutes les tables';
  END IF;
  
  RAISE NOTICE '✅ Toutes les vérifications sont passées';
END $$;

-- Afficher les politiques créées
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
