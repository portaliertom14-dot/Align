-- =====================================================
-- FIX : Erreur "ON CONFLICT specification" lors du signup
-- =====================================================
-- Problème : Les triggers utilisent ON CONFLICT (id) mais les tables
--            n'ont pas de contrainte UNIQUE/PRIMARY KEY sur id
-- Solution : Supprimer tous les triggers problématiques

-- ÉTAPE 1 : Supprimer TOUS les triggers sur auth.users
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPPRESSION DE TOUS LES TRIGGERS SUR auth.users';
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
    RAISE NOTICE '✅ Trigger supprimé : %', trigger_record.tgname;
  END LOOP;
END $$;

-- ÉTAPE 2 : Supprimer toutes les fonctions de trigger problématiques
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_progress_id() CASCADE;

-- ÉTAPE 3 : Vérifier que les tables ont les bonnes contraintes
-- user_profiles doit avoir id comme PRIMARY KEY
DO $$
BEGIN
  -- Vérifier si user_profiles existe et a une PK sur id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    -- Vérifier si id est PRIMARY KEY
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'user_profiles'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND kcu.column_name = 'id'
    ) THEN
      -- Ajouter PRIMARY KEY si elle n'existe pas
      ALTER TABLE public.user_profiles 
      ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);
      RAISE NOTICE '✅ PRIMARY KEY ajoutée à user_profiles.id';
    ELSE
      RAISE NOTICE '✅ user_profiles.id a déjà une PRIMARY KEY';
    END IF;
  END IF;
  
  -- Vérifier si user_progress existe et a une PK sur id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress'
  ) THEN
    -- Vérifier si id est PRIMARY KEY
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
      AND tc.table_name = 'user_progress'
      AND tc.constraint_type = 'PRIMARY KEY'
      AND kcu.column_name = 'id'
    ) THEN
      -- Ajouter PRIMARY KEY si elle n'existe pas
      ALTER TABLE public.user_progress 
      ADD CONSTRAINT user_progress_pkey PRIMARY KEY (id);
      RAISE NOTICE '✅ PRIMARY KEY ajoutée à user_progress.id';
    ELSE
      RAISE NOTICE '✅ user_progress.id a déjà une PRIMARY KEY';
    END IF;
  END IF;
END $$;

-- ÉTAPE 4 : Vérification finale - Compter les triggers restants
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgrelid = 'auth.users'::regclass 
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%';
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ Aucun trigger restant sur auth.users';
  ELSE
    RAISE WARNING '⚠️ % trigger(s) restant(s) sur auth.users', trigger_count;
  END IF;
END $$;

-- ÉTAPE 5 : Afficher l'état final
SELECT 
  'Triggers restants sur auth.users' as check_type,
  COUNT(*) as count
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass 
AND tgname NOT LIKE 'pg_%'
AND tgname NOT LIKE 'RI_%';

SELECT 
  'Fonctions de trigger restantes' as check_type,
  COUNT(*) as count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('handle_new_user', 'create_profile_for_new_user', 'auto_create_user_profile', 'sync_user_progress_id');

-- ÉTAPE 6 : Message final
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SCRIPT TERMINÉ';
  RAISE NOTICE '========================================';
END $$;
