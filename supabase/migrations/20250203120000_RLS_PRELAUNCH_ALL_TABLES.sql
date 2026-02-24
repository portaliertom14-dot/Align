-- ============================================================
-- Pré-launch : RLS sur toutes les tables sensibles
-- Chaque table user-based : auth.uid() = id ou user_id
-- ============================================================

-- user_profiles (déjà couvert par fix_rls_policies, on s'assure qu'il n'y a pas de policy trop permissive)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can select own profile') THEN
      CREATE POLICY "Users can select own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can insert own profile') THEN
      CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can update own profile') THEN
      CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
  END IF;
END $$;

-- user_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_progress') THEN
    ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can select own progress') THEN
      CREATE POLICY "Users can select own progress" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can insert own progress') THEN
      CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_progress' AND policyname = 'Users can update own progress') THEN
      CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
  END IF;
END $$;

-- user_modules (SELECT only; INSERT/UPDATE via service role)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_modules') THEN
    ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_modules_select_own" ON public.user_modules;
    CREATE POLICY "user_modules_select_own" ON public.user_modules FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

-- ai_modules (déjà dans CREATE_AI_MODULES, on vérifie)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_modules') THEN
    ALTER TABLE public.ai_modules ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_modules' AND policyname = 'ai_modules_select_own') THEN
      CREATE POLICY "ai_modules_select_own" ON public.ai_modules FOR SELECT USING (auth.uid() = user_id);
    END IF;
  END IF;
END $$;

-- scores (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scores') THEN
    ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "scores_own" ON public.scores;
    CREATE POLICY "scores_own" ON public.scores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- quiz_responses (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'quiz_responses') THEN
    ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "quiz_responses_own" ON public.quiz_responses;
    CREATE POLICY "quiz_responses_own" ON public.quiz_responses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- user_chapter_progress (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_chapter_progress') THEN
    ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "user_chapter_progress_own" ON public.user_chapter_progress;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_chapter_progress' AND column_name = 'user_id') THEN
      CREATE POLICY "user_chapter_progress_own" ON public.user_chapter_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_chapter_progress' AND column_name = 'id') THEN
      CREATE POLICY "user_chapter_progress_own" ON public.user_chapter_progress FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    END IF;
  END IF;
END $$;
