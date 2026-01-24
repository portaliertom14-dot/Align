-- Script de correction pour la persistance des profils utilisateur
-- À exécuter dans le SQL Editor de Supabase
-- CORRIGE le problème de persistance des champs first_name, last_name, username, favorite_sector, favorite_job

-- 1. Ajouter les colonnes manquantes à la table profiles
DO $$
BEGIN
  -- Ajouter first_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'first_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
  END IF;

  -- Ajouter last_name si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'last_name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
  END IF;

  -- Ajouter username si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT;
  END IF;

  -- Ajouter favorite_sector si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'favorite_sector'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN favorite_sector TEXT;
  END IF;

  -- Ajouter favorite_job si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'favorite_job'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN favorite_job TEXT;
  END IF;

  -- Ajouter email si elle n'existe pas (pour compatibilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;

  -- Ajouter birthdate si elle n'existe pas (pour compatibilité)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN birthdate DATE;
  END IF;
END $$;

-- 2. S'assurer que les RLS policies pour profiles existent et sont correctes
-- Activer RLS sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recréer les politiques RLS pour profiles
-- IMPORTANT: Les policies doivent permettre INSERT et UPDATE pour auth.uid() = id
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy supplémentaire pour UPSERT (INSERT ... ON CONFLICT)
-- Supabase nécessite que les policies INSERT et UPDATE soient compatibles
-- La policy INSERT avec WITH CHECK permet déjà l'UPSERT si auth.uid() = id

-- 3. Vérification : lister toutes les colonnes de profiles
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Vérification : lister toutes les politiques RLS pour profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

