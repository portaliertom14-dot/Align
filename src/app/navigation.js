import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getWebOrigin } from '../config/webUrl';
import { withScreenEntrance } from '../components/ScreenEntranceAnimation';

// Import des layouts et écrans
import MainLayout from '../layouts/MainLayout';
import WelcomeScreen from '../screens/Welcome';
import ChoiceScreen from '../screens/Choice';
import LoginScreen from '../screens/Auth/LoginScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/Auth/ResetPasswordScreen';
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
import InterludeSecteurScreen from '../screens/InterludeSecteur';
import QuizMetierScreen from '../screens/QuizMetier';
import PropositionMetierScreen from '../screens/PropositionMetier';
import TonMetierDefiniScreen from '../screens/TonMetierDefini';
import CheckpointsValidationScreen from '../screens/CheckpointsValidation';
import Checkpoint1IntroScreen from '../screens/Checkpoint1Intro';
import Checkpoint1QuestionScreen from '../screens/Checkpoint1Question';
import Checkpoint2IntroScreen from '../screens/Checkpoint2Intro';
import Checkpoint2QuestionScreen from '../screens/Checkpoint2Question';
import Checkpoint3IntroScreen from '../screens/Checkpoint3Intro';
import Checkpoint3QuestionScreen from '../screens/Checkpoint3Question';
import FinCheckpointsScreen from '../screens/FinCheckpoints';
import ChargementRoutineScreen from '../screens/ChargementRoutine';
// Anciens écrans Series supprimés - remplacés par le nouveau système de modules
import ModuleScreen from '../screens/Module';
import ModuleCompletionScreen from '../screens/ModuleCompletion';
import QuestCompletionScreen from '../screens/QuestCompletion';
// Streaks désactivés — FlameScreen retiré de la navigation
import ChapterModulesScreen from '../screens/ChapterModules';
import SettingsScreen from '../screens/Settings';
import PrivacyPolicyScreen from '../screens/PrivacyPolicy';
import AboutScreen from '../screens/About';

const Stack = createNativeStackNavigator();

/** Linking web : route /reset-password → écran ResetPassword (liens email, deep link). */
const origin = typeof window !== 'undefined' && window.location?.origin
  ? window.location.origin
  : (getWebOrigin() || '');
const linking = origin
  ? {
      prefixes: [origin],
      config: {
        screens: {
          ResetPassword: 'reset-password',
          ForgotPassword: 'forgot-password',
          Login: 'auth',
          Welcome: '',
        },
      },
    }
  : undefined;

/**
 * Navigation principale de l'application Align
 *
 * RÈGLE DE REDIRECTION :
 * - Au rechargement, rediriger vers Welcome sauf si l'URL est un deep link (ex: /reset-password).
 */
export function AppNavigator() {
  const navigationRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      onReady={() => {
        if (!navigationRef.current || hasNavigatedRef.current) return;
        const isWeb = typeof window !== 'undefined';
        const pathname = isWeb && window.location?.pathname ? window.location.pathname : '';
        const isDeepLink = pathname === '/reset-password' || pathname === '/forgot-password' || pathname === '/auth';
        if (isDeepLink) return;
        hasNavigatedRef.current = true;
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A1B23', flex: 1 },
          animation: 'none', // Pas de transition entre écrans ; animation d'entrée sur le contenu uniquement
        }}
        initialRouteName="Welcome"
      >
        <Stack.Screen name="Welcome" component={withScreenEntrance(WelcomeScreen)} />
        <Stack.Screen name="Choice" component={withScreenEntrance(ChoiceScreen)} />
        <Stack.Screen name="Login" component={withScreenEntrance(LoginScreen)} />
        <Stack.Screen name="ForgotPassword" component={withScreenEntrance(ForgotPasswordScreen)} />
        <Stack.Screen name="ResetPassword" component={withScreenEntrance(ResetPasswordScreen)} />
        <Stack.Screen name="IntroQuestion" component={withScreenEntrance(IntroQuestionScreen)} />
        <Stack.Screen name="PreQuestions" component={withScreenEntrance(PreQuestionsScreen)} />
        <Stack.Screen name="OnboardingQuestions" component={withScreenEntrance(OnboardingQuestionsScreen)} />
        <Stack.Screen name="OnboardingInterlude" component={withScreenEntrance(OnboardingInterlude)} />
        <Stack.Screen name="OnboardingDob" component={withScreenEntrance(OnboardingDob)} />
        <Stack.Screen name="Onboarding" component={withScreenEntrance(OnboardingFlow)} />
        <Stack.Screen name="OnboardingOld" component={withScreenEntrance(OnboardingScreen)} />
        <Stack.Screen name="Quiz" component={withScreenEntrance(QuizScreen)} />
        <Stack.Screen name="Main" component={withScreenEntrance(MainLayout)} />
        <Stack.Screen name="Resultat" component={withScreenEntrance(ResultatScreen)} />
        <Stack.Screen name="ResultatSecteur" component={withScreenEntrance(ResultatSecteurScreen)} />
        <Stack.Screen name="InterludeSecteur" component={withScreenEntrance(InterludeSecteurScreen)} />
        <Stack.Screen name="QuizMetier" component={withScreenEntrance(QuizMetierScreen)} />
        <Stack.Screen name="PropositionMetier" component={withScreenEntrance(PropositionMetierScreen)} />
        <Stack.Screen name="TonMetierDefini" component={withScreenEntrance(TonMetierDefiniScreen)} />
        <Stack.Screen name="CheckpointsValidation" component={withScreenEntrance(CheckpointsValidationScreen)} />
        <Stack.Screen name="Checkpoint1Intro" component={withScreenEntrance(Checkpoint1IntroScreen)} />
        <Stack.Screen name="Checkpoint1Question" component={withScreenEntrance(Checkpoint1QuestionScreen)} />
        <Stack.Screen name="Checkpoint2Intro" component={withScreenEntrance(Checkpoint2IntroScreen)} />
        <Stack.Screen name="Checkpoint2Question" component={withScreenEntrance(Checkpoint2QuestionScreen)} />
        <Stack.Screen name="Checkpoint3Intro" component={withScreenEntrance(Checkpoint3IntroScreen)} />
        <Stack.Screen name="Checkpoint3Question" component={withScreenEntrance(Checkpoint3QuestionScreen)} />
        <Stack.Screen name="FinCheckpoints" component={withScreenEntrance(FinCheckpointsScreen)} />
        <Stack.Screen name="ChargementRoutine" component={withScreenEntrance(ChargementRoutineScreen)} />
        <Stack.Screen name="Module" component={withScreenEntrance(ModuleScreen)} />
        <Stack.Screen name="ModuleCompletion" component={withScreenEntrance(ModuleCompletionScreen)} />
        <Stack.Screen name="QuestCompletion" component={withScreenEntrance(QuestCompletionScreen)} />
        <Stack.Screen name="ChapterModules" component={withScreenEntrance(ChapterModulesScreen)} />
        <Stack.Screen name="Settings" component={withScreenEntrance(SettingsScreen)} />
        <Stack.Screen name="PrivacyPolicy" component={withScreenEntrance(PrivacyPolicyScreen)} />
        <Stack.Screen name="About" component={withScreenEntrance(AboutScreen)} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
