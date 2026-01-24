-- ============================================================================
-- Script de correction COMPLET du schéma Supabase pour Align
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- ============================================================================
-- PARTIE 1: CORRECTION DE LA TABLE user_progress
-- ============================================================================
-- Problème: Colonnes manquantes causant des erreurs PGRST204
-- Solution: Ajouter toutes les colonnes utilisées par le code

-- Vérifier que la table user_progress existe, sinon la créer
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  niveau INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  etoiles INTEGER DEFAULT 0,
  current_module_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter les colonnes manquantes (en camelCase comme le code les envoie)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeDirection TEXT;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeSerie TEXT;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeMetier TEXT;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeModule TEXT DEFAULT 'mini_simulation_metier';

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS currentChapter INTEGER DEFAULT 1;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS currentLesson INTEGER DEFAULT 1;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS completedLevels JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS quizAnswers JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS metierQuizAnswers JSONB DEFAULT '{}'::jsonb;

-- Initialiser les valeurs par défaut pour les lignes existantes
UPDATE public.user_progress 
SET 
  current_module_index = COALESCE(current_module_index, 0),
  activeModule = COALESCE(activeModule, 'mini_simulation_metier'),
  currentChapter = COALESCE(currentChapter, 1),
  currentLesson = COALESCE(currentLesson, 1),
  completedLevels = COALESCE(completedLevels, '[]'::jsonb),
  quizAnswers = COALESCE(quizAnswers, '{}'::jsonb),
  metierQuizAnswers = COALESCE(metierQuizAnswers, '{}'::jsonb)
WHERE current_module_index IS NULL 
   OR activeModule IS NULL 
   OR currentChapter IS NULL 
   OR currentLesson IS NULL 
   OR completedLevels IS NULL 
   OR quizAnswers IS NULL 
   OR metierQuizAnswers IS NULL;

-- ============================================================================
-- PARTIE 2: VÉRIFICATION ET CORRECTION DES POLICIES RLS
-- ============================================================================

-- Activer RLS sur user_progress si ce n'est pas déjà fait
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies pour éviter les conflits
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;

-- Policy SELECT: Les utilisateurs peuvent lire leur propre progression
CREATE POLICY "Users can view own progress" ON public.user_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy INSERT: Les utilisateurs peuvent insérer leur propre progression
CREATE POLICY "Users can insert own progress" ON public.user_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy UPDATE: Les utilisateurs peuvent mettre à jour leur propre progression
CREATE POLICY "Users can update own progress" ON public.user_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PARTIE 3: VÉRIFICATION DE LA TABLE profiles
-- ============================================================================

-- Vérifier que la table profiles existe et a les bonnes colonnes
-- (Le trigger handle_new_user devrait créer automatiquement un profil)
-- Mais on s'assure que les colonnes nécessaires existent

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS favorite_sector TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS favorite_job TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Vérifier les policies RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies pour éviter les conflits
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Policy SELECT: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy INSERT: Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Policy UPDATE: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- PARTIE 4: VÉRIFICATION DES COLONNES (DIAGNOSTIC)
-- ============================================================================

-- Lister toutes les colonnes de user_progress pour vérification
SELECT 
  'user_progress' as table_name,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Lister toutes les colonnes de profiles pour vérification
SELECT 
  'profiles' as table_name,
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================================
-- PARTIE 5: INSTRUCTIONS POST-EXÉCUTION
-- ============================================================================
-- 
-- APRÈS AVOIR EXÉCUTÉ CE SCRIPT :
-- 
-- 1. Attendre 10-15 secondes pour que PostgREST rafraîchisse son cache
-- 
-- 2. Si les erreurs persistent :
--    - Aller dans Supabase Dashboard > Settings > API
--    - Cliquer sur "Restart PostgREST service"
--    - Attendre 30 secondes
-- 
-- 3. Vérifier que les colonnes ont bien été ajoutées :
--    - Exécuter les requêtes SELECT ci-dessus
--    - Vérifier que activeDirection, quizAnswers, etc. apparaissent
-- 
-- 4. Tester l'application :
--    - Créer un nouveau compte ou se connecter
--    - Compléter l'onboarding
--    - Vérifier que les erreurs PGRST204 ont disparu
-- 
-- ============================================================================










