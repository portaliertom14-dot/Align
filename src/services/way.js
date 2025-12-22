/**
 * WAY - Intelligence Artificielle centrale d'Align
 * 
 * way est le cerveau d'Align. Elle :
 * - Analyse le profil cognitif de l'utilisateur
 * - Détermine UN secteur principal
 * - Propose 1 à 3 métiers crédibles
 * - Génère de vrais modules interactifs
 * - Personnalise le parcours en continu
 * 
 * Configuration requise :
 * - Variable d'environnement OPENAI_API_KEY
 */

import { getUserProgress } from '../lib/userProgress';
import { getUserProfile } from '../lib/userProfile';
import { calculateUserProfileFromAnswers } from './way-profile-calculator';
import { findBestMatchingSector, findBestMatchingMetiers, METIER_PROFILES } from './way-scoring';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Récupère la clé API OpenAI depuis les variables d'environnement
 * 
 * Pour Expo/React Native :
 * - En développement : utiliser EXPO_PUBLIC_OPENAI_API_KEY dans .env
 * - En production : utiliser les variables d'environnement de la plateforme (EAS Secrets, etc.)
 * 
 * IMPORTANT : Pour la sécurité, en production la clé devrait être stockée côté serveur
 * et les appels à way devraient passer par une API backend.
 */
function getOpenAIApiKey() {
  // Expo utilise EXPO_PUBLIC_* pour les variables d'environnement accessibles côté client
  if (typeof process !== 'undefined') {
    // Essayer EXPO_PUBLIC_OPENAI_API_KEY (Expo standard)
    if (process.env?.EXPO_PUBLIC_OPENAI_API_KEY) {
      return process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    }
    // Essayer OPENAI_API_KEY (fallback)
    if (process.env?.OPENAI_API_KEY) {
      return process.env.OPENAI_API_KEY;
    }
  }
  
  // Pour React Native / Expo, on peut aussi utiliser Constants
  try {
    const Constants = require('expo-constants');
    if (Constants.expoConfig?.extra?.openaiApiKey) {
      return Constants.expoConfig.extra.openaiApiKey;
    }
  } catch (e) {
    // Constants n'est pas disponible
  }
  
  // Fallback: le développeur doit configurer cette clé
  console.warn('OPENAI_API_KEY non configurée. Veuillez configurer EXPO_PUBLIC_OPENAI_API_KEY dans .env ou via EAS Secrets.');
  return null;
}

/**
 * Construit le profil utilisateur complet pour way
 */
async function buildUserProfileForWay() {
  const progress = await getUserProgress();
  const profile = await getUserProfile();
  
  // Construire un résumé des réponses du quiz secteur pour way
  const réponses_quiz_secteur = progress.quizAnswers || {};
  const réponses_quiz_métier = progress.metierQuizAnswers || {};
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:66',message:'buildUserProfileForWay data',data:{quizSecteurCount:Object.keys(réponses_quiz_secteur).length,quizMetierCount:Object.keys(réponses_quiz_métier).length,activeDirection:progress.activeDirection,activeMetier:progress.activeMetier},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  // Calculer un résumé des réponses pour way (format plus lisible)
  const résumé_réponses_secteur = Object.entries(réponses_quiz_secteur).map(([questionId, answer]) => ({
    question: questionId,
    réponse: answer,
  }));
  
  const résumé_réponses_métier = Object.entries(réponses_quiz_métier).map(([questionId, answer]) => ({
    question: questionId,
    réponse: answer,
  }));
  
  // Retourner les réponses au format attendu par le calculateur de profil
  // Le calculateur attend directement un objet { questionId: 'A'|'B'|'C' }
  // Les réponses sont déjà dans le bon format dans progress.quizAnswers
  return {
    // Format brut pour le calculateur de profil
    réponses_quiz_secteur: réponses_quiz_secteur, // Format { questionId: 'A'|'B'|'C' }
    réponses_quiz_métier: réponses_quiz_métier,   // Format { questionId: 'A'|'B'|'C' }
    // Informations additionnelles
    age: profile?.age || (profile?.prenom ? 17 : null),
    niveau_scolaire: profile?.niveau_scolaire || 'lycée',
    historique_modules: progress.completedModules || [],
    niveau_utilisateur: progress.currentLevel || 1,
    étoiles: progress.totalStars || 0,
    xp: progress.currentXP || 0,
    secteur_actuel: progress.activeDirection || null,
    métier_actuel: progress.activeMetier || null,
  };
}

