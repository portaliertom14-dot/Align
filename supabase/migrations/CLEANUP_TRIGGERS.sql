-- =====================================================
-- NETTOYAGE : Supprimer tous les triggers qui pourraient causer des problèmes
-- Date : 2026-01-20
-- =====================================================

-- Supprimer le trigger s'il existe (peut causer l'erreur "Database error saving new user")
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Supprimer d'autres triggers potentiellement problématiques
DROP TRIGGER IF EXISTS on_user_created ON user_profiles;
DROP TRIGGER IF EXISTS on_user_updated ON user_profiles;
DROP TRIGGER IF EXISTS on_progress_updated ON user_progress;

-- =====================================================
-- FIN - Tous les triggers potentiellement problématiques sont supprimés
-- =====================================================
