-- Script de correction du trigger pour créer automatiquement le profil dans profiles
-- À exécuter dans le SQL Editor de Supabase
-- CORRIGE le problème où les nouveaux utilisateurs n'ont pas de profil créé automatiquement

-- 1. Mettre à jour le trigger handle_new_user pour créer le profil dans profiles avec email
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
  -- Créer le profil utilisateur dans user_profiles (si la table existe)
  BEGIN
    INSERT INTO public.user_profiles (user_id, email, onboarding_completed)
    VALUES (
      NEW.id,
      NEW.email,
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création du profil user_profiles pour user_id %: %', NEW.id, SQLERRM;
    -- Continuer même en cas d'erreur sur le profil
  END;

  -- CRITICAL: Créer le profil dans profiles avec email et birthdate
  -- Le trigger utilise SECURITY DEFINER donc il contourne RLS
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création du profil profiles pour user_id %: %', NEW.id, SQLERRM;
    -- Continuer même en cas d'erreur
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
      NULL;
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

-- 2. S'assurer que le trigger existe et est actif
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Vérification : compter les utilisateurs et leurs profils
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.user_progress) AS total_user_progress;