/**
 * Appel générique à l'API OpenAI
 */
async function callWay(prompt, systemPrompt, temperature = 0.7) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:107',message:'callWay ENTRY',data:{promptLength:prompt.length,systemPromptLength:systemPrompt.length,temperature},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  
  const apiKey = getOpenAIApiKey();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:112',message:'getOpenAIApiKey result',data:{hasApiKey:!!apiKey,apiKeyLength:apiKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  
  if (!apiKey) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:116',message:'ERROR: No API key',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    throw new Error('OPENAI_API_KEY non configurée. Veuillez configurer la clé API OpenAI dans les variables d\'environnement.');
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:122',message:'CALLING WAY - FETCH START',data:{url:OPENAI_API_URL,model:'gpt-4o-mini'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Modèle économique mais performant
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        response_format: { type: 'json_object' }, // Force la réponse en JSON
      }),
    });
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:145',message:'FETCH RESPONSE RECEIVED',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:154',message:'ERROR: OpenAI API response not OK',data:{status:response.status,statusText:response.statusText,errorMessage:errorData.error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
      // #endregion
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:150',message:'OPENAI RESPONSE PARSED',data:{hasContent:!!content,contentLength:content?.length,contentPreview:content?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    
    if (!content) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:154',message:'ERROR: Empty response',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
      // #endregion
      throw new Error('Réponse OpenAI vide');
    }

    // Parser le JSON de la réponse
    try {
      const parsed = JSON.parse(content);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:162',message:'callWay RETURN SUCCESS',data:{parsedKeys:Object.keys(parsed||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
      // #endregion
      return parsed;
    } catch (parseError) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:166',message:'ERROR: JSON parse failed',data:{error:parseError.message,contentPreview:content?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
      // #endregion
      console.error('Erreur de parsing JSON:', content);
      throw new Error('Réponse OpenAI invalide (non-JSON)');
    }
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:172',message:'ERROR: callWay exception',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,300)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de l\'appel à way:', error);
    throw error;
  }
}

/**
 * WAY détermine le secteur principal de l'utilisateur
 * Utilise un système de scoring et de matching (PAS de génération de texte)
 * Retourne UN SEUL secteur avec son score
 */
