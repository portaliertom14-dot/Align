-- =====================================================
-- DÉSACTIVER TOUS LES TRIGGERS SUR auth.users
-- =====================================================
-- Ces triggers causent des erreurs 500 lors de la création de comptes
-- On va gérer la création de profils côté client à la place

-- Supprimer le trigger sur auth.users (si existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer la fonction de trigger (si existe)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Vérifier qu'il n'y a plus de triggers actifs sur auth.users
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  proname as function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'auth.users'::regclass
AND tgname NOT LIKE 'pg_%'; -- Exclure les triggers système

-- Si des triggers subsistent, les afficher pour diagnostic
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  FOR trigger_record IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass 
    AND tgname NOT LIKE 'pg_%'
  LOOP
    RAISE NOTICE 'Trigger restant sur auth.users: %', trigger_record.tgname;
  END LOOP;
END $$;

-- =====================================================
-- S'ASSURER QUE LES RLS PERMETTENT L'INSERTION
-- =====================================================

-- Politique pour user_profiles : permettre aux utilisateurs authentifiés d'insérer leur propre profil
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Politique pour user_progress : permettre aux utilisateurs authentifiés d'insérer leur propre progression
DROP POLICY IF EXISTS "Users can insert own progress" ON public.user_progress;
CREATE POLICY "Users can insert own progress"
ON public.user_progress
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- =====================================================
-- VÉRIFICATION FINALE
-- =====================================================

-- Afficher l'état des RLS pour user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_progress')
ORDER BY tablename, policyname;
