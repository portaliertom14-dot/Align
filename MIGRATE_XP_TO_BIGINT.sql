-- ============================================================================
-- Migration : Changer le type de currentXP de INTEGER à BIGINT
-- ============================================================================
-- 
-- PROBLÈME: 
-- - La colonne currentXP est de type INTEGER (limite : 2^31 - 1 = 2,147,483,647)
-- - Les valeurs d'XP dépassent maintenant cette limite (ex: 4,309,007,670)
-- - Erreur PostgreSQL : "value \"4309007670\" is out of range for type integer"
--
-- SOLUTION:
-- - Changer le type de currentXP de INTEGER à BIGINT (limite : 2^63 - 1 = 9,223,372,036,854,775,807)
-- - BIGINT peut stocker des valeurs jusqu'à 9 quintillions
--
-- INSTRUCTIONS:
-- 1. Copier-coller ce script dans le SQL Editor de Supabase
-- 2. Exécuter le script
-- 3. Attendre 10-15 secondes pour le rafraîchissement du cache PostgREST
-- 4. Si les erreurs persistent: Settings > API > Restart PostgREST service
-- ============================================================================

-- Vérifier si la colonne currentXP existe et son type actuel
DO $$ 
DECLARE
  col_exists BOOLEAN;
  current_type TEXT;
BEGIN
  -- Vérifier si la colonne existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'currentXP'
  ) INTO col_exists;
  
  IF NOT col_exists THEN
    RAISE NOTICE '⚠️ Colonne currentXP n''existe pas - création avec type BIGINT';
    ALTER TABLE public.user_progress ADD COLUMN "currentXP" BIGINT DEFAULT 0;
    RAISE NOTICE '✅ Colonne currentXP créée avec type BIGINT';
  ELSE
    -- Vérifier le type actuel
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'currentXP';
    
    IF current_type = 'integer' THEN
      RAISE NOTICE '🔄 Migration de currentXP de INTEGER à BIGINT...';
      ALTER TABLE public.user_progress ALTER COLUMN "currentXP" TYPE BIGINT USING "currentXP"::BIGINT;
      RAISE NOTICE '✅ Colonne currentXP migrée de INTEGER à BIGINT';
    ELSIF current_type = 'bigint' THEN
      RAISE NOTICE '✅ Colonne currentXP est déjà de type BIGINT';
    ELSE
      RAISE NOTICE '⚠️ Type actuel de currentXP: % - Changement vers BIGINT...', current_type;
      ALTER TABLE public.user_progress ALTER COLUMN "currentXP" TYPE BIGINT USING "currentXP"::BIGINT;
      RAISE NOTICE '✅ Colonne currentXP changée en BIGINT';
    END IF;
  END IF;
END $$;

-- Vérifier aussi la colonne "xp" (ancienne convention de nommage)
DO $$ 
DECLARE
  col_exists BOOLEAN;
  current_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'xp'
  ) INTO col_exists;
  
  IF col_exists THEN
    SELECT data_type INTO current_type
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_progress' 
      AND column_name = 'xp';
    
    IF current_type = 'integer' THEN
      RAISE NOTICE '🔄 Migration de xp de INTEGER à BIGINT...';
      ALTER TABLE public.user_progress ALTER COLUMN xp TYPE BIGINT USING xp::BIGINT;
      RAISE NOTICE '✅ Colonne xp migrée de INTEGER à BIGINT';
    ELSIF current_type = 'bigint' THEN
      RAISE NOTICE '✅ Colonne xp est déjà de type BIGINT';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- VÉRIFICATION: Afficher le type actuel de currentXP et xp
-- ============================================================================
SELECT 
  column_name, 
  data_type,
  numeric_precision,
  numeric_scale,
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
  AND column_name IN ('currentXP', 'xp')
ORDER BY column_name;

-- ============================================================================
-- Message de confirmation
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ Migration terminée!';
  RAISE NOTICE '📋 Vérifiez le type des colonnes ci-dessus (devrait être bigint)';
  RAISE NOTICE '⏳ Attendez 10-15 secondes pour le rafraîchissement du cache PostgREST';
  RAISE NOTICE '🔄 Si les erreurs persistent, redémarrez PostgREST: Settings > API > Restart PostgREST service';
END $$;
