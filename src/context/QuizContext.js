import React, { createContext, useContext, useState } from 'react';

/**
 * Context pour gérer l'état du quiz Align (40 questions secteur + mode affinement micro-questions).
 */
const QuizContext = createContext();

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within QuizProvider');
  }
  return context;
};

/** Phases du quiz : main = 40 questions, refinement_intro = overlay "On affine ton profil", refinement_quiz = micro-questions */
const QUIZ_PHASE_MAIN = 'main';
const QUIZ_PHASE_REFINEMENT_INTRO = 'refinement_intro';
const QUIZ_PHASE_REFINEMENT_QUIZ = 'refinement_quiz';

export const QUIZ_PHASES = {
  MAIN: QUIZ_PHASE_MAIN,
  REFINEMENT_INTRO: QUIZ_PHASE_REFINEMENT_INTRO,
  REFINEMENT_QUIZ: QUIZ_PHASE_REFINEMENT_QUIZ,
};

/**
 * Provider du Quiz
 * Gère les réponses, l'index courant, et le mode affinement (microQuestions, microAnswers, sectorRanked).
 */
export function QuizProvider({ children }) {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState(QUIZ_PHASE_MAIN);
  const [microQuestions, setMicroQuestions] = useState([]);
  const [microAnswers, setMicroAnswers] = useState({});
  const [sectorRanked, setSectorRanked] = useState([]);
  const [currentMicroIndex, setCurrentMicroIndex] = useState(0);
  /** Nombre de tours d'affinement déjà effectués (0 = premier analyse, 1+ = après micro-questions). Envoyé au backend pour forcer un secteur après 5 tours. */
  const [refinementRoundCount, setRefinementRoundCount] = useState(0);

  const saveAnswer = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const getAnswer = (questionId) => {
    return answers[questionId] ?? null;
  };

  const saveMicroAnswer = (questionId, answer) => {
    const label = typeof answer === 'string' ? answer : (answer?.label ?? answer?.value ?? '');
    setMicroAnswers((prev) => ({ ...prev, [questionId]: label }));
  };

  const getMicroAnswer = (questionId) => {
    return microAnswers[questionId] ?? null;
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setQuizPhase(QUIZ_PHASE_MAIN);
    setMicroQuestions([]);
    setMicroAnswers({});
    setSectorRanked([]);
    setCurrentMicroIndex(0);
    setRefinementRoundCount(0);
  };

  const enterRefinementMode = (ranked, questions) => {
    setSectorRanked(Array.isArray(ranked) ? ranked : []);
    setMicroQuestions(Array.isArray(questions) ? questions : []);
    setMicroAnswers({});
    setCurrentMicroIndex(0);
    setQuizPhase(QUIZ_PHASE_REFINEMENT_INTRO);
  };

  const incrementRefinementRoundCount = () => {
    setRefinementRoundCount((prev) => Math.min(10, prev + 1));
  };

  const startRefinementQuiz = () => {
    setQuizPhase(QUIZ_PHASE_REFINEMENT_QUIZ);
    setCurrentMicroIndex(0);
  };

  const isComplete = (totalQuestions) => {
    return Object.keys(answers).length >= totalQuestions;
  };

  const value = {
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    resetQuiz,
    isComplete,
    quizPhase,
    setQuizPhase,
    microQuestions,
    microAnswers,
    saveMicroAnswer,
    getMicroAnswer,
    sectorRanked,
    currentMicroIndex,
    setCurrentMicroIndex,
    enterRefinementMode,
    startRefinementQuiz,
    refinementRoundCount,
    incrementRefinementRoundCount,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}













