import React, { createContext, useContext, useState } from 'react';

/**
 * Context pour gérer l'état du quiz Align
 */
const QuizContext = createContext();

export const useQuiz = () => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error('useQuiz must be used within QuizProvider');
  }
  return context;
};

/**
 * Provider du Quiz
 * Gère les réponses et l'état du quiz
 */
export function QuizProvider({ children }) {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  /**
   * Enregistre une réponse
   */
  const saveAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  /**
   * Récupère la réponse pour une question
   */
  const getAnswer = (questionId) => {
    return answers[questionId] || null;
  };

  /**
   * Réinitialise le quiz
   */
  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  /**
   * Vérifie si toutes les questions sont répondues
   */
  const isComplete = (totalQuestions) => {
    return Object.keys(answers).length === totalQuestions;
  };

  const value = {
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    resetQuiz,
    isComplete,
  };

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}













