-- =====================================================
-- NETTOYAGE DES UTILISATEURS ET CRÉATION DU COMPTE ADMIN
-- =====================================================
-- Ce script :
-- 1. Supprime les comptes utilisateurs avec les emails spécifiés
-- 2. Crée un compte admin avec l'email "align.app.contact@gmail.com"
--    qui passera toujours par l'onboarding

-- ÉTAPE 1 : SUPPRIMER LES UTILISATEURS AVEC LES EMAILS SPÉCIFIÉS
DO $$
DECLARE
  user_id_to_delete UUID;
  email_to_delete TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUPPRESSION DES UTILISATEURS';
  RAISE NOTICE '========================================';
  
  -- Liste des emails à supprimer
  FOR email_to_delete IN 
    SELECT unnest(ARRAY[
      'pxxrta@gmail.com',
      'portaliertom@gmail.com',
      'tom.portalier@gmail.com',
      'prt.tom133@gmail.com'
    ])
  LOOP
    -- Trouver l'ID de l'utilisateur par son email
    SELECT id INTO user_id_to_delete
    FROM auth.users
    WHERE email = email_to_delete;
    
    IF user_id_to_delete IS NOT NULL THEN
      RAISE NOTICE 'Suppression de l''utilisateur: % (ID: %)', email_to_delete, user_id_to_delete;
      
      -- ÉTAPE 1.1 : Supprimer d'abord les données dans les tables dépendantes
      -- Supprimer de user_progress (si la table existe)
      BEGIN
        DELETE FROM public.user_progress WHERE id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de user_progress';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table user_progress n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de user_profiles (si la table existe)
      BEGIN
        DELETE FROM public.user_profiles WHERE id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de user_profiles';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table user_profiles n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de profiles (si la table existe)
      BEGIN
        DELETE FROM public.profiles WHERE id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de profiles';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table profiles n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de users (si la table existe)
      BEGIN
        DELETE FROM public.users WHERE id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de users';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table users n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de quiz_responses (si la table existe)
      BEGIN
        DELETE FROM public.quiz_responses WHERE user_id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de quiz_responses';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table quiz_responses n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de quiz_responses_individual (si la table existe)
      BEGIN
        DELETE FROM public.quiz_responses_individual WHERE user_id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de quiz_responses_individual';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table quiz_responses_individual n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- Supprimer de scores (si la table existe)
      BEGIN
        DELETE FROM public.scores WHERE user_id = user_id_to_delete;
        RAISE NOTICE '  - Données supprimées de scores';
      EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = '42P01' THEN
          RAISE NOTICE '  - Table scores n''existe pas, ignorée';
        ELSE
          RAISE;
        END IF;
      END;
      
      -- ÉTAPE 1.2 : Enfin, supprimer l'utilisateur de auth.users
      DELETE FROM auth.users WHERE id = user_id_to_delete;
      
      RAISE NOTICE '✅ Utilisateur supprimé: %', email_to_delete;
    ELSE
      RAISE NOTICE '⚠️ Utilisateur non trouvé: %', email_to_delete;
    END IF;
  END LOOP;
  
  RAISE NOTICE '========================================';
END $$;

-- ÉTAPE 2 : VÉRIFIER QUE LES UTILISATEURS ONT BIEN ÉTÉ SUPPRIMÉS
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM auth.users
  WHERE email IN (
    'pxxrta@gmail.com',
    'portaliertom@gmail.com',
    'tom.portalier@gmail.com',
    'prt.tom133@gmail.com'
  );
  
  IF remaining_count > 0 THEN
    RAISE WARNING '⚠️ Il reste % utilisateur(s) à supprimer', remaining_count;
  ELSE
    RAISE NOTICE '✅ Tous les utilisateurs ont été supprimés';
  END IF;
END $$;

-- ÉTAPE 3 : CRÉER LE COMPTE ADMIN
-- Note: Le compte auth.users doit être créé via l'API Supabase Auth
-- Ce script prépare uniquement les données dans user_profiles et user_progress
-- L'utilisateur devra créer le compte auth via l'interface ou l'API avec l'email "align.app.contact@gmail.com"

