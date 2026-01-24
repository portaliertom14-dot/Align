-- Script de correction du schéma user_progress
-- À exécuter dans le SQL Editor de Supabase pour corriger les colonnes manquantes

-- 1. Ajouter current_module_index si elle n'existe pas (pour remplacer module_index_actuel)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_module_index INTEGER DEFAULT 0;

-- 2. Ajouter activeDirection si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeDirection TEXT;

-- 3. Ajouter activeSerie si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeSerie TEXT;

-- 4. Ajouter activeMetier si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeMetier TEXT;

-- 5. Ajouter activeModule si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS activeModule TEXT DEFAULT 'mini_simulation_metier';

-- 6. Ajouter currentChapter si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS currentChapter INTEGER DEFAULT 1;

-- 7. Ajouter currentLesson si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS currentLesson INTEGER DEFAULT 1;

-- 8. Ajouter completedLevels si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS completedLevels JSONB DEFAULT '[]'::jsonb;

-- 9. Ajouter quizAnswers si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS quizAnswers JSONB DEFAULT '{}'::jsonb;

-- 10. Ajouter metierQuizAnswers si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS metierQuizAnswers JSONB DEFAULT '{}'::jsonb;

-- 11. Initialiser current_module_index à 0 pour toutes les lignes existantes
UPDATE public.user_progress 
SET current_module_index = 0 
WHERE current_module_index IS NULL;

-- 12. Vérification : lister toutes les colonnes de user_progress
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 13. IMPORTANT : Forcer le refresh du cache PostgREST de Supabase
-- Note: PostgREST devrait automatiquement détecter les changements de schéma,
-- mais parfois il faut attendre quelques secondes ou redémarrer le service
-- Si les erreurs persistent, allez dans Settings > API > Restart PostgREST service

