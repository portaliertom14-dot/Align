# INSTRUCTIONS CRITIQUES - CORRECTION DU SCHÉMA SUPABASE

## PROBLÈME IDENTIFIÉ

L'erreur `PGRST204` indique que la colonne `modules_completes` n'existe pas dans la table `user_progress` dans votre base de données Supabase.

## SOLUTION

Vous devez exécuter le schéma SQL suivant dans Supabase pour créer/corriger la table `user_progress` :

### Étapes :

1. **Aller sur https://app.supabase.com**
2. **Sélectionner votre projet Align**
3. **Aller dans "SQL Editor"** (menu de gauche)
4. **Créer une nouvelle requête**
5. **Copier-coller le contenu de `supabase_schema_clean.sql`**
6. **Exécuter la requête**

### Vérification

Après avoir exécuté le schéma, vérifiez que la table `user_progress` contient bien la colonne `modules_completes` :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_progress' 
  AND table_schema = 'public';
```

Vous devriez voir `modules_completes` avec le type `jsonb`.

### Alternative : Si la table existe déjà mais sans la colonne

Si la table `user_progress` existe déjà mais sans la colonne `modules_completes`, exécutez :

```sql
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS modules_completes JSONB DEFAULT '[]'::jsonb;
```

Pareil pour toutes les autres colonnes manquantes :

```sql
-- Ajouter toutes les colonnes manquantes
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS niveau INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS etoiles INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS module_index_actuel INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS modules_completes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quetes_completes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS progression_quetes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS activeDirection TEXT,
ADD COLUMN IF NOT EXISTS activeSerie TEXT,
ADD COLUMN IF NOT EXISTS activeMetier TEXT,
ADD COLUMN IF NOT EXISTS activeModule TEXT DEFAULT 'mini_simulation_metier',
ADD COLUMN IF NOT EXISTS currentChapter INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS currentLesson INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS completedLevels JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quizAnswers JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS metierQuizAnswers JSONB DEFAULT '{}'::jsonb;
```

### Important

Une fois le schéma corrigé, **redémarrer l'application** pour que les changements soient pris en compte.














