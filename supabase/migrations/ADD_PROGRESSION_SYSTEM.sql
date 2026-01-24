-- Migration: Ajout du nouveau système de progression
-- Ajoute les colonnes total_xp, stars, completed_modules_count à user_progress

-- Vérifier si les colonnes existent déjà
DO $$
BEGIN
  -- Ajouter total_xp (BIGINT pour supporter de grandes valeurs)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'total_xp'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN total_xp BIGINT DEFAULT 0 NOT NULL;
    COMMENT ON COLUMN user_progress.total_xp IS 'XP totale accumulée (source de vérité pour le niveau)';
  END IF;

  -- Ajouter stars (INTEGER)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'stars'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN stars INTEGER DEFAULT 0 NOT NULL;
    COMMENT ON COLUMN user_progress.stars IS 'Étoiles totales accumulées';
  END IF;

  -- Ajouter completed_modules_count (INTEGER)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'completed_modules_count'
  ) THEN
    ALTER TABLE user_progress ADD COLUMN completed_modules_count INTEGER DEFAULT 0 NOT NULL;
    COMMENT ON COLUMN user_progress.completed_modules_count IS 'Nombre de modules complétés';
  END IF;
END $$;

-- Migrer les données existantes (si xp existe, l'utiliser pour total_xp)
DO $$
BEGIN
  -- Si la colonne xp existe et total_xp est à 0, migrer les données
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'xp'
  ) THEN
    UPDATE user_progress
    SET total_xp = COALESCE(xp, 0)
    WHERE total_xp = 0 AND COALESCE(xp, 0) > 0;
  END IF;

  -- Si la colonne etoiles existe et stars est à 0, migrer les données
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_progress' AND column_name = 'etoiles'
  ) THEN
    UPDATE user_progress
    SET stars = COALESCE(etoiles, 0)
    WHERE stars = 0 AND COALESCE(etoiles, 0) > 0;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_user_progress_total_xp ON user_progress(total_xp);
CREATE INDEX IF NOT EXISTS idx_user_progress_stars ON user_progress(stars);
