-- =====================================================
-- FIX : Erreurs 406 sur user_profiles et user_progress
-- =====================================================
-- Problème : Les politiques RLS bloquent l'accès aux tables
-- Solution : Vérifier et corriger les politiques RLS

-- ÉTAPE 1 : Vérifier que les tables existent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    RAISE EXCEPTION 'Table user_profiles n''existe pas. Exécutez d''abord les migrations de création de tables.';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress'
  ) THEN
    RAISE EXCEPTION 'Table user_progress n''existe pas. Exécutez d''abord les migrations de création de tables.';
  END IF;
END $$;

-- ÉTAPE 2 : Activer RLS sur les tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 3 : Supprimer les anciennes politiques (si elles existent)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow select for own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow update for own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.user_progress;
DROP POLICY IF EXISTS "Allow select for own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Allow update for own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_progress;

-- ÉTAPE 4 : Créer les politiques RLS pour user_profiles
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

-- ÉTAPE 5 : Créer les politiques RLS pour user_progress
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

-- ÉTAPE 6 : Vérification finale
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
  RAISE NOTICE '✅ Politiques RLS créées';
  RAISE NOTICE 'user_profiles: % politique(s)', profile_policies_count;
  RAISE NOTICE 'user_progress: % politique(s)', progress_policies_count;
  RAISE NOTICE '========================================';
END $$;

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
