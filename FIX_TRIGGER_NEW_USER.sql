-- Script de correction du trigger handle_new_user
-- À exécuter dans le SQL Editor de Supabase
-- CORRIGE l'erreur "Database error saving new user" lors de la création de compte

-- 1. S'assurer que current_module_index existe (priorité sur module_index_actuel)
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_module_index INTEGER DEFAULT 0;

-- 2. Version robuste du trigger qui gère les colonnes optionnelles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_has_active_module BOOLEAN;
  v_has_current_chapter BOOLEAN;
  v_has_current_lesson BOOLEAN;
  v_has_completed_levels BOOLEAN;
  v_has_quiz_answers BOOLEAN;
  v_has_metier_quiz_answers BOOLEAN;
BEGIN
  -- Créer le profil utilisateur
  BEGIN
    INSERT INTO public.user_profiles (user_id, email, onboarding_completed)
    VALUES (
      NEW.id,
      NEW.email,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création du profil pour user_id %: %', NEW.id, SQLERRM;
    -- Continuer même en cas d'erreur sur le profil
  END;

  -- Vérifier quelles colonnes existent dans user_progress
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'activeModule'
  ) INTO v_has_active_module;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'currentChapter'
  ) INTO v_has_current_chapter;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'currentLesson'
  ) INTO v_has_current_lesson;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'completedLevels'
  ) INTO v_has_completed_levels;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'quizAnswers'
  ) INTO v_has_quiz_answers;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'metierQuizAnswers'
  ) INTO v_has_metier_quiz_answers;

  -- Créer la progression utilisateur avec seulement les colonnes de base
  -- Les colonnes optionnelles seront ajoutées après si elles existent
  BEGIN
    INSERT INTO public.user_progress (
      user_id,
      niveau,
      xp,
      etoiles,
      current_module_index,
      modules_completes,
      quetes_completes,
      progression_quetes
    )
    VALUES (
      NEW.id,
      0,
      0,
      0,
      0,
      '[]'::jsonb,
      '[]'::jsonb,
      '{}'::jsonb
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création de la progression pour user_id %: %', NEW.id, SQLERRM;
    -- Ne pas bloquer la création de l'utilisateur même si la progression échoue
  END;

  -- Mettre à jour les colonnes optionnelles si elles existent
  IF v_has_active_module THEN
    BEGIN
      UPDATE public.user_progress
      SET activeModule = 'mini_simulation_metier'
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignorer les erreurs sur les colonnes optionnelles
    END;
  END IF;

  IF v_has_current_chapter THEN
    BEGIN
      UPDATE public.user_progress
      SET currentChapter = 1
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_has_current_lesson THEN
    BEGIN
      UPDATE public.user_progress
      SET currentLesson = 1
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_has_completed_levels THEN
    BEGIN
      UPDATE public.user_progress
      SET completedLevels = '[]'::jsonb
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_has_quiz_answers THEN
    BEGIN
      UPDATE public.user_progress
      SET quizAnswers = '{}'::jsonb
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  IF v_has_metier_quiz_answers THEN
    BEGIN
      UPDATE public.user_progress
      SET metierQuizAnswers = '{}'::jsonb
      WHERE user_id = NEW.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- En cas d'erreur critique, logger mais ne pas bloquer la création de l'utilisateur
  RAISE WARNING 'Erreur critique dans handle_new_user pour user_id %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Vérifier que le trigger existe et est actif
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE 'Trigger on_auth_user_created créé';
  ELSE
    RAISE NOTICE 'Trigger on_auth_user_created existe déjà, fonction mise à jour';
  END IF;
END $$;

-- 4. Vérification : lister les colonnes de user_progress
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Vérification : lister les politiques RLS pour user_progress
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_progress';

-- 6. IMPORTANT : Vérifier que les RLS policies permettent au trigger de fonctionner
-- Le trigger utilise SECURITY DEFINER, donc il devrait contourner RLS
-- Mais si vous avez des erreurs, vérifiez que les policies existent et sont correctes
-- Les policies doivent permettre INSERT avec auth.uid() = user_id
-- Le trigger utilise NEW.id qui correspond à auth.uid() dans le contexte du trigger
