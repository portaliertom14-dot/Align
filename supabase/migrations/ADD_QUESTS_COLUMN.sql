-- Migration: Ajouter le support des quêtes dans Supabase
-- Date: 2026-01-21
-- Description: Ajoute une colonne JSONB pour stocker les données de quêtes

-- ============================================================================
-- ÉTAPE 1: Ajouter la colonne quests à user_progress
-- ============================================================================

-- Ajouter la colonne quests (JSONB pour stocker les données structurées)
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS quests JSONB DEFAULT NULL;

-- Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN user_progress.quests IS 'Données des quêtes utilisateur (quotidiennes, hebdomadaires, performance) au format JSON';

-- ============================================================================
-- ÉTAPE 2: Créer un index pour améliorer les performances
-- ============================================================================

-- Index GIN pour recherches efficaces dans le JSONB
CREATE INDEX IF NOT EXISTS idx_user_progress_quests 
ON user_progress USING GIN (quests);

-- ============================================================================
-- ÉTAPE 3: Ajouter les colonnes de tracking (optionnel)
-- ============================================================================

-- Colonnes pour le tracking d'activité et séries (si pas déjà présentes)
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS activity_data JSONB DEFAULT NULL;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS series_data JSONB DEFAULT NULL;

-- Commentaires
COMMENT ON COLUMN user_progress.activity_data IS 'Données de tracking d\'activité utilisateur (temps actif, sessions)';
COMMENT ON COLUMN user_progress.series_data IS 'Données de tracking des séries (séries complétées, séries parfaites)';

-- Index pour les colonnes de tracking
CREATE INDEX IF NOT EXISTS idx_user_progress_activity_data 
ON user_progress USING GIN (activity_data);

CREATE INDEX IF NOT EXISTS idx_user_progress_series_data 
ON user_progress USING GIN (series_data);

-- ============================================================================
-- ÉTAPE 4: Mettre à jour les politiques RLS (si nécessaire)
-- ============================================================================

-- Les politiques RLS existantes devraient déjà couvrir ces colonnes
-- Vérifier que les utilisateurs peuvent lire et mettre à jour leurs propres quêtes

-- Politique SELECT (lire ses propres quêtes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_progress' 
    AND policyname = 'Users can read own progress'
  ) THEN
    CREATE POLICY "Users can read own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = id);
  END IF;
END $$;

-- Politique UPDATE (mettre à jour ses propres quêtes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_progress' 
    AND policyname = 'Users can update own progress'
  ) THEN
    CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = id);
  END IF;
END $$;

-- ============================================================================
-- ÉTAPE 5: Fonction helper pour mettre à jour les quêtes
-- ============================================================================

-- Fonction pour mettre à jour les quêtes sans écraser les autres colonnes
CREATE OR REPLACE FUNCTION update_user_quests(
  user_id UUID,
  quests_data JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_progress
  SET 
    quests = quests_data,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire sur la fonction
COMMENT ON FUNCTION update_user_quests IS 'Met à jour les données de quêtes d\'un utilisateur';

-- ============================================================================
-- ÉTAPE 6: Fonction helper pour récupérer les quêtes
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_quests(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT quests INTO result
  FROM user_progress
  WHERE id = user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire sur la fonction
COMMENT ON FUNCTION get_user_quests IS 'Récupère les données de quêtes d\'un utilisateur';

-- ============================================================================
-- VÉRIFICATION: Afficher les colonnes ajoutées
-- ============================================================================

-- Vérifier que les colonnes ont été ajoutées
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_progress'
  AND column_name IN ('quests', 'activity_data', 'series_data')
ORDER BY column_name;

-- ============================================================================
-- INSTRUCTIONS POST-MIGRATION
-- ============================================================================

-- 1. Exécuter ce script dans l'éditeur SQL de Supabase
-- 2. Attendre 10-15 secondes pour le rafraîchissement du cache PostgREST
-- 3. Si nécessaire, redémarrer PostgREST: Settings > API > Restart PostgREST service
-- 4. Tester que les sauvegardes fonctionnent sans erreurs PGRST204
-- 5. Les données seront automatiquement synchronisées depuis AsyncStorage
