-- =====================================================
-- MIGRATION : Ajouter les colonnes de chapitre manquantes
-- Date : 2026-01-20
-- =====================================================

-- Ajouter les colonnes manquantes à user_progress
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS current_module_in_chapter INTEGER DEFAULT 0;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb;

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS chapter_history JSONB DEFAULT '[]'::jsonb;

-- Commenter pour référence
COMMENT ON COLUMN user_progress.current_module_in_chapter IS 'Index du module actuel dans le chapitre en cours';
COMMENT ON COLUMN user_progress.completed_modules_in_chapter IS 'Liste des modules complétés dans le chapitre actuel';
COMMENT ON COLUMN user_progress.chapter_history IS 'Historique des chapitres complétés avec leurs données';
