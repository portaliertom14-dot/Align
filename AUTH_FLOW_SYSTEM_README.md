# Système de Redirection Intelligente Align

## Vue d'ensemble

Système de **redirection automatique et protection des routes** basé sur l'authentification et l'état d'onboarding.

### Principe

Chaque utilisateur est dans **un seul état** à la fois :
1. **Non authentifié** → Auth
2. **Authentifié + Onboarding complété** → Main/Feed
3. **Authentifié + Onboarding non complété** → Onboarding

### États utilisateur

```javascript
{
  isAuthenticated: boolean,        // Utilisateur connecté
  hasCompletedOnboarding: boolean, // Onboarding terminé
  accountCreatedAt: timestamp,     // Date création compte
  lastLoginAt: timestamp,          // Dernière connexion
  userId: string,                  // ID utilisateur
  email: string,                   // Email
  onboardingStep: number,          // Étape onboarding (0-N)
}
```

## Architecture

```
src/services/
├── authState.js         ✅ Gestion des états utilisateur
├── navigationService.js ✅ Logique de redirection
├── authNavigation.js    ✅ Intégration auth + navigation
└── authFlow.js          ✅ Point d'entrée principal (API publique)

src/hooks/
└── useRouteProtection.js ✅ Hooks React pour protection routes

src/components/
└── ProtectedRoute.js     ✅ Composant de protection
```

## Logique de redirection

### CAS 1: Utilisateur non authentifié

```
État:
├─ isAuthenticated: false

Action:
└─ Redirection → Auth (page connexion/création)
```

### CAS 2: Connexion (compte existant)

```
État:
├─ isAuthenticated: true
└─ hasCompletedOnboarding: true

Action:
└─ Redirection → Main/Feed (accueil)
```

### CAS 3: Création de compte (première fois)

```
État:
├─ isAuthenticated: true
└─ hasCompletedOnboarding: false

Action:
└─ Redirection → Onboarding (étape 0)
```

## Flux complets

### Flux 1: Création de compte

```
1. Utilisateur clique "Créer un compte"
   ↓
2. Email + mot de passe
   ↓
3. Compte créé dans Supabase
   - hasCompletedOnboarding = false
   ↓
4. Profil créé dans user_profiles
   - onboarding_completed = false
   ↓
5. Redirection automatique → Onboarding (étape 0)
   ↓
6. Utilisateur passe toutes les étapes
   ↓
7. Dernière étape → markOnboardingCompleted()
   - hasCompletedOnboarding = true
   - onboarding_completed = true en DB
   ↓
8. Redirection automatique → Main/Feed
   ↓
9. Utilisateur dans l'app ✅
```

### Flux 2: Connexion compte existant

```
1. Utilisateur clique "Se connecter"
   ↓
2. Email + mot de passe
   ↓
3. Authentification Supabase
   ↓
4. Récupération profil DB
   - onboarding_completed: true
   ↓
5. Redirection automatique → Main/Feed
   ↓
6. Utilisateur dans l'app ✅
```

### Flux 3: Reconnexion avec onboarding incomplet

```
1. Utilisateur se connecte
   ↓
2. Authentification Supabase
   ↓
3. Récupération profil DB
   - onboarding_completed: false
   - onboarding_step: 2 (exemple)
   ↓
4. Redirection automatique → Onboarding (étape 2)
   ↓
5. Utilisateur reprend là où il s'était arrêté
   ↓
6. Complétion onboarding
   ↓
7. Redirection → Main/Feed
```

## Protection des routes

### Règles de protection

```javascript
// Route Auth (publique)
- Toujours accessible

// Route Onboarding
IF isAuthenticated && hasCompletedOnboarding:
  → Redirection forcée vers Main/Feed
ELSE:
  → Accès autorisé

// Route Main/Feed
IF isAuthenticated && !hasCompletedOnboarding:
  → Redirection forcée vers Onboarding
ELSE IF !isAuthenticated:
  → Redirection forcée vers Auth
ELSE:
  → Accès autorisé
```

### Implémentation

