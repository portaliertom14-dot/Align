-- =====================================================
-- MIGRATION : Système de Chapitres + Modules + Questions
-- =====================================================
-- Crée les tables pour gérer 10 chapitres, 30 modules, 360 questions
-- Compatible avec les données existantes (ne casse rien)

-- =====================================================
-- 1. TABLE CHAPTERS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chapters (
  id SERIAL PRIMARY KEY,
  index INTEGER NOT NULL UNIQUE, -- 1-10
  title TEXT NOT NULL,
  description TEXT,
  is_unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. TABLE MODULES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.modules (
  id SERIAL PRIMARY KEY,
  chapter_id INTEGER NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL, -- 1, 2, ou 3 dans le chapitre
  type TEXT NOT NULL, -- 'apprentissage', 'test_secteur', 'mini_simulation'
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chapter_id, "order") -- Un seul module d'ordre n par chapitre
);

-- =====================================================
-- 3. TABLE QUESTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id SERIAL PRIMARY KEY,
  module_id INTEGER NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL, -- 1-12 dans le module
  content JSONB NOT NULL, -- { question, options, correct_answer, explanation }
  personalization JSONB DEFAULT '{}'::jsonb, -- { secteur, metier, difficulty }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, "order") -- Une seule question d'ordre n par module
);

-- =====================================================
-- 4. TABLE USER_CHAPTER_PROGRESS (Progression par utilisateur)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_chapter_progress (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter_id INTEGER REFERENCES public.chapters(id),
  current_module_order INTEGER DEFAULT 1, -- 1, 2, ou 3
  completed_modules JSONB DEFAULT '[]'::jsonb, -- [{ chapter_id, module_order, completed_at }]
  unlocked_chapters JSONB DEFAULT '[1]'::jsonb, -- [1, 2, 3, ...] IDs des chapitres déverrouillés
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXES pour performances
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_modules_chapter_id ON public.modules(chapter_id);
CREATE INDEX IF NOT EXISTS idx_modules_order ON public.modules(chapter_id, "order");
CREATE INDEX IF NOT EXISTS idx_questions_module_id ON public.questions(module_id);
CREATE INDEX IF NOT EXISTS idx_questions_order ON public.questions(module_id, "order");
CREATE INDEX IF NOT EXISTS idx_chapters_index ON public.chapters(index);
CREATE INDEX IF NOT EXISTS idx_user_chapter_progress_id ON public.user_chapter_progress(id);

-- =====================================================
-- 6. RLS (Row Level Security)
-- =====================================================
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chapter_progress ENABLE ROW LEVEL SECURITY;

-- Chapters, Modules, Questions : Lecture publique (tous peuvent voir)
CREATE POLICY "Anyone can view chapters"
  ON public.chapters FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view modules"
  ON public.modules FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view questions"
  ON public.questions FOR SELECT
  USING (true);

-- User Chapter Progress : Seul l'utilisateur peut voir/modifier sa progression
CREATE POLICY "Users can view own chapter progress"
  ON public.user_chapter_progress FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own chapter progress"
  ON public.user_chapter_progress FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own chapter progress"
  ON public.user_chapter_progress FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 7. TRIGGERS pour updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chapters_updated_at
  BEFORE UPDATE ON public.chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_chapter_progress_updated_at
  BEFORE UPDATE ON public.user_chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. VÉRIFICATIONS
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Tables créées : chapters, modules, questions, user_chapter_progress';
  RAISE NOTICE '✅ Indexes créés';
  RAISE NOTICE '✅ RLS activé';
  RAISE NOTICE '✅ Triggers created_at/updated_at configurés';
END $$;
