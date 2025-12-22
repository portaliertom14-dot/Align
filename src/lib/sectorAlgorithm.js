/**
 * DEPRECATED: Cet algorithme est remplacé par way (IA)
 * 
 * ⚠️ CONSERVÉ UNIQUEMENT POUR COMPATIBILITÉ TEMPORAIRE
 * 
 * NE PLUS UTILISER : Utiliser wayDetermineSecteur() depuis way.js à la place
 */

// wayMock — remplacé plus tard par wayAI (OpenAI)
import { wayDetermineSecteur } from '../services/wayMock';
import { updateUserProgress } from './userProgress';

/**
 * Mapping des secteurs vers les noms affichés (conservé pour compatibilité)
 */
export const SECTOR_NAMES = {
  droit_argumentation: 'Droit & Argumentation',
  arts_communication: 'Arts & Communication',
  commerce_entrepreneuriat: 'Commerce & Entrepreneuriat',
  sciences_technologies: 'Sciences & Technologies',
  sciences_humaines_sociales: 'Sciences Humaines & Sociales',
  // Secteurs supplémentaires supportés par way
  tech: 'Tech',
  santé: 'Santé',
  droit: 'Droit',
  ingénierie: 'Ingénierie',
  recherche: 'Recherche',
  business: 'Business',
  création: 'Création',
  finance: 'Finance',
  sciences_humaines: 'Sciences Humaines',
  design: 'Design',
  communication: 'Communication',
  architecture: 'Architecture',
  enseignement: 'Enseignement',
};

/**
 * Calcule le secteur dominant en utilisant way (IA)
 * @param {Object} answers - Réponses { questionId: option }
 * @param {Array} questions - Liste des questions du quiz secteur
 * @returns {Object} { secteurId, secteurName, explanation }
 */
export async function calculateSectorFromAnswers(answers, questions) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sectorAlgorithm.js:43',message:'calculateSectorFromAnswers ENTRY',data:{answersCount:Object.keys(answers||{}).length,answersKeys:Object.keys(answers||{}).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  // Sauvegarder les réponses dans userProgress pour way
  await updateUserProgress({ quizAnswers: answers });
  
  // Utiliser way pour déterminer le secteur
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sectorAlgorithm.js:49',message:'BEFORE wayDetermineSecteur call',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const wayResult = await wayDetermineSecteur();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sectorAlgorithm.js:52',message:'AFTER wayDetermineSecteur call',data:{secteurId:wayResult?.secteurId,secteur:wayResult?.secteur,score:wayResult?.score},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    const result = {
      secteurId: wayResult.secteurId,
      secteurName: wayResult.secteur || SECTOR_NAMES[wayResult.secteurId] || wayResult.secteur,
      explanation: wayResult.resume || 'Way a analysé ton profil pour déterminer ce secteur.',
      confiance: wayResult.score ? wayResult.score / 100 : 0.8, // Convertir score 0-100 en confiance 0-1
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sectorAlgorithm.js:59',message:'calculateSectorFromAnswers RETURN',data:{secteurId:result.secteurId,secteurName:result.secteurName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sectorAlgorithm.js:70',message:'ERROR in calculateSectorFromAnswers - THROWING',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
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






