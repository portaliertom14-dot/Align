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
import QuestCompletionScreen from '../screens/QuestCompletion';
import SettingsScreen from '../screens/Settings';
import PrivacyPolicyScreen from '../screens/PrivacyPolicy';
import AboutScreen from '../screens/About';

const Stack = createNativeStackNavigator();

/**
 * Navigation principale de l'application Align
 * 
 * RÈGLE DE REDIRECTION :
 * - TOUJOURS rediriger vers Onboarding (page de connexion) au rechargement
 */
export function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Onboarding');
  const navigationRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  /**
   * Détermine la route initiale selon l'état utilisateur
   * TOUJOURS rediriger vers Onboarding (page de connexion) au rechargement
   */
  const checkInitialRoute = async () => {
    try {
      // TOUJOURS rediriger vers Onboarding (page de connexion) au rechargement
      setInitialRoute('Onboarding');
      setIsReady(true);
      
      // Forcer la navigation vers Onboarding
      if (navigationRef.current && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    } catch (error) {
      console.error('[Navigation] Erreur lors de la détermination de la route:', error);
      
      // En cas d'erreur, démarrer sur Onboarding par sécurité
      setInitialRoute('Onboarding');
      setIsReady(true);
      
      // Forcer la navigation vers Onboarding en cas d'erreur
      if (navigationRef.current && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      }
    }
  };

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF7B2B" />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onReady={() => {
        // Forcer la navigation vers la route initiale une fois le container prêt
        if (navigationRef.current && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: initialRoute }],
          });
        }
      }}
    >
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
          name="QuestCompletion" 
          component={QuestCompletionScreen} 
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen} 
        />
        <Stack.Screen 
          name="PrivacyPolicy" 
          component={PrivacyPolicyScreen} 
        />
        <Stack.Screen 
          name="About" 
          component={AboutScreen} 
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
    backgroundColor: '#1A1B23', // Fond unifié #1A1B23
  },
});
