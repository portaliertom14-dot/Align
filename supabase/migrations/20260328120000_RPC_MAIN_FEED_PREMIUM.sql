-- Vérif serveur (Postgres) : accès main feed = user_profiles.is_premium strictement true pour auth.uid().
-- Exécuté avec les droits du rôle défini (SECURITY DEFINER) mais la ligne lue est toujours celle du JWT.
-- Le client ne peut pas choisir un autre user_id.

CREATE OR REPLACE FUNCTION public.get_main_feed_premium_allowed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (up.is_premium IS TRUE)
     FROM public.user_profiles up
     WHERE up.id = auth.uid()),
    false
  );
$$;

COMMENT ON FUNCTION public.get_main_feed_premium_allowed() IS
  'Retourne true si user_profiles.is_premium est true pour l''utilisateur connecté ; sinon false. Garde paywall / main feed.';

REVOKE ALL ON FUNCTION public.get_main_feed_premium_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_main_feed_premium_allowed() TO authenticated;
