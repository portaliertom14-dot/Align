-- Migration pour ajouter les colonnes manquantes à la table user_profiles
-- Ces colonnes sont utilisées dans le flux d'onboarding

-- Vérifier si la table existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        RAISE EXCEPTION 'Table user_profiles does not exist';
    END IF;
END $$;

-- Ajouter les colonnes si elles n'existent pas déjà
DO $$
BEGIN
    -- Ajouter first_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'first_name'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Colonne first_name ajoutée';
    ELSE
        RAISE NOTICE 'Colonne first_name existe déjà';
    END IF;

    -- Ajouter last_name si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'last_name'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Colonne last_name ajoutée';
    ELSE
        RAISE NOTICE 'Colonne last_name existe déjà';
    END IF;

    -- Ajouter username si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN username TEXT;
        RAISE NOTICE 'Colonne username ajoutée';
    ELSE
        RAISE NOTICE 'Colonne username existe déjà';
    END IF;

    -- Ajouter professional_project si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'professional_project'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN professional_project TEXT;
        RAISE NOTICE 'Colonne professional_project ajoutée';
    ELSE
        RAISE NOTICE 'Colonne professional_project existe déjà';
    END IF;

    -- Ajouter similar_apps si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'similar_apps'
    ) THEN
        ALTER TABLE public.user_profiles 
        ADD COLUMN similar_apps TEXT;
        RAISE NOTICE 'Colonne similar_apps ajoutée';
    ELSE
        RAISE NOTICE 'Colonne similar_apps existe déjà';
    END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT 'first_name' AS column_name
        UNION SELECT 'last_name'
        UNION SELECT 'username'
        UNION SELECT 'professional_project'
        UNION SELECT 'similar_apps'
    ) AS required_columns
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
    );

    IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Colonnes manquantes: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'Toutes les colonnes requises sont présentes';
    END IF;
END $$;
