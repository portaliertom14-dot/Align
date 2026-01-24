-- Migration pour ajouter current_module_index à la table user_progress
-- À exécuter dans le SQL Editor de Supabase

-- Ajouter la colonne current_module_index si elle n'existe pas
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_module_index INTEGER DEFAULT 0;

-- Supprimer l'ancienne colonne modules_completes si elle existe (plus utilisée)
ALTER TABLE public.user_progress 
DROP COLUMN IF EXISTS modules_completes;

-- Mettre à jour toutes les lignes existantes pour initialiser current_module_index à 0
UPDATE public.user_progress 
SET current_module_index = 0 
WHERE current_module_index IS NULL;

-- Vérification : vérifier que la colonne existe
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public'
  AND column_name = 'current_module_index';














