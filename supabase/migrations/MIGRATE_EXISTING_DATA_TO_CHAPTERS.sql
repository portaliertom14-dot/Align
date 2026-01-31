-- =====================================================
-- MIGRATION : Mapper les données existantes vers le nouveau système de chapitres
-- =====================================================
-- IMPORTANT: Exécuter après CREATE_CHAPTERS_SYSTEM.sql et SEED_CHAPTERS_DATA.sql
-- Préserve toutes les données utilisateur existantes

-- =====================================================
-- 1. MIGRER LA PROGRESSION DES UTILISATEURS EXISTANTS
-- =====================================================
-- Mapper user_progress.current_chapter → user_chapter_progress.current_chapter_id
-- Mapper user_progress.current_module_in_chapter → user_chapter_progress.current_module_order
-- Mapper user_progress.completed_modules_in_chapter → user_chapter_progress.completed_modules
-- Mapper user_progress.chapter_history → user_chapter_progress.unlocked_chapters

DO $$
DECLARE
  user_rec RECORD;
  chapter_id_val INTEGER;
  module_order_val INTEGER;
  completed_modules_val JSONB;
  unlocked_chapters_val JSONB;
BEGIN
  -- Pour chaque utilisateur dans user_progress
  FOR user_rec IN 
    SELECT 
      id,
      COALESCE(current_chapter, 1) as current_chapter,
      COALESCE(current_module_in_chapter, 0) as current_module,
      COALESCE(completed_modules_in_chapter, '[]'::jsonb) as completed_modules,
      COALESCE(chapter_history, '[]'::jsonb) as chapter_history
    FROM public.user_progress
    WHERE id IS NOT NULL
  LOOP
    -- Trouver l'ID du chapitre dans la table chapters
    SELECT id INTO chapter_id_val
    FROM public.chapters
    WHERE index = user_rec.current_chapter
    LIMIT 1;
    
    -- Si le chapitre n'existe pas, utiliser le chapitre 1
    IF chapter_id_val IS NULL THEN
      SELECT id INTO chapter_id_val
      FROM public.chapters
      WHERE index = 1
      LIMIT 1;
    END IF;
    
    -- Convertir current_module_in_chapter (0-2) → current_module_order (1-3)
    module_order_val := user_rec.current_module + 1;
    
    -- Mapper completed_modules_in_chapter vers le nouveau format
    -- Format ancien: [0, 1, 2] (indexes)
    -- Format nouveau: [{ chapter_id, module_order, completed_at }]
    completed_modules_val := '[]'::jsonb;
    
    IF jsonb_typeof(user_rec.completed_modules) = 'array' THEN
      FOR i IN 0..jsonb_array_length(user_rec.completed_modules) - 1 LOOP
        DECLARE
          module_index INTEGER;
          module_entry JSONB;
        BEGIN
          module_index := (user_rec.completed_modules->i)::text::integer;
          
          -- Créer une entrée au nouveau format
          module_entry := jsonb_build_object(
            'chapter_id', chapter_id_val,
            'module_order', module_index + 1, -- Convertir 0-2 → 1-3
            'completed_at', NOW()::text
          );
          
          completed_modules_val := completed_modules_val || jsonb_build_array(module_entry);
        END;
      END LOOP;
    END IF;
    
    -- Mapper chapter_history vers unlocked_chapters
    -- Format ancien: [1, 2, 3, ...] (indexes de chapitres)
    -- Format nouveau: [1, 2, 3, ...] (indexes de chapitres déverrouillés)
    unlocked_chapters_val := user_rec.chapter_history;
    
    -- S'assurer que le chapitre actuel est déverrouillé
    IF NOT (unlocked_chapters_val @> jsonb_build_array(user_rec.current_chapter)) THEN
      unlocked_chapters_val := unlocked_chapters_val || jsonb_build_array(user_rec.current_chapter);
    END IF;
    
    -- S'assurer que le chapitre 1 est toujours déverrouillé
    IF NOT (unlocked_chapters_val @> jsonb_build_array(1)) THEN
      unlocked_chapters_val := jsonb_build_array(1) || unlocked_chapters_val;
    END IF;
    
    -- Insérer ou mettre à jour dans user_chapter_progress
    INSERT INTO public.user_chapter_progress (
      id,
      current_chapter_id,
      current_module_order,
      completed_modules,
      unlocked_chapters
    ) VALUES (
      user_rec.id,
      chapter_id_val,
      module_order_val,
      completed_modules_val,
      unlocked_chapters_val
    )
    ON CONFLICT (id) DO UPDATE
    SET
      current_chapter_id = COALESCE(EXCLUDED.current_chapter_id, user_chapter_progress.current_chapter_id),
      current_module_order = COALESCE(EXCLUDED.current_module_order, user_chapter_progress.current_module_order),
      completed_modules = COALESCE(EXCLUDED.completed_modules, user_chapter_progress.completed_modules),
      unlocked_chapters = COALESCE(EXCLUDED.unlocked_chapters, user_chapter_progress.unlocked_chapters),
      updated_at = NOW();
    
    RAISE NOTICE '✅ Progression migrée pour utilisateur % (chapitre %, module %)', 
      user_rec.id, user_rec.current_chapter, module_order_val;
  END LOOP;