export async function wayDetermineSecteur() {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:204',message:'wayDetermineSecteur ENTRY',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  const userProfileData = await buildUserProfileForWay();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:169',message:'BEFORE calculateUserProfileFromAnswers',data:{reponsesCount:Object.keys(userProfileData.réponses_quiz_secteur||{}).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  // PHASE 1 : Calculer le profil utilisateur depuis les réponses
  const userProfile = calculateUserProfileFromAnswers(userProfileData.réponses_quiz_secteur || {});
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:173',message:'AFTER calculateUserProfileFromAnswers',data:{userProfileDimensions:Object.keys(userProfile),analyse:userProfile.analyse,execution:userProfile.execution},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  // PHASE 2 : Trouver le secteur avec le meilleur score de matching
  const bestMatch = findBestMatchingSector(userProfile);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:176',message:'AFTER findBestMatchingSector',data:{bestMatchSecteurId:bestMatch?.secteurId,bestMatchScore:bestMatch?.score},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  // Mapper secteurId vers nom lisible
  const secteurId = bestMatch.secteurId;
  const secteurNames = {
    'tech': 'Tech',
    'santé': 'Santé',
    'droit': 'Droit',
    'ingénierie': 'Ingénierie',
    'recherche': 'Recherche',
    'business': 'Business',
    'création': 'Création',
    'finance': 'Finance',
    'sciences_humaines': 'Sciences Humaines',
    'design': 'Design',
    'communication': 'Communication',
    'architecture': 'Architecture',
    'enseignement': 'Enseignement',
  };
  
  const secteurNom = secteurNames[secteurId] || secteurId;
  
  // Générer un résumé court via IA (optionnel, mais utile pour l'UX)
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Générer UNIQUEMENT un résumé court (1-2 phrases) expliquant pourquoi le secteur "${secteurNom}" correspond au profil.

RÈGLES STRICTES :
- Uniquement un résumé court (1-2 phrases max)
- Honnête et direct
- Basé sur les dimensions du profil

Format JSON :
{
  "resume": "Résumé court en 1-2 phrases"
}`;

  const prompt = `Profil utilisateur calculé :
${JSON.stringify(userProfile, null, 2)}

Secteur sélectionné : ${secteurNom} (score: ${bestMatch.score.toFixed(1)})

Génère un résumé court expliquant cette correspondance.`;

  let resume = `Le secteur ${secteurNom} correspond le mieux à ton profil.`;
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:233',message:'CALLING WAY for sector resume',data:{secteurNom},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    const result = await callWay(prompt, systemPrompt, 0.5);
    resume = result.resume || resume;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:239',message:'ERROR in sector resume generation',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de la génération du résumé:', error);
    // Continuer avec le résumé par défaut
  }
  
  const result = {
    secteur: secteurNom,
    secteurId: secteurId,
    score: bestMatch.score,
    resume: resume,
  };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:232',message:'wayDetermineSecteur RETURN',data:{secteurId:result.secteurId,secteur:result.secteur,score:result.score},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  return result;
}

/**
 * WAY détermine UN SEUL métier basé sur le secteur validé
 * Utilise un système de scoring et de matching (PAS de génération de texte)
 * Retourne UN SEUL métier avec son score
 */
export async function wayProposeMetiers(secteurId, secteurNom) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:300',message:'wayProposeMetiers ENTRY',data:{secteurId,secteurNom},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  const userProfileData = await buildUserProfileForWay();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:264',message:'BEFORE calculateUserProfileFromAnswers (metiers)',data:{secteurAnswersCount:Object.keys(userProfileData.réponses_quiz_secteur||{}).length,metierAnswersCount:Object.keys(userProfileData.réponses_quiz_métier||{}).length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  // PHASE 1 : Calculer le profil utilisateur depuis les réponses (secteur + métier)
  const quizSecteurAnswers = userProfileData.réponses_quiz_secteur || {};
  const quizMetierAnswers = userProfileData.réponses_quiz_métier || {};
  
  // Combiner les réponses pour un profil complet
  const allAnswers = { ...quizSecteurAnswers, ...quizMetierAnswers };
  const userProfile = calculateUserProfileFromAnswers(allAnswers);
  
  // PHASE 3 : Trouver le métier avec le meilleur score dans le secteur validé
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:273',message:'BEFORE findBestMatchingMetiers',data:{secteurId,userProfileDimensions:Object.keys(userProfile),analyse:userProfile.analyse,execution:userProfile.execution},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  const metierMatches = findBestMatchingMetiers(userProfile, secteurId);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:276',message:'AFTER findBestMatchingMetiers',data:{matchesCount:metierMatches.length,bestMetierId:metierMatches[0]?.metierId,bestScore:metierMatches[0]?.score},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  
  if (metierMatches.length === 0) {
    // Aucun métier trouvé dans ce secteur (cas rare, mais possible)
    return {
      nom: 'Métier à explorer',
      id: 'explorer',
      score: 0,
      resume: `Continue à explorer le secteur ${secteurNom} pour découvrir ton métier.`,
    };
  }
  
  // Prendre le meilleur métier (premier de la liste triée)
  const bestMetier = metierMatches[0];
  const metierProfile = METIER_PROFILES[bestMetier.metierId];
  
  // Noms des métiers
  const metierNames = {
    'developpeur': 'Développeur',
    'data_scientist': 'Data Scientist',
    'avocat': 'Avocat',
    'juriste': 'Juriste',
    'commercial': 'Commercial',
    'entrepreneur': 'Entrepreneur',
    'medecin': 'Médecin',
    'infirmier': 'Infirmier',
    'graphiste': 'Graphiste',
    'redacteur': 'Rédacteur',
  };
  
  const metierNom = metierNames[bestMetier.metierId] || bestMetier.metierId;
  
  // Générer un résumé court via IA (optionnel)
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Générer UNIQUEMENT un résumé court (1-2 phrases) expliquant pourquoi le métier "${metierNom}" correspond au profil.

RÈGLES STRICTES :
- Uniquement un résumé court (1-2 phrases max)
- Honnête et direct
- Basé sur les dimensions du profil

Format JSON :
{
  "resume": "Résumé court en 1-2 phrases"
}`;

  const prompt = `Profil utilisateur calculé :
${JSON.stringify(userProfile, null, 2)}

Métier sélectionné : ${metierNom} dans le secteur ${secteurNom} (score: ${bestMetier.score.toFixed(1)})

Génère un résumé court expliquant cette correspondance.`;

  let resume = `Le métier ${metierNom} correspond le mieux à ton profil dans le secteur ${secteurNom}.`;
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:329',message:'CALLING WAY for metier resume',data:{metierNom,secteurNom},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    const result = await callWay(prompt, systemPrompt, 0.5);
    resume = result.resume || resume;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:335',message:'ERROR in metier resume generation',data:{errorMessage:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
    // #endregion
    console.error('Erreur lors de la génération du résumé:', error);
    // Continuer avec le résumé par défaut
  }
  
  const result = {
    nom: metierNom,
    id: bestMetier.metierId,
    score: bestMetier.score,
    resume: resume,
  };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:341',message:'wayProposeMetiers RETURN',data:{metierId:result.id,metierNom:result.nom,score:result.score},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  return result;
}

