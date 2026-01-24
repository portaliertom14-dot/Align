# Exemples de code - Système d'authentification et redirection

## 🚀 Code prêt à copier-coller

### 1. App.js - Configuration initiale

```javascript
// src/App.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { setupAuthStateListener } from './src/services/authFlow';

// Import des écrans
import AuthScreen from './src/screens/Auth';
import OnboardingFlow from './src/screens/Onboarding/OnboardingFlow';
import MainNavigator from './src/app/navigation'; // Votre navigateur principal

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = useRef(null);

  useEffect(() => {
    // CRITICAL: Configurer le listener d'authentification
    // Gère les redirections automatiques lors des changements d'état
    if (navigationRef.current) {
      console.log('⚙️ Configuration du listener d\'authentification');
      const unsubscribe = setupAuthStateListener(navigationRef.current);
      
      return () => {
        if (unsubscribe) {
          console.log('🧹 Nettoyage du listener d\'authentification');
          unsubscribe();
        }
      };
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        initialRouteName="Auth"
        screenOptions={{ 
          headerShown: false,
          // Empêcher le retour arrière avec geste
          gestureEnabled: false,
        }}
      >
        {/* ÉCRAN D'AUTHENTIFICATION */}
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{
            // Empêcher le retour arrière
            headerLeft: null,
          }}
        />
        
        {/* FLUX D'ONBOARDING */}
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingFlow}
          options={{
            // Empêcher le retour arrière pendant l'onboarding
            headerLeft: null,
            gestureEnabled: false,
          }}
        />
        
        {/* APPLICATION PRINCIPALE */}
        <Stack.Screen 
          name="Main" 
          component={MainNavigator}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 2. AuthScreen - Connexion et création de compte

```javascript
// src/screens/Auth/index.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signInAndRedirect, signUpAndRedirect } from '../../services/authFlow';

export default function AuthScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false); // false = connexion, true = création
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validation
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

    try {
      let result;
      
      if (isSignup) {
        // CRÉATION DE COMPTE
        console.log('📝 Création de compte:', email);
        result = await signUpAndRedirect(email, password, navigation);
        // → Redirection automatique vers Onboarding si succès
      } else {
        // CONNEXION
        console.log('🔐 Connexion:', email);
        result = await signInAndRedirect(email, password, navigation);
        // → Redirection automatique vers Main/Feed ou Onboarding si succès
      }

      if (!result.success) {
        setError(result.error || 'Erreur d\'authentification');
        setLoading(false);
      }
      // Si succès, pas besoin de setLoading(false) car redirection en cours
      
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message || 'Erreur inconnue');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isSignup ? 'CRÉER UN COMPTE' : 'CONNEXION'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading 
            ? (isSignup ? 'CRÉATION...' : 'CONNEXION...') 
            : (isSignup ? 'CRÉER UN COMPTE' : 'SE CONNECTER')
          }
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchButton}
        onPress={() => {
          setIsSignup(!isSignup);
          setError('');
        }}
        disabled={loading}
      >
        <Text style={styles.switchText}>
          {isSignup 
            ? 'Déjà un compte ? Se connecter' 
            : 'Pas de compte ? Créer un compte'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchButton: {
    marginTop: 20,
  },
  switchText: {
    color: '#4CAF50',
    textAlign: 'center',
    fontSize: 14,
  },
});
```

### 3. OnboardingFlow - Gestion des étapes

```javascript
// src/screens/Onboarding/OnboardingFlow.js
import React, { useState, useEffect } from 'react';
import { View, BackHandler } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  updateOnboardingStep,
  completeOnboardingAndRedirect,
  getOnboardingStep 
} from '../../services/authFlow';

// Import de vos écrans d'onboarding
import IntroScreen from './IntroScreen';
import BirthdateScreen from './BirthdateScreen';
import SchoolLevelScreen from './SchoolLevelScreen';
import ProfessionalProjectScreen from './ProfessionalProjectScreen';
import FinalScreen from './FinalScreen';

// Liste ordonnée des étapes
const ONBOARDING_STEPS = [
  IntroScreen,
  BirthdateScreen,
  SchoolLevelScreen,
  ProfessionalProjectScreen,
  FinalScreen,
];

