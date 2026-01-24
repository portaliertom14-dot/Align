-- ============================================================================
-- Script pour créer un trigger qui initialise automatiquement user_progress
-- lors de la création d'un nouvel utilisateur
-- ============================================================================
-- 
-- PROBLÈME: Les nouveaux utilisateurs n'ont pas de progression initiale
-- SOLUTION: Créer un trigger qui initialise user_progress avec des valeurs par défaut
--image.png
-- INSTRUCTIONS:
-- 1. Copier-coller ce script dans le SQL Editor de Supabase
-- 2. Exécuter le script
-- 3. Tester en créant un nouveau compte
-- ============================================================================

-- Fonction pour créer automatiquement user_progress lors de la création d'un utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer la progression initiale avec des valeurs par défaut non-null
  INSERT INTO public.user_progress (
    user_id,
    niveau,
    xp,
    etoiles,
    current_module_index,
    "activeModule",
    "currentChapter",
    "currentLesson",
    "completedLevels",
    "quizAnswers",
    "metierQuizAnswers",
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    0, -- niveau
    0, -- xp
    0, -- etoiles
    0, -- current_module_index
    'mini_simulation_metier', -- activeModule
    1, -- currentChapter
    1, -- currentLesson
    '[]'::jsonb, -- completedLevels
    '{}'::jsonb, -- quizAnswers
    '{}'::jsonb, -- metierQuizAnswers
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Ne rien faire si la progression existe déjà
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created_progress ON auth.users;

-- Créer le trigger qui s'exécute après l'insertion d'un nouvel utilisateur
CREATE TRIGGER on_auth_user_created_progress
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_progress();

-- Vérification: Tester que la fonction existe
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user_progress';

-- Message de confirmation
DO $$ 
BEGIN
  RAISE NOTICE '✅ Trigger créé avec succès!';
  RAISE NOTICE '📋 La progression user_progress sera créée automatiquement pour chaque nouvel utilisateur';
  RAISE NOTICE '💡 Les valeurs par défaut sont initialisées (pas null)';
END $$;