/**
 * WAY génère un module de type "Mini-Simulations Métier"
 * 
 * Durée : 3-5 minutes
 * Items : 10-15 micro-situations professionnelles réalistes
 * Format : Items courts avec choix multiples ou réponse courte
 */
export async function wayGenerateModuleMiniSimulationMetier(secteurId, metierId, niveau = 1) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:351',message:'wayGenerateModuleMiniSimulationMetier ENTRY',data:{secteurId,metierId,niveau},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Générer un module "Mini-Simulations Métier" pour tester la compatibilité réelle avec un métier.

RÈGLES STRICTES :
- Durée : 3 à 5 minutes MAXIMUM
- Items : EXACTEMENT 12 items (entre 10 et 15)
- Style : Sérieux, crédible, professionnel (comme Duolingo premium)
- Pas ludique, pas enfantin, pas abstrait
- Ultra simplifié : lecture rapide, décisions rapides

FORMATS D'ITEMS STRICTEMENT AUTORISÉS (TOUS avec choix multiples) :
1. Mini-cas (3 lignes max) → 3-4 options de choix multiple (PAS de réponse libre)
2. Priorisation de tâches → 3-4 options de classement/choix
3. Choix d'argument → 3-4 options (PAS de texte libre)
4. Décision éthique → Vrai/Faux ou 3-4 options (PAS de justification écrite)
5. Détection erreur → 3-4 options (PAS d'analyse longue)

INTERDICTIONS ABSOLUES :
- ❌ Réponses libres (TextInput multiline)
- ❌ Réponses en plusieurs phrases
- ❌ Analyses longues
- ❌ Jargon technique/juridique avancé
- ❌ Cas complexes nécessitant réflexion approfondie
- ❌ Contenu hors secteur/métier

Chaque item DOIT être :
- Ultra court (lecture en 10-15 secondes max)
- Réaliste et professionnel MAIS simple
- Choix multiple uniquement (3-4 options)
- Cohérent avec le secteur ${secteurId} et métier ${metierId}

Format JSON :
{
  "titre": "Mini-Simulations : [Nom du métier]",
  "objectif": "Tester ta compatibilité avec [métier] via des micro-situations professionnelles",
  "type": "mini_simulation_metier",
  "durée_estimée": 4,
  "items": [
    {
      "type": "mini_cas" | "priorisation" | "choix_argument" | "decision_ethique" | "detection_erreur",
      "question": "Texte ultra court de la question/cas (max 3 lignes, simple et clair)",
      "options": ["option 1", "option 2", "option 3", "option 4"] (OBLIGATOIRE - 3 ou 4 options),
      "reponse_correcte": 0 (index 0-3 de la bonne réponse, OBLIGATOIRE un nombre),
      "explication": "Explication courte (1 phrase max) de pourquoi cette réponse est correcte"
    }
  ],
  "feedback_final": {
    "badge": "Tu as les réflexes d'un [métier]",
    "message": "✔ Bravo : tu viens d'agir comme un professionnel.",
    "recompense": {
      "xp": 50,
      "etoiles": 2
    }
  }
}`;

  const prompt = `Génère un module "Mini-Simulations Métier" pour :
- Métier : ${metierId}
- Secteur : ${secteurId}
- Niveau utilisateur : ${niveau}

Profil utilisateur :
${JSON.stringify(userProfile, null, 2)}

RÈGLES ABSOLUES (NON NÉGOCIABLES) :
1. Génère EXACTEMENT 12 items (entre 10 et 15)
2. TOUS les items DOIVENT avoir des choix multiples (3-4 options) - OBLIGATOIRE
3. AUCUNE réponse libre (pas de TextInput, pas de texte à écrire) - INTERDIT
4. Tous les items DOIVENT être cohérents avec le métier ${metierId} et secteur ${secteurId} UNIQUEMENT
5. Aucun contenu d'un autre secteur/métier - si secteur=tech, pas de contenu juridique/médical/business
6. Style simple, professionnel, lisible en 10 secondes par item
7. Chaque item doit avoir un champ "options" avec 3 ou 4 options (OBLIGATOIRE)
8. Chaque item doit avoir "reponse_correcte" comme un nombre (index 0-3) (OBLIGATOIRE)

COHÉRENCE SECTEUR/MÉTIER STRICTE :
- Si secteur = ${secteurId}, alors AUCUN item ne doit contenir de références à d'autres secteurs
- Si métier = ${metierId}, alors tous les items doivent tester des compétences de CE métier uniquement`;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:443',message:'CALLING WAY for MiniSimulationMetier module',data:{secteurId,metierId,niveau},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  const result = await callWay(prompt, systemPrompt, 0.7);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:446',message:'BEFORE validation items (mini sim)',data:{itemsCount:result.items?.length,firstItemQuestion:result.items?.[0]?.question?.substring(0,50),firstItemHasOptions:!!result.items?.[0]?.options,firstItemOptionsCount:result.items?.[0]?.options?.length,titre:result.titre},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  // Validation : s'assurer que tous les items ont des options et une réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 3) {
      console.warn(`Item ${index} n'a pas assez d'options, génération d'options par défaut`);
      item.options = item.options || ['Option A', 'Option B', 'Option C'];
    }
    if (typeof item.reponse_correcte !== 'number') {
      console.warn(`Item ${index} n'a pas une réponse numérique, conversion en 0`);
      item.reponse_correcte = 0;
    }
    return item;
  });

  const moduleResult = {
    id: `way_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'mini_simulation_metier',
    titre: result.titre,
    objectif: result.objectif,
    durée_estimée: result.durée_estimée || 4,
    items: validatedItems,
    feedback_final: result.feedback_final || {
      badge: `Tu as les réflexes d'un ${metierId}`,
      message: '✔ Bravo : tu viens d\'agir comme un professionnel.',
      recompense: { xp: 50, etoiles: 2 },
    },
    secteur: secteurId,
    métier: metierId,
    généré_par: 'way',
    créé_le: new Date().toISOString(),
  };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:465',message:'wayGenerateModuleMiniSimulationMetier RETURN',data:{moduleSecteur:moduleResult.secteur,moduleMetier:moduleResult.métier,itemsCount:moduleResult.items.length,firstItemQuestionPreview:moduleResult.items[0]?.question?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  return moduleResult;
}

