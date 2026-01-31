import React, { useState } from 'react';
import OnboardingQuestionScreen from '../../components/OnboardingQuestionScreen';
import {
  ONBOARDING_QUESTIONS,
  EXPLANATORY_TEXTS,
  TOTAL_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from '../../data/onboardingQuestions';

/**
 * Flux des 6 questions onboarding Align
 * Barre de progression sur 7 étapes (6 questions + 1 écran birthdate ; l'interlude n'est pas compté)
 */
export default function OnboardingQuestionsFlow({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState([]);

  const stepData = ONBOARDING_QUESTIONS[currentStep - 1];
  const subtitle = stepData
    ? EXPLANATORY_TEXTS[stepData.explanatoryVariant]
    : '';

  const handleSelect = (choice) => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);

    if (currentStep >= TOTAL_STEPS) {
      onComplete(newAnswers);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  if (!stepData) return null;

  return (
    <OnboardingQuestionScreen
      progress={currentStep / ONBOARDING_TOTAL_STEPS}
      title={stepData.question}
      subtitle={subtitle}
      choices={stepData.answers}
      onSelect={handleSelect}
    />
  );
}
