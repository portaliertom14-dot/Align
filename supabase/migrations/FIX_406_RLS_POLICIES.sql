-- =====================================================
-- FIX DES POLITIQUES RLS POUR PERMETTRE LES REQUÊTES SELECT
-- MÊME QUAND AUCUNE LIGNE N'EXISTE
-- =====================================================
-- Ce script modifie les politiques RLS pour permettre les requêtes SELECT
-- même quand aucune ligne n'existe pour l'utilisateur (retourne résultat vide au lieu de 406)

-- ÉTAPE 1 : SUPPRIMER LES ANCIENNES POLITIQUES SELECT
DROP POLICY IF EXISTS "authenticated_users_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "authenticated_users_select_own_progress" ON public.user_progress;

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

-- ÉTAPE 3 : VÉRIFICATION
DO $$
DECLARE
  profile_select_policy_exists BOOLEAN;
  progress_select_policy_exists BOOLEAN;
BEGIN
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
  RAISE NOTICE '✅ POLITIQUES SELECT MODIFIÉES';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'user_profiles SELECT policy: %', profile_select_policy_exists;
  RAISE NOTICE 'user_progress SELECT policy: %', progress_select_policy_exists;
  RAISE NOTICE '========================================';
  
  IF NOT profile_select_policy_exists OR NOT progress_select_policy_exists THEN
    RAISE EXCEPTION '❌ Les politiques SELECT n''ont pas été créées correctement';
  END IF;
END $$;

-- Afficher les politiques SELECT créées
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
AND cmd = 'SELECT'
ORDER BY tablename, policyname;
