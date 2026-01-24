-- =====================================================
-- FIX : column "user_id" of relation "user_progress" does not exist
-- =====================================================
-- Un trigger essaie d'utiliser user_progress.user_id mais la colonne s'appelle "id"
-- Solution : Ajouter une colonne user_id comme alias de id

-- ÉTAPE 1 : Vérifier le schéma actuel
DO $$
BEGIN
  RAISE NOTICE 'Schéma actuel de user_progress :';
END $$;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
ORDER BY ordinal_position;

-- ÉTAPE 2 : Ajouter la colonne user_id si elle n'existe pas
-- (Elle sera un alias de id pour la compatibilité avec les anciens triggers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_progress' 
    AND column_name = 'user_id'
  ) THEN
    -- Ajouter user_id comme colonne calculée qui pointe vers id
    ALTER TABLE public.user_progress 
    ADD COLUMN user_id UUID;
    
    -- Copier les valeurs de id vers user_id pour les lignes existantes
    UPDATE public.user_progress SET user_id = id WHERE user_id IS NULL;
    
    -- Rendre user_id NOT NULL
    ALTER TABLE public.user_progress ALTER COLUMN user_id SET NOT NULL;
    
    -- Créer un trigger pour synchroniser id et user_id
    CREATE OR REPLACE FUNCTION sync_user_progress_id()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        -- Si user_id est fourni mais pas id, copier user_id vers id
        IF NEW.user_id IS NOT NULL AND NEW.id IS NULL THEN
          NEW.id := NEW.user_id;
        END IF;
        -- Si id est fourni mais pas user_id, copier id vers user_id
        IF NEW.id IS NOT NULL AND NEW.user_id IS NULL THEN
          NEW.user_id := NEW.id;
        END IF;
        -- Si les deux sont fournis, prendre id comme source de vérité
        IF NEW.id IS NOT NULL AND NEW.user_id IS NOT NULL AND NEW.id != NEW.user_id THEN
          NEW.user_id := NEW.id;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
    
    DROP TRIGGER IF EXISTS sync_user_progress_id_trigger ON public.user_progress;
    CREATE TRIGGER sync_user_progress_id_trigger
    BEFORE INSERT OR UPDATE ON public.user_progress
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_progress_id();
    
    RAISE NOTICE 'Colonne user_id ajoutée et synchronisée avec id';
  ELSE
    RAISE NOTICE 'Colonne user_id existe déjà';
  END IF;
END $$;

-- ÉTAPE 3 : Vérifier que la colonne existe maintenant
SELECT 
  column_name, 
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_progress'
AND column_name IN ('id', 'user_id')
ORDER BY column_name;

-- ÉTAPE 4 : Recréer les RLS policies pour user_progress
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;
CREATE POLICY "Users can view own progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.user_progress;
CREATE POLICY "Users can update own progress"
ON public.user_progress
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR auth.uid() = user_id);

RAISE NOTICE '✅ Schéma user_progress corrigé avec user_id comme alias de id';
