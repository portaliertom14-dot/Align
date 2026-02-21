/**
 * Fixtures V3 Hybride — 3 scénarios pour tests secteur.
 * Utilisés par les tests pour vérifier les règles de décision (confidence, whitelist).
 */

/** Réponses type "tech" : préférence pour comprendre, structuré, logique → attendu ingenierie_tech, confidence > 0.60 */
export const FIXTURE_SECTOR_TECH: Record<string, string> = {};
for (let i = 1; i <= 40; i++) {
  const id = `secteur_${i}`;
  if (i % 3 === 0) FIXTURE_SECTOR_TECH[id] = 'comprendre le pourquoi';
  else if (i % 3 === 1) FIXTURE_SECTOR_TECH[id] = 'structurées';
  else FIXTURE_SECTOR_TECH[id] = 'logique';
}
for (const id of ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46']) {
  (FIXTURE_SECTOR_TECH as Record<string, string>)[id] = 'Des idées et des concepts';
}

/** Réponses type "créa" : préférence pour créer, imaginer, variable → attendu creation_design, confidence > 0.60 */
export const FIXTURE_SECTOR_CREA: Record<string, string> = {};
for (let i = 1; i <= 40; i++) {
  const id = `secteur_${i}`;
  if (i % 3 === 0) FIXTURE_SECTOR_CREA[id] = 'créer';
  else if (i % 3 === 1) FIXTURE_SECTOR_CREA[id] = 'imaginer / créer';
  else FIXTURE_SECTOR_CREA[id] = 'variable, inspirant';
}
for (const id of ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46']) {
  (FIXTURE_SECTOR_CREA as Record<string, string>)[id] = 'Imaginer des solutions nouvelles';
}

/** Réponses ambivalentes : mélange équilibré → attendu low confidence, microQuestions non vides, puis top1 forcé */
export const FIXTURE_SECTOR_AMBIVALENT: Record<string, string> = {};
const optionsAmbivalent = ['comprendre le pourquoi', 'comprendre comment on fait', 'tester directement', 'créer', 'faire / exécuter', 'structurées', 'libres', 'variable, inspirant'];
for (let i = 1; i <= 40; i++) {
  FIXTURE_SECTOR_AMBIVALENT[`secteur_${i}`] = optionsAmbivalent[i % optionsAmbivalent.length];
}
FIXTURE_SECTOR_AMBIVALENT['secteur_41'] = 'Des idées et des concepts';
FIXTURE_SECTOR_AMBIVALENT['secteur_42'] = 'Faire évoluer un système';
FIXTURE_SECTOR_AMBIVALENT['secteur_43'] = 'Les mécanismes et logiques';
FIXTURE_SECTOR_AMBIVALENT['secteur_44'] = 'Ressenti dans une transformation';
FIXTURE_SECTOR_AMBIVALENT['secteur_45'] = 'Expérimenter';
FIXTURE_SECTOR_AMBIVALENT['secteur_46'] = 'Améliorer quelque chose qui fonctionne';

/** Profil Sport : énergie, mouvement, performance, optimiser → attendu sport_evenementiel (ou top1 après refinement) */
export const FIXTURE_SECTOR_SPORT: Record<string, string> = { ...FIXTURE_SECTOR_TECH };
for (let i = 1; i <= 40; i++) {
  const id = `secteur_${i}`;
  if (i % 4 === 0) FIXTURE_SECTOR_SPORT[id] = 'faire / exécuter';
  else if (i % 4 === 1) FIXTURE_SECTOR_SPORT[id] = 'tester directement';
  else if (i % 4 === 2) FIXTURE_SECTOR_SPORT[id] = 'dynamique';
  else FIXTURE_SECTOR_SPORT[id] = 'action';
}
FIXTURE_SECTOR_SPORT['secteur_41'] = 'Des choses concrètes et tangibles';
FIXTURE_SECTOR_SPORT['secteur_42'] = 'Améliorer les capacités d\'un individu';
FIXTURE_SECTOR_SPORT['secteur_43'] = 'L\'énergie et le mouvement';
FIXTURE_SECTOR_SPORT['secteur_44'] = 'Mesurable dans des performances';
FIXTURE_SECTOR_SPORT['secteur_45'] = 'Optimiser';
FIXTURE_SECTOR_SPORT['secteur_46'] = 'Faire évoluer quelque chose de vivant';

/** Profil Éducation : personnes, transmettre, transformation, structurer → attendu education_formation */
export const FIXTURE_SECTOR_EDUCATION: Record<string, string> = {};
for (let i = 1; i <= 40; i++) {
  const id = `secteur_${i}`;
  if (i % 3 === 0) FIXTURE_SECTOR_EDUCATION[id] = 'comprendre le pourquoi';
  else if (i % 3 === 1) FIXTURE_SECTOR_EDUCATION[id] = 'structurées';
  else FIXTURE_SECTOR_EDUCATION[id] = 'comprendre le sens';
}
FIXTURE_SECTOR_EDUCATION['secteur_41'] = 'Des personnes et leurs dynamiques';
FIXTURE_SECTOR_EDUCATION['secteur_42'] = 'Améliorer les capacités d\'un individu';
FIXTURE_SECTOR_EDUCATION['secteur_43'] = 'L\'espace physique';
FIXTURE_SECTOR_EDUCATION['secteur_44'] = 'Ressenti dans une transformation';
FIXTURE_SECTOR_EDUCATION['secteur_45'] = 'Structurer';
FIXTURE_SECTOR_EDUCATION['secteur_46'] = 'Faire évoluer quelque chose de vivant';

/** Réponses métier type tech (pour analyze-job avec lockedSectorId = ingenierie_tech) */
export const FIXTURE_JOB_TECH: Record<string, string> = {};
for (let i = 1; i <= 20; i++) {
  FIXTURE_JOB_TECH[`metier_${i}`] = i % 3 === 0 ? 'maîtrises des outils précis (technique)' : 'analyser / résoudre';
}

/** Réponses métier type créa (pour analyze-job avec lockedSectorId = creation_design) */
export const FIXTURE_JOB_CREA: Record<string, string> = {};
for (let i = 1; i <= 20; i++) {
  FIXTURE_JOB_CREA[`metier_${i}`] = i % 2 === 0 ? 'inventes des idées (créatif)' : 'imaginer / créer';
}

export const EXPECTED_SECTOR_TECH = 'ingenierie_tech';
export const EXPECTED_SECTOR_CREA = 'creation_design';
export const EXPECTED_SECTOR_SPORT = 'sport_evenementiel';
export const EXPECTED_SECTOR_EDUCATION = 'education_formation';
export const MIN_CONFIDENCE_DETERMINED = 0.60;
export const DOMAIN_QUESTION_IDS_FIXTURE = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'] as const;
/** @deprecated Produit ne retourne plus undetermined; conservé pour tests legacy. */
export const EXPECTED_SECTOR_UNDETERMINED = 'undetermined';
export const MAX_CONFIDENCE_UNDETERMINED = 0.40;
