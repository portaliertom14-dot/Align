-- Migration: colonnes Flammes (streak) et rappels email
-- À exécuter dans Supabase SQL Editor

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'streak_count'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN streak_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne streak_count ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'last_flame_day'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN last_flame_day DATE;
        RAISE NOTICE 'Colonne last_flame_day ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'flame_screen_seen_for_day'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN flame_screen_seen_for_day DATE;
        RAISE NOTICE 'Colonne flame_screen_seen_for_day ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'last_activity_at'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN last_activity_at TIMESTAMPTZ;
        RAISE NOTICE 'Colonne last_activity_at ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'last_reminder_stage'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN last_reminder_stage INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne last_reminder_stage ajoutée';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'last_reminder_sent_at'
    ) THEN
        ALTER TABLE public.user_progress ADD COLUMN last_reminder_sent_at TIMESTAMPTZ;
        RAISE NOTICE 'Colonne last_reminder_sent_at ajoutée';
    END IF;
END $$;
