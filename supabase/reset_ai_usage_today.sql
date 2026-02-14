-- Réinitialiser les compteurs d'appels IA pour aujourd'hui
-- À exécuter dans Supabase SQL Editor
DELETE FROM public.ai_usage WHERE date = CURRENT_DATE;
