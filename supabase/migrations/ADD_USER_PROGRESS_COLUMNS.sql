-- Migration pour ajouter les colonnes manquantes à la table user_progress
-- Ces colonnes sont utilisées pour gérer la progression utilisateur dans l'application

-- Vérifier si la table existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress') THEN
        RAISE EXCEPTION 'Table user_progress does not exist';
    END IF;
END $$;

-- Ajouter les colonnes si elles n'existent pas déjà
DO $$
BEGIN
    -- Ajouter activeDirection si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'activeDirection'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "activeDirection" TEXT;
        RAISE NOTICE 'Colonne activeDirection ajoutée';
    ELSE
        RAISE NOTICE 'Colonne activeDirection existe déjà';
    END IF;

    -- Ajouter activeSerie si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'activeSerie'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "activeSerie" TEXT;
        RAISE NOTICE 'Colonne activeSerie ajoutée';
    ELSE
        RAISE NOTICE 'Colonne activeSerie existe déjà';
    END IF;

    -- Ajouter activeMetier si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'activeMetier'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "activeMetier" TEXT;
        RAISE NOTICE 'Colonne activeMetier ajoutée';
    ELSE
        RAISE NOTICE 'Colonne activeMetier existe déjà';
    END IF;

    -- Ajouter activeModule si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'activeModule'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "activeModule" TEXT DEFAULT 'mini_simulation_metier';
        RAISE NOTICE 'Colonne activeModule ajoutée';
    ELSE
        RAISE NOTICE 'Colonne activeModule existe déjà';
    END IF;

    -- Ajouter currentChapter si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'currentChapter'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "currentChapter" INTEGER DEFAULT 1;
        RAISE NOTICE 'Colonne currentChapter ajoutée';
    ELSE
        RAISE NOTICE 'Colonne currentChapter existe déjà';
    END IF;

    -- Ajouter currentLesson si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'currentLesson'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "currentLesson" INTEGER DEFAULT 1;
        RAISE NOTICE 'Colonne currentLesson ajoutée';
    ELSE
        RAISE NOTICE 'Colonne currentLesson existe déjà';
    END IF;

    -- Ajouter current_module_in_chapter si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'current_module_in_chapter'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN current_module_in_chapter INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne current_module_in_chapter ajoutée';
    ELSE
        RAISE NOTICE 'Colonne current_module_in_chapter existe déjà';
    END IF;

    -- Ajouter completed_modules_in_chapter si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'completed_modules_in_chapter'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Colonne completed_modules_in_chapter ajoutée';
    ELSE
        RAISE NOTICE 'Colonne completed_modules_in_chapter existe déjà';
    END IF;

    -- Ajouter chapter_history si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'chapter_history'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN chapter_history JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Colonne chapter_history ajoutée';
    ELSE
        RAISE NOTICE 'Colonne chapter_history existe déjà';
    END IF;

    -- Ajouter completedLevels si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'completedLevels'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "completedLevels" JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Colonne completedLevels ajoutée';
    ELSE
        RAISE NOTICE 'Colonne completedLevels existe déjà';
    END IF;

    -- Ajouter quizAnswers si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'quizAnswers'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "quizAnswers" JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Colonne quizAnswers ajoutée';
    ELSE
        RAISE NOTICE 'Colonne quizAnswers existe déjà';
    END IF;

    -- Ajouter metierQuizAnswers si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'metierQuizAnswers'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN "metierQuizAnswers" JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Colonne metierQuizAnswers ajoutée';
    ELSE
        RAISE NOTICE 'Colonne metierQuizAnswers existe déjà';
    END IF;

    -- Ajouter current_module_index si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'current_module_index'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN current_module_index INTEGER DEFAULT 0;
        RAISE NOTICE 'Colonne current_module_index ajoutée';
    ELSE
        RAISE NOTICE 'Colonne current_module_index existe déjà';
    END IF;

    -- Ajouter quetes_completes si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'quetes_completes'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN quetes_completes JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE 'Colonne quetes_completes ajoutée';
    ELSE
        RAISE NOTICE 'Colonne quetes_completes existe déjà';
    END IF;

    -- Ajouter progression_quetes si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'progression_quetes'
    ) THEN
        ALTER TABLE public.user_progress 
        ADD COLUMN progression_quetes JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Colonne progression_quetes ajoutée';
    ELSE
        RAISE NOTICE 'Colonne progression_quetes existe déjà';
    END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT ARRAY_AGG(column_name)
    INTO missing_columns
    FROM (
        SELECT 'activeDirection' AS column_name
        UNION SELECT 'activeSerie'
        UNION SELECT 'activeMetier'
        UNION SELECT 'activeModule'
        UNION SELECT 'currentChapter'
        UNION SELECT 'currentLesson'
        UNION SELECT 'current_module_in_chapter'
        UNION SELECT 'completed_modules_in_chapter'
        UNION SELECT 'chapter_history'
        UNION SELECT 'completedLevels'
        UNION SELECT 'quizAnswers'
        UNION SELECT 'metierQuizAnswers'
        UNION SELECT 'current_module_index'
        UNION SELECT 'quetes_completes'
        UNION SELECT 'progression_quetes'
    ) AS required_columns
    WHERE column_name NOT IN (
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress'
    );

    IF missing_columns IS NOT NULL AND array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Colonnes manquantes: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE 'Toutes les colonnes requises sont présentes dans user_progress';
    END IF;
END $$;
