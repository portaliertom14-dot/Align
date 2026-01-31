-- =====================================================
-- SEED : Génération des 10 chapitres + 30 modules + 360 questions
-- =====================================================
-- IMPORTANT: Exécuter après CREATE_CHAPTERS_SYSTEM.sql

-- =====================================================
-- 1. INSÉRER LES 10 CHAPITRES
-- =====================================================
INSERT INTO public.chapters (index, title, description, is_unlocked) VALUES
  (1, 'Découverte de soi', 'Identifier ses centres d''intérêt, comprendre ses forces et explorer différentes options de carrière', true), -- Chapitre 1 déverrouillé par défaut
  (2, 'Orientation', 'Explorer les secteurs d''activité, comprendre les tendances du marché et identifier les métiers adaptés', false),
  (3, 'Compétences de base', 'Développer la communication, l''organisation et la résolution de problème', false),
  (4, 'Prise de décision', 'Prendre des décisions rationnelles, gérer l''incertitude et prioriser ses choix', false),
  (5, 'Développement pratique', 'Mettre en pratique les compétences, apprendre par projet et suivre ses progrès', false),
  (6, 'Exploration avancée', 'Tester différents métiers, comprendre les secteurs connexes et analyser les parcours inspirants', false),
  (7, 'Professionnalisation', 'Développer des compétences avancées, le networking et la gestion de projets', false),
  (8, 'Spécialisation', 'Choisir sa spécialité, optimiser ses forces et construire un plan d''évolution', false),
  (9, 'Préparation à la carrière', 'Préparer son CV, réseauter efficacement et se préparer aux entretiens', false),
  (10, 'Excellence et autonomie', 'Maîtriser son secteur, créer sa trajectoire et développer son autonomie', false)
ON CONFLICT (index) DO NOTHING; -- Ne pas écraser si déjà existant

-- =====================================================
-- 2. INSÉRER LES 30 MODULES (3 par chapitre)
-- =====================================================
-- Pour chaque chapitre, créer 3 modules : apprentissage (order 1), test_secteur (order 2), mini_simulation (order 3)
DO $$
DECLARE
  chapter_rec RECORD;
  module_order INTEGER;
  module_type TEXT;
BEGIN
  FOR chapter_rec IN SELECT id, index FROM public.chapters ORDER BY index LOOP
    -- Module 1 : Apprentissage
    INSERT INTO public.modules (chapter_id, "order", type, is_completed)
    VALUES (chapter_rec.id, 1, 'apprentissage', false)
    ON CONFLICT (chapter_id, "order") DO NOTHING;
    
    -- Module 2 : Test Secteur
    INSERT INTO public.modules (chapter_id, "order", type, is_completed)
    VALUES (chapter_rec.id, 2, 'test_secteur', false)
    ON CONFLICT (chapter_id, "order") DO NOTHING;
    
    -- Module 3 : Mini Simulation
    INSERT INTO public.modules (chapter_id, "order", type, is_completed)
    VALUES (chapter_rec.id, 3, 'mini_simulation', false)
    ON CONFLICT (chapter_id, "order") DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- 3. INSÉRER LES 360 QUESTIONS (12 par module)
-- =====================================================
-- Générer 12 questions template par module
-- Les questions seront personnalisées dynamiquement selon secteur/métier
DO $$
DECLARE
  module_rec RECORD;
  question_order INTEGER;
  question_template JSONB;
