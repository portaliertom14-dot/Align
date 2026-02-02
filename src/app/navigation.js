import React, { useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import des layouts et écrans
import MainLayout from '../layouts/MainLayout';
import WelcomeScreen from '../screens/Welcome';
import ChoiceScreen from '../screens/Choice';
import LoginScreen from '../screens/Auth/LoginScreen';
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
  const navigationRef = useRef(null);
  const hasNavigatedRef = useRef(false);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Forcer Welcome une fois le container prêt (évite double reset)
        if (navigationRef.current && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: 'Welcome' }],
          });
        }
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName="Welcome"
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
          name="Login" 
          component={LoginScreen} 
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
        <Stack.Screen 
          name="TonMetierDefini" 
          component={TonMetierDefiniScreen} 
        />
        <Stack.Screen 
          name="CheckpointsValidation" 
          component={CheckpointsValidationScreen} 
        />
        <Stack.Screen name="Checkpoint1Intro" component={Checkpoint1IntroScreen} />
        <Stack.Screen name="Checkpoint1Question" component={Checkpoint1QuestionScreen} />
        <Stack.Screen name="Checkpoint2Intro" component={Checkpoint2IntroScreen} />
        <Stack.Screen name="Checkpoint2Question" component={Checkpoint2QuestionScreen} />
        <Stack.Screen name="Checkpoint3Intro" component={Checkpoint3IntroScreen} />
        <Stack.Screen name="Checkpoint3Question" component={Checkpoint3QuestionScreen} />
        <Stack.Screen name="FinCheckpoints" component={FinCheckpointsScreen} />
        <Stack.Screen name="ChargementRoutine" component={ChargementRoutineScreen} />
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
