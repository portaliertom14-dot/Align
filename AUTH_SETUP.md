# Configuration Authentification Align - Version Propre

## Vue d'ensemble

Système d'authentification Supabase **simple, propre et standard**, sans hacks ni contournements.

## Structure de base de données

### Table `profiles`

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies

- **SELECT**: `auth.uid() = id`
- **INSERT**: `auth.uid() = id`
- **UPDATE**: `auth.uid() = id`

Aucune exception, aucun bypass.

## Installation

1. Exécuter `supabase_schema_clean.sql` dans le SQL Editor de Supabase
2. C'est tout ! Pas de triggers, pas de fonctions complexes

## Flow de création de compte (Sign Up)

1. `supabase.auth.signUp(email, password)` → Crée l'utilisateur dans `auth.users`
2. Insertion dans `profiles` avec `id = user.id`
3. Redirection vers `Onboarding`

## Flow de connexion (Login)

1. `supabase.auth.signInWithPassword(email, password)` → Vérifie les identifiants
2. Récupération de la session
3. Redirection directe vers `Main` (accueil)

## Persistance de session

Configuration Supabase client :
- `persistSession: true`
- `autoRefreshToken: true`
- `storage: AsyncStorage` (React Native)

Au chargement de l'app :
- Vérification de la session via `getSession()`
- Si session valide → `Main`
- Sinon → `Login`

## Fichiers créés/modifiés

### Nouveaux fichiers

- `supabase_schema_clean.sql` : Schéma SQL minimal et propre
- `src/services/profileService.js` : Service pour gérer les profils (optionnel pour l'instant)

### Fichiers modifiés

- `src/services/auth.js` : Version propre sans hacks
- `src/screens/Auth/LoginScreen.js` : Logique simplifiée
- `src/app/navigation.js` : Navigation simplifiée (pas de vérification onboarding)

### Fichiers obsolètes (à nettoyer plus tard)

- `src/services/userService.js` : Ancien système avec user_profiles/user_progress
- `supabase_schema_with_triggers.sql` : Ancien schéma avec triggers
- `supabase_schema_final.sql` : Ancien schéma complexe

## Prochaines étapes

1. ✅ Authentification fonctionnelle
2. ⏳ Gérer l'onboarding (créer/mettre à jour le profil lors de l'onboarding)
3. ⏳ Ajouter la table de progression si nécessaire (séparée de l'auth)
4. ⏳ Nettoyer les anciens fichiers obsolètes















