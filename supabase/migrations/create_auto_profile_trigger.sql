-- =====================================================
-- MIGRATION : Créer le trigger d'auto-création de profil utilisateur
-- Date : 2026-01-20
-- Description : Crée automatiquement un profil dans user_profiles 
--               lors de la création d'un utilisateur dans auth.users
-- =====================================================

-- 1. Créer la fonction qui sera appelée par le trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_progress (id, created_at, updated_at)
  VALUES (
    NEW.id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Créer le trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Mettre à jour les RLS policies pour user_profiles
-- Permettre aux utilisateurs authentifiés de lire LEUR profil
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Permettre aux utilisateurs authentifiés de mettre à jour LEUR profil
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Permettre au système (trigger avec SECURITY DEFINER) d'insérer
-- Note : Les triggers avec SECURITY DEFINER bypasse RLS automatiquement

-- 4. Activer RLS sur user_profiles si pas déjà fait
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Faire de même pour user_progress
DROP POLICY IF EXISTS "Users can view their own progress" ON user_progress;
CREATE POLICY "Users can view their own progress"
  ON user_progress
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own progress" ON user_progress;
CREATE POLICY "Users can update their own progress"
  ON user_progress
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- 6. Commenter pour référence
COMMENT ON FUNCTION public.handle_new_user() IS 'Crée automatiquement un profil et une progression pour chaque nouvel utilisateur';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Déclenche la création automatique du profil après insertion dans auth.users';