```javascript
// Automatique avec le hook
import { useRouteProtection } from '../hooks/useRouteProtection';

const MyScreen = () => {
  const { isChecking, isAllowed } = useRouteProtection('Main');
  
  if (isChecking) return <Loading />;
  if (!isAllowed) return null; // Redirection en cours
  
  return <MyContent />;
};
```

## Utilisation

### 1. Écran de connexion

```javascript
// src/screens/Auth/LoginScreen.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInAndRedirect } from '../../services/authFlow';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signInAndRedirect(email, password, navigation);
      
      if (!result.success) {
        setError(result.error || 'Erreur de connexion');
      }
      // Si succès, redirection automatique
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
      >
        <Text>{loading ? 'Connexion...' : 'SE CONNECTER'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 2. Écran de création de compte

```javascript
// src/screens/Auth/SignupScreen.js
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signUpAndRedirect } from '../../services/authFlow';

export default function SignupScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await signUpAndRedirect(
        email, 
        password, 
        navigation,
        {} // userData additionnel si nécessaire
      );
      
      if (!result.success) {
        setError(result.error || 'Erreur de création de compte');
      }
      // Si succès, redirection automatique vers Onboarding
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error && <Text style={{ color: 'red' }}>{error}</Text>}

      <TouchableOpacity
        onPress={handleSignup}
        disabled={loading}
      >
        <Text>{loading ? 'Création...' : 'CRÉER UN COMPTE'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3. Dernière étape d'onboarding

```javascript
// src/screens/Onboarding/FinalStep.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { completeOnboardingAndRedirect } from '../../services/authFlow';

export default function OnboardingFinalStep() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Marquer l'onboarding comme complété et rediriger
      await completeOnboardingAndRedirect(navigation);
      // Redirection automatique vers Main/Feed
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Dernière étape !
      </Text>

      <TouchableOpacity
        onPress={handleComplete}
        disabled={loading}
      >
        <Text>{loading ? 'Finalisation...' : 'COMMENCER'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 4. Protection d'un écran

```javascript
// src/screens/Feed/index.js
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useMainAppProtection } from '../../hooks/useRouteProtection';

