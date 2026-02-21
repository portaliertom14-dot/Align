/**
 * DEPRECATED: Cet algorithme est remplacé par way (IA)
 * 
 * ⚠️ CONSERVÉ UNIQUEMENT POUR COMPATIBILITÉ TEMPORAIRE
 * 
 * NE PLUS UTILISER : Utiliser wayDetermineSecteur() depuis way.js à la place
 */

// way — IA OpenAI (réactivée)
import { wayDetermineSecteur } from '../services/way';
import { updateUserProgress } from './userProgress';

/** Liste officielle Align — 16 secteurs (noms affichés) */
export const SECTOR_NAMES = {
  ingenierie_tech: 'Ingénierie & Tech',
  data_ia: 'Data & IA',
  creation_design: 'Création & Design',
  communication_medias: 'Communication & Médias',
  business_entrepreneuriat: 'Business & Entrepreneuriat',
  finance_audit: 'Finance & Audit',
  droit_justice: 'Droit & Justice',
  defense_securite: 'Défense & Sécurité',
  sante_medical: 'Santé & Médical',
  sciences_recherche: 'Sciences & Recherche',
  education_transmission: 'Éducation & Transmission',
  architecture_urbanisme: 'Architecture & Urbanisme',
  industrie_production: 'Industrie & Production',
  sport_performance: 'Sport & Performance',
  social_accompagnement: 'Social & Accompagnement',
  environnement_energie: 'Environnement & Énergie',
};

/**
 * Calcule le secteur dominant en utilisant way (IA)
 * @param {Object} answers - Réponses { questionId: option }
 * @param {Array} questions - Liste des questions du quiz secteur
 * @returns {Object} { secteurId, secteurName, explanation }
 */
export async function calculateSectorFromAnswers(answers, questions) {
  // Sauvegarder les réponses dans userProgress pour way
  await updateUserProgress({ quizAnswers: answers });
  
  // Utiliser way pour déterminer le secteur
  try {
    const wayResult = await wayDetermineSecteur();
    
    const result = {
      secteurId: wayResult.secteurId,
      secteurName: wayResult.secteur || SECTOR_NAMES[wayResult.secteurId] || wayResult.secteur,
      explanation: wayResult.resume || 'Way a analysé ton profil pour déterminer ce secteur.',
      confiance: wayResult.score ? wayResult.score / 100 : 0.8, // Convertir score 0-100 en confiance 0-1
    };
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'appel à way:', error);
    
    // NE PAS utiliser de fallback - propager l'erreur pour que l'UI affiche un message d'erreur
    throw error;
  }
}

/**
 * Génère une explication de secteur (déprécié - way le fait maintenant)
 */
export function generateSectorExplanation(sectorId) {
  // Conservé pour compatibilité mais way fournit déjà les justifications
  return 'Way a analysé ton profil pour déterminer ce secteur.';
}






