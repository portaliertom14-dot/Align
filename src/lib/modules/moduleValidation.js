/**
 * Validation IA des réponses utilisateur aux modules
 * Analyse la qualité, pertinence et effort de la réponse
 * 
 * DÉLÉGUÉ À way (IA) pour une validation intelligente
 * 
 * IMPORTANT: Utiliser validateAnswerDetailed() qui appelle way en priorité
 */

/**
 * Critères de validation pour différents types de modules
 */
const VALIDATION_CRITERIA = {
  test: {
    minLength: 50, // caractères minimum
    requiredKeywords: 2, // mots-clés pertinents minimum
    minSentences: 3,
  },
  defi: {
    minLength: 80,
    requiredKeywords: 3,
    minSentences: 5,
  },
  analyse: {
    minLength: 120,
    requiredKeywords: 4,
    minSentences: 8,
  },
  mission: {
    minLength: 100,
    requiredKeywords: 3,
    minSentences: 6,
  },
  projet: {
    minLength: 150,
    requiredKeywords: 5,
    minSentences: 10,
  },
  choix: {
    minLength: 70,
    requiredKeywords: 2,
    minSentences: 4,
  },
};

/**
 * Mots-clés pertinents par secteur (pour validation basique)
 */
const KEYWORDS_BY_SECTEUR = {
  droit_argumentation: ['loi', 'juridique', 'droit', 'contrat', 'cas', 'procédure', 'argument', 'défense', 'jurisprudence'],
  sciences_technologies: ['technique', 'système', 'solution', 'algorithme', 'code', 'logiciel', 'technologie', 'développement', 'optimisation'],
  arts_communication: ['créatif', 'message', 'communication', 'design', 'visuel', 'concept', 'publicité', 'marque', 'identité'],
  commerce_entrepreneuriat: ['client', 'business', 'marché', 'vente', 'stratégie', 'projet', 'entreprise', 'commercial', 'développement'],
  sciences_humaines_sociales: ['personne', 'relation', 'social', 'comportement', 'psychologie', 'accompagnement', 'écoute', 'compréhension'],
};

/**
 * Calcule un score de qualité pour une réponse
 * @param {string} answer - Réponse de l'utilisateur
 * @param {Object} module - Module auquel répondre
 * @param {string} secteur - Secteur de l'utilisateur
 */
export function validateAnswer(answer, module, secteur) {
  if (!answer || typeof answer !== 'string') {
    return {
      isValid: false,
      score: 0,
      feedback: 'Ta réponse est vide. Réfléchis et exprime-toi !',
    };
  }

  const trimmedAnswer = answer.trim();
  const criteria = VALIDATION_CRITERIA[module.type] || VALIDATION_CRITERIA.test;
  const keywords = KEYWORDS_BY_SECTEUR[secteur] || [];

  // Vérifications de base
  const lengthCheck = trimmedAnswer.length >= criteria.minLength;
  const sentenceCount = (trimmedAnswer.match(/[.!?]+\s/g) || []).length + 1;
  const sentenceCheck = sentenceCount >= criteria.minSentences;

  // Vérification des mots-clés (au moins certains mots pertinents)
  const answerLower = trimmedAnswer.toLowerCase();
  const foundKeywords = keywords.filter(keyword => 
    answerLower.includes(keyword.toLowerCase())
  ).length;
  const keywordCheck = foundKeywords >= criteria.requiredKeywords;

  // Calcul du score (0-100)
  let score = 0;
  if (lengthCheck) score += 30;
  if (sentenceCheck) score += 30;
  if (keywordCheck) score += 40;

  // Bonus pour réponse longue et structurée
  if (trimmedAnswer.length > criteria.minLength * 1.5) {
    score = Math.min(100, score + 10);
  }

  // Validation : minimum 60% pour valider
  const isValid = score >= 60;

  // Génération du feedback
  let feedback = '';
  if (isValid) {
    if (score >= 90) {
      feedback = 'Excellente réponse ! Tu as bien compris et développé ta réflexion. ⭐';
    } else if (score >= 75) {
      feedback = 'Très bonne réponse ! Ta réflexion est pertinente et bien structurée.';
    } else {
      feedback = 'Bonne réponse ! Tu progresses bien dans ta compréhension du secteur.';
    }
  } else {
    const missingElements = [];
    if (!lengthCheck) missingElements.push('plus développée');
    if (!sentenceCheck) missingElements.push('plus structurée');
    if (!keywordCheck) missingElements.push('plus précise sur les aspects du secteur');
    
    feedback = `Ta réponse est incomplète. Essaie d'être ${missingElements.join(', ')}. Relis les instructions et approfondis ta réflexion.`;
  }

  return {
    isValid,
    score,
    feedback,
    details: {
      length: trimmedAnswer.length,
      sentences: sentenceCount,
      keywords: foundKeywords,
      lengthCheck,
      sentenceCheck,
      keywordCheck,
    },
  };
}

/**
 * Valide une réponse avec un feedback plus détaillé (pour affichage)
 * DEPRECATED pour les nouveaux modules (QCM) - utiliser wayValidateModuleAnswer directement
 */
export async function validateAnswerDetailed(answer, module, secteur) {
  // Pour les nouveaux modules (QCM), cette fonction n'est plus utilisée
  // La validation se fait directement via wayValidateModuleAnswer dans Module/index.js
  
  // Fallback sur validation basique pour compatibilité
  const validation = validateAnswer(answer, module, secteur);
  
  // Suggestions d'amélioration si réponse non valide
  if (!validation.isValid) {
    const suggestions = [];
    
    if (!validation.details.lengthCheck) {
      suggestions.push(`Développe davantage ta réponse (minimum ${VALIDATION_CRITERIA[module.type]?.minLength || 50} caractères)`);
    }
    
    if (!validation.details.sentenceCheck) {
      suggestions.push(`Structure ta réponse en plusieurs phrases (minimum ${VALIDATION_CRITERIA[module.type]?.minSentences || 3} phrases)`);
    }
    
    if (!validation.details.keywordCheck) {
      suggestions.push('Approfondis les aspects concrets du secteur/métier dans ta réponse');
    }

    validation.suggestions = suggestions;
  }

  return validation;
}

/**
 * Valide une réponse de type "choix" (doit contenir une justification)
 */
export function validateChoiceAnswer(answer, module, secteur) {
  const baseValidation = validateAnswer(answer, module, secteur);
  
  // Vérification supplémentaire : présence d'une justification
  const hasJustification = answer.toLowerCase().includes('parce que') ||
                          answer.toLowerCase().includes('car') ||
                          answer.toLowerCase().includes('caractère') ||
                          answer.toLowerCase().includes('raison') ||
                          answer.toLowerCase().includes('pourquoi') ||
                          answer.length > 100;

  if (!hasJustification && baseValidation.isValid) {
    return {
      ...baseValidation,
      isValid: false,
      score: Math.max(0, baseValidation.score - 20),
      feedback: baseValidation.feedback + ' N\'oublie pas de justifier ton choix avec des arguments clairs.',
    };
  }

  return baseValidation;
}







