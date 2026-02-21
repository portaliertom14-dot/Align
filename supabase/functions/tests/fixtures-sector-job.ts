/**
 * Fixtures pour tests reproductibles secteur + métier.
 * 1) Tech/data → ingenierie_tech, confidence > 0.5
 * 2) Créa/design → creation_design, confidence > 0.5
 * 3) Ambivalent → undetermined, confidence < 0.35
 */

export const FIXTURE_TECH_DATA_SECTEUR_ANSWERS: Record<string, string> = {};
for (let i = 1; i <= 40; i++) {
  const qId = `secteur_${i}`;
  if (i <= 24) {
    FIXTURE_TECH_DATA_SECTEUR_ANSWERS[qId] = 'comprendre le pourquoi';
  } else {
    FIXTURE_TECH_DATA_SECTEUR_ANSWERS[qId] = 'structurées';
  }
}

export const FIXTURE_CREA_DESIGN_SECTEUR_ANSWERS: Record<string, string> = {};
for (let i = 1; i <= 40; i++) {
  const qId = `secteur_${i}`;
  if (i <= 24) {
    FIXTURE_CREA_DESIGN_SECTEUR_ANSWERS[qId] = 'créer';
  } else {
    FIXTURE_CREA_DESIGN_SECTEUR_ANSWERS[qId] = 'flexibles';
  }
}

export const FIXTURE_AMBIVALENT_SECTEUR_ANSWERS: Record<string, string> = {};
const optionsAmbivalent = ['comprendre le pourquoi', 'créer', 'tester directement'];
for (let i = 1; i <= 40; i++) {
  FIXTURE_AMBIVALENT_SECTEUR_ANSWERS[`secteur_${i}`] = optionsAmbivalent[i % 3];
}

export const EXPECTED_TECH_DATA = {
  secteurId: 'ingenierie_tech',
  confidenceMin: 0.5,
};

export const EXPECTED_CREA_DESIGN = {
  secteurId: 'creation_design',
  confidenceMin: 0.5,
};

export const EXPECTED_AMBIVALENT = {
  secteurId: 'undetermined',
  confidenceMax: 0.35,
};
