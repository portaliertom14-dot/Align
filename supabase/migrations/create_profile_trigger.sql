-- =====================================================
-- TRIGGER : Auto-créer user_profiles et user_progress lors du signup
-- Date : 2026-01-20
-- =====================================================

-- Fonction pour créer automatiquement le profil et la progression
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer le profil utilisateur
  INSERT INTO public.user_profiles (id, email, onboarding_completed)
  VALUES (NEW.id, NEW.email, false)
  ON CONFLICT (id) DO NOTHING;
  
  -- Créer la progression utilisateur
  INSERT INTO public.user_progress (id, niveau, xp, etoiles)
  VALUES (NEW.id, 1, 0, 0)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger qui s'exécute après l'insertion d'un nouvel utilisateur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
