-- =====================================================
-- FIX SIMPLE ET ROBUSTE POUR L'AUTHENTIFICATION
-- =====================================================
-- Résout : "column user_id of relation user_progress does not exist"

-- ÉTAPE 1 : Ajouter user_id à user_progress (si n'existe pas)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Copier les valeurs de id vers user_id
UPDATE public.user_progress 
SET user_id = id 
WHERE user_id IS NULL;

-- ÉTAPE 2 : Ajouter user_id à user_profiles (si n'existe pas)
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Copier les valeurs de id vers user_id
UPDATE public.user_profiles 
SET user_id = id 
WHERE user_id IS NULL;

-- ÉTAPE 3 : Supprimer tous les triggers sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users CASCADE;
DROP TRIGGER IF EXISTS auto_create_profile ON auth.users CASCADE;

-- Supprimer les fonctions de trigger
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_profile_for_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_user_profile() CASCADE;

-- ÉTAPE 4 : RLS Policies pour user_profiles
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

-- ÉTAPE 5 : RLS Policies pour user_progress
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

-- ÉTAPE 6 : Vérifier que les colonnes existent maintenant
SELECT 
  'user_profiles' as table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
AND column_name IN ('id', 'user_id')
UNION ALL
SELECT 
  'user_progress' as table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
AND column_name IN ('id', 'user_id')
ORDER BY table_name, column_name;
