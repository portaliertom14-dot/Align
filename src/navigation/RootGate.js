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

import React, { useMemo, useRef } from 'react';
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

// Wrapped screens au niveau module — références stables pour éviter démontage/remontage à chaque re-render de RootGate.
const WrappedWelcome = withScreenEntrance(WelcomeScreen);
const WrappedChoice = withScreenEntrance(ChoiceScreen);
const WrappedLogin = withScreenEntrance(LoginScreen);
const WrappedForgotPassword = withScreenEntrance(ForgotPasswordScreen);
const WrappedResetPassword = withScreenEntrance(ResetPasswordScreen);
const WrappedIntroQuestion = withScreenEntrance(IntroQuestionScreen);
const WrappedPreQuestions = withScreenEntrance(PreQuestionsScreen);
const WrappedOnboardingQuestions = withScreenEntrance(OnboardingQuestionsScreen);
const WrappedOnboardingInterlude = withScreenEntrance(OnboardingInterlude);
const WrappedOnboardingDob = withScreenEntrance(OnboardingDob);
const WrappedOnboardingFlow = withScreenEntrance(OnboardingFlow);
const WrappedOnboardingScreen = withScreenEntrance(OnboardingScreen);
const WrappedQuiz = withScreenEntrance(QuizScreen);
const WrappedResultat = withScreenEntrance(ResultatScreen);
const WrappedLoadingReveal = withScreenEntrance(LoadingRevealScreen);
const WrappedResultatSecteur = withScreenEntrance(ResultatSecteurScreen);
const WrappedInterludeSecteur = withScreenEntrance(InterludeSecteurScreen);
const WrappedRefineDroitTrack = withScreenEntrance(RefineDroitTrackScreen);
const WrappedQuizMetier = withScreenEntrance(QuizMetierScreen);
const WrappedPropositionMetier = withScreenEntrance(PropositionMetierScreen);
const WrappedResultJob = withScreenEntrance(ResultJobScreen);
const WrappedRefineJob = withScreenEntrance(RefineJobScreen);
const WrappedTonMetierDefini = withScreenEntrance(TonMetierDefiniScreen);
const WrappedCheckpointsValidation = withScreenEntrance(CheckpointsValidationScreen);
const WrappedCheckpoint1Intro = withScreenEntrance(Checkpoint1IntroScreen);
const WrappedCheckpoint1Question = withScreenEntrance(Checkpoint1QuestionScreen);
const WrappedCheckpoint2Intro = withScreenEntrance(Checkpoint2IntroScreen);
const WrappedCheckpoint2Question = withScreenEntrance(Checkpoint2QuestionScreen);
const WrappedCheckpoint3Intro = withScreenEntrance(Checkpoint3IntroScreen);
const WrappedCheckpoint3Question = withScreenEntrance(Checkpoint3QuestionScreen);
const WrappedFinCheckpoints = withScreenEntrance(FinCheckpointsScreen);
const WrappedChargementRoutine = withScreenEntrance(ChargementRoutineScreen);
const WrappedModule = withScreenEntrance(ModuleScreen);
const WrappedModuleCompletion = withScreenEntrance(ModuleCompletionScreen);
const WrappedQuestCompletion = withScreenEntrance(QuestCompletionScreen);
const WrappedChapterModules = withScreenEntrance(ChapterModulesScreen);
const WrappedSettings = withScreenEntrance(SettingsScreen);
const WrappedPrivacyPolicy = withScreenEntrance(PrivacyPolicyScreen);
const WrappedAbout = withScreenEntrance(AboutScreen);
const WrappedMainLayout = withScreenEntrance(MainLayout);

function getAuthInitialRoute(forceInitialRoute) {
  if (forceInitialRoute) return forceInitialRoute;
  return 'Welcome';
}

