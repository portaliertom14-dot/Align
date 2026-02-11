/**
 * Prompts centralisés — ton Align, instructions strictes, français.
 * Utilisés par analyze-sector, analyze-job, generate-dynamic-modules.
 */

export const SECTOR_IDS = [
  'tech',
  'business',
  'creation',
  'droit',
  'sante',
  'finance',
  'ingenierie',
  'recherche',
  'sciences_humaines',
  'design',
  'communication',
  'architecture',
  'enseignement',
] as const;

export const SECTOR_NAMES: Record<string, string> = {
  tech: 'Tech',
  business: 'Business',
  creation: 'Création',
  droit: 'Droit',
  sante: 'Santé',
  finance: 'Finance',
  ingenierie: 'Ingénierie',
  recherche: 'Recherche',
  sciences_humaines: 'Sciences Humaines',
  design: 'Design',
  communication: 'Communication',
  architecture: 'Architecture',
  enseignement: 'Enseignement',
};

export const JOB_IDS = [
  'developpeur',
  'data_scientist',
  'ingenieur',
  'cybersecurity',
  'avocat',
  'juriste',
  'notaire',
  'magistrat',
  'graphiste',
  'redacteur',
  'webdesigner',
  'photographe',
  'commercial',
  'entrepreneur',
  'product_manager',
  'marketing',
  'psychologue',
  'sociologue',
  'coach',
  'enseignant',
  'medecin',
  'designer',
] as const;

export const JOB_NAMES: Record<string, string> = {
  developpeur: 'Développeur / Ingénieur logiciel',
  data_scientist: 'Data Scientist',
  ingenieur: 'Ingénieur',
  cybersecurity: 'Expert Cybersécurité',
  avocat: 'Avocat',
  juriste: "Juriste d'entreprise",
  notaire: 'Notaire',
  magistrat: 'Magistrat',
  graphiste: 'Graphiste / Designer',
  redacteur: 'Rédacteur / Copywriter',
  webdesigner: 'Web Designer',
  photographe: 'Photographe',
  commercial: 'Commercial / Business Developer',
  entrepreneur: 'Entrepreneur / Fondateur',
  product_manager: 'Product Manager',
  marketing: 'Responsable Marketing',
  psychologue: 'Psychologue',
  sociologue: 'Sociologue',
  coach: 'Coach / Consultant',
  enseignant: 'Enseignant / Formateur',
  medecin: 'Médecin',
  designer: 'Designer',
};

const TONE_ALIGN =
  'Ton Align : simple, encourageant, moderne, légère dopamine, jamais infantilisant. Français uniquement.';

export function promptAnalyzeSector(sectorList: string, summary: string): { system: string; user: string } {
  return {
    system: `Tu es un assistant d'orientation pour l'app Align. À partir des réponses d'un quiz secteur, tu dois déterminer UN seul secteur dominant et renvoyer un JSON strict.

Secteurs autorisés (secteurId exact): ${sectorList}

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour, avec exactement ces clés:
- secteurId: string (un des ids ci-dessus, en minuscules)
- secteurName: string (nom affiché en français, ex. "Tech", "Santé")
- description: string (2 à 3 phrases en français, décrivant pourquoi ce secteur correspond au profil. Maximum 240 caractères.)

${TONE_ALIGN}`,
    user: `Réponses du quiz:\n${summary}\n\nDonne le secteur dominant au format JSON (secteurId, secteurName, description).`,
  };
}

export function promptAnalyzeJob(jobList: string, summary: string): { system: string; user: string } {
  return {
    system: `Tu es un assistant d'orientation pour l'app Align. À partir des réponses d'un quiz métier, tu dois déterminer UN seul métier qui correspond le mieux au profil et renvoyer un JSON strict.

Métiers autorisés (jobId exact): ${jobList}

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni texte autour, avec exactement ces clés:
- jobId: string (un des ids ci-dessus, en minuscules, avec underscore si besoin)
- jobName: string (nom affiché en français, ex. "Développeur logiciel", "Avocat")
- description: string (2 à 3 phrases en français, décrivant pourquoi ce métier correspond au profil. Maximum 240 caractères.)

${TONE_ALIGN}`,
    user: `Réponses du quiz métier:\n${summary}\n\nDonne le métier dominant au format JSON (jobId, jobName, description).`,
  };
}

/**
 * Prompt pour générer les modules dynamiques (10 chapitres × 2 modules × 12 questions).
 */
export function promptGenerateDynamicModules(sectorLabel: string, jobLabel: string): { system: string; user: string } {
  return {
    system: `Tu es un expert pour l'app Align. Tu génères le contenu des modules dynamiques : mini-simulation métier et test secteur, pour 10 chapitres.

Secteur : ${sectorLabel}. Métier : ${jobLabel}.

Règles STRICTES :
- EXACTEMENT 10 chapitres (chapter: 1 à 10).
- Pour chaque chapitre : 2 modules :
  1) simulation : moduleType "simulation_metier", 12 questions (situations concrètes du métier, pas orientation).
     Par question : id, prompt, choices (A/B/C), puis SOIT bestChoiceId + explanation (obligatoires), SOIT correctChoiceId optionnel mais cohérent (A|B|C) + explanation.
     bestChoiceId = le meilleur choix en situation pro ; explanation = pourquoi (obligatoire).
  2) sectorTest : moduleType "test_secteur", 12 questions (connaissances/raisonnements du secteur, pas orientation).
     Par question : correctChoiceId ET explanation OBLIGATOIRES (correctChoiceId "A"|"B"|"C", explanation non vide).
- Difficulté monte légèrement du chapitre 1 au 10.
- ${TONE_ALIGN}
- INTERDIT : questions du type "Quel est ton style ?" ou orientation.

Réponds UNIQUEMENT avec un JSON valide, sans markdown. Structure :
- simulation : chaque question a id, prompt, choices: [{id, text}], bestChoiceId ou correctChoiceId, explanation (toujours).
- sectorTest : chaque question a id, prompt, choices, correctChoiceId, explanation (tous obligatoires).
{
  "chapters": [
    {
      "chapter": 1,
      "simulation": { "moduleType": "simulation_metier", "questions": [ { "id": "C1_SIM_Q1", "prompt": "...", "choices": [{ "id": "A", "text": "..." }, { "id": "B", "text": "..." }, { "id": "C", "text": "..." }], "bestChoiceId": "A", "explanation": "..." }, ... ] },
      "sectorTest": { "moduleType": "test_secteur", "questions": [ { "id": "C1_TEST_Q1", "prompt": "...", "choices": [...], "correctChoiceId": "B", "explanation": "..." }, ... ] }
    },
    ... jusqu'à chapter 10
  ]
}`,
    user: `Génère les 10 chapitres avec simulation_metier et test_secteur (12 questions chacun) pour secteur ${sectorLabel} et métier ${jobLabel}.`,
  };
}
