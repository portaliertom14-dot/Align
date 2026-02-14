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
 * 
 * Durée : 3-5 minutes
 * Items : 10-15 micro-situations professionnelles réalistes
 * Format : Items courts avec choix multiples ou réponse courte
 */
export async function wayGenerateModuleMiniSimulationMetier(secteurId, metierId, niveau = 1) {
  const userProfile = await buildUserProfileForWay();
  
  const systemPrompt = `Tu es way, l'intelligence artificielle d'Align.

PUBLIC : Adolescents 15-18 ans (niveau 3e).

OBJECTIF : Tester l'intérêt naturel, la réaction instinctive et l'énergie. NE PAS tester les connaissances ni les compétences.

RÈGLES OBLIGATOIRES :
1. Niveau de langage : élève de 3e.
2. Aucun jargon professionnel.
3. Aucun mot technique.
4. Aucun concept abstrait (INTERDIT : stratégie, optimisation, performance, modèle économique, analyse, viabilité, rentabilité, gestion, financement, scalabilité, etc.).
5. Situation concrète, réaliste et simple.
6. Une seule décision à prendre.
7. Maximum 3 choix par item.
8. Chaque choix = phrase courte (max 12 mots).
9. Pas de calcul.
10. Lecture totale par item < 10 secondes.

FORMAT STRICT PAR ITEM :
- Situation : 2 phrases max. Concrète. Visuelle. Simple.
- Question : 1 phrase claire.
- Choix : A) B) C) — chacun max 12 mots.

INTERDIT : Long paragraphe, sous-questions, théorie, explication, analyse, formulation scolaire.

Si une phrase nécessite une connaissance métier → simplifie.
Si un mot semble professionnel → remplace-le.
Si la situation semble académique → rends-la humaine.

Ton : immersif, naturel, direct.

Format JSON :
{
  "titre": "Mini-Simulations : [Nom du métier]",
  "objectif": "Découvre si ce métier te correspond via des situations du quotidien",
  "type": "mini_simulation_metier",
  "durée_estimée": 4,
  "items": [
    {
      "type": "mini_cas",
      "question": "Situation (2 phrases) + Question (1 phrase). Tout compris en < 10 secondes.",
      "options": ["choix A max 12 mots", "choix B max 12 mots", "choix C max 12 mots"],
      "reponse_correcte": 0,
      "explication": "1 phrase courte et simple"
    }
  ],
  "feedback_final": {
    "badge": "Tu as les réflexes pour ce métier",
    "message": "✔ Bravo : tu viens de tester ton énergie et ton intérêt.",
    "recompense": { "xp": 50, "etoiles": 2 }
  }
}`;

  const prompt = `Génère un module "Mini-Simulations Métier" pour adolescents 15-18 ans.
- Métier : ${metierId}
- Secteur : ${secteurId}

RÈGLES ABSOLUES :
1. EXACTEMENT 12 items.
2. Maximum 3 options par item (pas 4).
3. Chaque option max 12 mots.
4. Situations du quotidien, pas de jargon. Cohérent avec ${metierId} et ${secteurId}.
5. "reponse_correcte" = nombre (index 0, 1 ou 2).`;

  const result = await callWay(prompt, systemPrompt, 0.7);
  
  // Validation : max 3 options, réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 2) {
      item.options = item.options || ['Option A', 'Option B', 'Option C'];
    }
    if (item.options.length > 3) {
      item.options = item.options.slice(0, 3);
    }
    if (typeof item.reponse_correcte !== 'number') {
      item.reponse_correcte = 0;
    }
    if (item.reponse_correcte >= item.options.length) {
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

PUBLIC : Adolescents 15-18 ans (niveau 3e).

OBJECTIF : Tester l'intérêt naturel et l'énergie pour apprendre. NE PAS tester les connaissances ni les compétences.

RÈGLES OBLIGATOIRES :
1. Niveau de langage : élève de 3e.
2. Aucun jargon.
3. Aucun mot technique.
4. Aucun concept abstrait (INTERDIT : stratégie, optimisation, performance, analyse, productivité, etc.).
5. Situation concrète du quotidien (lycée, maison, amis).
6. Une seule décision à prendre.
7. Maximum 3 choix par item.
8. Chaque choix = phrase courte (max 12 mots).
9. Lecture totale par item < 10 secondes.

FORMAT STRICT PAR ITEM :
- Situation : 2 phrases max. Concrète. Simple.
- Question : 1 phrase claire.
- Choix : A) B) C) — chacun max 12 mots.

INTERDIT : Théorie, explication, formulation scolaire, longs paragraphes.

Ton : immersif, naturel, direct.