BEGIN
  FOR module_rec IN SELECT id, chapter_id, "order", type FROM public.modules ORDER BY chapter_id, "order" LOOP
    FOR question_order IN 1..12 LOOP
      -- Template de question générique (sera personnalisé par questionGenerator.js)
      question_template := jsonb_build_object(
        'question', format('Question %s du module %s (chapitre %s)', question_order, module_rec."order", module_rec.chapter_id),
        'options', jsonb_build_array('Option A', 'Option B', 'Option C'),
        'correct_answer', 'A',
        'explanation', 'Explication de la réponse correcte',
        'difficulty', CASE 
          WHEN module_rec.chapter_id <= 2 THEN 'simple'
          WHEN module_rec.chapter_id <= 5 THEN 'intermediate'
          ELSE 'advanced'
        END
      );
      
      INSERT INTO public.questions (module_id, "order", content, personalization)
      VALUES (
        module_rec.id,
        question_order,
        question_template,
        jsonb_build_object(
          'module_type', module_rec.type,
          'chapter_id', module_rec.chapter_id,
          'question_index', question_order
        )
      )
      ON CONFLICT (module_id, "order") DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- 4. INITIALISER LA PROGRESSION DES UTILISATEURS EXISTANTS
-- =====================================================
-- Créer une entrée dans user_chapter_progress pour chaque utilisateur existant
-- Mapper depuis user_progress.current_chapter si existe
-- IMPORTANT: current_chapter_id doit référencer chapters.id (pas chapters.index)
INSERT INTO public.user_chapter_progress (id, current_chapter_id, current_module_order, unlocked_chapters)
SELECT 
  up.id,
  -- Mapper l'index du chapitre (1-10) vers l'id réel du chapitre
  -- Si le chapitre n'existe pas, utiliser le chapitre 1 par défaut
  COALESCE(
    (SELECT c.id FROM public.chapters c WHERE c.index = COALESCE(up.current_chapter, 1)),
    (SELECT c.id FROM public.chapters c WHERE c.index = 1 LIMIT 1)
  ),
  COALESCE(up.current_module_in_chapter, 0)::INTEGER + 1, -- Convertir 0-2 → 1-3
  -- Construire un array des IDs de chapitres déverrouillés (pas les indices)
  COALESCE(
    CASE 
      WHEN up.current_chapter IS NOT NULL THEN
        (
          SELECT jsonb_agg(c.id ORDER BY c.index)
          FROM public.chapters c
          WHERE c.index <= LEAST(up.current_chapter::INTEGER, 10)
        )
      ELSE
        (SELECT jsonb_build_array(c.id) FROM public.chapters c WHERE c.index = 1 LIMIT 1)
    END,
    (SELECT jsonb_build_array(c.id) FROM public.chapters c WHERE c.index = 1 LIMIT 1)
  )
FROM public.user_progress up
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_chapter_progress ucp WHERE ucp.id = up.id
)
ON CONFLICT (id) DO UPDATE
SET
  current_chapter_id = COALESCE(EXCLUDED.current_chapter_id, user_chapter_progress.current_chapter_id),
  current_module_order = COALESCE(EXCLUDED.current_module_order, user_chapter_progress.current_module_order),
  unlocked_chapters = COALESCE(EXCLUDED.unlocked_chapters, user_chapter_progress.unlocked_chapters);

-- =====================================================
-- 5. VÉRIFICATIONS
-- =====================================================
DO $$
DECLARE
  chapters_count INTEGER;
  modules_count INTEGER;
  questions_count INTEGER;
  progress_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO chapters_count FROM public.chapters;
  SELECT COUNT(*) INTO modules_count FROM public.modules;
  SELECT COUNT(*) INTO questions_count FROM public.questions;
  SELECT COUNT(*) INTO progress_count FROM public.user_chapter_progress;
  
  RAISE NOTICE '✅ Chapitres créés: %', chapters_count;
  RAISE NOTICE '✅ Modules créés: %', modules_count;
  RAISE NOTICE '✅ Questions créées: %', questions_count;
  RAISE NOTICE '✅ Progressions initialisées: %', progress_count;
  
  IF chapters_count != 10 THEN
    RAISE WARNING '⚠️ Nombre de chapitres incorrect: % (attendu: 10)', chapters_count;
  END IF;
  
  IF modules_count != 30 THEN
    RAISE WARNING '⚠️ Nombre de modules incorrect: % (attendu: 30)', modules_count;
  END IF;
  
  IF questions_count != 360 THEN
    RAISE WARNING '⚠️ Nombre de questions incorrect: % (attendu: 360)', questions_count;
  END IF;
END $$;
