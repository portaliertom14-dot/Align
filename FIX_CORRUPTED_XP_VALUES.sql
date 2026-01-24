-- ============================================================================
-- Script de Réparation : Valeurs XP Corrompues (Ancien Système)
-- ============================================================================
-- 
-- PROBLÈME:
-- - L'ancien système générait des valeurs d'XP astronomiques (trillions)
-- - Exemple : 1,147,684,330,552,630 XP → Niveau 999 → Infinity XP requise
-- - Cause : Multiplicateurs exponentiels (×2, ×4, ×8...) par niveau
--
-- SOLUTION:
-- Option 1 : Recalculer l'XP depuis le niveau (approximatif mais équitable)
-- Option 2 : Réinitialiser à un niveau raisonnable (niveau 100)
-- Option 3 : Conserver le niveau mais ajuster l'XP (recommandé)
--
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : IDENTIFIER LES COMPTES CORROMPUS
-- ============================================================================

-- Voir tous les comptes avec XP > 1 million (suspects)
SELECT 
  user_id,
  niveau as niveau_actuel,
  "currentXP" as xp_actuel,
  etoiles,
  updated_at
FROM public.user_progress
WHERE "currentXP" > 1000000
ORDER BY "currentXP" DESC;

-- Statistiques
SELECT 
  COUNT(*) as nb_comptes_corrompus,
  MIN("currentXP") as xp_min,
  MAX("currentXP") as xp_max,
  AVG("currentXP") as xp_moyen
FROM public.user_progress
WHERE "currentXP" > 1000000;

-- ============================================================================
-- ÉTAPE 2 : CHOISIR UNE STRATÉGIE DE RÉPARATION
-- ============================================================================

-- ============================================================================
-- OPTION 1 : RECALCULER L'XP DEPUIS LE NIVEAU (RECOMMANDÉ)
-- ============================================================================
-- 
-- Formule Nouveau Système V2 : XP_total = SUM(20 + 8 * (i ^ 1.5)) pour i=1..niveau
-- 
-- Cette option est ÉQUITABLE car elle conserve le niveau mais corrige l'XP
-- Un utilisateur niveau 300 aura l'XP correspondant au niveau 300 dans le nouveau système
-- 
-- ⚠️ ATTENTION : Cette opération est IRRÉVERSIBLE
-- Faire un BACKUP avant d'exécuter
-- ============================================================================

