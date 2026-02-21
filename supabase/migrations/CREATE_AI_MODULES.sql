              -- Table de stockage des modules IA générés
              -- UNE SEULE GÉNÉRATION par (user_id, chapter_id, module_index, module_type)
              -- Réutilisation à chaque reconnexion / refresh — 0 appel IA

              CREATE TABLE IF NOT EXISTS public.ai_modules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                chapter_id INTEGER NOT NULL DEFAULT 1,
                module_index INTEGER NOT NULL CHECK (module_index >= 0 AND module_index <= 2),
                module_type TEXT NOT NULL CHECK (module_type IN ('mini_simulation_metier', 'apprentissage_mindset', 'test_secteur')),
                payload_json JSONB NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, chapter_id, module_index, module_type)
              );

              CREATE INDEX IF NOT EXISTS idx_ai_modules_user_chapter ON public.ai_modules(user_id, chapter_id);
              CREATE INDEX IF NOT EXISTS idx_ai_modules_lookup ON public.ai_modules(user_id, chapter_id, module_index, module_type);

              COMMENT ON TABLE public.ai_modules IS 'Modules IA générés — réutilisés à chaque session (0 regen au login)';

              -- RLS : chaque utilisateur accède uniquement à ses propres modules
              ALTER TABLE public.ai_modules ENABLE ROW LEVEL SECURITY;

              CREATE POLICY ai_modules_select_own ON public.ai_modules
                FOR SELECT USING (auth.uid() = user_id);

              CREATE POLICY ai_modules_insert_own ON public.ai_modules
                FOR INSERT WITH CHECK (auth.uid() = user_id);

              CREATE POLICY ai_modules_update_own ON public.ai_modules
                FOR UPDATE USING (auth.uid() = user_id);

              CREATE POLICY ai_modules_delete_own ON public.ai_modules
                FOR DELETE USING (auth.uid() = user_id);
