/**
 * Questions du Quiz Align - QUIZ SECTEUR
 * Utilise les 40 questions officielles
 */

import { quizSecteurQuestions } from './quizSecteurQuestions';

// Adapter la structure pour compatibilité avec l'écran Quiz
// L'écran attend: { id, texte, options }
// Les questions officielles ont: { id, question, options }
export const questions = quizSecteurQuestions.map((q) => ({
  id: q.id,
  texte: q.question, // Adapter "question" en "texte"
  options: q.options,
  section: q.section,
  sectionTitle: q.sectionTitle,
}));

export const TOTAL_QUESTIONS = questions.length;








