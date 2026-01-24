# Guide de migration vers Supabase

## Avant de commencer

Pour activer le système d'authentification Supabase, vous devez :

1. **Créer les tables dans Supabase** (voir `SUPABASE_SETUP.md`)
2. **Choisir le système de progression** :
   - Option A : Utiliser Supabase uniquement (recommandé pour la production)
   - Option B : Utiliser AsyncStorage pour développement local

## Option A : Utiliser Supabase (Production)

Pour activer Supabase, modifiez les imports dans les fichiers qui utilisent `userProgress` :

**Remplacer :**
```javascript
import { getUserProgress, updateUserProgress } from '../../lib/userProgress';
```

**Par :**
```javascript
import { getUserProgress, updateUserProgress } from '../../lib/userProgressSupabase';
```

## Option B : Utiliser AsyncStorage (Développement)

Le système actuel avec AsyncStorage reste fonctionnel. Pour continuer à l'utiliser, ne changez rien aux imports.

## Migration des données existantes

Si vous avez déjà des utilisateurs avec des données dans AsyncStorage et que vous voulez migrer vers Supabase, vous devrez créer un script de migration personnalisé qui :

1. Lit les données depuis AsyncStorage
2. Crée un compte utilisateur dans Supabase (si nécessaire)
3. Insère les données dans les tables Supabase correspondantes

## Notes importantes

- **Sécurité** : Les données sont isolées par `user_id` grâce aux politiques RLS
- **Persistance** : Les sessions sont persistées dans AsyncStorage automatiquement
- **Performance** : Les données sont récupérées depuis Supabase à chaque chargement
















