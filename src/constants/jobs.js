/**
 * Whitelist jobIds — alignée avec Edge (supabase/functions/_shared/prompts.ts JOB_IDS).
 * Utilisée pour prefetch et validation côté client.
 */

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
];

export const JOB_NAMES = {
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
