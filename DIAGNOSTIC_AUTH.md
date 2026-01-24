# Diagnostic Authentification Align

## Logs de diagnostic ajoutés

Des logs explicites ont été ajoutés pour diagnostiquer précisément où le problème se produit :

### 1. Logs dans `signIn()` (`src/services/auth.js`)

- **Avant signInWithPassword**: Log de la tentative
- **Après signInWithPassword**: 
  - Log de l'erreur (si présente)
  - Log de `data.session` (présence, user_id, expires_at, access_token)
  - Log de `data.user` (id, email)
- **Vérification getSession()**: Vérifie explicitement que la session est persistée
- **Résultat final**: Log de succès ou échec

### 2. Logs dans `getSession()` (`src/services/auth.js`)

- Log de la vérification
- Log du résultat (hasSession, userId, expiresAt, accessToken)
- Log des erreurs

### 3. Logs dans `LoginScreen` (`src/screens/Auth/LoginScreen.js`)

- **Après connexion réussie**: 
  - Log du user.id
  - Vérification de la session
  - Vérification du profil
  - Log avant redirection

### 4. Logs dans `navigation.js` (`src/app/navigation.js`)

- **checkInitialRoute**: 
  - Log de la vérification au démarrage
  - Log du résultat (hasSession, hasUser, userId)
  - Log de la route initiale choisie
- **onAuthStateChange**: 
  - Log de l'événement (SIGNED_IN, SIGNED_OUT)
  - Log de la présence de session
  - Log des redirections effectuées

### 5. Logs dans `supabase.js` (`src/services/supabase.js`)

- Log de la configuration (URL, hasAnonKey)
- Log de la configuration auth (persistSession, autoRefreshToken, storage)

## Configuration vérifiée

✅ **Supabase client configuré avec:**
- `persistSession: true`
- `autoRefreshToken: true`
- `storage: AsyncStorage`

## Points de vérification

Lors d'une connexion, les logs doivent permettre d'identifier :

1. **Étape 1**: `signInWithPassword` réussit-il ?
   - Si `error !== null` → Connexion échoue réellement
   - Si `data.session === null` → Problème Supabase

2. **Étape 2**: La session est-elle persistée ?
   - Si `getSession()` après `signIn` retourne `null` → Problème de persistance

3. **Étape 3**: La redirection se fait-elle ?
   - Log `[LOGIN] Redirection vers Main` doit apparaître
   - Log `[NAV] onAuthStateChange: SIGNED_IN` doit apparaître

4. **Étape 4**: La navigation détecte-t-elle la session ?
   - Log `[NAV] checkInitialRoute: Session valide` doit apparaître
   - Si redirection vers Login → Log `[NAV] onAuthStateChange: Redirection vers Login`

## Instructions de test

1. Ouvrir la console (logs React Native / Expo)
2. Tenter une connexion
3. Observer les logs dans l'ordre :
   - `[AUTH] signIn:` - Tentative de connexion
   - `[AUTH] signIn: Résultat signInWithPassword` - Résultat
   - `[AUTH] signIn: Vérification getSession()` - Vérification session
   - `[LOGIN]` - Logs dans LoginScreen
   - `[NAV]` - Logs de navigation

4. Identifier où ça bloque :
   - Si pas de log `[AUTH] signIn: SUCCÈS` → Problème dans signIn
   - Si pas de log `[LOGIN] Redirection vers Main` → Problème dans LoginScreen
   - Si log `[NAV] onAuthStateChange: Redirection vers Login` → Problème dans navigation

## Messages d'erreur possibles

- **"SESSION_NOT_PERSISTED"**: La session n'a pas pu être sauvegardée (vérifier AsyncStorage)
- **"Mot de passe incorrect"**: Identifiants invalides
- **Pas de message mais redirection vers Login**: Vérifier les logs `[NAV]` pour comprendre pourquoi















