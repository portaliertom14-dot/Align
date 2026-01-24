# Diagnostic Création de Compte - Align

## Problème identifié

La création de compte échoue et redirige vers "se connecter" sans message d'erreur.

## Corrections appliquées

### 1. Logs de diagnostic complets dans `signUp()`

Ajout de logs détaillés pour tracer chaque étape :
- Avant `signUp`
- Après `signUp` : error, data.session, data.user
- Création du profil : tentatives, erreurs, codes d'erreur
- Vérification de la session après signUp

### 2. Gestion d'erreur améliorée pour le profil

Le code retourne maintenant des erreurs explicites au lieu de continuer silencieusement :

- **RLS_ERROR (42501)** : Erreur de configuration RLS
  - Message : "Erreur de configuration serveur. Veuillez vérifier que le schéma SQL a été exécuté correctement."
  
- **TABLE_NOT_FOUND (42P01)** : Table n'existe pas
  - Message : "La table profiles n'existe pas. Veuillez exécuter le schéma SQL dans Supabase."
  
- **PROFILE_ERROR** : Autre erreur de profil
  - Message : "Impossible de créer le profil utilisateur. Veuillez réessayer."

### 3. Logs dans LoginScreen

Ajout de logs pour tracer :
- Début de la création de compte
- Résultat signUp (hasError, hasUser, errorCode, errorMessage)
- Affichage des erreurs
- Redirection vers Onboarding

### 4. Messages d'erreur spécifiques

Les erreurs de configuration serveur (RLS_ERROR, TABLE_NOT_FOUND) sont maintenant affichées avec des messages clairs.

## Schéma SQL

Le schéma `supabase_schema_clean.sql` n'inclut plus la colonne `email` dans la table `profiles` (l'email est dans `auth.users`). Le code a été corrigé pour ne plus essayer d'insérer `email`.

## Instructions de test

1. **Ouvrir la console** (logs React Native/Expo)
2. **Tenter une création de compte**
3. **Observer les logs dans l'ordre** :
   - `[AUTH] signUp: Tentative de création de compte...`
   - `[AUTH] signUp: Résultat signUp` → Vérifier error, data.session, data.user
   - `[AUTH] signUp: Tentative de création du profil...` → Vérifier si ça échoue
   - `[LOGIN] Résultat signUp:` → Vérifier hasError, errorCode
   - `[LOGIN]` → Vérifier si l'erreur est affichée

4. **Identifier le problème** :
   - Si log `[AUTH] signUp: ERREUR lors de la création du profil` avec code `42501` → Problème RLS
   - Si log `[AUTH] signUp: Table profiles n'existe pas` → Table non créée
   - Si log `[LOGIN] Autre erreur` → Vérifier le code d'erreur exact
   - Si aucun message d'erreur n'est affiché → Vérifier que `setEmailError()` est bien appelé

## Prochaines étapes

Les logs vont maintenant révéler :
1. Si signUp échoue (quelle erreur)
2. Si la création du profil échoue (quelle erreur, quel code)
3. Si l'erreur est bien affichée dans LoginScreen
4. Pourquoi il y a une redirection vers "se connecter"