END $$;

-- =====================================================
-- 2. VÉRIFICATIONS POST-MIGRATION
-- =====================================================
DO $$
DECLARE
  total_users INTEGER;
  migrated_users INTEGER;
  chapters_count INTEGER;
  modules_count INTEGER;
  questions_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.user_progress;
  SELECT COUNT(*) INTO migrated_users FROM public.user_chapter_progress;
  SELECT COUNT(*) INTO chapters_count FROM public.chapters;
  SELECT COUNT(*) INTO modules_count FROM public.modules;
  SELECT COUNT(*) INTO questions_count FROM public.questions;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSUMÉ DE LA MIGRATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Utilisateurs dans user_progress: %', total_users;
  RAISE NOTICE 'Utilisateurs migrés vers user_chapter_progress: %', migrated_users;
  RAISE NOTICE 'Chapitres créés: %', chapters_count;
  RAISE NOTICE 'Modules créés: %', modules_count;
  RAISE NOTICE 'Questions créées: %', questions_count;
  RAISE NOTICE '========================================';
  
  IF migrated_users < total_users THEN
    RAISE WARNING '⚠️ Certains utilisateurs n''ont pas été migrés';
  END IF;
  
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

-- =====================================================
-- 3. CRÉER UNE FONCTION DE SYNCHRONISATION (optionnel)
-- =====================================================
-- Permet de synchroniser user_progress et user_chapter_progress
-- Utile pendant la période de transition

CREATE OR REPLACE FUNCTION sync_chapter_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Synchroniser user_chapter_progress quand user_progress est mis à jour
  -- (seulement si les colonnes de chapitres sont modifiées)
  IF TG_OP = 'UPDATE' AND (
    OLD.current_chapter IS DISTINCT FROM NEW.current_chapter OR
    OLD.current_module_in_chapter IS DISTINCT FROM NEW.current_module_in_chapter OR
    OLD.completed_modules_in_chapter IS DISTINCT FROM NEW.completed_modules_in_chapter OR
    OLD.chapter_history IS DISTINCT FROM NEW.chapter_history
  ) THEN
    -- Appeler la logique de migration pour cet utilisateur
    -- (simplifié, utilise la même logique que la migration)
    PERFORM 1; -- Placeholder pour la logique de sync
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: Le trigger n'est pas activé par défaut pour éviter les conflits
-- Décommenter si nécessaire :
-- CREATE TRIGGER sync_chapter_progress_trigger
--   AFTER UPDATE ON public.user_progress
--   FOR EACH ROW
--   EXECUTE FUNCTION sync_chapter_progress();
