/**
 * DEPRECATED: Cet algorithme est remplacé par way (IA)
 * 
 * ⚠️ CONSERVÉ UNIQUEMENT POUR COMPATIBILITÉ TEMPORAIRE
 * 
 * NE PLUS UTILISER : Utiliser wayProposeMetiers() depuis way.js à la place
 */

// wayMock — remplacé plus tard par wayAI (OpenAI)
import { wayProposeMetiers } from '../services/wayMock';
import { updateUserProgress, getUserProgress } from './userProgress';

/**
 * Liste des métiers possibles par secteur (conservé pour référence mais way peut proposer d'autres métiers)
 * way n'est PAS limité à cette liste
 */
export const METIERS_BY_SECTOR = {
  droit_argumentation: [
    { id: 'avocat', name: 'Avocat', description: 'Défendre et conseiller des clients en matière juridique' },
    { id: 'juriste', name: 'Juriste d\'entreprise', description: 'Conseiller une entreprise sur les aspects juridiques' },
    { id: 'notaire', name: 'Notaire', description: 'Authentifier des actes et conseiller sur le patrimoine' },
    { id: 'magistrat', name: 'Magistrat', description: 'Rendre la justice au nom de l\'État' },
  ],
  arts_communication: [
    { id: 'graphiste', name: 'Graphiste / Designer', description: 'Créer des visuels et identités de marque' },
    { id: 'redacteur', name: 'Rédacteur / Copywriter', description: 'Écrire des contenus pour communiquer' },
    { id: 'webdesigner', name: 'Web Designer', description: 'Créer des interfaces web et expériences utilisateur' },
    { id: 'photographe', name: 'Photographe', description: 'Créer des images artistiques ou commerciales' },
  ],
  commerce_entrepreneuriat: [
    { id: 'commercial', name: 'Commercial / Business Developer', description: 'Vendre et développer un portefeuille clients' },
    { id: 'entrepreneur', name: 'Entrepreneur / Fondateur', description: 'Créer et développer sa propre entreprise' },
    { id: 'product_manager', name: 'Product Manager', description: 'Développer des produits qui répondent aux besoins du marché' },
    { id: 'marketing', name: 'Responsable Marketing', description: 'Promouvoir et développer une marque ou un produit' },
  ],
  sciences_technologies: [
    { id: 'developpeur', name: 'Développeur / Ingénieur Logiciel', description: 'Créer des applications et systèmes informatiques' },
    { id: 'data_scientist', name: 'Data Scientist', description: 'Analyser des données pour en extraire des insights' },
    { id: 'ingenieur', name: 'Ingénieur', description: 'Résoudre des problèmes techniques complexes' },
    { id: 'cybersecurity', name: 'Expert Cybersécurité', description: 'Protéger les systèmes informatiques' },
  ],
  sciences_humaines_sociales: [
    { id: 'psychologue', name: 'Psychologue', description: 'Comprendre et accompagner les personnes' },
    { id: 'sociologue', name: 'Sociologue', description: 'Analyser les comportements et phénomènes sociaux' },
    { id: 'coach', name: 'Coach / Consultant', description: 'Accompagner des personnes ou organisations' },
    { id: 'enseignant', name: 'Enseignant / Formateur', description: 'Transmettre des connaissances' },
  ],
  // way peut proposer d'autres métiers non listés ici
};

/**
 * Calcule le métier dominant en utilisant way (IA)
 * @param {Object} answers - Réponses { questionId: option }
 * @param {Array} questions - Liste des questions du quiz métier
 * @param {String} secteurId - Secteur déterminé précédemment par way
 * @returns {Object} { metierId, metierName, description, why, métiers[] }
 */
export async function calculateMetierFromAnswers(answers, questions, secteurId) {
  // Sauvegarder les réponses dans userProgress pour way
  await updateUserProgress({ metierQuizAnswers: answers });
  
  // Récupérer le nom du secteur pour way
  const progress = await getUserProgress();
  const secteurNom = progress.activeDirection || secteurId;
  
  // Utiliser way pour déterminer UN SEUL métier
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'metierAlgorithm.js:67',message:'BEFORE wayProposeMetiers call',data:{secteurId,secteurNom},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    const wayResult = await wayProposeMetiers(secteurId, secteurNom);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'metierAlgorithm.js:70',message:'AFTER wayProposeMetiers call',data:{wayResultId:wayResult?.id,wayResultNom:wayResult?.nom,wayResultKeys:Object.keys(wayResult||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    // way retourne UN SEUL métier (format strict)
    const result = {
      metierId: wayResult.id,
      metierName: wayResult.nom,
      description: `${wayResult.nom} dans le secteur ${secteurNom}`,
      why: wayResult.resume,
      secteurId,
      métiers: [{
        id: wayResult.id,
        nom: wayResult.nom,
        justification: wayResult.resume, // Format attendu par l'UI
      }], // Format compatible avec l'UI (array avec un seul métier)
      score: wayResult.score,
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'metierAlgorithm.js:81',message:'calculateMetierFromAnswers RETURN',data:{metierId:result.metierId,metiersCount:result.métiers?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return result;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'metierAlgorithm.js:89',message:'ERROR in calculateMetierFromAnswers - THROWING',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de l\'appel à way:', error);
    
    // NE PAS utiliser de fallback - propager l'erreur pour que l'UI affiche un message d'erreur
    throw error;
  }
}

/**
 * Génère une explication "pourquoi ce métier" (déprécié - way le fait maintenant)
 */
export function generateMetierWhy(metier, secteurId, traitDominant) {
  // Conservé pour compatibilité mais way fournit déjà les justifications
  return 'Way a analysé ton profil pour te proposer ce métier.';
}






