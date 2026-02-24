-- =====================================================
-- Table learning_templates : contenus universels pour module "apprentissage"
-- Remplie une seule fois par l'edge admin generate-learning-templates.
-- Chapitres 1-9 : 1 template chacun (module_index = 0).
-- Chapitre 10 : pool pour boucle infinie (module_index 0..N-1, ex. 0..19).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.learning_templates (
  chapter_id INTEGER NOT NULL CHECK (chapter_id >= 1 AND chapter_id <= 10),
  module_index INTEGER NOT NULL CHECK (module_index >= 0),
  payload JSONB NOT NULL,
  PRIMARY KEY (chapter_id, module_index)
);

COMMENT ON TABLE public.learning_templates IS 'Templates apprentissage universels ; ch1-9: un par chapitre (module_index=0), ch10: pool (module_index 0..19).';

-- RLS : lecture possible pour tout le monde (ou service seulement) ; écriture service_role uniquement.
ALTER TABLE public.learning_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS learning_templates_select ON public.learning_templates;
CREATE POLICY learning_templates_select
  ON public.learning_templates FOR SELECT
  USING (true);

-- Pas de policy INSERT/UPDATE pour le client ; l'edge admin utilise service_role.
