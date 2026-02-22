/**
 * RootGate — Require manual login à chaque lancement.
 * manualLoginRequired === true → toujours AuthStack (Créer un compte / Se connecter).
 * manualLoginRequired === false et authStatus === "signedIn" → AppStack (progression chargée depuis DB).
 * Pas de signOut au boot : session conservée pour reconnexion et récupération progression.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { withScreenEntrance } from '../components/ScreenEntranceAnimation';
import { sanitizeOnboardingStep, ONBOARDING_MAX_STEP } from '../lib/onboardingSteps';

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
import RefineDroitTrackScreen from '../screens/RefineDroitTrack';
import QuizMetierScreen from '../screens/QuizMetier';
import PropositionMetierScreen from '../screens/PropositionMetier';
import ResultJobScreen from '../screens/ResultJob';
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
import LoadingRevealScreen from '../screens/LoadingReveal';
import ModuleScreen from '../screens/Module';
import ModuleCompletionScreen from '../screens/ModuleCompletion';
import QuestCompletionScreen from '../screens/QuestCompletion';
import ChapterModulesScreen from '../screens/ChapterModules';
import SettingsScreen from '../screens/Settings';
import PrivacyPolicyScreen from '../screens/PrivacyPolicy';
import AboutScreen from '../screens/About';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: '#1A1B23', flex: 1 },
  animation: 'none',
  lazy: true,
};

// ————— AuthStack : écrans auth + onboarding questions (PreQuestions → OnboardingQuestions) —————
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName="Welcome">
      <Stack.Screen name="Welcome" component={withScreenEntrance(WelcomeScreen)} />
      <Stack.Screen name="Invite" component={withScreenEntrance(WelcomeScreen)} options={{ headerShown: false }} />
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
    </Stack.Navigator>
  );
}

// ————— AppStack : après signedIn (onboarding ou main) —————
function getAppInitialRoute(onboardingStatus, onboardingStep) {
  if (onboardingStatus === 'complete') {
    return { initialRouteName: 'Main', initialParams: { screen: 'Feed' } };
  }
  const step = Math.min(ONBOARDING_MAX_STEP, Math.max(1, sanitizeOnboardingStep(onboardingStep)));
  return { initialRouteName: 'Onboarding', initialParams: { step } };
}

function getAppNavKey(onboardingStatus) {
  return onboardingStatus === 'complete' ? 'signedIn:complete' : 'signedIn:incomplete';
}

function AppStack() {
  const { onboardingStatus, onboardingStep } = useAuth();
  const navKey = useMemo(() => getAppNavKey(onboardingStatus), [onboardingStatus]);
  const { initialRouteName, initialParams } = useMemo(
    () => getAppInitialRoute(onboardingStatus, onboardingStep),
    [onboardingStatus, onboardingStep]
  );

  return (
    <Stack.Navigator
      key={navKey}
      screenOptions={screenOptions}
      initialRouteName={initialRouteName}
      initialParams={initialParams}
    >
      <Stack.Screen name="OnboardingQuestions" component={withScreenEntrance(OnboardingQuestionsScreen)} />
      <Stack.Screen name="OnboardingInterlude" component={withScreenEntrance(OnboardingInterlude)} />
      <Stack.Screen name="OnboardingDob" component={withScreenEntrance(OnboardingDob)} />
      <Stack.Screen name="Onboarding" component={withScreenEntrance(OnboardingFlow)} />
      <Stack.Screen name="OnboardingOld" component={withScreenEntrance(OnboardingScreen)} />
      <Stack.Screen name="Quiz" component={withScreenEntrance(QuizScreen)} />
      <Stack.Screen name="Main" component={withScreenEntrance(MainLayout)} />
      <Stack.Screen name="Resultat" component={withScreenEntrance(ResultatScreen)} />
      <Stack.Screen name="LoadingReveal" component={withScreenEntrance(LoadingRevealScreen)} />
      <Stack.Screen name="ResultatSecteur" component={withScreenEntrance(ResultatSecteurScreen)} />
      <Stack.Screen name="InterludeSecteur" component={withScreenEntrance(InterludeSecteurScreen)} />
      <Stack.Screen name="RefineDroitTrack" component={withScreenEntrance(RefineDroitTrackScreen)} />
      <Stack.Screen name="QuizMetier" component={withScreenEntrance(QuizMetierScreen)} />
      <Stack.Screen name="PropositionMetier" component={withScreenEntrance(PropositionMetierScreen)} />
      <Stack.Screen name="ResultJob" component={withScreenEntrance(ResultJobScreen)} />
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
  );
}

export default function RootGate() {
  const { authStatus, manualLoginRequired } = useAuth();
  const navLockRef = useRef(false);

  useEffect(() => {
    if (authStatus === 'signedIn' && !manualLoginRequired) {
      navLockRef.current = true;
    } else if (authStatus === 'signedOut') {
      navLockRef.current = false;
    }
  }, [authStatus, manualLoginRequired]);

  // Routing post-auth géré uniquement ici (pas de navigation dans Signup/Login).
  if (manualLoginRequired || authStatus !== 'signedIn') {
    return <AuthStack />;
  }

  return <AppStack />;
}
