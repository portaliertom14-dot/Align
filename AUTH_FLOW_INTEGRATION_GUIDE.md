# Guide d'intégration - Système de redirection intelligente

## 📋 Checklist d'intégration

### Étape 1: Vérifier la structure Supabase

Vérifier que la table `user_profiles` a la colonne :
- `onboarding_completed` (boolean, default: false)

Si manquante, exécuter :

```sql
-- Ajouter la colonne si elle n'existe pas
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Optionnel: étape d'onboarding
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Optionnel: dernière connexion
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ DEFAULT NOW();
```

### Étape 2: Modifier les écrans d'authentification

#### LoginScreen (Connexion)

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
    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signInAndRedirect(email, password, navigation);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // Si succès, redirection automatique (pas besoin de setLoading(false))
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleLogin}
        disabled={loading}
        style={{ marginTop: 20, padding: 15, backgroundColor: loading ? '#ccc' : '#4CAF50' }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'CONNEXION...' : 'SE CONNECTER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

#### SignupScreen (Création de compte)

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
    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    if (password.length < 6) {
      setError('Mot de passe trop court (min 6 caractères)');
      return;
    }

    setLoading(true);
    setError('');

    const result = await signUpAndRedirect(email, password, navigation);
    
    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // Si succès, redirection automatique vers Onboarding
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      {error ? <Text style={{ color: 'red', marginTop: 10 }}>{error}</Text> : null}

      <TouchableOpacity
        onPress={handleSignup}
        disabled={loading}
        style={{ marginTop: 20, padding: 15, backgroundColor: loading ? '#ccc' : '#4CAF50' }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'CRÉATION...' : 'CRÉER UN COMPTE'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Étape 3: Modifier l'onboarding

#### OnboardingFlow (gestionnaire d'étapes)

```javascript
// src/screens/Onboarding/OnboardingFlow.js
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  updateOnboardingStep,
  completeOnboardingAndRedirect,
  getOnboardingStep 
} from '../../services/authFlow';

// Vos écrans d'onboarding
import IntroScreen from './IntroScreen';
import BirthdateScreen from './BirthdateScreen';
import SchoolLevelScreen from './SchoolLevelScreen';
import FinalScreen from './FinalScreen';

const ONBOARDING_STEPS = [
  IntroScreen,
  BirthdateScreen,
  SchoolLevelScreen,
  FinalScreen,
];

export default function OnboardingFlow() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Récupérer l'étape depuis les params ou le stockage
    const loadStep = async () => {
      const stepFromParams = route.params?.step;
      const stepFromStorage = await getOnboardingStep();
      const step = stepFromParams ?? stepFromStorage ?? 0;
      setCurrentStep(step);
    };
    
    loadStep();
  }, [route.params]);

  const handleNext = async (stepData = {}) => {
    const nextStep = currentStep + 1;

    // Sauvegarder les données de l'étape actuelle si nécessaire
    // ... (logique de sauvegarde)

    if (nextStep >= ONBOARDING_STEPS.length) {
      // Dernière étape : compléter l'onboarding
      await completeOnboardingAndRedirect(navigation, stepData);
    } else {
      // Passer à l'étape suivante
      await updateOnboardingStep(nextStep);
      setCurrentStep(nextStep);
    }
  };

  const CurrentStepComponent = ONBOARDING_STEPS[currentStep];

  return (
    <View style={{ flex: 1 }}>
      <CurrentStepComponent onNext={handleNext} />
    </View>
  );
}
```

#### Dernière étape d'onboarding

```javascript
// src/screens/Onboarding/FinalScreen.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function FinalScreen({ onNext }) {
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Appeler onNext qui déclenche completeOnboardingAndRedirect
      await onNext({
        // Données finales de l'étape si nécessaire
      });
      // Redirection automatique vers Main/Feed
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
        C'est parti !
      </Text>

      <TouchableOpacity
        onPress={handleComplete}
        disabled={loading}
        style={{
          padding: 15,
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'FINALISATION...' : 'COMMENCER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Étape 4: Protéger les écrans principaux

#### FeedScreen (avec protection)

```javascript
// src/screens/Feed/index.js
import React from 'react';
import { View, Text } from 'react-native';
import { useMainAppProtection } from '../../hooks/useRouteProtection';

export default function FeedScreen() {
  const { isChecking, isAllowed } = useMainAppProtection();

  // Afficher loading pendant vérification
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  // Si accès refusé, ne rien afficher (redirection en cours)
  if (!isAllowed) {
    return null;
  }

  // Afficher le contenu normalement
  return (
    <View style={{ flex: 1 }}>
      <Text>Écran Feed</Text>
      {/* Votre contenu existant */}
    </View>
  );
}
```

### Étape 5: App.js avec listener

```javascript
// src/App.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setupAuthStateListener } from './src/services/authFlow';

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // Configurer le listener d'authentification
    if (navigationRef.current) {
      const unsubscribe = setupAuthStateListener(navigationRef.current);
      
      // Nettoyer au démontage
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName="Auth"
        screenOptions={{ headerShown: false }}
      >
        {/* Écrans publics */}
        <Stack.Screen name="Auth" component={AuthScreen} />
        
        {/* Onboarding */}
        <Stack.Screen name="Onboarding" component={OnboardingFlow} />
        
        {/* Application principale */}
        <Stack.Screen name="Main" component={MainNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Étape 6: Déconnexion

```javascript
// src/screens/Settings/index.js
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOutAndRedirect } from '../../services/authFlow';

export default function SettingsScreen() {
  const navigation = useNavigation();

  const handleLogout = async () => {
    await signOutAndRedirect(navigation);
    // Redirection automatique vers Auth
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity
        onPress={handleLogout}
        style={{ padding: 15, backgroundColor: '#f44336', borderRadius: 10 }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          SE DÉCONNECTER
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🧪 Tests

### Test 1: Création de compte

1. Ouvrir l'app → Écran Auth ✅
2. Créer un compte → Redirection vers Onboarding ✅
3. Ne pas compléter l'onboarding → Fermer l'app
4. Rouvrir l'app → Écran Onboarding (reprise) ✅
5. Compléter l'onboarding → Redirection vers Feed ✅

### Test 2: Connexion

1. Se connecter avec compte existant → Redirection vers Feed ✅
2. Vérifier que l'onboarding n'est pas affiché ✅

### Test 3: Protection

1. Tenter d'accéder à Feed sans onboarding → Bloqué ✅
2. Tenter d'accéder à Onboarding avec onboarding complété → Bloqué ✅

## ✅ Checklist finale

- [ ] Colonne `onboarding_completed` existe en DB
- [ ] `signInAndRedirect()` dans LoginScreen
- [ ] `signUpAndRedirect()` dans SignupScreen
- [ ] `completeOnboardingAndRedirect()` dans dernière étape onboarding
- [ ] Protection des écrans principaux (Feed, etc.)
- [ ] `setupAuthStateListener()` dans App.js
- [ ] `signOutAndRedirect()` dans Settings
- [ ] Tests effectués
- [ ] Logs vérifiés

## 🐛 Troubleshooting rapide

| Problème | Solution |
|----------|----------|
| Redirection en boucle | Vérifier `onboarding_completed` en DB |
| Accès refusé | Vérifier état avec `getAuthState()` |
| Onboarding skip | Vérifier `signUpAndRedirect` crée bien le profil |
| Pas de redirection | Vérifier que navigation est passé en param |

---

**Le système est prêt à être intégré !** 🚀

Consultez `AUTH_FLOW_SYSTEM_README.md` pour la documentation complète.
