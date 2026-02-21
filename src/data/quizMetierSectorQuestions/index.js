/**
 * Export des 8 questions métier par secteur (spécifiques au secteur verrouillé).
 * Utilisé après les 12 questions communes pour départager les jobs dans le secteur.
 */

import quizMetierSectorQuestionsIngenierieTech from './ingenierie_tech.js';
import quizMetierSectorQuestionsCreationDesign from './creation_design.js';
import quizMetierSectorQuestionsEnvironnementAgri from './environnement_agri.js';

export const quizMetierSectorQuestionsBySector = {
  ingenierie_tech: quizMetierSectorQuestionsIngenierieTech,
  creation_design: quizMetierSectorQuestionsCreationDesign,
  environnement_agri: quizMetierSectorQuestionsEnvironnementAgri,
};

export function getQuizMetierSectorQuestions(sectorId) {
  return quizMetierSectorQuestionsBySector[sectorId] ?? null;
}

export default quizMetierSectorQuestionsBySector;