Format JSON :
{
  "titre": "Apprentissage & Mindset",
  "objectif": "Découvre comment tu réagis face à l'apprentissage",
  "type": "apprentissage_mindset",
  "durée_estimée": 4,
  "items": [
    {
      "type": "cas_etudiant",
      "question": "Situation (2 phrases) + Question (1 phrase). < 10 secondes.",
      "options": ["choix A max 12 mots", "choix B max 12 mots", "choix C max 12 mots"],
      "reponse_correcte": 0,
      "explication": "1 phrase courte"
    }
  ],
  "feedback_final": {
    "message": "✔ Bravo : tu viens de tester ton énergie.",
    "recompense": { "xp": 50, "etoiles": 2 }
  }
}`;

  const prompt = `Génère un module "Apprentissage & Mindset" pour adolescents 15-18 ans.

RÈGLES ABSOLUES :
1. EXACTEMENT 12 items.
2. Maximum 3 options par item. Chaque option max 12 mots.
3. Situations du quotidien (cours, devoirs, projets, amis). Pas de théorie.
4. "reponse_correcte" = nombre (index 0, 1 ou 2).`;
  
  const result = await callWay(prompt, systemPrompt, 0.7);
  
  // Validation : max 3 options, réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 2) {
      item.options = item.options || ['Option A', 'Option B', 'Option C'];
    }
    if (item.options.length > 3) {
      item.options = item.options.slice(0, 3);
    }
    if (typeof item.reponse_correcte !== 'number') {
      item.reponse_correcte = 0;
    }
    if (item.reponse_correcte >= item.options.length) {
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

PUBLIC : Adolescents 15-18 ans (niveau 3e).

OBJECTIF : Tester l'intérêt naturel, la réaction instinctive et l'énergie pour le secteur. NE PAS tester les connaissances ni les compétences.

RÈGLES OBLIGATOIRES :
1. Niveau de langage : élève de 3e.
2. Aucun jargon professionnel.
3. Aucun mot technique.
4. Aucun concept abstrait (INTERDIT : stratégie, optimisation, performance, analyse, viabilité, rentabilité, gestion, financement, etc.).
5. Situation concrète, réaliste et simple.
6. Une seule décision à prendre.
7. Maximum 3 choix par item.
8. Chaque choix = phrase courte (max 12 mots).
9. Pas de calcul.
10. Lecture totale par item < 10 secondes.

FORMAT STRICT PAR ITEM :
- Situation : 2 phrases max. Concrète. Visuelle. Simple.
- Question : 1 phrase claire.
- Choix : A) B) C) — chacun max 12 mots.

INTERDIT : Vocabulaire métier, définition de termes, théorie, analyse, formulation scolaire.

Si une phrase nécessite une connaissance secteur → simplifie.
Si un mot semble professionnel → remplace-le.
Situations du quotidien qui reflètent l'énergie et l'intérêt pour le secteur, pas les connaissances.

Ton : immersif, naturel, direct.

Format JSON :
{
  "titre": "Test de Secteur : [Nom du secteur]",
  "objectif": "Découvre si ce secteur te correspond via des situations simples",
  "type": "test_secteur",
  "durée_estimée": 4,
  "items": [
    {
      "type": "mini_cas",
      "question": "Situation (2 phrases) + Question (1 phrase). Tout compris en < 10 secondes.",
      "options": ["choix A max 12 mots", "choix B max 12 mots", "choix C max 12 mots"],
      "reponse_correcte": 0,
      "explication": "1 phrase courte et simple"
    }
  ],
  "feedback_final": {
    "badge": "Ce secteur te correspond",
    "message": "✔ Bravo : tu viens de tester ton intérêt naturel.",
    "recompense": { "xp": 50, "etoiles": 2 }
  }
}`;

  const prompt = `Génère un module "Test de Secteur" pour adolescents 15-18 ans.
- Secteur : ${secteurId}

RÈGLES ABSOLUES :
1. EXACTEMENT 12 items.
2. Maximum 3 options par item. Chaque option max 12 mots.
3. Situations du quotidien, pas de jargon. Cohérent avec le secteur ${secteurId}.
4. "reponse_correcte" = nombre (index 0, 1 ou 2).
5. PAS de questions de type "Qu'est-ce que...", "Définis...", "Quel terme..." — uniquement des situations et des choix.`;
  
  const result = await callWay(prompt, systemPrompt, 0.7);
  
  // Validation : max 3 options, réponse numérique
  const validatedItems = (result.items || []).map((item, index) => {
    if (!item.options || item.options.length < 2) {
      item.options = item.options || ['Option A', 'Option B', 'Option C'];
    }
    if (item.options.length > 3) {
      item.options = item.options.slice(0, 3);
    }
    if (typeof item.reponse_correcte !== 'number') {
      item.reponse_correcte = 0;
    }
    if (item.reponse_correcte >= item.options.length) {
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






