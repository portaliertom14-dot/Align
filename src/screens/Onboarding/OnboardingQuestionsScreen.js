import React from 'react';
import { useNavigation } from '@react-navigation/native';
import OnboardingQuestionsFlow from './OnboardingQuestionsFlow';

/**
 * Écran des 6 questions onboarding (affiché après "C'EST PARTI !")
 * À la fin des 6 réponses, redirige vers OnboardingInterlude ("Ça tombe bien...")
 */
export default function OnboardingQuestionsScreen() {
  const navigation = useNavigation();

  const handleComplete = (answers) => {
    // TODO: persister answers (userProfile / Supabase) si besoin
    console.log('[OnboardingQuestions] Réponses:', answers);
    navigation.navigate('OnboardingInterlude');
  };

  return <OnboardingQuestionsFlow onComplete={handleComplete} />;
}