/**
 * WAY génère un module de type "Apprentissage & Mindset"
 * 
 * Durée : 3-5 minutes
 * Items : 10-15 concepts/applications pratiques
 * Format : Apprentissage concret et applicable
 */
export async function wayGenerateModuleApprentissage(secteurId, metierId = null, niveau = 1) {
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Générer un module "Apprentissage & Mindset" pour aider concrètement l'utilisateur à mieux apprendre, travailler, raisonner, s'organiser.

RÈGLES STRICTES :
- Durée : 3 à 5 minutes MAXIMUM
- Items : EXACTEMENT 12 items (entre 10 et 15)
- Style : Utile dans la vraie vie, applicable immédiatement
- Sérieux, adulte, efficace

FORMATS D'ITEMS STRICTEMENT AUTORISÉS (TOUS avec choix, PAS de réponses libres) :
1. Carte concept ultra courte → Vrai/Faux ou 3-4 options (PAS de réponse libre)
2. Micro-cas étudiant → 3-4 options de choix (PAS de texte libre)
3. Vrai/Faux intelligent → Vrai/Faux uniquement (PAS de justification)
4. Cas professionnel → 3-4 options de choix (PAS d'analyse longue)
5. Choix stratégique → 3-4 options (PAS de réponse écrite)

INTERDICTIONS ABSOLUES :
- ❌ Réponses libres (TextInput)
- ❌ Réponses en plusieurs phrases
- ❌ Analyses longues
- ❌ Contenu complexe ou technique avancé

Thèmes possibles :
- Méthodes de mémorisation
- Organisation du travail
- Apprentissage efficace
- Productivité
- Gestion du stress
- Mindset d'excellence

Format JSON :
{
  "titre": "Apprentissage & Mindset",
  "objectif": "Améliorer ta façon d'apprendre et de travailler",
  "type": "apprentissage_mindset",
  "durée_estimée": 4,
  "items": [
    {
      "type": "concept" | "cas_etudiant" | "vrai_faux" | "cas_pro" | "choix_strategique",
      "question": "Texte ultra court (max 3 lignes)",
      "options": ["option 1", "option 2", "option 3", "option 4"] (OBLIGATOIRE - 3 ou 4 options, toujours un tableau),
      "reponse_correcte": 0 (OBLIGATOIRE un nombre - index 0-3 de la bonne réponse),
      "explication": "Explication courte (1 phrase max)"
    }
  ],
  "feedback_final": {
    "message": "✔ Tu viens d'améliorer ta façon d'apprendre.",
    "recompense": {
      "xp": 50,
      "etoiles": 2
    }
  }
}`;

  const prompt = `Génère un module "Apprentissage & Mindset" adapté à un lycéen.

RÈGLES ABSOLUES :
1. Génère EXACTEMENT 12 items (entre 10 et 15)
2. TOUS les items DOIVENT avoir des choix multiples (3-4 options) ou Vrai/Faux
3. AUCUNE réponse libre (pas de TextInput, pas de texte à écrire)
4. Style simple, utile, applicable immédiatement
5. Lisible en 10 secondes par item`;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:542',message:'CALLING WAY for Apprentissage module',data:{secteurId,metierId,niveau},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  const result = await callWay(prompt, systemPrompt, 0.7);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:545',message:'BEFORE validation items (apprentissage)',data:{itemsCount:result.items?.length,firstItemHasOptions:!!result.items?.[0]?.options,firstItemOptionsCount:result.items?.[0]?.options?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  // Validation : s'assurer que tous les items ont des options et une réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 2) {
      console.warn(`Item ${index} n'a pas assez d'options`);
      item.options = item.options || ['Vrai', 'Faux'];
    }
    if (typeof item.reponse_correcte !== 'number') {
      console.warn(`Item ${index} n'a pas une réponse numérique, conversion en 0`);
      item.reponse_correcte = 0;
    }
    return item;
  });

  return {
    id: `way_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'apprentissage_mindset',
    titre: result.titre,
    objectif: result.objectif,
    durée_estimée: result.durée_estimée || 4,
    items: validatedItems,
    feedback_final: result.feedback_final || {
      message: '✔ Tu viens d\'améliorer ta façon d\'apprendre.',
      recompense: { xp: 50, etoiles: 2 },
    },
    secteur: secteurId,
    métier: metierId,
    généré_par: 'way',
    créé_le: new Date().toISOString(),
  };
}

/**
 * WAY génère un module de type "Test de Secteur"
 * 
 * Durée : 3-5 minutes
 * Items : 10-15 questions sur le secteur professionnel
 * Format : Vocabulaire, logique, principes fondamentaux, culture professionnelle
 */
export async function wayGenerateModuleTestSecteur(secteurId, niveau = 1) {
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Générer un module "Test de Secteur" pour tester l'adéquation de l'utilisateur avec un secteur professionnel.

RÈGLES STRICTES :
- Durée : 3 à 5 minutes MAXIMUM
- Items : EXACTEMENT 12 items (entre 10 et 15)
- Style : Sérieux, professionnel
- Explore : vocabulaire, logique du secteur, principes fondamentaux, culture professionnelle

FORMATS D'ITEMS STRICTEMENT AUTORISÉS (TOUS avec choix, PAS de réponses libres) :
1. Vocabulaire → Associer un mot-clé à sa définition (3-4 options, choix multiple)
2. Sous-domaine → Identifier le sous-domaine (3-4 options, choix multiple)
3. Principe → Reconnaître un principe (Vrai/Faux ou 3-4 options)
4. Outil/Pratique → Identifier un outil du secteur (3-4 options, choix multiple)
5. Culture pro → Question de culture professionnelle (3-4 options, choix multiple)

INTERDICTIONS ABSOLUES :
- ❌ Réponses libres (TextInput)
- ❌ Réponses écrites
- ❌ Analyses longues
- ❌ Contenu technique/juridique avancé
- ❌ Jargon complexe

COHÉRENCE OBLIGATOIRE :
- Tous les items DOIVENT être cohérents avec le secteur ${secteurId}
- Aucun contenu d'un autre secteur

Format JSON :
{
  "titre": "Test de Secteur : [Nom du secteur]",
  "objectif": "Tester ta maîtrise des bases du secteur [secteur]",
  "type": "test_secteur",
  "durée_estimée": 4,
  "items": [
    {
      "type": "vocabulaire" | "sous_domaine" | "principe" | "outil_pratique" | "culture_pro",
      "question": "Texte ultra court (max 3 lignes)",
      "options": ["option 1", "option 2", "option 3"],
      "reponse_correcte": 0 (index),
      "explication": "Explication courte (1 phrase)"
    }
  ],
  "feedback_final": {
    "badge": "Secteur [X] validé",
    "message": "✔ Tu maîtrises les bases du secteur.",
    "recompense": {
      "xp": 50,
      "etoiles": 2
    }
  }
}`;

  const prompt = `Génère un module "Test de Secteur" pour le secteur ${secteurId}.

RÈGLES ABSOLUES :
1. Génère EXACTEMENT 12 items (entre 10 et 15)
2. TOUS les items DOIVENT avoir des choix multiples (3-4 options)
3. AUCUNE réponse libre (pas de TextInput, pas de texte à écrire)
4. TOUS les items DOIVENT être cohérents avec le secteur ${secteurId} UNIQUEMENT
5. AUCUN contenu d'un autre secteur (si secteur=tech, pas de contenu juridique/médical/business)
6. Style simple, professionnel, vocabulaire accessible

IMPORTANT : Chaque item doit avoir un champ "options" avec 3 ou 4 options, et "reponse_correcte" doit être un nombre (index 0-3).`;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:662',message:'CALLING WAY for TestSecteur module',data:{secteurId,niveau},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
  // #endregion
  const result = await callWay(prompt, systemPrompt, 0.7);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'way.js:665',message:'BEFORE validation items (test secteur)',data:{itemsCount:result.items?.length,firstItemHasOptions:!!result.items?.[0]?.options,firstItemOptionsCount:result.items?.[0]?.options?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  
  // Validation : s'assurer que tous les items ont des options et une réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 3) {
      console.warn(`Item ${index} n'a pas assez d'options, génération d'options par défaut`);
      item.options = item.options || ['Option A', 'Option B', 'Option C'];
    }
    if (typeof item.reponse_correcte !== 'number') {
      console.warn(`Item ${index} n'a pas une réponse numérique, conversion en 0`);
      item.reponse_correcte = 0;
    }
    return item;
  });

  return {
    id: `way_sect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'test_secteur',
    titre: result.titre,
    objectif: result.objectif,
    durée_estimée: result.durée_estimée || 4,
    items: validatedItems,
    feedback_final: result.feedback_final || {
      badge: `Secteur ${secteurId} validé`,
      message: '✔ Tu maîtrises les bases du secteur.',
      recompense: { xp: 50, etoiles: 2 },
    },
    secteur: secteurId,
    métier: null,
    généré_par: 'way',
    créé_le: new Date().toISOString(),
  };
}

/**
 * DEPRECATED: Ancienne fonction de génération de module
 * Conservée pour compatibilité mais ne plus utiliser
 */
export async function wayGenerateModule(secteurId, metierId = null, niveau = 1) {
  // Délègue aux nouvelles fonctions selon le contexte
  if (metierId) {
    return await wayGenerateModuleMiniSimulationMetier(secteurId, metierId, niveau);
  }
  return await wayGenerateModuleTestSecteur(secteurId, niveau);
}

/**
 * WAY génère plusieurs modules d'avance (pool de modules)
 * Pour éviter la répétition et garantir la continuité
 */
export async function wayGenerateModulePool(secteurId, metierId = null, niveau = 1, count = 10) {
  const modules = [];
  
  for (let i = 0; i < count; i++) {
    try {
      const module = await wayGenerateModule(secteurId, metierId, niveau);
      modules.push(module);
      
      // Petite pause entre les appels pour éviter le rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (error) {
      console.error(`Erreur lors de la génération du module ${i + 1}:`, error);
      // Continue même si un module échoue
    }
  }
  
  return modules;
}

/**
 * WAY valide une réponse utilisateur à un module
 * Analyse la qualité, pertinence, et effort de la réponse
 */
export async function wayValidateModuleAnswer(module, userAnswer, secteurId) {
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Valider la réponse d'un utilisateur à un module.

RÈGLES STRICTES :
- Sois juste mais encourageant
- Analyse la qualité de la réflexion, pas juste la longueur
- Vérifie si l'utilisateur a compris l'enjeu du module
- Donne un feedback constructif

Format JSON :
{
  "valide": true,
  "score": 0.85,
  "feedback": "Feedback détaillé et constructif (3-4 phrases)",
  "points_forts": ["point 1", "point 2"],
  "points_à_améliorer": ["suggestion 1", "suggestion 2"]
}`;

  const prompt = `Module :
${JSON.stringify(module, null, 2)}

Réponse de l'utilisateur :
"${userAnswer}"

Valide cette réponse selon les critères du module.`;

  const result = await callWay(prompt, systemPrompt, 0.4); // Température basse pour cohérence
  
  return {
    valide: result.valide || false,
    score: result.score || 0.5,
    feedback: result.feedback || 'Réponse reçue.',
    points_forts: result.points_forts || [],
    points_à_améliorer: result.points_à_améliorer || [],
  };
}

/**
 * WAY peut ajuster le parcours si nécessaire
 * Par exemple : dire qu'un métier ne correspond probablement pas
 */
export async function wayEvaluateProgress() {
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

TA MISSION : Évaluer la progression de l'utilisateur et donner un avis honnête.

RÈGLES STRICTES :
- Sois honnête et direct
- Si un métier ne correspond vraiment pas, dis-le
- Propose des ajustements si nécessaire
- Encourage si l'utilisateur progresse bien

Format JSON :
{
  "évaluation": "positive" | "neutre" | "à_réajuster",
  "message": "Message clair pour l'utilisateur (3-4 phrases)",
  "recommandations": ["reco 1", "reco 2"],
  "métier_à_réévaluer": null ou "id_métier"
}`;

  const prompt = `Évalue la progression de cet utilisateur :
${JSON.stringify(userProfile, null, 2)}`;

  const result = await callWay(prompt, systemPrompt, 0.5);
  
  return {
    évaluation: result.évaluation || 'neutre',
    message: result.message || '',
    recommandations: result.recommandations || [],
    métier_à_réévaluer: result.métier_à_réévaluer || null,
  };
}






