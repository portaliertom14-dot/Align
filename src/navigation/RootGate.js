/**
 * RootGate — Routing déterministe. Une seule source de vérité : Supabase DB (onboarding_completed).
 *
 * Règles :
 * - Décision UNIQUEMENT sur : profileStatus === "ready" ET onboarding_completed === true → Main.
 * - Si profileStatus !== "ready" → Loader uniquement (aucune décision sur état partiel).
 * - Aucun fallback cache pour la décision métier.
 *
 * A) !signedIn → AuthStack.
 * B) signedIn + profile non prêt → Loader.
 * C) signedIn + profile prêt + onboarding_completed → AppStackMain.
 * D) signedIn + profile prêt + !onboarding_completed → Onboarding (Start ou Resume).
 */

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { isRecoveryFlow } from '../lib/recoveryUrl';
import { withScreenEntrance } from '../components/ScreenEntranceAnimation';
import LoadingGate from '../components/LoadingGate';
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
import RefineJobScreen from '../screens/RefineJob';
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

function getAuthInitialRoute(forceInitialRoute) {
  if (forceInitialRoute) return forceInitialRoute;
  return 'Welcome';
}

// ————— AuthStack : Welcome, Login, ForgotPassword, ResetPassword, Onboarding… —————
function AuthStack({ forceInitialRoute }) {
  const initialRoute = getAuthInitialRoute(forceInitialRoute);
  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName={initialRoute}>
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
      <Stack.Screen name="Quiz" component={withScreenEntrance(QuizScreen)} />
      <Stack.Screen name="LoadingReveal" component={withScreenEntrance(LoadingRevealScreen)} />
      <Stack.Screen name="ResultatSecteur" component={withScreenEntrance(ResultatSecteurScreen)} />
      <Stack.Screen name="InterludeSecteur" component={withScreenEntrance(InterludeSecteurScreen)} />
      <Stack.Screen name="QuizMetier" component={withScreenEntrance(QuizMetierScreen)} />
      <Stack.Screen name="PropositionMetier" component={withScreenEntrance(PropositionMetierScreen)} />
      <Stack.Screen name="ResultJob" component={withScreenEntrance(ResultJobScreen)} />
      <Stack.Screen name="RefineJob" component={withScreenEntrance(RefineJobScreen)} />
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
      <Stack.Screen name="Main" component={withScreenEntrance(MainLayout)} />
    </Stack.Navigator>
  );
}

// ————— Décision initiale AppStack selon onboarding (profile missing / incomplete / complete) —————
function getAppInitialRoute(decision, onboardingStatus, onboardingStep) {
  if (decision === 'AppStackMain' || onboardingStatus === 'complete') {
    return { initialRouteName: 'Main', initialParams: { screen: 'Feed' } };
  }
  // OnboardingStart = user signed in but no profile row yet (new signup) → step 2 (UserInfo), not Auth.
  const step =
    decision === 'OnboardingStart'
      ? 2
      : Math.min(ONBOARDING_MAX_STEP, Math.max(1, sanitizeOnboardingStep(onboardingStep)));
  return { initialRouteName: 'Onboarding', initialParams: { step } };
}

/** Clé stable pour éviter remount du stack quand onboarding passe à complete (sinon flash + animations reset). */
const APP_STACK_KEY = 'app-stack';

function AppStack({ decision, onboardingStatus, onboardingStep }) {
  const { initialRouteName, initialParams } = useMemo(
    () => getAppInitialRoute(decision, onboardingStatus, onboardingStep),
    [decision, onboardingStatus, onboardingStep]
  );

  return (
    <Stack.Navigator
      key={APP_STACK_KEY}
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
      <Stack.Screen name="RefineJob" component={withScreenEntrance(RefineJobScreen)} />
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

/** Mettre à false pour retirer les logs [RECOVERY_GUARD] en prod. */
const RECOVERY_DEBUG = true;
function logRecoveryGuard(msg, data) {
  if (RECOVERY_DEBUG && typeof console !== 'undefined' && console.log) {
    console.log('[RECOVERY_GUARD]', msg, data != null ? JSON.stringify(data) : '');
  }
}

export default function RootGate() {
  const { authStatus, manualLoginRequired, profileLoading, hasProfileRow, onboardingStatus, onboardingStep, bootReady } = useAuth();

  if (typeof window !== 'undefined' && isRecoveryFlow()) {
    const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
    if (path !== 'reset-password' && !path.endsWith('/reset-password')) {
      logRecoveryGuard('redirect_fallback', { pathname: path, file: 'RootGate.js' });
      const origin = window.location.origin || '';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      window.location.replace(origin + '/reset-password' + search + hash);
      return <LoadingGate />;
    }
    if (typeof console !== 'undefined' && console.log) {
      console.log('[RECOVERY_GUARD] on reset-password, hashPresent=', !!window.location.hash);
    }
    logRecoveryGuard('bypass', { pathname: path, reason: 'recovery_flow_reset_password' });
    return <AuthStack forceInitialRoute="ResetPassword" />;
  }

  const profileStatus = profileLoading ? 'loading' : 'ready';
  const onboarding_completed = onboardingStatus === 'complete';

  const decision = useMemo(() => {
    if (!bootReady || manualLoginRequired || authStatus !== 'signedIn') {
      return 'AuthStack';
    }
    if (profileStatus !== 'ready') {
      return 'Loader';
    }
    if (onboarding_completed) {
      return 'AppStackMain';
    }
    if (!hasProfileRow) {
      return 'OnboardingStart';
    }
    return 'OnboardingResume';
  }, [bootReady, authStatus, manualLoginRequired, profileStatus, hasProfileRow, onboarding_completed]);

  if (typeof window !== 'undefined' && window.location) {
    const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
    const hash = window.location.hash || '';
    logRecoveryGuard('decision', {
      pathname: path,
      hashPresent: hash.length > 0,
      hasAccessToken: hash.indexOf('access_token') !== -1,
      hasTypeRecovery: hash.indexOf('type=recovery') !== -1,
      decision,
      guard: decision === 'AuthStack' ? 'AuthStack' : decision === 'Loader' ? 'Loader' : 'AppStack(Onboarding/Main)',
    });
  }

  if (decision === 'AuthStack') {
    if (!bootReady) return <LoadingGate />;
    return <AuthStack />;
  }
  if (decision === 'Loader') {
    return <LoadingGate />;
  }
  return (
    <AppStack
      decision={decision}
      onboardingStatus={onboardingStatus}
      onboardingStep={onboardingStep}
    />
  );
}

const styles = StyleSheet.create({});