export default function OnboardingFlow() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({});

  useEffect(() => {
    // EMPÊCHER LE RETOUR ARRIÈRE pendant l'onboarding
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true; // Bloquer le retour
    });

    // Charger l'étape de départ
    loadInitialStep();

    return () => {
      backHandler.remove();
    };
  }, []);

  const loadInitialStep = async () => {
    try {
      // Récupérer l'étape depuis les params ou le stockage
      const stepFromParams = route.params?.step;
      const stepFromStorage = await getOnboardingStep();
      const step = stepFromParams ?? stepFromStorage ?? 0;
      
      console.log('[OnboardingFlow] Étape de départ:', step);
      setCurrentStep(step);
    } catch (error) {
      console.error('[OnboardingFlow] Erreur chargement étape:', error);
      setCurrentStep(0);
    }
  };

  const handleNext = async (stepData = {}) => {
    try {
      // Fusionner les données de cette étape
      const updatedData = {
        ...onboardingData,
        ...stepData,
      };
      setOnboardingData(updatedData);

      const nextStep = currentStep + 1;

      // Vérifier si c'est la dernière étape
      if (nextStep >= ONBOARDING_STEPS.length) {
        console.log('[OnboardingFlow] Dernière étape, complétion de l\'onboarding');
        
        // COMPLÉTER L'ONBOARDING
        await completeOnboardingAndRedirect(navigation, updatedData);
        // → Redirection automatique vers Main/Feed
        
      } else {
        console.log('[OnboardingFlow] Passage à l\'étape', nextStep);
        
        // Sauvegarder l'étape actuelle
        await updateOnboardingStep(nextStep);
        
        // Passer à l'étape suivante
        setCurrentStep(nextStep);
      }
    } catch (error) {
      console.error('[OnboardingFlow] Erreur lors du passage à l\'étape suivante:', error);
    }
  };

  const handlePrevious = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      await updateOnboardingStep(prevStep);
      setCurrentStep(prevStep);
    }
  };

  // Récupérer le composant de l'étape actuelle
  const CurrentStepComponent = ONBOARDING_STEPS[currentStep];

  if (!CurrentStepComponent) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <CurrentStepComponent
        onNext={handleNext}
        onPrevious={currentStep > 0 ? handlePrevious : null}
        currentStep={currentStep}
        totalSteps={ONBOARDING_STEPS.length}
        data={onboardingData}
      />
    </View>
  );
}
```

### 4. Écran Onboarding avec progression

```javascript
// src/screens/Onboarding/BirthdateScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export default function BirthdateScreen({ onNext, onPrevious, currentStep, totalSteps }) {
  const [birthdate, setBirthdate] = useState('');

  const handleNext = () => {
    if (!birthdate) {
      alert('Date de naissance requise');
      return;
    }

    // Passer au suivant avec les données
    onNext({ birthdate });
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {/* Indicateur de progression */}
      <Text style={{ textAlign: 'center', marginBottom: 20 }}>
        Étape {currentStep + 1} / {totalSteps}
      </Text>

      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Quelle est ta date de naissance ?
      </Text>

      <TextInput
        placeholder="JJ/MM/AAAA"
        value={birthdate}
        onChangeText={setBirthdate}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {onPrevious && (
          <TouchableOpacity
            onPress={onPrevious}
            style={{ padding: 15, backgroundColor: '#ccc', borderRadius: 10, flex: 1, marginRight: 10 }}
          >
            <Text style={{ textAlign: 'center' }}>RETOUR</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleNext}
          style={{ padding: 15, backgroundColor: '#4CAF50', borderRadius: 10, flex: 1 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            SUIVANT
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

### 5. FeedScreen - Avec protection

```javascript
// src/screens/Feed/index.js
import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMainAppProtection } from '../../hooks/useRouteProtection';
import { useQuestActivityTracking } from '../../lib/quests';
import { getAllModules, canStartModule } from '../../lib/modules';

export default function FeedScreen() {
  const navigation = useNavigation();
  
  // PROTECTION AUTOMATIQUE
  const { isChecking, isAllowed } = useMainAppProtection();
  
  // TRACKING ACTIVITÉ (pour les quêtes)
  const { startTracking, stopTracking } = useQuestActivityTracking();

  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);

  // Afficher loading pendant vérification
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Vérification...</Text>
      </View>
    );
  }

  // Si accès refusé, ne rien afficher (redirection en cours)
  if (!isAllowed) {
    return null;
  }

  // Charger les modules
  const modules = getAllModules();

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Écran Feed
      </Text>

      {/* Afficher les modules */}
      {modules.map(module => (
        <TouchableOpacity
          key={module.index}
          disabled={!canStartModule(module.index)}
          onPress={() => navigation.navigate('Module', { moduleIndex: module.index })}
          style={{
            padding: 20,
            marginBottom: 15,
            backgroundColor: canStartModule(module.index) ? '#4CAF50' : '#ccc',
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Module {module.index}
          </Text>
          
          {module.isLocked() && <Text>🔒 Verrouillé</Text>}
          {module.isUnlocked() && <Text>▶️ Jouer</Text>}
          {module.isCompleted() && <Text>✅ Complété</Text>}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
```

### 6. SettingsScreen - Déconnexion

```javascript
// src/screens/Settings/index.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { signOutAndRedirect, useAuth } from '../../services/authFlow';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { authState, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    // Confirmation avant déconnexion
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          onPress: async () => {
            setLoading(true);
            
            try {
              await signOutAndRedirect(navigation);
              // Redirection automatique vers Auth
            } catch (error) {
              console.error('Erreur déconnexion:', error);
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Paramètres
      </Text>

      {/* Afficher les infos utilisateur */}
      {authState && (
        <View style={{ marginBottom: 30 }}>
          <Text>Email: {authState.email}</Text>
          <Text>User ID: {authState.userId?.substring(0, 8)}...</Text>
          <Text>Onboarding: {authState.hasCompletedOnboarding ? '✅ Complété' : '⏳ En cours'}</Text>
        </View>
      )}

      {/* Bouton de déconnexion */}
      <TouchableOpacity
        onPress={handleLogout}
        disabled={loading}
        style={{
          padding: 15,
          backgroundColor: loading ? '#ccc' : '#f44336',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {loading ? 'DÉCONNEXION...' : 'SE DÉCONNECTER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 7. ModuleCompletionScreen - Avec navigation intelligente

```javascript
// src/screens/ModuleCompletion/index.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { handleModuleCompletion, navigateAfterModuleCompletion } from '../../lib/modules';

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [processing, setProcessing] = useState(false);

  const {
    moduleIndex,
    score = 100,
    correctAnswers = 10,
    totalQuestions = 10,
  } = route.params || {};

  const handleContinue = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      console.log('📝 Complétion du module', moduleIndex);

      // 1. Compléter le module avec toutes les intégrations
      const result = await handleModuleCompletion({
        moduleId: `module_${moduleIndex}_${Date.now()}`,
        score,
        correctAnswers,
        totalQuestions,
      });

      console.log('Résultat complétion:', result);

      if (!result.success) {
        console.error('Échec complétion');
        navigation.navigate('Main', { screen: 'Feed' });
        return;
      }

      // Afficher message si cycle complété
      if (result.cycleCompleted) {
        console.log('🎉 CYCLE COMPLÉTÉ !');
        console.log('Bonus:', result.rewards.cycleBonus);
        // Optionnel: Afficher un modal de célébration
      }

      // 2. Navigation automatique intelligente
      navigateAfterModuleCompletion(navigation, result);
      
    } catch (error) {
      console.error('Erreur:', error);
      navigation.navigate('Main', { screen: 'Feed' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
        Module {moduleIndex} terminé !
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 40, textAlign: 'center' }}>
        Score: {score}% ({correctAnswers}/{totalQuestions})
      </Text>

      <TouchableOpacity
        onPress={handleContinue}
        disabled={processing}
        style={{
          padding: 15,
          backgroundColor: processing ? '#ccc' : '#4CAF50',
          borderRadius: 10,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {processing ? 'TRAITEMENT...' : 'CONTINUER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 8. Hook useAuth - Vérification d'état

```javascript
// Exemple d'utilisation du hook useAuth
import React from 'react';
import { View, Text } from 'react-native';
import { useAuth } from '../hooks/useRouteProtection';

export default function ProfileScreen() {
  const { 
    authState, 
    loading, 
    isAuthenticated, 
    hasCompletedOnboarding,
    email,
    refreshAuth 
  } = useAuth();

  if (loading) {
    return <View><Text>Chargement...</Text></View>;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Email: {email}</Text>
      <Text>Authentifié: {isAuthenticated ? '✅' : '❌'}</Text>
      <Text>Onboarding: {hasCompletedOnboarding ? '✅' : '⏳'}</Text>
      
      <TouchableOpacity onPress={refreshAuth}>
        <Text>Rafraîchir</Text>
      </TouchableOpacity>
    </View>
  );
}
```

## 🧪 Tests de validation

### Test complet (copier-coller dans un fichier de test)

```javascript
// tests/authFlow.test.js
import { 
  signUpAndRedirect,
  signInAndRedirect,
  completeOnboardingAndRedirect,
  signOutAndRedirect,
  getAuthState,
} from '../src/services/authFlow';

// Mock navigation
const mockNavigation = {
  navigate: (route, params) => console.log('Navigate to:', route, params),
  reset: (config) => console.log('Reset to:', config),
};

async function runTests() {
  console.log('🧪 Début des tests\n');

  // Test 1: Création de compte
  console.log('Test 1: Création de compte');
  const signupResult = await signUpAndRedirect(
    'test@example.com',
    'password123',
    mockNavigation
  );
  console.assert(signupResult.success, 'Signup doit réussir');
  console.log('✅ Test 1 passé\n');

  // Test 2: Vérifier état après signup
  console.log('Test 2: État après signup');
  const stateAfterSignup = await getAuthState();
  console.assert(stateAfterSignup.isAuthenticated, 'Doit être authentifié');
  console.assert(!stateAfterSignup.hasCompletedOnboarding, 'Onboarding doit être false');
  console.log('✅ Test 2 passé\n');

  // Test 3: Compléter onboarding
  console.log('Test 3: Complétion onboarding');
  await completeOnboardingAndRedirect(mockNavigation);
  const stateAfterOnboarding = await getAuthState();
  console.assert(stateAfterOnboarding.hasCompletedOnboarding, 'Onboarding doit être true');
  console.log('✅ Test 3 passé\n');

  // Test 4: Déconnexion
  console.log('Test 4: Déconnexion');
  await signOutAndRedirect(mockNavigation);
  const stateAfterLogout = await getAuthState();
  console.assert(!stateAfterLogout.isAuthenticated, 'Doit être déconnecté');
  console.log('✅ Test 4 passé\n');

  console.log('✅ TOUS LES TESTS PASSÉS !');
}

runTests();
```

## 🔍 Vérification logs attendus

Lors d'une création de compte :

```
[AuthNavigation] Tentative de création de compte: test@example.com
[AuthNavigation] ✅ Compte créé: abc123...
[AuthNavigation] ✅ Profil initialisé avec onboarding_completed = false
[NavigationService] Redirection après création de compte...
[NavigationService] → Redirection vers Onboarding (étape 0)
[AuthNavigation] ✅ Création de compte et redirection réussies
```

Lors d'une connexion :

```
[AuthNavigation] Tentative de connexion: user@example.com
[AuthNavigation] ✅ Authentification réussie
[AuthState] État utilisateur: { hasCompletedOnboarding: true, ... }
[NavigationService] → Redirection vers Main/Feed
[AuthNavigation] ✅ Connexion et redirection réussies
```

Lors de la complétion onboarding :

```
[OnboardingFlow] Dernière étape, complétion de l'onboarding
[AuthNavigation] Complétion de l'onboarding...
[AuthState] Marquage onboarding comme complété pour: abc123...
[AuthNavigation] ✅ Onboarding marqué comme complété
[NavigationService] Redirection après onboarding...
[NavigationService] → Redirection vers Main/Feed
```

---

**Ces exemples sont prêts à l'emploi. Copiez-collez selon vos besoins !** 🚀
