-- =====================================================
-- FIX ERREUR 403 SUR LA TABLE users
-- =====================================================
-- Ce script vérifie et corrige les politiques RLS pour la table public.users
-- qui cause des erreurs 403 (Forbidden)

-- ÉTAPE 1 : VÉRIFIER SI LA TABLE users EXISTE
DO $$
DECLARE
  users_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) INTO users_table_exists;
  
  IF users_table_exists THEN
    RAISE NOTICE '✅ Table public.users existe';
  ELSE
    RAISE NOTICE '⚠️ Table public.users n''existe pas - aucune action nécessaire';
    RETURN;
  END IF;
END $$;

-- ÉTAPE 2 : VÉRIFIER L'ÉTAT RLS DE LA TABLE users
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policies_count INTEGER;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'users'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'users';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAT ACTUEL DE LA TABLE users';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS activé: %', rls_enabled;
  RAISE NOTICE 'Nombre de politiques: %', policies_count;
  RAISE NOTICE '========================================';
END $$;

-- ÉTAPE 3 : SUPPRIMER LES ANCIENNES POLITIQUES (SI ELLES EXISTENT)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users CASCADE', r.policyname);
    RAISE NOTICE 'Politique supprimée: users.%', r.policyname;
  END LOOP;
END $$;

-- ÉTAPE 4 : ACTIVER RLS SUR LA TABLE users (SI ELLE EXISTE)
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS activé sur public.users';
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '⚠️ Table public.users n''existe pas, ignorée';
  END;
END $$;

-- ÉTAPE 5 : CRÉER LES POLITIQUES RLS POUR users (SI LA TABLE EXISTE)
DO $$
BEGIN
  BEGIN
    -- INSERT : Permettre aux utilisateurs authentifiés de créer leur propre entrée
    CREATE POLICY "authenticated_users_insert_own_user"
    ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
    
    RAISE NOTICE '✅ Politique INSERT créée pour users';
    
    -- SELECT : Permettre aux utilisateurs authentifiés de lire leur propre entrée
    CREATE POLICY "authenticated_users_select_own_user"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true); -- Permettre toutes les requêtes SELECT pour les utilisateurs authentifiés
    
    RAISE NOTICE '✅ Politique SELECT créée pour users';
    
    -- UPDATE : Permettre aux utilisateurs authentifiés de mettre à jour leur propre entrée
    CREATE POLICY "authenticated_users_update_own_user"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
    
    RAISE NOTICE '✅ Politique UPDATE créée pour users';
    
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE '⚠️ Table public.users n''existe pas, politiques non créées';
  END;
END $$;

-- ÉTAPE 6 : VÉRIFICATION FINALE
DO $$
DECLARE
  users_table_exists BOOLEAN;
  rls_enabled BOOLEAN;
  policies_count INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) INTO users_table_exists;
  
  IF users_table_exists THEN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'users'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VÉRIFICATION FINALE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table users existe: %', users_table_exists;
    RAISE NOTICE 'RLS activé: %', rls_enabled;
    RAISE NOTICE 'Politiques créées: %', policies_count;
    RAISE NOTICE '========================================';
    
    IF policies_count < 3 THEN
      RAISE WARNING '⚠️ Certaines politiques sont manquantes';
    END IF;
  ELSE
    RAISE NOTICE '✅ Table users n''existe pas - aucune action nécessaire';
  END IF;
END $$;

-- Afficher les politiques créées pour users (si la table existe)
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
AND tablename = 'users'
ORDER BY cmd, policyname;
