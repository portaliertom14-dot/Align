-- Script de vérification et correction complète de Supabase
-- À exécuter dans le SQL Editor de Supabase
-- VÉRIFIE et CORRIGE tous les problèmes d'enregistrement des nouveaux utilisateurs

-- =====================================================
-- 1. VÉRIFICATION DES TABLES
-- =====================================================

-- Vérifier que user_profiles existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
) AS user_profiles_exists;

-- Vérifier que user_progress existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
) AS user_progress_exists;

-- Vérifier que profiles existe
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profiles'
) AS profiles_exists;

-- =====================================================
-- 2. VÉRIFICATION DES COLONNES
-- =====================================================

-- Colonnes de user_progress
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Colonnes de user_profiles
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Colonnes de profiles
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. VÉRIFICATION DES RLS POLICIES
-- =====================================================

-- Policies pour user_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Policies pour user_progress
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_progress';

-- Policies pour profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- =====================================================
-- 4. VÉRIFICATION DU TRIGGER
-- =====================================================

-- Vérifier que le trigger existe
SELECT 
  tgname AS trigger_name,
  tgtype::text AS trigger_type,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Vérifier que la fonction existe
SELECT 
  proname AS function_name,
  prosrc AS function_source
FROM pg_proc
WHERE proname = 'handle_new_user';

-- =====================================================
-- 5. CORRECTION : S'assurer que current_module_index existe
-- =====================================================

ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_module_index INTEGER DEFAULT 0;

-- =====================================================
-- 6. CORRECTION : Mettre à jour le trigger pour qu'il soit robuste
-- =====================================================

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
  -- Créer le profil utilisateur dans user_profiles
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

  -- Créer le profil dans profiles (pour compatibilité)
  BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
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

-- =====================================================
-- 7. S'assurer que le trigger est actif
-- =====================================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 8. VÉRIFICATION FINALE
-- =====================================================

-- Vérifier que le trigger est bien créé
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Compter les utilisateurs dans chaque table
SELECT 
  (SELECT COUNT(*) FROM auth.users) AS total_auth_users,
  (SELECT COUNT(*) FROM public.user_profiles) AS total_user_profiles,
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.user_progress) AS total_user_progress;











