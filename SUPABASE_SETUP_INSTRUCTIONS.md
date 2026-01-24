# Instructions de configuration Supabase pour Align

## ⚠️ Problème actuel

Si vous voyez l'erreur : **"Les tables de base de données ne sont pas configurées. Veuillez exécuter le fichier supabase_schema_with_triggers.sql dans le SQL Editor de Supabase."**

Cela signifie que les tables Supabase n'ont pas été créées ou que le schéma n'a pas été appliqué.

## ✅ Solution : Exécuter le schéma SQL

### Si vous avez l'erreur "policy already exists"

Si vous voyez l'erreur **"policy already exists"**, cela signifie que les policies existent déjà. Suivez ces étapes :

**Étape 1 : Nettoyage (si nécessaire)**
1. Ouvrez le fichier `supabase_cleanup.sql`
2. Copiez son contenu
3. Exécutez-le dans le SQL Editor de Supabase
4. Cela supprimera les policies et triggers existants (c'est sûr, ils seront recréés)

**Étape 2 : Création du schéma**
1. Ouvrez le fichier `supabase_schema_final.sql`
2. Copiez tout son contenu
3. Collez-le dans le SQL Editor de Supabase
4. Cliquez sur **Run**

### Installation normale (première fois)

Si c'est la première fois que vous installez le schéma :

1. Connectez-vous à votre projet Supabase : https://app.supabase.com
2. Allez dans **SQL Editor** (dans le menu de gauche)
3. Cliquez sur **New Query**
4. Ouvrez le fichier `supabase_schema_final.sql`
5. Copiez **tout le contenu** du fichier
6. Collez-le dans l'éditeur SQL de Supabase
7. Cliquez sur **Run** (ou appuyez sur Ctrl+Enter / Cmd+Enter)

**Note:** La version finale vérifie automatiquement si les policies existent avant de les créer, donc elle peut être exécutée plusieurs fois sans erreur.

## 📋 Ce que le schéma crée

- **Tables:**
  - `user_profiles` : Profils utilisateurs (email, nom, prénom, etc.)
  - `user_progress` : Progression et gamification (XP, étoiles, modules, quêtes)

- **Sécurité (RLS):**
  - Politiques Row Level Security pour que chaque utilisateur ne voie que ses propres données

- **Automatisation:**
  - Trigger SQL qui crée automatiquement le profil et la progression lors de la création d'un utilisateur

## 🔍 Vérification

Après avoir exécuté le schéma :

1. Allez dans **Table Editor** dans Supabase
2. Vous devriez voir deux nouvelles tables :
   - `user_profiles`
   - `user_progress`

3. Testez la création de compte dans l'application
4. L'erreur devrait disparaître

## 🐛 Dépannage

- **Erreur "policy already exists":** 
  - Exécutez d'abord `supabase_cleanup.sql` pour supprimer les policies existantes
  - Puis exécutez `supabase_schema_final.sql`
  - OU utilisez `supabase_schema_final.sql` qui vérifie l'existence avant de créer (ne devrait pas donner cette erreur)

- **Erreur "relation already exists":** Normal si vous exécutez le script plusieurs fois, ignorez-la (CREATE TABLE IF NOT EXISTS gère cela)

- **Erreur "trigger already exists":** 
  - Exécutez `supabase_cleanup.sql` puis `supabase_schema_final.sql`
  - OU `supabase_schema_final.sql` vérifie l'existence avant de créer

Si le problème persiste :
- Vérifiez que vous êtes connecté au bon projet Supabase
- Vérifiez que l'URL et la clé Supabase dans votre application correspondent au projet
- Consultez les logs Supabase (Logs > Postgres Logs)
