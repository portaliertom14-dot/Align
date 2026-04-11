import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import OnboardingQuestionScreen from '../../components/OnboardingQuestionScreen';
import {
  ONBOARDING_QUESTIONS,
  EXPLANATORY_TEXTS,
  TOTAL_STEPS,
  ONBOARDING_TOTAL_STEPS,
} from '../../data/onboardingQuestions';
import { saveDraft, loadDraft } from '../../lib/onboardingDraftStore';

const DRAFT_KEYS_BY_INDEX = ['futureFeeling', 'schoolLevel', 'hasIdeas', 'clarifyGoal', 'discoverySource', 'openReason'];

function answersToDraft(answers) {
  const partial = {};
  answers.forEach((value, i) => {
    if (DRAFT_KEYS_BY_INDEX[i]) partial[DRAFT_KEYS_BY_INDEX[i]] = value;
  });
  return partial;
}

/** Délai (ms) entre clic sur une réponse et avancement vers la question suivante (flash border + micro-feedback). */
const FLASH_DELAY_MS = 0;

/**
 * Flux des 6 questions onboarding Align
 * Barre de progression sur 6 étapes (l'interlude n'est pas compté)
 * resetSeed : quand fourni (ex. depuis PreQuestions), force currentStep=1 et selectedChoice=null au montage.
 * onExitFirstStep : appelé depuis le bouton retour quand on est à la question 1 (sortie vers l’écran précédent du stack).
 * ref.goBack() : recule d’une question dans le flux, ou déclenche onExitFirstStep si déjà à la question 1.
 */
const OnboardingQuestionsFlow = forwardRef(function OnboardingQuestionsFlow(
  { onComplete, resetSeed = null, onExitFirstStep },
  ref
) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (resetSeed != null) {
      setCurrentStep(1);
      setSelectedChoice(null);
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const draft = await loadDraft();
      if (cancelled) return;
      const restored = [];
      DRAFT_KEYS_BY_INDEX.forEach((key) => {
        if (draft[key]) restored.push(draft[key]);
      });
      if (restored.length > 0) {
        setAnswers(restored);
        setCurrentStep(restored.length >= TOTAL_STEPS ? TOTAL_STEPS : restored.length + 1);
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [resetSeed]);

  const stepData = ONBOARDING_QUESTIONS[currentStep - 1];
  const subtitle = stepData
    ? EXPLANATORY_TEXTS[stepData.explanatoryVariant]
    : '';

  const selectedForStep = selectedChoice ?? null;

  const handleSelect = (choice) => {
    setSelectedChoice(choice);
  };

  const handleNext = (choiceOverride) => {
    const choice = choiceOverride ?? selectedForStep;
    if (!choice) return;
    const newAnswers = [...answers.slice(0, currentStep - 1), choice];
    setAnswers(newAnswers);
    setSelectedChoice(null);
    saveDraft(answersToDraft(newAnswers));

    if (currentStep >= TOTAL_STEPS) {
      saveDraft({ ...answersToDraft(newAnswers), completedAt: new Date().toISOString() });
      onComplete(newAnswers);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  /** @returns {boolean} true si le retour a été géré (ne pas laisser le handler système continuer) */
  const goBack = useCallback(() => {
    if (!hydrated) return false;
    if (currentStep <= 1) {
      onExitFirstStep?.();
      return true;
    }
    const targetStep = currentStep - 1;
    const prevAnswer = answers[targetStep - 1];
    const trimmed = answers.slice(0, targetStep - 1);
    setCurrentStep(targetStep);
    setAnswers(trimmed);
    setSelectedChoice(prevAnswer ?? null);
    if (targetStep === 1 && prevAnswer != null) {
      saveDraft(answersToDraft([prevAnswer]));
    } else {
      saveDraft(answersToDraft(trimmed));
    }
    return true;
  }, [hydrated, currentStep, answers, onExitFirstStep]);

  useImperativeHandle(ref, () => ({ goBack }), [goBack]);

  if (!hydrated || !stepData) return null;

  return (
    <OnboardingQuestionScreen
      progress={currentStep / ONBOARDING_TOTAL_STEPS}
      stepIndex={currentStep}
      totalSteps={TOTAL_STEPS}
      title={stepData.question}
      subtitle={subtitle}
      choices={stepData.answers}
      selectedChoice={selectedForStep}
      onSelect={handleSelect}
      onNext={handleNext}
      flashDelayMs={FLASH_DELAY_MS}
    />
  );
});

export default OnboardingQuestionsFlow;
