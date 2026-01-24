# 🔧 FIX : Redirection vers Onboarding au lieu de Feed

## 🐛 Problème

**Symptôme** : Lors de la reconnexion, les utilisateurs sont **toujours redirigés vers l'onboarding** au lieu du Feed, même s'ils ont déjà complété l'onboarding.

**Console logs** :
```
Authentication successful
state recovered
connection registered
redirect after connection
redirect to onboarding  ← ❌ MAUVAIS pour utilisateur existant
connection and redirect successful
```

**Comportement attendu** :
- ✅ **Nouveau compte** → Onboarding
- ✅ **Reconnexion avec onboarding complété** → Feed
- ✅ **Reconnexion avec onboarding incomplet** → Onboarding (pour finir)

**Comportement actuel (bug)** :
- ❌ **Tout le monde** → Onboarding

---

## 🔍 Cause racine

La colonne **`onboarding_completed`** est **MANQUANTE** dans la table `user_profiles` de Supabase.

### Diagnostic

1. Le fichier `add_onboarding_columns.sql` ajoute plusieurs colonnes MAIS PAS `onboarding_completed`
2. Le code dans `authState.js` (ligne 54) essaie de lire cette colonne :
   ```javascript
   hasCompletedOnboarding: profile?.onboarding_completed || false
   ```
3. Comme la colonne n'existe pas, elle retourne toujours `false`
4. La fonction `redirectAfterLogin` redirige donc toujours vers onboarding

---

## ✅ Solution

### Étape 1 : Exécuter la migration SQL (2 min)

1. **Ouvrir Supabase Dashboard**
   - Aller sur https://supabase.com/dashboard
   - Sélectionner votre projet

2. **Aller dans SQL Editor**
   - Menu latéral → SQL Editor
   - Cliquer sur "New query"

3. **Copier le contenu du fichier**
   ```
   supabase/migrations/ADD_ONBOARDING_COMPLETED_COLUMN.sql
   ```

4. **Exécuter le script**
   - Coller le contenu dans l'éditeur
   - Cliquer sur "Run" (ou F5)
   - Attendre la confirmation

5. **Vérifier les logs**
   Vous devriez voir :
   ```
   ✅ Table user_profiles existe
   ✅ Colonne onboarding_completed ajoutée avec valeur par défaut FALSE
   ✅ Colonne onboarding_step ajoutée avec valeur par défaut 0
   ✅ X utilisateur(s) existant(s) marqué(s) comme ayant complété l'onboarding
   
   📊 STATISTIQUES ONBOARDING
   Total utilisateurs: X
   Onboarding complété: Y (Z%)
   Onboarding incomplet: W (V%)
   
   ✅ Migration réussie: colonne onboarding_completed créée
   ```

---

### Étape 2 : Tester la reconnexion

#### Test 1 : Utilisateur existant avec données complètes
1. Se déconnecter de l'application
2. Se reconnecter avec un compte existant (email + password)
3. **✅ Vérifier** : Redirection vers Feed (PAS vers onboarding)

#### Test 2 : Nouvel utilisateur
1. Créer un nouveau compte
2. **✅ Vérifier** : Redirection vers onboarding
3. Compléter l'onboarding
4. **✅ Vérifier** : Redirection vers Feed
5. Se déconnecter
6. Se reconnecter
7. **✅ Vérifier** : Redirection vers Feed (PAS vers onboarding)

---

## 🔬 Détails techniques

### Logique de migration

La migration SQL effectue 3 opérations :

1. **Ajout colonne `onboarding_completed`**
   ```sql
   ALTER TABLE public.user_profiles 
   ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL;
   ```

2. **Ajout colonne `onboarding_step`** (pour reprise)
   ```sql
   ALTER TABLE public.user_profiles 
   ADD COLUMN onboarding_step INTEGER DEFAULT 0 NOT NULL;
   ```

3. **Mise à jour utilisateurs existants**
   - Si `first_name`, `last_name`, `username` sont renseignés
   - → Marquer `onboarding_completed = TRUE`
   - Sinon → Laisser `FALSE`

### Logique de redirection

Le flux dans `navigationService.js` (ligne 101) :

