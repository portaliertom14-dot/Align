-- Fonction pour vérifier si un email existe déjà
-- Cette fonction bypass RLS car elle est SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.check_email_exists(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier dans user_profiles si l'email existe
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$;

-- Permettre à tous d'exécuter cette fonction (même non-authentifiés)
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;
