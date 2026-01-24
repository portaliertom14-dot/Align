-- Script pour supprimer les comptes utilisateurs avec les emails spécifiés
-- À exécuter dans l'éditeur SQL de Supabase
-- 
-- IMPORTANT: Ce script supprime les données dans l'ordre correct pour respecter les contraintes de clés étrangères

-- Étape 1: Récupérer les IDs des utilisateurs à supprimer
DO $$
DECLARE
  user_ids UUID[];
BEGIN
  -- Récupérer les IDs des utilisateurs à partir de leurs emails
  SELECT ARRAY_AGG(id) INTO user_ids
  FROM auth.users
  WHERE email IN (
    'pxxrta@gmail.com',
    'portaliertom@gmail.com',
    'missionsommeil@gmail.com',
    'prt.tom133@gmail.com'
  );

  -- Si aucun utilisateur trouvé, arrêter
  IF user_ids IS NULL OR array_length(user_ids, 1) IS NULL THEN
    RAISE NOTICE 'Aucun utilisateur trouvé avec ces emails';
    RETURN;
  END IF;

  RAISE NOTICE 'Suppression de % utilisateur(s)', array_length(user_ids, 1);

  -- Étape 2: Supprimer les scores (qui référencent profiles)
  DELETE FROM public.scores
  WHERE user_id IN (SELECT id FROM public.profiles WHERE id = ANY(user_ids));
  
  RAISE NOTICE 'Scores supprimés';

  -- Étape 3: Supprimer les profils (qui référencent auth.users)
  DELETE FROM public.profiles
  WHERE id = ANY(user_ids);
  
  RAISE NOTICE 'Profils supprimés';

  -- Étape 4: Supprimer les données de public.users (qui référencent auth.users)
  -- Note: quiz_responses et quiz_responses_individual ont ON DELETE CASCADE
  -- donc elles seront supprimées automatiquement
  DELETE FROM public.users
  WHERE id = ANY(user_ids);
  
  RAISE NOTICE 'Données utilisateurs supprimées';

  -- Étape 5: Supprimer les utilisateurs de auth.users
  DELETE FROM auth.users
  WHERE id = ANY(user_ids);
  
  RAISE NOTICE 'Utilisateurs supprimés de auth.users';
END $$;

-- Vérifier que les utilisateurs ont bien été supprimés
SELECT email, id, created_at 
FROM auth.users 
WHERE email IN (
  'pxxrta@gmail.com',
  'portaliertom@gmail.com',
  'missionsommeil@gmail.com',
  'prt.tom133@gmail.com'
);
-- Cette requête devrait retourner 0 lignes si la suppression a réussi
