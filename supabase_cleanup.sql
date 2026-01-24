-- =====================================================
-- SCRIPT DE NETTOYAGE SUPABASE POUR ALIGN
-- =====================================================
-- Exécutez ce script AVANT supabase_schema_final.sql
-- si vous avez des erreurs "already exists"
-- Ce script supprime les policies et triggers existants

-- Supprimer les policies pour user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Supprimer les policies pour user_progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

-- Supprimer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer la fonction (optionnel, sera recréée par le schéma)
-- DROP FUNCTION IF EXISTS public.handle_new_user();















