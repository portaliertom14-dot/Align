/**
 * WAY - Intelligence Artificielle centrale d'Align
 *
 * Génération des modules (mini_simulation_metier, apprentissage_mindset, test_secteur)
 * via Supabase Edge Function "generate-feed-module" — aucune clé OpenAI côté client.
 * La clé OPENAI_API_KEY est stockée en secret côté Supabase.
 */

import { supabase } from './supabase';
import { getUserProgress } from '../lib/userProgress';
import { getUserProfile } from '../lib/userProfile';
import { calculateUserProfileFromAnswers } from './way-profile-calculator';
import { findBestMatchingSector, findBestMatchingMetiers, METIER_PROFILES } from './way-scoring';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * @deprecated Uniquement pour wayValidateModuleAnswer/wayEvaluateProgress en fallback.
 * La génération de modules passe par Edge Function (generate-feed-module).
 */
function getOpenAIApiKey() {
  if (typeof process !== 'undefined') {
    if (process.env?.EXPO_PUBLIC_OPENAI_API_KEY) return process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    if (process.env?.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  }
  try {
    const Constants = require('expo-constants');
    if (Constants.expoConfig?.extra?.openaiApiKey) return Constants.expoConfig.extra.openaiApiKey;
  } catch (_) {}
  return null;
}

const GEN_UNAVAILABLE_MSG = 'Génération indisponible, réessaie dans 1 min.';

/**
 * Génère un module via Supabase Edge Function (generate-feed-module).
 * Aucune clé OpenAI côté client.
 */
async function generateModuleViaEdge(moduleType, sectorId, metierId, level = 1) {
  try {
    const { data, error } = await supabase.functions.invoke('generate-feed-module', {
      body: { moduleType, sectorId, metierId: metierId ?? null, level },
    });

    if (error) {
      const errMsg = error?.message || String(error);
      if (__DEV__) console.warn('[way] Edge Function error:', errMsg);
      throw new Error(`${GEN_UNAVAILABLE_MSG} (${errMsg})`);
    }

    if (!data || data.source === 'disabled' || data.source === 'invalid' || data.source === 'error') {
      const reason = data?.error || data?.source || 'erreur inconnue';
      if (__DEV__) console.warn('[way] Edge Function returned:', data?.source, reason);
      throw new Error(`${GEN_UNAVAILABLE_MSG} (${String(reason)})`);
    }

    // data est le module complet (id, type, titre, objectif, items, feedback_final, etc.)
    return data;
  } catch (err) {
    if (__DEV__) console.warn('[way] generate-feed-module failed:', err?.message ?? err);
    throw err instanceof Error && !err.message.includes('Génération indisponible')
      ? new Error(GEN_UNAVAILABLE_MSG)
      : err;
  }
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
  const apiKey = getOpenAIApiKey();
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY non configurée. Veuillez configurer EXPO_PUBLIC_OPENAI_API_KEY dans .env ou via EAS Secrets.');
  }
  
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
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Erreur lors de l\'appel à OpenAI:', error);
    throw error;
  }
}

/**
 * WAY détermine UN SEUL secteur dominant basé sur le scoring
 * Utilise un système de scoring et de matching (PAS de génération de texte)
 * Retourne UN SEUL secteur avec son score
 */
export async function wayDetermineSecteur() {
  const userProfileData = await buildUserProfileForWay();
  
  // PHASE 1 : Calculer le profil utilisateur depuis les réponses
  const userProfile = calculateUserProfileFromAnswers(userProfileData.réponses_quiz_secteur || {});
  
  // PHASE 2 : Trouver le secteur avec le meilleur score de matching
  const bestMatch = findBestMatchingSector(userProfile);
  
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
    const aiResult = await callWay(prompt, systemPrompt, 0.7);
    if (aiResult && aiResult.resume) {
      resume = aiResult.resume;
    }
  } catch (error) {
    console.warn('Erreur lors de la génération du résumé IA, utilisation du résumé par défaut:', error);
  }
  
  return {
    secteurId,
    secteur: secteurNom,
    score: Math.min(100, Math.max(50, bestMatch.score * 10)), // Score entre 50-100
    resume,
  };
}

/**
 * WAY détermine UN SEUL métier basé sur le secteur validé
 * Utilise un système de scoring et de matching (PAS de génération de texte)
 * Retourne UN SEUL métier avec son score
 */
export async function wayProposeMetiers(secteurId, secteurNom) {
  
  const userProfileData = await buildUserProfileForWay();
  
  // PHASE 1 : Calculer le profil utilisateur depuis les réponses (secteur + métier)
  const quizSecteurAnswers = userProfileData.réponses_quiz_secteur || {};
  const quizMetierAnswers = userProfileData.réponses_quiz_métier || {};
  
  // Combiner les réponses pour un profil complet
  const allAnswers = { ...quizSecteurAnswers, ...quizMetierAnswers };
  const userProfile = calculateUserProfileFromAnswers(allAnswers);
  
  // PHASE 3 : Trouver le métier avec le meilleur score dans le secteur validé
  const metierMatches = findBestMatchingMetiers(userProfile, secteurId);
  
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
    const aiResult = await callWay(prompt, systemPrompt, 0.7);
    if (aiResult && aiResult.resume) {
      resume = aiResult.resume;
    }
  } catch (error) {
    console.warn('Erreur lors de la génération du résumé IA, utilisation du résumé par défaut:', error);
  }
  
  return {
    id: bestMetier.metierId,
    nom: metierNom,
    score: Math.min(100, Math.max(50, bestMetier.score * 10)), // Score entre 50-100
    resume,
  };
}

/**
 * WAY génère un module de type "Mini-Simulations Métier"
 * Via Edge Function generate-feed-module — aucune clé OpenAI côté client.
 */
export async function wayGenerateModuleMiniSimulationMetier(secteurId, metierId, niveau = 1) {
  return generateModuleViaEdge('mini_simulation_metier', secteurId, metierId, niveau);
}

/**
 * WAY génère un module de type "Apprentissage & Mindset"
 * Via Edge Function generate-feed-module — aucune clé OpenAI côté client.
 */
export async function wayGenerateModuleApprentissage(secteurId, metierId = null, niveau = 1) {
  return generateModuleViaEdge('apprentissage_mindset', secteurId, metierId, niveau);
}

/**
 * WAY génère un module de type "Test de Secteur"
 * Via Edge Function generate-feed-module — aucune clé OpenAI côté client.
 */
export async function wayGenerateModuleTestSecteur(secteurId, niveau = 1) {
  return generateModuleViaEdge('test_secteur', secteurId, null, niveau);
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