// ————— AuthStack : Welcome, Login, ForgotPassword, ResetPassword, Onboarding… —————
function AuthStack({ forceInitialRoute }) {
  const initialRoute = getAuthInitialRoute(forceInitialRoute);
  return (
    <Stack.Navigator screenOptions={screenOptions} initialRouteName={initialRoute}>
      <Stack.Screen name="Welcome" component={WrappedWelcome} />
      <Stack.Screen name="Invite" component={WrappedWelcome} options={{ headerShown: false }} />
      <Stack.Screen name="Choice" component={WrappedChoice} />
      <Stack.Screen name="Login" component={WrappedLogin} />
      <Stack.Screen name="ForgotPassword" component={WrappedForgotPassword} />
      <Stack.Screen name="ResetPassword" component={WrappedResetPassword} />
      <Stack.Screen name="IntroQuestion" component={WrappedIntroQuestion} />
      <Stack.Screen name="PreQuestions" component={WrappedPreQuestions} />
      <Stack.Screen name="OnboardingQuestions" component={WrappedOnboardingQuestions} />
      <Stack.Screen name="OnboardingInterlude" component={WrappedOnboardingInterlude} />
      <Stack.Screen name="OnboardingDob" component={WrappedOnboardingDob} />
      <Stack.Screen name="Onboarding" component={WrappedOnboardingFlow} />
      <Stack.Screen name="Quiz" component={WrappedQuiz} />
      <Stack.Screen name="LoadingReveal" component={WrappedLoadingReveal} />
      <Stack.Screen name="ResultatSecteur" component={WrappedResultatSecteur} />
      <Stack.Screen name="InterludeSecteur" component={WrappedInterludeSecteur} />
      <Stack.Screen name="QuizMetier" component={WrappedQuizMetier} />
      <Stack.Screen name="PropositionMetier" component={WrappedPropositionMetier} />
      <Stack.Screen name="ResultJob" component={WrappedResultJob} />
      <Stack.Screen name="RefineJob" component={WrappedRefineJob} />
      <Stack.Screen name="TonMetierDefini" component={WrappedTonMetierDefini} />
      <Stack.Screen name="CheckpointsValidation" component={WrappedCheckpointsValidation} />
      <Stack.Screen name="Checkpoint1Intro" component={WrappedCheckpoint1Intro} />
      <Stack.Screen name="Checkpoint1Question" component={WrappedCheckpoint1Question} />
      <Stack.Screen name="Checkpoint2Intro" component={WrappedCheckpoint2Intro} />
      <Stack.Screen name="Checkpoint2Question" component={WrappedCheckpoint2Question} />
      <Stack.Screen name="Checkpoint3Intro" component={WrappedCheckpoint3Intro} />
      <Stack.Screen name="Checkpoint3Question" component={WrappedCheckpoint3Question} />
      <Stack.Screen name="FinCheckpoints" component={WrappedFinCheckpoints} />
      <Stack.Screen name="ChargementRoutine" component={WrappedChargementRoutine} />
      <Stack.Screen name="Module" component={WrappedModule} />
      <Stack.Screen name="ModuleCompletion" component={WrappedModuleCompletion} />
      <Stack.Screen name="QuestCompletion" component={WrappedQuestCompletion} />
      <Stack.Screen name="ChapterModules" component={WrappedChapterModules} />
      <Stack.Screen name="Settings" component={WrappedSettings} />
      <Stack.Screen name="PrivacyPolicy" component={WrappedPrivacyPolicy} />
      <Stack.Screen name="About" component={WrappedAbout} />
      <Stack.Screen name="Main" component={WrappedMainLayout} />
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
      <Stack.Screen name="OnboardingQuestions" component={WrappedOnboardingQuestions} />
      <Stack.Screen name="OnboardingInterlude" component={WrappedOnboardingInterlude} />
      <Stack.Screen name="OnboardingDob" component={WrappedOnboardingDob} />
      <Stack.Screen name="Onboarding" component={WrappedOnboardingFlow} />
      <Stack.Screen name="OnboardingOld" component={WrappedOnboardingScreen} />
      <Stack.Screen name="Quiz" component={WrappedQuiz} />
      <Stack.Screen name="Main" component={WrappedMainLayout} />
      <Stack.Screen name="Resultat" component={WrappedResultat} />
      <Stack.Screen name="LoadingReveal" component={WrappedLoadingReveal} />
      <Stack.Screen name="ResultatSecteur" component={WrappedResultatSecteur} />
      <Stack.Screen name="InterludeSecteur" component={WrappedInterludeSecteur} />
      <Stack.Screen name="RefineDroitTrack" component={WrappedRefineDroitTrack} />
      <Stack.Screen name="QuizMetier" component={WrappedQuizMetier} />
      <Stack.Screen name="PropositionMetier" component={WrappedPropositionMetier} />
      <Stack.Screen name="ResultJob" component={WrappedResultJob} />
      <Stack.Screen name="RefineJob" component={WrappedRefineJob} />
      <Stack.Screen name="TonMetierDefini" component={WrappedTonMetierDefini} />
      <Stack.Screen name="CheckpointsValidation" component={WrappedCheckpointsValidation} />
      <Stack.Screen name="Checkpoint1Intro" component={WrappedCheckpoint1Intro} />
      <Stack.Screen name="Checkpoint1Question" component={WrappedCheckpoint1Question} />
      <Stack.Screen name="Checkpoint2Intro" component={WrappedCheckpoint2Intro} />
      <Stack.Screen name="Checkpoint2Question" component={WrappedCheckpoint2Question} />
      <Stack.Screen name="Checkpoint3Intro" component={WrappedCheckpoint3Intro} />
      <Stack.Screen name="Checkpoint3Question" component={WrappedCheckpoint3Question} />
      <Stack.Screen name="FinCheckpoints" component={WrappedFinCheckpoints} />
      <Stack.Screen name="ChargementRoutine" component={WrappedChargementRoutine} />
      <Stack.Screen name="Module" component={WrappedModule} />
      <Stack.Screen name="ModuleCompletion" component={WrappedModuleCompletion} />
      <Stack.Screen name="QuestCompletion" component={WrappedQuestCompletion} />
      <Stack.Screen name="ChapterModules" component={WrappedChapterModules} />
      <Stack.Screen name="Settings" component={WrappedSettings} />
      <Stack.Screen name="PrivacyPolicy" component={WrappedPrivacyPolicy} />
      <Stack.Screen name="About" component={WrappedAbout} />
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
  const { authStatus, authOrigin, manualLoginRequired, profileLoading, hasProfileRow, onboardingStatus, onboardingStep, bootReady, recoveryMode } = useAuth();

  const isRecoveryMount = useRef(null);
  if (isRecoveryMount.current === null) {
    isRecoveryMount.current = (
      recoveryMode ||
      (typeof window !== 'undefined' && isRecoveryFlow() &&
        (window.location.pathname || '').indexOf('reset-password') !== -1)
    );
  }
  if (isRecoveryMount.current) {
    if (__DEV__ && typeof console !== 'undefined' && console.log) {
      console.log('[RECOVERY_GUARD] bypass — stable mount, no re-render');
    }
    logRecoveryGuard('bypass', { reason: 'recovery_flow_reset_password' });
    return <AuthStack forceInitialRoute="ResetPassword" />;
  }

  // Recovery flow mais pas encore sur /reset-password → redirection une fois.
  if (typeof window !== 'undefined' && isRecoveryFlow()) {
    const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
    const alreadyOnReset = path === 'reset-password' || path.endsWith('/reset-password') || (window.location.href || '').indexOf('reset-password') !== -1;
    if (!alreadyOnReset) {
      if (typeof console !== 'undefined' && console.log) {
        console.log('[ROOT_GATE]', JSON.stringify({ stack: 'LoadingGate', reason: 'redirect_fallback', pathname: path }));
      }
      logRecoveryGuard('redirect_fallback', { pathname: path, file: 'RootGate.js' });
      const origin = window.location.origin || '';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      window.location.replace(origin + '/reset-password' + search + hash);
      return <LoadingGate />;
    }
  }

  const profileStatus = profileLoading ? 'loading' : 'ready';
  const onboarding_completed = onboardingStatus === 'complete';

  const decision = useMemo(() => {
    let out = 'AuthStack';
    if (!bootReady || manualLoginRequired || authStatus !== 'signedIn') {
      out = 'AuthStack';
    } else if (authOrigin === 'signup') {
      // Création de compte → Onboarding. Toujours. Aucune exception.
      out = 'OnboardingStart';
    } else if (authOrigin === 'login') {
      // Connexion classique → Accueil.
      out = 'AppStackMain';
    } else if (profileStatus !== 'ready') {
      out = 'Loader';
    } else if (onboarding_completed || hasProfileRow) {
      out = 'AppStackMain';
    } else {
      out = 'OnboardingStart';
    }
    return out;
  }, [bootReady, authStatus, authOrigin, manualLoginRequired, profileStatus, hasProfileRow, onboarding_completed, onboardingStatus]);

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
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ROOT_GATE]', JSON.stringify({ stack: !bootReady ? 'LoadingGate' : 'AuthStack', reason: 'decision', decision, bootReady }));
    }
    if (!bootReady) return <LoadingGate />;
    return <AuthStack />;
  }
  if (decision === 'Loader') {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[ROOT_GATE]', JSON.stringify({ stack: 'Loader', reason: 'decision', decision }));
    }
    return <LoadingGate />;
  }
  if (typeof console !== 'undefined' && console.log) {
    console.log('[ROOT_GATE]', JSON.stringify({ stack: 'AppStack', reason: 'decision', decision }));
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
