-- =====================================================
-- SCRIPT DE SUPPRESSION DES COMPTES DE TEST
-- =====================================================
-- Emails ciblés : pxxrta@gmail.com, portaliertom@gmail.com
-- 
-- SÉCURITÉ :
-- ❌ Aucun DROP, TRUNCATE, ou suppression de structure
-- ✅ Suppression ciblée par email uniquement
-- ✅ Respect de l'ordre des contraintes FK
-- ✅ Vérifications avant/après
--
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : VÉRIFICATION AVANT SUPPRESSION
-- =====================================================
-- Exécuter d'abord cette section pour voir les données à supprimer

-- 1.1 Vérifier les utilisateurs dans auth.users
SELECT 
    'auth.users' as table_name,
    id,
    email,
    created_at
FROM auth.users 
WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');

-- 1.2 Vérifier les profils dans user_profiles
SELECT 
    'user_profiles' as table_name,
    id,
    email,
    first_name,
    last_name,
    onboarding_completed,
    created_at
FROM public.user_profiles 
WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');

-- 1.3 Vérifier les progressions dans user_progress
SELECT 
    'user_progress' as table_name,
    up.id,
    prof.email,
    up.xp,
    up.etoiles,
    up.niveau
FROM public.user_progress up
JOIN public.user_profiles prof ON up.id = prof.id
WHERE prof.email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');

-- =====================================================
-- ÉTAPE 2 : SUPPRESSION DES DONNÉES (ORDRE FK RESPECTÉ)
-- =====================================================
-- Exécuter cette section APRÈS avoir vérifié l'étape 1

DO $$
DECLARE
    v_user_ids UUID[];
    v_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DÉBUT DE LA SUPPRESSION DES COMPTES TEST';
    RAISE NOTICE '========================================';
    
    -- Récupérer les IDs des utilisateurs ciblés depuis user_profiles
    SELECT ARRAY_AGG(id) INTO v_user_ids
    FROM public.user_profiles
    WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');
    
    -- Si aucun utilisateur trouvé dans user_profiles, essayer auth.users
    IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
        RAISE NOTICE 'Aucun utilisateur trouvé dans user_profiles, recherche dans auth.users...';
        
        SELECT ARRAY_AGG(id) INTO v_user_ids
        FROM auth.users
        WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');
    END IF;
    
    -- Vérifier si des utilisateurs ont été trouvés
    IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
        RAISE NOTICE '✅ Aucun utilisateur trouvé avec ces emails. Rien à supprimer.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'IDs trouvés : %', v_user_ids;
    RAISE NOTICE 'Nombre d''utilisateurs à supprimer : %', array_length(v_user_ids, 1);
    
    -- ========================================
    -- 2.1 Supprimer user_progress (référence user_profiles ou auth.users)
    -- ========================================
    DELETE FROM public.user_progress
    WHERE id = ANY(v_user_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ user_progress : % ligne(s) supprimée(s)', v_count;
    
    -- ========================================
    -- 2.2 Supprimer les anciennes tables si elles existent
    -- ========================================
    
    -- scores (référence profiles)
    BEGIN
        DELETE FROM public.scores
        WHERE user_id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ scores : % ligne(s) supprimée(s)', v_count;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⏭️ Table scores n''existe pas, ignorée';
    END;
    
    -- quiz_responses_individual (référence users)
    BEGIN
        DELETE FROM public.quiz_responses_individual
        WHERE user_id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ quiz_responses_individual : % ligne(s) supprimée(s)', v_count;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⏭️ Table quiz_responses_individual n''existe pas, ignorée';
    END;
    
    -- quiz_responses (référence users)
    BEGIN
        DELETE FROM public.quiz_responses
        WHERE user_id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ quiz_responses : % ligne(s) supprimée(s)', v_count;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⏭️ Table quiz_responses n''existe pas, ignorée';
    END;
    
    -- profiles (ancienne table)
    BEGIN
        DELETE FROM public.profiles
        WHERE id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ profiles : % ligne(s) supprimée(s)', v_count;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⏭️ Table profiles n''existe pas, ignorée';
    END;
    
    -- users (ancienne table)
    BEGIN
        DELETE FROM public.users
        WHERE id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count > 0 THEN
            RAISE NOTICE '✅ users : % ligne(s) supprimée(s)', v_count;
        END IF;
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE '⏭️ Table users n''existe pas, ignorée';
    END;
    
    -- ========================================
    -- 2.3 Supprimer user_profiles (table principale)
    -- ========================================
    DELETE FROM public.user_profiles
    WHERE id = ANY(v_user_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ user_profiles : % ligne(s) supprimée(s)', v_count;
    
    -- ========================================
    -- 2.4 Supprimer de auth.users
    -- ========================================
    -- NOTE: Cette opération peut nécessiter des privilèges service_role
    -- Si elle échoue, supprimer manuellement via Dashboard
    BEGIN
        DELETE FROM auth.users
        WHERE id = ANY(v_user_ids);
        GET DIAGNOSTICS v_count = ROW_COUNT;
        RAISE NOTICE '✅ auth.users : % ligne(s) supprimée(s)', v_count;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE '⚠️ Impossible de supprimer de auth.users par SQL.';
        RAISE NOTICE '   → Supprimer manuellement via Dashboard : Authentication → Users';
        RAISE NOTICE '   → Chercher les emails : pxxrta@gmail.com, portaliertom@gmail.com';
    END;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIN DE LA SUPPRESSION';
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- ÉTAPE 3 : VÉRIFICATION APRÈS SUPPRESSION
-- =====================================================
-- Exécuter cette section pour confirmer la suppression

-- 3.1 Vérifier auth.users (devrait retourner 0 lignes)
SELECT 
    'auth.users (APRÈS)' as verification,
    COUNT(*) as count
FROM auth.users 
WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');

-- 3.2 Vérifier user_profiles (devrait retourner 0 lignes)
SELECT 
    'user_profiles (APRÈS)' as verification,
    COUNT(*) as count
FROM public.user_profiles 
WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com');

-- 3.3 Vérifier user_progress (devrait retourner 0 lignes)
SELECT 
    'user_progress (APRÈS)' as verification,
    COUNT(*) as count
FROM public.user_progress up
WHERE up.id IN (
    SELECT id FROM auth.users 
    WHERE email IN ('pxxrta@gmail.com', 'portaliertom@gmail.com')
);

-- =====================================================
-- RÉSULTAT ATTENDU : Toutes les requêtes ci-dessus
-- doivent retourner count = 0
-- =====================================================
