import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

// Import des layouts et écrans
import MainLayout from '../layouts/MainLayout';
import OnboardingFlow from '../screens/Onboarding/OnboardingFlow';
import OnboardingScreen from '../screens/Onboarding';
import QuizScreen from '../screens/Quiz';
import ResultatScreen from '../screens/Resultat';
import ResultatSecteurScreen from '../screens/ResultatSecteur';
import QuizMetierScreen from '../screens/QuizMetier';
import PropositionMetierScreen from '../screens/PropositionMetier';
// Anciens écrans Series supprimés - remplacés par le nouveau système de modules
import ModuleScreen from '../screens/Module';
import ModuleCompletionScreen from '../screens/ModuleCompletion';
import SettingsScreen from '../screens/Settings';

// Services (non utilisés pour l'instant - réintégration avec IA prévue)

const Stack = createNativeStackNavigator();

/**
 * Navigation principale de l'application Align
 * Gère le routing entre onboarding et l'app principale
 * Vérifie l'état de l'onboarding au démarrage pour déterminer la route initiale
 */
export function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Onboarding');
  const navigationRef = useRef(null);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  /**
   * Détermine la route initiale
   * NOTE: La vérification d'onboarding a été simplifiée - on démarre toujours sur Onboarding
   * L'intégration complète sera faite avec l'IA plus tard
   */
  const checkInitialRoute = async () => {
    // Pour l'instant, on démarre toujours sur Onboarding
    // La vérification d'onboarding sera réintégrée avec l'IA
    setIsReady(true);
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7B2B" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={initialRoute}
      >
        <Stack.Screen 
          name="Onboarding" 
          component={OnboardingFlow} 
        />
        <Stack.Screen 
          name="OnboardingOld" 
          component={OnboardingScreen} 
        />
        <Stack.Screen 
          name="Quiz" 
          component={QuizScreen} 
        />
        <Stack.Screen 
          name="Main" 
          component={MainLayout} 
        />
        <Stack.Screen 
          name="Resultat" 
          component={ResultatScreen} 
        />
        <Stack.Screen 
          name="ResultatSecteur" 
          component={ResultatSecteurScreen} 
        />
        <Stack.Screen 
          name="QuizMetier" 
          component={QuizMetierScreen} 
        />
        <Stack.Screen 
          name="PropositionMetier" 
          component={PropositionMetierScreen} 
        />
        {/* Anciens écrans Series supprimés - utiliser Module et ModuleCompletion à la place */}
        <Stack.Screen 
          name="Module" 
          component={ModuleScreen} 
        />
        <Stack.Screen 
          name="ModuleCompletion" 
          component={ModuleCompletionScreen} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#27273B',
  },
});
