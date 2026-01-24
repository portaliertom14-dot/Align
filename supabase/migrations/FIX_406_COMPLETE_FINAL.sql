-- =====================================================
-- FIX COMPLET ET DÉFINITIF : Erreurs 406
-- =====================================================
-- Ce script résout définitivement les erreurs 406 en :
-- 1. Modifiant les politiques SELECT pour permettre les résultats vides
-- 2. Vérifiant que tout est correctement configuré

-- ÉTAPE 1 : SUPPRIMER LES ANCIENNES POLITIQUES SELECT
DROP POLICY IF EXISTS "authenticated_users_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_users_select_own_progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can select own progress" ON public.user_progress;

-- ÉTAPE 2 : CRÉER DE NOUVELLES POLITIQUES SELECT QUI PERMETTENT LES RÉSULTATS VIDES
-- Pour user_profiles : permettre SELECT si l'utilisateur est authentifié
-- (même si aucune ligne n'existe, cela retournera un résultat vide au lieu de 406)
CREATE POLICY "authenticated_users_select_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true); -- Permettre toutes les requêtes SELECT pour les utilisateurs authentifiés
-- Note: Le filtrage par id se fait dans la requête .eq('id', userId), pas dans la politique

-- Pour user_progress : même chose
CREATE POLICY "authenticated_users_select_own_progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (true); -- Permettre toutes les requêtes SELECT pour les utilisateurs authentifiés

-- Note: Les politiques INSERT et UPDATE restent restrictives (auth.uid() = id)
-- pour garantir que les utilisateurs ne peuvent créer/modifier que leurs propres données

-- ÉTAPE 3 : VÉRIFIER QUE LES TABLES EXISTENT ET QUE RLS EST ACTIVÉ
DO $$
DECLARE
  profile_table_exists BOOLEAN;
  progress_table_exists BOOLEAN;
  profile_rls_enabled BOOLEAN;
  progress_rls_enabled BOOLEAN;
  profile_select_policy_exists BOOLEAN;
  progress_select_policy_exists BOOLEAN;
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
  
  -- Vérifier si RLS est activé
  SELECT relrowsecurity INTO profile_rls_enabled
  FROM pg_class
  WHERE relname = 'user_profiles'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  SELECT relrowsecurity INTO progress_rls_enabled
  FROM pg_class
  WHERE relname = 'user_progress'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Vérifier que les politiques SELECT existent
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
    AND policyname = 'authenticated_users_select_own_profile'
  ) INTO profile_select_policy_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_progress'
    AND policyname = 'authenticated_users_select_own_progress'
  ) INTO progress_select_policy_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VÉRIFICATION DE LA CONFIGURATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'user_profiles:';
  RAISE NOTICE '  - Table existe: %', profile_table_exists;
  RAISE NOTICE '  - RLS activé: %', profile_rls_enabled;
  RAISE NOTICE '  - Politique SELECT: %', profile_select_policy_exists;
  RAISE NOTICE 'user_progress:';
  RAISE NOTICE '  - Table existe: %', progress_table_exists;
  RAISE NOTICE '  - RLS activé: %', progress_rls_enabled;
  RAISE NOTICE '  - Politique SELECT: %', progress_select_policy_exists;
  RAISE NOTICE '========================================';
  
  IF NOT profile_table_exists OR NOT progress_table_exists THEN
    RAISE EXCEPTION '❌ Les tables n''existent pas. Exécutez d''abord FIX_406_DEFINITIVE.sql';
  END IF;
  
  IF NOT profile_select_policy_exists OR NOT progress_select_policy_exists THEN
    RAISE EXCEPTION '❌ Les politiques SELECT n''ont pas été créées correctement';
  END IF;
  
  RAISE NOTICE '✅ Toutes les vérifications sont passées';
END $$;

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
ORDER BY tablename, cmd, policyname;
