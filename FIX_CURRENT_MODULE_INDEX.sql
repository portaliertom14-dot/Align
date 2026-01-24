-- Script de correction pour current_module_index
-- À exécuter dans le SQL Editor de Supabase

-- 1. Ajouter current_module_index si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_module_index INTEGER DEFAULT 0;

-- 2. Si module_index_actuel existe, copier les valeurs vers current_module_index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'module_index_actuel'
  ) THEN
    -- Copier les valeurs de module_index_actuel vers current_module_index
    UPDATE public.user_progress 
    SET current_module_index = module_index_actuel 
    WHERE current_module_index IS NULL OR current_module_index = 0;
    
    RAISE NOTICE 'Valeurs copiées de module_index_actuel vers current_module_index';
  END IF;
END $$;

-- 3. Initialiser current_module_index à 0 pour toutes les lignes existantes où elle est NULL
UPDATE public.user_progress 
SET current_module_index = 0 
WHERE current_module_index IS NULL;

-- 4. Mettre à jour le trigger pour utiliser current_module_index au lieu de module_index_actuel
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (user_id, email, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Créer la progression utilisateur avec current_module_index
  INSERT INTO public.user_progress (
    user_id,
    niveau,
    xp,
    etoiles,
    current_module_index,
    modules_completes,
    quetes_completes,
    progression_quetes,
    activeModule,
    currentChapter,
    currentLesson,
    completedLevels,
    quizAnswers,
    metierQuizAnswers
  )
  VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    'mini_simulation_metier',
    1,
    1,
    '[]'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Vérification : lister les colonnes de user_progress
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
  AND (column_name = 'current_module_index' OR column_name = 'module_index_actuel')
ORDER BY ordinal_position;












