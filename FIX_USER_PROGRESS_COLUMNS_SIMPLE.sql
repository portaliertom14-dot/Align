-- ============================================================================
-- Script SIMPLE et DIRECT pour ajouter les colonnes manquantes à user_progress
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================
-- 
-- PROBLÈME: Erreurs PGRST204 car les colonnes activeDirection et quizAnswers n'existent pas
-- SOLUTION: Ajouter toutes les colonnes utilisées par le frontend
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

-- Ajouter les colonnes manquantes (en camelCase comme le code les envoie)
-- CRITICAL: Utiliser des guillemets doubles pour préserver la casse exacte
-- PostgreSQL convertit les noms non-quotés en minuscules, donc "activeDirection" != activeDirection
-- Utiliser DO $$ pour gérer les erreurs si les colonnes existent déjà
DO $$ 
BEGIN
  -- Colonnes principales manquantes (camelCase avec guillemets doubles)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'activeDirection') THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeDirection" TEXT;
    RAISE NOTICE 'Colonne "activeDirection" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "activeDirection" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'activeSerie') THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeSerie" TEXT;
    RAISE NOTICE 'Colonne "activeSerie" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "activeSerie" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'activeMetier') THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeMetier" TEXT;
    RAISE NOTICE 'Colonne "activeMetier" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "activeMetier" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'activeModule') THEN
    ALTER TABLE public.user_progress ADD COLUMN "activeModule" TEXT DEFAULT 'mini_simulation_metier';
    RAISE NOTICE 'Colonne "activeModule" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "activeModule" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'currentChapter') THEN
    ALTER TABLE public.user_progress ADD COLUMN "currentChapter" INTEGER DEFAULT 1;
    RAISE NOTICE 'Colonne "currentChapter" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "currentChapter" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'currentLesson') THEN
    ALTER TABLE public.user_progress ADD COLUMN "currentLesson" INTEGER DEFAULT 1;
    RAISE NOTICE 'Colonne "currentLesson" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "currentLesson" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'completedLevels') THEN
    ALTER TABLE public.user_progress ADD COLUMN "completedLevels" JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne "completedLevels" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "completedLevels" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'quizAnswers') THEN
    ALTER TABLE public.user_progress ADD COLUMN "quizAnswers" JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne "quizAnswers" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "quizAnswers" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'metierQuizAnswers') THEN
    ALTER TABLE public.user_progress ADD COLUMN "metierQuizAnswers" JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne "metierQuizAnswers" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "metierQuizAnswers" existe déjà';
  END IF;
  
  -- Colonnes pour le système de chapitres
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'current_module_in_chapter') THEN
    ALTER TABLE public.user_progress ADD COLUMN "current_module_in_chapter" INTEGER DEFAULT 0;
    RAISE NOTICE 'Colonne "current_module_in_chapter" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "current_module_in_chapter" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'completed_modules_in_chapter') THEN
    ALTER TABLE public.user_progress ADD COLUMN "completed_modules_in_chapter" JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne "completed_modules_in_chapter" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "completed_modules_in_chapter" existe déjà';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'user_progress' 
                 AND column_name = 'chapter_history') THEN
    ALTER TABLE public.user_progress ADD COLUMN "chapter_history" JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne "chapter_history" ajoutée';
  ELSE
    RAISE NOTICE 'Colonne "chapter_history" existe déjà';
  END IF;
END $$;

-- Vérification: Lister toutes les colonnes de user_progress
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Script exécuté avec succès!';
  RAISE NOTICE '⏳ Attendez 10-15 secondes pour le rafraîchissement du cache PostgREST';
  RAISE NOTICE '🔄 Si les erreurs persistent, redémarrez PostgREST: Settings > API > Restart PostgREST service';
END $$;

