-- Migration pour ajouter la colonne onboarding_completed
-- Cette colonne est CRITIQUE pour le système de redirection Auth V1
-- Sans elle, tous les utilisateurs sont redirigés vers l'onboarding au lieu du Feed

-- Vérifier si la table existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
        RAISE EXCEPTION 'Table user_profiles does not exist. Please create it first.';
    END IF;
    
    RAISE NOTICE '✅ Table user_profiles existe';
END $$;

-- Ajouter la colonne onboarding_completed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'onboarding_completed'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE public.user_profiles 
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;
        
        RAISE NOTICE '✅ Colonne onboarding_completed ajoutée avec valeur par défaut FALSE';
    ELSE
        RAISE NOTICE '⚠️  Colonne onboarding_completed existe déjà';
    END IF;
END $$;

-- Ajouter la colonne onboarding_step pour reprendre l'onboarding là où on s'est arrêté
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'onboarding_step'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE public.user_profiles 
        ADD COLUMN onboarding_step INTEGER DEFAULT 0 NOT NULL;
        
        RAISE NOTICE '✅ Colonne onboarding_step ajoutée avec valeur par défaut 0';
    ELSE
        RAISE NOTICE '⚠️  Colonne onboarding_step existe déjà';
    END IF;
END $$;

-- Mettre à jour les utilisateurs existants
-- IMPORTANT: Déterminer qui a déjà complété l'onboarding
-- Stratégie: Si un utilisateur a first_name ET last_name ET username renseignés,
-- on considère qu'il a probablement complété l'onboarding
DO $$
DECLARE
    users_updated INTEGER;
BEGIN
    -- Marquer comme "onboarding complété" les utilisateurs qui ont des données complètes
    UPDATE public.user_profiles
    SET onboarding_completed = TRUE
    WHERE 
        first_name IS NOT NULL 
        AND first_name != ''
        AND last_name IS NOT NULL 
        AND last_name != ''
        AND username IS NOT NULL 
        AND username != ''
        AND onboarding_completed = FALSE; -- Seulement ceux qui sont FALSE
    
    GET DIAGNOSTICS users_updated = ROW_COUNT;
    
    IF users_updated > 0 THEN
        RAISE NOTICE '✅ % utilisateur(s) existant(s) marqué(s) comme ayant complété l''onboarding', users_updated;
    ELSE
        RAISE NOTICE 'ℹ️  Aucun utilisateur existant à mettre à jour';
    END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
    total_users INTEGER;
    completed_users INTEGER;
    incomplete_users INTEGER;
BEGIN
    -- Compter les utilisateurs
    SELECT COUNT(*) INTO total_users FROM public.user_profiles;
    SELECT COUNT(*) INTO completed_users FROM public.user_profiles WHERE onboarding_completed = TRUE;
    SELECT COUNT(*) INTO incomplete_users FROM public.user_profiles WHERE onboarding_completed = FALSE;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '📊 STATISTIQUES ONBOARDING';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Total utilisateurs: %', total_users;
    RAISE NOTICE 'Onboarding complété: % (%.1f%%)', completed_users, (completed_users::FLOAT / NULLIF(total_users, 0) * 100);
    RAISE NOTICE 'Onboarding incomplet: % (%.1f%%)', incomplete_users, (incomplete_users::FLOAT / NULLIF(total_users, 0) * 100);
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    -- Vérifier que la colonne existe bien
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'onboarding_completed'
    ) THEN
        RAISE NOTICE '✅ Migration réussie: colonne onboarding_completed créée';
    ELSE
        RAISE EXCEPTION '❌ ERREUR: La colonne onboarding_completed n''a pas été créée';
    END IF;
END $$;

-- Note importante pour l'équipe
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE '⚠️  IMPORTANT';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    RAISE NOTICE 'Cette migration résout le bug de redirection :';
    RAISE NOTICE '- Avant: Tous les utilisateurs étaient redirigés vers onboarding au login';
    RAISE NOTICE '- Après: Les utilisateurs avec onboarding complété vont vers Feed';
    RAISE NOTICE '';
    RAISE NOTICE 'Les utilisateurs peuvent maintenant se reconnecter normalement !';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;
