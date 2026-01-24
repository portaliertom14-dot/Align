-- Script de correction pour l'onboarding et les profils
-- À exécuter dans le SQL Editor de Supabase
-- CORRIGE les erreurs RLS et colonnes manquantes lors de l'onboarding

-- 1. Vérifier que la table profiles existe et a les bonnes colonnes
-- La table profiles est utilisée par profileService.js
-- Elle doit avoir les mêmes colonnes que user_profiles pour compatibilité

-- Ajouter les colonnes manquantes à profiles si elles n'existent pas
DO $$
BEGIN
  -- Ajouter prenom si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'prenom'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN prenom TEXT;
  END IF;

  -- Ajouter nom si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'nom'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN nom TEXT;
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

  -- Ajouter avatar_url si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

-- 2. S'assurer que les RLS policies pour profiles existent et sont correctes
-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recréer les politiques RLS pour profiles
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
  USING (auth.uid() = id);

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