export default function FeedScreen() {
  // Protection automatique de la route
  const { isChecking, isAllowed } = useMainAppProtection();

  if (isChecking) {
    return <View><Text>Vérification...</Text></View>;
  }

  if (!isAllowed) {
    return null; // Redirection en cours
  }

  return (
    <View>
      <Text>Écran Feed</Text>
      {/* Votre contenu */}
    </View>
  );
}
```

### 5. App.js avec listener d'authentification

```javascript
// src/App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setupAuthStateListener } from './src/services/authFlow';

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = React.useRef(null);

  useEffect(() => {
    // Configurer le listener d'authentification
    if (navigationRef.current) {
      const unsubscribe = setupAuthStateListener(navigationRef.current);
      return unsubscribe;
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingFlow} />
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Scénarios détaillés

### Scénario 1: Nouvelle inscription

```
1. Utilisateur ouvre l'app
   État: Non authentifié
   → Écran: Auth

2. Clique "Créer un compte"
   → Entre email + mot de passe

3. Validation formulaire
   → Appel: signUpAndRedirect(email, password, navigation)

4. Compte créé
   État: isAuthenticated = true, hasCompletedOnboarding = false
   → Redirection automatique: Onboarding (étape 0)

5. Utilisateur passe les étapes
   → Appels: updateOnboardingStep(1), updateOnboardingStep(2), ...

6. Dernière étape
   → Appel: completeOnboardingAndRedirect(navigation)
   → hasCompletedOnboarding = true en DB

7. Redirection automatique: Main/Feed
   → Utilisateur dans l'app ✅
```

### Scénario 2: Reconnexion utilisateur existant

```
1. Utilisateur ouvre l'app
   État: Non authentifié
   → Écran: Auth

2. Clique "Se connecter"
   → Entre email + mot de passe

3. Validation formulaire
   → Appel: signInAndRedirect(email, password, navigation)

4. Authentification réussie
   → Récupération profil DB: onboarding_completed = true

5. Redirection automatique: Main/Feed
   → Utilisateur dans l'app ✅
```

### Scénario 3: Reconnexion avec onboarding incomplet

```
1. Utilisateur ouvre l'app
   État: Non authentifié
   → Écran: Auth

2. Se connecte
   → Appel: signInAndRedirect(email, password, navigation)

3. Authentification réussie
   → Récupération profil DB: onboarding_completed = false
   → Récupération: onboarding_step = 2 (exemple)

4. Redirection automatique: Onboarding (étape 2)
   → Utilisateur reprend là où il s'était arrêté

5. Complète l'onboarding
   → Appel: completeOnboardingAndRedirect(navigation)

6. Redirection automatique: Main/Feed
   → Utilisateur dans l'app ✅
```

### Scénario 4: Tentative d'accès non autorisé

```
CAS A: Accès à Main/Feed sans onboarding
├─ État: isAuthenticated = true, hasCompletedOnboarding = false
├─ Tentative: navigation.navigate('Main')
└─ Redirection forcée → Onboarding

CAS B: Accès à Onboarding avec onboarding complété
├─ État: isAuthenticated = true, hasCompletedOnboarding = true
├─ Tentative: navigation.navigate('Onboarding')
└─ Redirection forcée → Main/Feed

CAS C: Accès à Main/Feed sans authentification
├─ État: isAuthenticated = false
├─ Tentative: navigation.navigate('Main')
└─ Redirection forcée → Auth
```

## API

### Authentification

```javascript
import { 
  signInAndRedirect,
  signUpAndRedirect,
  signOutAndRedirect 
} from './services/authFlow';

// Connexion
await signInAndRedirect(email, password, navigation);

// Création compte
await signUpAndRedirect(email, password, navigation, {
  // userData optionnel
  birthdate: '2000-01-01',
  school_level: 'lycee',
});

// Déconnexion
await signOutAndRedirect(navigation);
```

### Onboarding

```javascript
import { 
  updateOnboardingStep,
  completeOnboardingAndRedirect 
} from './services/authFlow';

// Mettre à jour l'étape actuelle
await updateOnboardingStep(3);

// Compléter l'onboarding
await completeOnboardingAndRedirect(navigation, {
  // finalData optionnel
  professional_project: 'medecine',
  similar_apps: ['app1', 'app2'],
});
```

### Protection des routes

```javascript
import { useRouteProtection } from './hooks/useRouteProtection';

// Dans un composant
const MyScreen = () => {
  const { isChecking, isAllowed } = useRouteProtection('Main');
  
  if (isChecking) return <Loading />;
  if (!isAllowed) return null;
  
  return <Content />;
};
```

### Vérification de l'état

```javascript
import { 
  getAuthState,
  isAuthenticated,
  hasCompletedOnboarding 
} from './services/authFlow';

// État complet
const state = await getAuthState();

// Vérifications rapides
const authenticated = await isAuthenticated();
const onboardingDone = await hasCompletedOnboarding();
```

## Protection automatique

### Méthode 1: Hook dans l'écran

```javascript
import { useMainAppProtection } from './hooks/useRouteProtection';

export default function FeedScreen() {
  const { isChecking, isAllowed } = useMainAppProtection();
  
  if (isChecking) return <Loading />;
  if (!isAllowed) return null;
  
  return <Feed />;
}
```

### Méthode 2: HOC (Higher Order Component)

```javascript
import { withRouteProtection } from './services/authFlow';

const FeedScreen = () => {
  return <Feed />;
};

// Wrapper avec protection
export default withRouteProtection(FeedScreen, 'Main');
```

### Méthode 3: Composant wrapper

```javascript
import ProtectedRoute from './components/ProtectedRoute';

export default function FeedScreen() {
  return (
    <ProtectedRoute routeName="Main">
      <Feed />
    </ProtectedRoute>
  );
}
```

## Persistence

### AsyncStorage

```
@align_auth_state_[userId]
├── isAuthenticated
├── hasCompletedOnboarding
├── accountCreatedAt
├── lastLoginAt
├── userId
├── email
└── onboardingStep
```

### Supabase

```sql
user_profiles
├── id (UUID)
├── email
├── onboarding_completed (boolean)
└── created_at (timestamp)

-- Optionnel: ajouter si nécessaire
├── onboarding_step (integer)
└── last_login_at (timestamp)
```

## Logs automatiques

Le système log automatiquement chaque action :

```
[AuthState] Aucun utilisateur authentifié
[AuthState] État récupéré: { isAuthenticated: true, hasCompletedOnboarding: false }
[NavigationService] Détermination de la route initiale...
[NavigationService] → Route: Onboarding (première connexion)
[AuthNavigation] Tentative de connexion: user@example.com
[AuthNavigation] ✅ Authentification réussie
[AuthNavigation] ✅ Connexion et redirection réussies
[AuthNavigation] Complétion de l'onboarding...
[AuthNavigation] ✅ Onboarding marqué comme complété
[NavigationService] → Redirection vers Main/Feed
```

## Tests

### Test 1: Création compte

```javascript
import { signUpAndRedirect } from './services/authFlow';

// Créer un compte de test
await signUpAndRedirect(
  'test@example.com',
  'password123',
  navigation
);

// Vérifier redirection vers Onboarding
// → Doit être sur l'écran Onboarding
```

### Test 2: Connexion

```javascript
import { signInAndRedirect } from './services/authFlow';

// Se connecter avec compte existant
await signInAndRedirect(
  'existing@example.com',
  'password123',
  navigation
);

// Vérifier redirection vers Main/Feed
// → Doit être sur l'écran Feed
```

### Test 3: Protection routes

```javascript
import { canAccessRoute } from './services/authFlow';

// Tester accès Main sans onboarding
const result = await canAccessRoute('Main');
// → { allowed: false, redirectTo: 'Onboarding' }

// Tester accès Auth
const result2 = await canAccessRoute('Auth');
// → { allowed: true, redirectTo: null }
```

## Debugging

### Vérifier l'état utilisateur

```javascript
import { getAuthState } from './services/authFlow';

const state = await getAuthState();
console.log('État:', state);
```

### Forcer une redirection

```javascript
import { redirectAfterLogin } from './services/authFlow';

// Forcer redirection selon état actuel
await redirectAfterLogin(navigation);
```

### Reset onboarding (dev uniquement)

```javascript
import { markOnboardingCompleted } from './services/authFlow';

// Marquer comme complété
await markOnboardingCompleted();

// Ou mettre à jour l'étape
import { updateOnboardingStep } from './services/authFlow';
await updateOnboardingStep(0); // Revenir au début
```

## Troubleshooting

### Problème: Redirection en boucle

**Cause**: État incohérent

**Solution**:
```javascript
import { refreshAuthState } from './services/authFlow';
await refreshAuthState();
```

### Problème: Onboarding non détecté

**Cause**: `onboarding_completed` pas à jour en DB

**Solution**:
```javascript
// Vérifier en DB
SELECT id, email, onboarding_completed FROM user_profiles WHERE email = 'user@example.com';

// Corriger manuellement si nécessaire
UPDATE user_profiles SET onboarding_completed = true WHERE email = 'user@example.com';
```

### Problème: Accès refusé même après connexion

**Cause**: Cache obsolète

**Solution**:
```javascript
import { refreshAuthState } from './services/authFlow';
await refreshAuthState();
```

## Validation

Le système est correctement configuré si :

1. ✅ Nouveau compte → Redirigé vers Onboarding
2. ✅ Connexion compte existant → Redirigé vers Main/Feed
3. ✅ Onboarding incomplet → Bloqué sur Onboarding
4. ✅ Tentative accès Main sans onboarding → Redirigé vers Onboarding
5. ✅ Tentative accès Onboarding avec onboarding complété → Redirigé vers Main
6. ✅ Déconnexion → Redirigé vers Auth

---

**Le système de redirection est COMPLET et ROBUSTE !** 🎉