```javascript
if (authState.hasCompletedOnboarding) {
  // Redirection vers Feed
  navigation.reset({
    index: 0,
    routes: [{ name: ROUTES.MAIN, params: { screen: ROUTES.FEED } }],
  });
} else {
  // Redirection vers Onboarding
  navigation.reset({
    index: 0,
    routes: [{ name: ROUTES.ONBOARDING, params: { step: authState.onboardingStep || 0 } }],
  });
}
```

**Avant la migration** :
- `authState.hasCompletedOnboarding` = `false` (toujours)
- → Tout le monde vers onboarding

**Après la migration** :
- `authState.hasCompletedOnboarding` = valeur réelle depuis DB
- → Redirection correcte selon l'état

---

## 📊 Vérification post-migration

### Dans Supabase (SQL Editor)

```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles' 
AND column_name IN ('onboarding_completed', 'onboarding_step');

-- Vérifier les valeurs des utilisateurs
SELECT 
  id,
  email,
  first_name,
  last_name,
  username,
  onboarding_completed,
  onboarding_step,
  created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques
SELECT 
  onboarding_completed,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM user_profiles), 1) as percentage
FROM user_profiles
GROUP BY onboarding_completed;
```

### Dans l'application (Console)

Lors du login, vérifier les logs :

```
[AuthNavigation] Tentative de connexion: user@example.com
[AuthNavigation] ✅ Authentification réussie
[AuthState] État récupéré: {
  isAuthenticated: true,
  hasCompletedOnboarding: true,  ← ✅ Devrait être TRUE pour utilisateur existant
  onboardingStep: 0
}
[NavigationService] → Redirection vers Main/Feed  ← ✅ CORRECT
[AuthNavigation] ✅ Connexion et redirection réussies
```

**Avant** (bug) :
```
hasCompletedOnboarding: false  ← ❌ Toujours false
→ Redirection vers Onboarding  ← ❌ Mauvais
```

**Après** (fix) :
```
hasCompletedOnboarding: true  ← ✅ Valeur réelle depuis DB
→ Redirection vers Main/Feed  ← ✅ Correct
```

---

## ⚠️ Notes importantes

### Pour les utilisateurs existants

Si certains utilisateurs ont des données **incomplètes** (pas de `first_name`, `last_name`, ou `username`), ils seront marqués comme `onboarding_completed = FALSE` et devront **compléter l'onboarding** lors de leur prochaine connexion.

C'est voulu : cela permet de s'assurer que tous les utilisateurs ont des profils complets.

### Pour les nouveaux utilisateurs

Tous les nouveaux comptes auront automatiquement `onboarding_completed = FALSE` et devront passer par l'onboarding lors de leur première connexion.

---

## 🎉 Résultat attendu

Après la migration :

- ✅ **Nouveaux comptes** → Onboarding (comme avant)
- ✅ **Reconnexion avec profil complet** → Feed (FIXÉ !)
- ✅ **Reconnexion avec profil incomplet** → Onboarding (pour compléter)

**Le bug de redirection est résolu !**

---

## 🐛 En cas de problème

Si après la migration le problème persiste :

### 1. Vérifier que la colonne existe

```sql
SELECT * FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'onboarding_completed';
```

### 2. Vérifier les valeurs

```sql
SELECT email, onboarding_completed, first_name, last_name, username
FROM user_profiles
WHERE email = 'votre@email.com';
```

### 3. Forcer la mise à jour manuelle

Si un utilisateur spécifique a toujours le problème :

```sql
UPDATE user_profiles
SET onboarding_completed = TRUE
WHERE email = 'utilisateur@example.com';
```

### 4. Vider le cache AsyncStorage

Dans l'app, se déconnecter puis se reconnecter pour forcer le rechargement de l'état depuis la DB.

---

## 📚 Fichiers concernés

- ✅ `supabase/migrations/ADD_ONBOARDING_COMPLETED_COLUMN.sql` (NOUVEAU)
- `src/services/authState.js` (ligne 54)
- `src/services/navigationService.js` (ligne 101)
- `src/services/userService.js` (fonction `markOnboardingCompleted`)

---

*Document créé le 21 janvier 2026*  
*Fix pour le bug de redirection onboarding* 🔧