DO $$
DECLARE
  admin_email TEXT := 'align.app.contact@gmail.com';
  admin_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CRÉATION DU COMPTE ADMIN';
  RAISE NOTICE '========================================';
  
  -- Vérifier si l'utilisateur admin existe déjà dans auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF admin_user_id IS NOT NULL THEN
    RAISE NOTICE 'Utilisateur admin trouvé dans auth.users: % (ID: %)', admin_email, admin_user_id;
    
    -- Vérifier si le profil existe déjà
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = admin_user_id) INTO admin_exists;
    
    IF NOT admin_exists THEN
      -- Créer le profil admin dans user_profiles
      INSERT INTO public.user_profiles (
        id,
        email,
        onboarding_completed,
        created_at,
        updated_at
      ) VALUES (
        admin_user_id,
        admin_email,
        FALSE, -- Toujours passer par l'onboarding
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        onboarding_completed = FALSE, -- Forcer onboarding_completed à FALSE
        updated_at = NOW();
      
      RAISE NOTICE '✅ Profil admin créé dans user_profiles';
    ELSE
      -- Mettre à jour le profil existant pour s'assurer que onboarding_completed = FALSE
      UPDATE public.user_profiles
      SET 
        email = admin_email,
        onboarding_completed = FALSE, -- Forcer onboarding_completed à FALSE
        updated_at = NOW()
      WHERE id = admin_user_id;
      
      RAISE NOTICE '✅ Profil admin mis à jour dans user_profiles (onboarding_completed = FALSE)';
    END IF;
    
    -- Vérifier si la progression existe déjà
    SELECT EXISTS(SELECT 1 FROM public.user_progress WHERE id = admin_user_id) INTO admin_exists;
    
    IF NOT admin_exists THEN
      -- Créer la progression admin dans user_progress
      INSERT INTO public.user_progress (
        id,
        niveau,
        xp,
        etoiles,
        created_at,
        updated_at
      ) VALUES (
        admin_user_id,
        1,
        0,
        0,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
      
      RAISE NOTICE '✅ Progression admin créée dans user_progress';
    ELSE
      RAISE NOTICE '✅ Progression admin existe déjà dans user_progress';
    END IF;
    
  ELSE
    RAISE NOTICE '⚠️ ATTENTION: L''utilisateur admin n''existe pas encore dans auth.users';
    RAISE NOTICE '   Créez d''abord le compte via l''API Supabase Auth avec l''email: %', admin_email;
    RAISE NOTICE '   Ensuite, réexécutez ce script pour créer les données associées.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- ÉTAPE 4 : VÉRIFICATION FINALE
DO $$
DECLARE
  deleted_count INTEGER;
  admin_profile_exists BOOLEAN;
  admin_progress_exists BOOLEAN;
  admin_onboarding_status BOOLEAN;
BEGIN
  -- Compter les utilisateurs supprimés (ne devraient plus exister)
  SELECT COUNT(*) INTO deleted_count
  FROM auth.users
  WHERE email IN (
    'pxxrta@gmail.com',
    'portaliertom@gmail.com',
    'tom.portalier@gmail.com',
    'prt.tom133@gmail.com'
  );
  
  -- Vérifier le compte admin
  SELECT 
    EXISTS(SELECT 1 FROM public.user_profiles WHERE email = 'align.app.contact@gmail.com'),
    EXISTS(SELECT 1 FROM public.user_progress WHERE id IN (SELECT id FROM public.user_profiles WHERE email = 'align.app.contact@gmail.com')),
    COALESCE((SELECT onboarding_completed FROM public.user_profiles WHERE email = 'align.app.contact@gmail.com'), TRUE)
  INTO 
    admin_profile_exists,
    admin_progress_exists,
    admin_onboarding_status;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ VÉRIFICATION FINALE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utilisateurs supprimés restants: %', deleted_count;
  RAISE NOTICE 'Compte admin (align.app.contact@gmail.com):';
  RAISE NOTICE '  - Profil existe: %', admin_profile_exists;
  RAISE NOTICE '  - Progression existe: %', admin_progress_exists;
  RAISE NOTICE '  - Onboarding complété: %', admin_onboarding_status;
  RAISE NOTICE '========================================';
  
  IF deleted_count > 0 THEN
    RAISE WARNING '⚠️ Il reste des utilisateurs à supprimer';
  END IF;
  
  IF NOT admin_profile_exists THEN
    RAISE WARNING '⚠️ Le profil admin n''existe pas encore';
  END IF;
  
  IF admin_onboarding_status THEN
    RAISE WARNING '⚠️ Le compte admin a onboarding_completed = TRUE, il devrait être FALSE';
  END IF;
END $$;

-- Afficher les utilisateurs restants avec les emails spécifiés (devrait être vide)
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email IN (
  'pxxrta@gmail.com',
  'portaliertom@gmail.com',
  'tom.portalier@gmail.com',
  'prt.tom133@gmail.com'
)
ORDER BY email;

-- Afficher les informations du compte admin
SELECT 
  up.id,
  up.email,
  up.onboarding_completed,
  up.created_at,
  up.updated_at,
  CASE WHEN ug.id IS NOT NULL THEN 'Oui' ELSE 'Non' END as progression_exists
FROM public.user_profiles up
LEFT JOIN public.user_progress ug ON up.id = ug.id
WHERE up.email = 'align.app.contact@gmail.com';
