import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

// Import des layouts et écrans
import MainLayout from '../layouts/MainLayout';
import WelcomeScreen from '../screens/Welcome';
import ChoiceScreen from '../screens/Choice';
import IntroQuestionScreen from '../screens/IntroQuestion';
import PreQuestionsScreen from '../screens/PreQuestions';
import OnboardingFlow from '../screens/Onboarding/OnboardingFlow';
import OnboardingQuestionsScreen from '../screens/Onboarding/OnboardingQuestionsScreen';
import OnboardingInterlude from '../screens/Onboarding/OnboardingInterlude';
import OnboardingDob from '../screens/Onboarding/OnboardingDob';
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
import ChapterModulesScreen from '../screens/ChapterModules';
import SettingsScreen from '../screens/Settings';
import PrivacyPolicyScreen from '../screens/PrivacyPolicy';
import AboutScreen from '../screens/About';

const Stack = createNativeStackNavigator();

/**
 * Navigation principale de l'application Align
 * 
 * RÈGLE DE REDIRECTION :
 * - TOUJOURS rediriger vers Welcome (écran d'accueil) au rechargement
 */
export function AppNavigator() {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Welcome');
  const navigationRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  /**
   * Détermine la route initiale selon l'état utilisateur
   * TOUJOURS rediriger vers Welcome (écran d'accueil) au rechargement
   */
  const checkInitialRoute = async () => {
    try {
      // TOUJOURS rediriger vers Welcome (écran d'accueil) au rechargement
      setInitialRoute('Welcome');
      setIsReady(true);
      
      // Forcer la navigation vers Welcome
      if (navigationRef.current && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }
    } catch (error) {
      console.error('[Navigation] Erreur lors de la détermination de la route:', error);
      
      // En cas d'erreur, démarrer sur Welcome par sécurité
      setInitialRoute('Welcome');
      setIsReady(true);
      
      // Forcer la navigation vers Welcome en cas d'erreur
      if (navigationRef.current && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
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
          name="Welcome" 
          component={WelcomeScreen} 
        />
        <Stack.Screen 
          name="Choice" 
          component={ChoiceScreen} 
        />
        <Stack.Screen 
          name="IntroQuestion" 
          component={IntroQuestionScreen} 
        />
        <Stack.Screen 
          name="PreQuestions" 
          component={PreQuestionsScreen} 
        />
        <Stack.Screen 
          name="OnboardingQuestions" 
          component={OnboardingQuestionsScreen} 
        />
        <Stack.Screen 
          name="OnboardingInterlude" 
          component={OnboardingInterlude} 
        />
        <Stack.Screen 
          name="OnboardingDob" 
          component={OnboardingDob} 
        />
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
          name="ChapterModules" 
          component={ChapterModulesScreen} 
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