-- Fonction pour calculer l'XP totale depuis le niveau (formule V2)
CREATE OR REPLACE FUNCTION calculate_xp_from_level(target_level INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  total_xp BIGINT := 0;
  level_iter INTEGER;
  xp_required NUMERIC;
BEGIN
  -- Limiter au niveau 1000 max
  IF target_level > 1000 THEN
    target_level := 1000;
  END IF;
  
  -- Calculer la somme des XP requises pour chaque niveau
  FOR level_iter IN 1..target_level LOOP
    -- Formule : 20 + 8 * (level ^ 1.5)
    xp_required := 20 + 8 * POWER(level_iter, 1.5);
    total_xp := total_xp + FLOOR(xp_required);
  END LOOP;
  
  RETURN total_xp;
END;
$$;

-- Test de la fonction
SELECT 
  niveau,
  calculate_xp_from_level(niveau) as xp_recalcule
FROM (VALUES (1), (10), (50), (100), (300)) AS t(niveau);

-- Prévisualiser les changements (DRY RUN)
SELECT 
  user_id,
  niveau as niveau_actuel,
  "currentXP" as xp_avant,
  calculate_xp_from_level(niveau) as xp_apres,
  "currentXP" - calculate_xp_from_level(niveau) as diff_xp
FROM public.user_progress
WHERE "currentXP" > 1000000
ORDER BY "currentXP" DESC;

-- ⚠️ EXÉCUTER SEULEMENT APRÈS BACKUP ET VALIDATION ⚠️
-- Mettre à jour tous les comptes corrompus
UPDATE public.user_progress
SET 
  "currentXP" = calculate_xp_from_level(niveau),
  updated_at = NOW()
WHERE "currentXP" > 1000000;

-- ============================================================================
-- OPTION 2 : PLAFONNER AU NIVEAU 100 (CONSERVATEUR)
-- ============================================================================
-- 
-- Cette option est plus CONSERVATRICE : tous les comptes > niveau 100
-- sont ramenés au niveau 100 avec l'XP correspondante
-- 
-- Avantage : Évite les niveaux trop élevés (300+)
-- Inconvénient : Perte de progression pour les utilisateurs très avancés
-- ============================================================================

-- Prévisualiser
SELECT 
  user_id,
  niveau as niveau_avant,
  LEAST(niveau, 100) as niveau_apres,
  "currentXP" as xp_avant,
  calculate_xp_from_level(LEAST(niveau, 100)) as xp_apres
FROM public.user_progress
WHERE "currentXP" > 1000000 OR niveau > 100;

-- ⚠️ EXÉCUTER SEULEMENT APRÈS BACKUP ET VALIDATION ⚠️
-- UPDATE public.user_progress
-- SET 
--   niveau = LEAST(niveau, 100),
--   "currentXP" = calculate_xp_from_level(LEAST(niveau, 100)),
--   updated_at = NOW()
-- WHERE "currentXP" > 1000000 OR niveau > 100;

-- ============================================================================
-- OPTION 3 : RESET COMPLET (DERNIER RECOURS)
-- ============================================================================
-- 
-- Cette option RESET complètement la progression
-- À utiliser SEULEMENT pour les comptes de test ou avec accord utilisateur
-- ============================================================================

-- Réinitialiser des comptes spécifiques (remplacer les UUIDs)
-- UPDATE public.user_progress
-- SET 
--   niveau = 1,
--   "currentXP" = 0,
--   etoiles = 0,
--   updated_at = NOW()
-- WHERE user_id IN (
--   'UUID_1',
--   'UUID_2'
-- );

-- ============================================================================
-- OPTION 4 : FIX POUR UN COMPTE SPÉCIFIQUE (MANUEL)
-- ============================================================================
-- 
-- Pour corriger un compte spécifique (ex: votre compte niveau 300)
-- ============================================================================

-- Trouver votre user_id
SELECT user_id, niveau, "currentXP", etoiles
FROM public.user_progress
WHERE niveau >= 300
ORDER BY "currentXP" DESC
LIMIT 5;

-- Option 4a : Conserver niveau 300, recalculer XP
-- (Remplacer 'YOUR_USER_ID' par votre UUID réel)
/*
UPDATE public.user_progress
SET 
  "currentXP" = calculate_xp_from_level(300),
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
*/

-- Résultat attendu pour niveau 300 : ~14M XP (au lieu de 1.1 trillion)
SELECT calculate_xp_from_level(300) as xp_niveau_300;

-- Option 4b : Ramener au niveau 100 (plus raisonnable)
-- (Remplacer 'YOUR_USER_ID' par votre UUID réel)
/*
UPDATE public.user_progress
SET 
  niveau = 100,
  "currentXP" = calculate_xp_from_level(100),
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID';
*/

-- Résultat attendu pour niveau 100 : ~326k XP
SELECT calculate_xp_from_level(100) as xp_niveau_100;

-- ============================================================================
-- ÉTAPE 3 : VÉRIFICATION POST-MIGRATION
-- ============================================================================

-- Vérifier qu'il n'y a plus de valeurs corrompues
SELECT 
  COUNT(*) as nb_comptes,
  MIN("currentXP") as xp_min,
  MAX("currentXP") as xp_max,
  AVG("currentXP") as xp_moyen,
  MAX(niveau) as niveau_max
FROM public.user_progress;

-- Distribution des niveaux après correction
SELECT 
  CASE 
    WHEN niveau BETWEEN 1 AND 10 THEN '1-10'
    WHEN niveau BETWEEN 11 AND 50 THEN '11-50'
    WHEN niveau BETWEEN 51 AND 100 THEN '51-100'
    WHEN niveau BETWEEN 101 AND 200 THEN '101-200'
    WHEN niveau > 200 THEN '200+'
  END as tranche_niveau,
  COUNT(*) as nb_utilisateurs
FROM public.user_progress
GROUP BY tranche_niveau
ORDER BY MIN(niveau);

-- Identifier les comptes qui ont encore des valeurs suspectes
SELECT 
  user_id,
  niveau,
  "currentXP",
  etoiles
FROM public.user_progress
WHERE "currentXP" > 100000000  -- > 100M
   OR niveau > 500
ORDER BY "currentXP" DESC;

-- ============================================================================
-- ÉTAPE 4 : NETTOYAGE (OPTIONNEL)
-- ============================================================================

-- Supprimer la fonction temporaire
-- DROP FUNCTION IF EXISTS calculate_xp_from_level(INTEGER);

-- ============================================================================
-- NOTES IMPORTANTES
-- ============================================================================
-- 
-- 1. BACKUP OBLIGATOIRE avant toute modification
-- 2. Tester d'abord sur un environnement de staging
-- 3. Option 1 (recalculer depuis niveau) est RECOMMANDÉE car équitable
-- 4. Après correction, redémarrer PostgREST si nécessaire
-- 5. Les utilisateurs verront leur XP corrigée au prochain chargement
-- 
-- ============================================================================
-- EXEMPLE D'UTILISATION POUR VOTRE COMPTE
-- ============================================================================
-- 
-- 1. Identifier votre user_id :
--    SELECT user_id FROM public.user_progress WHERE niveau >= 300 LIMIT 1;
-- 
-- 2. Voir l'XP actuelle et recalculée :
--    SELECT niveau, "currentXP", calculate_xp_from_level(niveau) 
--    FROM public.user_progress WHERE user_id = 'YOUR_UUID';
-- 
-- 3. Appliquer la correction :
--    UPDATE public.user_progress 
--    SET "currentXP" = calculate_xp_from_level(niveau)
--    WHERE user_id = 'YOUR_UUID';
-- 
-- 4. Vérifier :
--    SELECT niveau, "currentXP" FROM public.user_progress WHERE user_id = 'YOUR_UUID';
-- 
-- ============================================================================

-- Message de fin
DO $$ 
BEGIN
  RAISE NOTICE '✅ Script de réparation XP chargé';
  RAISE NOTICE '📋 Choisissez une option (1, 2, 3 ou 4)';
  RAISE NOTICE '⚠️  BACKUP OBLIGATOIRE avant toute modification';
  RAISE NOTICE '💡 Option 1 (recalculer depuis niveau) est RECOMMANDÉE';
END $$;
