# Hypothèses - Problèmes Authentification Align

## H1 : Création du profil échoue silencieusement (RLS ou table inexistante)
**Description** : La création du profil dans `profiles` échoue (erreur RLS 42501 ou table inexistante 42P01), mais le code continue quand même et retourne `{ user, error: null }`. Ensuite, LoginScreen redirige vers Onboarding, mais comme le profil n'existe pas, OnboardingFlow détecte que l'utilisateur n'est pas trouvé et redirige vers Login.

**Preuve attendue dans les logs** :
- `[AUTH] signUp: ERREUR lors de la création du profil` avec code 42501 ou 42P01
- `[AUTH] signUp: SUCCÈS` malgré l'erreur (retourne user sans error)
- `[LOGIN] Création de compte réussie` puis redirection vers Onboarding
- `[ONBOARDING] Pas d'utilisateur connecté, redirection vers Login`

## H2 : Session non persistée après signUp/signIn
**Description** : La session est créée par Supabase mais n'est pas correctement persistée dans AsyncStorage. Quand `getSession()` est appelé après signUp/signIn, il retourne null. La navigation détecte l'absence de session et redirige vers Login.

**Preuve attendue dans les logs** :
- `[AUTH] signUp: Résultat signUp` avec `data.session` présent
- `[AUTH] signUp: Vérification getSession()` avec `sessionData.session` = null
- `[NAV] checkInitialRoute: Pas de session, route initiale: Login`

## H3 : Navigation vérifie la session trop tôt (race condition)
**Description** : `AppNavigator` vérifie la session au montage avant que signUp/signIn ait terminé la persistance. La session existe en mémoire mais n'est pas encore dans AsyncStorage. La navigation pense qu'il n'y a pas de session et redirige vers Login immédiatement.

**Preuve attendue dans les logs** :
- `[LOGIN] Redirection vers Onboarding` (ou Main)
- `[NAV] onAuthStateChange: SIGNED_IN` avec session
- `[NAV] checkInitialRoute: Pas de session` (vérification trop rapide)
- `[NAV] onAuthStateChange: Redirection vers Login`

## H4 : OnboardingFlow redirige vers Login si utilisateur non trouvé
**Description** : OnboardingFlow appelle `getCurrentUser()` au montage. Si l'utilisateur n'est pas encore disponible (session en cours de chargement) ou si le profil n'existe pas, il redirige vers Login immédiatement, annulant la redirection précédente vers Onboarding.

**Preuve attendue dans les logs** :
- `[LOGIN] Redirection vers Onboarding`
- `[ONBOARDING] getCurrentUser() retourne null`
- `[ONBOARDING] Pas d'utilisateur connecté, redirection vers Login`

## H5 : Erreurs non affichées dans LoginScreen (state non mis à jour)
**Description** : Les erreurs sont correctement retournées par `signUp()`/`signIn()`, mais `setEmailError()` ou `setPasswordError()` ne mettent pas à jour l'état correctement (problème de timing, de closure, ou de re-render). L'utilisateur ne voit pas le message d'erreur, et le code continue avec une valeur d'erreur indéfinie.

**Preuve attendue dans les logs** :
- `[LOGIN] Erreur lors de la création de compte: {code, message}`
- `[LOGIN] Affichage erreur` avec le message
- Mais aucun `emailError` ou `passwordError` visible dans le UI (pas de log de l'état)

## H6 : Schéma SQL non exécuté ou RLS policies incorrectes
**Description** : Le schéma SQL `supabase_schema_clean.sql` n'a pas été exécuté dans Supabase, ou les RLS policies sont mal configurées. La table `profiles` n'existe pas, ou les policies bloquent l'insertion même avec `auth.uid() = id`.

**Preuve attendue dans les logs** :
- `[AUTH] signUp: Tentative de création du profil...`
- `[AUTH] signUp: ERREUR lors de la création du profil` avec code 42P01 (table n'existe pas) ou 42501 (RLS bloque)















