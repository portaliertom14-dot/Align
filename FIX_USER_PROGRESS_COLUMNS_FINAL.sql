-- ============================================================================
-- Script FINAL pour corriger les colonnes user_progress avec gestion de la casse
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================
-- 
-- PROBLÈME: 
-- - PostgreSQL convertit les noms non-quotés en minuscules (activeDirection → activedirection)
-- - Le frontend envoie activeDirection (camelCase)
-- - Erreurs PGRST204 car les colonnes n'existent pas avec la bonne casse
--
-- SOLUTION:
-- - Utiliser des guillemets doubles pour préserver la casse exacte
-- - Renommer les colonnes existantes en minuscules vers camelCase
-- - Créer les colonnes manquantes en camelCase
--
-- INSTRUCTIONS:
-- 1. Copier-coller ce script dans le SQL Editor de Supabase
-- 2. Exécuter le script
-- 3. Attendre 10-15 secondes pour le rafraîchissement du cache PostgREST
-- 4. Si les erreurs persistent: Settings > API > Restart PostgREST service
-- ============================================================================

-- Vérifier que la table existe, sinon la créer avec les colonnes de base
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  niveau INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  etoiles INTEGER DEFAULT 0,
  current_module_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fonction pour renommer ou créer une colonne en camelCase
DO $$ 
DECLARE
  col_exists_lower BOOLEAN;
  col_exists_camel BOOLEAN;
BEGIN
  -- ========================================================================
  -- activeDirection
  -- ========================================================================
  -- Vérifier si la colonne existe en minuscules
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'activedirection'
  ) INTO col_exists_lower;
  
  -- Vérifier si la colonne existe en camelCase
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'activeDirection'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    -- Renommer la colonne existante en minuscules vers camelCase
    ALTER TABLE public.user_progress RENAME COLUMN activedirection TO "activeDirection";
    RAISE NOTICE 'Colonne "activedirection" renommée en "activeDirection"';
  ELSIF NOT col_exists_camel THEN
    -- Créer la colonne en camelCase
    ALTER TABLE public.user_progress ADD COLUMN "activeDirection" TEXT;
    RAISE NOTICE 'Colonne "activeDirection" créée';
  ELSE
    RAISE NOTICE 'Colonne "activeDirection" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- activeSerie
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'activeserie'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'activeSerie'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN activeserie TO "activeSerie";
    RAISE NOTICE 'Colonne "activeserie" renommée en "activeSerie"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeSerie" TEXT;
    RAISE NOTICE 'Colonne "activeSerie" créée';
  ELSE
    RAISE NOTICE 'Colonne "activeSerie" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- activeMetier
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'activemetier'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'activeMetier'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN activemetier TO "activeMetier";
    RAISE NOTICE 'Colonne "activemetier" renommée en "activeMetier"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeMetier" TEXT;
    RAISE NOTICE 'Colonne "activeMetier" créée';
  ELSE
    RAISE NOTICE 'Colonne "activeMetier" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- activeModule
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'activemodule'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'activeModule'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN activemodule TO "activeModule";
    RAISE NOTICE 'Colonne "activemodule" renommée en "activeModule"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeModule" TEXT DEFAULT 'mini_simulation_metier';
    RAISE NOTICE 'Colonne "activeModule" créée';
  ELSE
    RAISE NOTICE 'Colonne "activeModule" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- currentChapter
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'currentchapter'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'currentChapter'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN currentchapter TO "currentChapter";
    RAISE NOTICE 'Colonne "currentchapter" renommée en "currentChapter"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "currentChapter" INTEGER DEFAULT 1;
    RAISE NOTICE 'Colonne "currentChapter" créée';
  ELSE
    RAISE NOTICE 'Colonne "currentChapter" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- currentLesson
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'currentlesson'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'currentLesson'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN currentlesson TO "currentLesson";
    RAISE NOTICE 'Colonne "currentlesson" renommée en "currentLesson"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "currentLesson" INTEGER DEFAULT 1;
    RAISE NOTICE 'Colonne "currentLesson" créée';
  ELSE
    RAISE NOTICE 'Colonne "currentLesson" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- completedLevels
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'completedlevels'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'completedLevels'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN completedlevels TO "completedLevels";
    RAISE NOTICE 'Colonne "completedlevels" renommée en "completedLevels"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "completedLevels" JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne "completedLevels" créée';
  ELSE
    RAISE NOTICE 'Colonne "completedLevels" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- quizAnswers
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'quizanswers'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'quizAnswers'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN quizanswers TO "quizAnswers";
    RAISE NOTICE 'Colonne "quizanswers" renommée en "quizAnswers"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "quizAnswers" JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne "quizAnswers" créée';
  ELSE
    RAISE NOTICE 'Colonne "quizAnswers" existe déjà en camelCase';
  END IF;
  
  -- ========================================================================
  -- metierQuizAnswers
  -- ========================================================================
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND LOWER(column_name) = 'metierquizanswers'
  ) INTO col_exists_lower;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'metierQuizAnswers'
  ) INTO col_exists_camel;
  
  IF col_exists_lower AND NOT col_exists_camel THEN
    ALTER TABLE public.user_progress RENAME COLUMN metierquizanswers TO "metierQuizAnswers";
    RAISE NOTICE 'Colonne "metierquizanswers" renommée en "metierQuizAnswers"';
  ELSIF NOT col_exists_camel THEN
    ALTER TABLE public.user_progress ADD COLUMN "metierQuizAnswers" JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne "metierQuizAnswers" créée';
  ELSE
    RAISE NOTICE 'Colonne "metierQuizAnswers" existe déjà en camelCase';
  END IF;
  
END $$;

-- ============================================================================
-- VÉRIFICATION: Lister toutes les colonnes de user_progress
-- ============================================================================
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- ============================================================================
-- Message de confirmation
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Script exécuté avec succès!';
  RAISE NOTICE '📋 Vérifiez la liste des colonnes ci-dessus pour confirmer que toutes les colonnes camelCase existent';
  RAISE NOTICE '⏳ Attendez 10-15 secondes pour le rafraîchissement du cache PostgREST';
  RAISE NOTICE '🔄 Si les erreurs persistent, redémarrez PostgREST: Settings > API > Restart PostgREST service';
  RAISE NOTICE '💡 Après redémarrage, changez filterOptionalColumns = false dans userProgressSupabase.js';
END $$;










