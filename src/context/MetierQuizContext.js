import React, { createContext, useContext, useState } from 'react';

/**
 * Context pour gérer l'état du quiz métier
 */
const MetierQuizContext = createContext();

export const useMetierQuiz = () => {
  const context = useContext(MetierQuizContext);
  if (!context) {
    throw new Error('useMetierQuiz must be used within MetierQuizProvider');
  }
  return context;
};

/**
 * Provider du Quiz Métier
 * Gère les réponses et l'état du quiz métier
 */
export function MetierQuizProvider({ children }) {
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizQuestions, setQuizQuestions] = useState(null);

  const saveAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const getAnswer = (questionId) => {
    return answers[questionId] || null;
  };

  const resetQuiz = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  const value = {
    answers,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    saveAnswer,
    getAnswer,
    resetQuiz,
    quizQuestions,
    setQuizQuestions,
  };

  return <MetierQuizContext.Provider value={value}>{children}</MetierQuizContext.Provider>;
}







