-- Migration: Ajouter le flag welcome_email_sent à la table profiles
-- Ce flag permet de s'assurer que l'email de bienvenue n'est envoyé qu'une seule fois

-- Ajouter la colonne welcome_email_sent si elle n'existe pas déjà
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'welcome_email_sent'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN welcome_email_sent BOOLEAN DEFAULT FALSE;
    
    COMMENT ON COLUMN public.profiles.welcome_email_sent IS 'Indique si l''email de bienvenue a été envoyé à l''utilisateur';
  END IF;
END $$;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_profiles_welcome_email_sent 
ON public.profiles(welcome_email_sent) 
WHERE welcome_email_sent = TRUE;
