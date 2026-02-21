-- Align V3 Hybride Premium: colonnes secteur/métier + hashes + top2/top3
-- sector_locked_id = activeDirection (existant), job_selected_id = activeMetier (existant)
-- Ajout: sector_confidence, sector_top2, sector_micro_answers, answers_sector_hash,
--        job_confidence, job_top3, answers_job_hash

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'sector_confidence') THEN
    ALTER TABLE public.user_progress ADD COLUMN sector_confidence REAL;
    RAISE NOTICE 'Colonne sector_confidence ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'sector_top2') THEN
    ALTER TABLE public.user_progress ADD COLUMN sector_top2 JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne sector_top2 ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'sector_micro_answers') THEN
    ALTER TABLE public.user_progress ADD COLUMN sector_micro_answers JSONB DEFAULT '{}'::jsonb;
    RAISE NOTICE 'Colonne sector_micro_answers ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'answers_sector_hash') THEN
    ALTER TABLE public.user_progress ADD COLUMN answers_sector_hash TEXT;
    RAISE NOTICE 'Colonne answers_sector_hash ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'job_confidence') THEN
    ALTER TABLE public.user_progress ADD COLUMN job_confidence REAL;
    RAISE NOTICE 'Colonne job_confidence ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'job_top3') THEN
    ALTER TABLE public.user_progress ADD COLUMN job_top3 JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Colonne job_top3 ajoutée';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_progress' AND column_name = 'answers_job_hash') THEN
    ALTER TABLE public.user_progress ADD COLUMN answers_job_hash TEXT;
    RAISE NOTICE 'Colonne answers_job_hash ajoutée';
  END IF;
  -- Alias optionnels: sector_locked_id / job_selected_id peuvent être des vues ou on utilise activeDirection/activeMetier
END $$;
