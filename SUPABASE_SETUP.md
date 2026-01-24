# Configuration Supabase pour Align App

## Étape 1 : Créer les tables dans Supabase

1. Connectez-vous à votre dashboard Supabase : https://app.supabase.com
2. Sélectionnez votre projet
3. Allez dans l'onglet "SQL Editor"
4. Exécutez le script SQL contenu dans `supabase_schema.sql`

Ce script créera :
- La table `user_profiles` pour les profils utilisateurs
- La table `user_progress` pour la progression et gamification
- Les politiques RLS (Row Level Security) pour sécuriser les données
- Les index pour améliorer les performances

## Étape 2 : Vérifier les variables d'environnement

Le fichier `src/services/supabase.js` utilise les variables suivantes :
- `EXPO_PUBLIC_SUPABASE_URL` : URL de votre projet Supabase
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` : Clé anonyme de votre projet

Ces variables sont déjà configurées par défaut dans le code, mais vous pouvez les surcharger avec un fichier `.env` si nécessaire.

## Étape 3 : Migration des données existantes

Si vous avez déjà des utilisateurs avec des données dans AsyncStorage, vous devrez créer un script de migration pour transférer ces données vers Supabase.

## Architecture des tables

### user_profiles
- `user_id` (UUID, Primary Key) : Référence à auth.users(id)
- `email` (TEXT)
- `prenom`, `nom`, `username` (TEXT)
- `avatar_url`, `description` (TEXT)
- `secteur_favori`, `metier_favori` (TEXT)
- `onboarding_completed` (BOOLEAN)

### user_progress
- `user_id` (UUID, Primary Key) : Référence à auth.users(id)
- `niveau` (INTEGER)
- `xp` (INTEGER)
- `etoiles` (INTEGER)
- `module_index_actuel` (INTEGER)
- `modules_completes` (JSONB)
- `quetes_completes` (JSONB)
- `progression_quetes` (JSONB)

## Sécurité (RLS)

Les politiques Row Level Security garantissent que chaque utilisateur ne peut accéder qu'à ses propres données. Toutes les requêtes sont automatiquement filtrées par `auth.uid()`.
















