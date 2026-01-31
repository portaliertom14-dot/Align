-- Migration: Ajouter colonne max_unlocked_module_index dans user_progress
-- BUG FIX: Permet de garder les modules déverrouillés une fois complétés
-- max_unlocked_module_index = index du module le plus élevé jamais déverrouillé (0, 1, ou 2)

-- Vérifier si la colonne existe déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_progress' 
        AND column_name = 'max_unlocked_module_index'
    ) THEN
        -- Ajouter la colonne
        ALTER TABLE public.user_progress 
        ADD COLUMN max_unlocked_module_index INTEGER DEFAULT 0;
        
        -- Initialiser avec current_module_index pour les utilisateurs existants
        UPDATE public.user_progress 
        SET max_unlocked_module_index = COALESCE(current_module_index, 0)
        WHERE max_unlocked_module_index IS NULL OR max_unlocked_module_index < COALESCE(current_module_index, 0);
        
        RAISE NOTICE '✅ Colonne max_unlocked_module_index ajoutée et initialisée';
    ELSE
        RAISE NOTICE '⚠️ Colonne max_unlocked_module_index existe déjà';
    END IF;
END $$;

-- Vérification
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN max_unlocked_module_index IS NOT NULL THEN 1 END) as users_with_max_unlocked,
    AVG(max_unlocked_module_index) as avg_max_unlocked
FROM public.user_progress;
