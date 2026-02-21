/**
 * 3 fixtures reproductibles — secteur + métier.
 * 1) Tech/data => ingenierie_tech, confidence > 0.5
 * 2) Créa/design => creation_design, confidence > 0.5
 * 3) Ambivalent => undetermined, confidence < 0.35
 */

import { stableAnswersHash } from './types.ts';

export const FIXTURE_1_TECH_DATA = {
  name: 'tech/data → ingenierie_tech',
  answers_secteur: (() => {
    const out: Record<string, string> = {};
    for (let i = 1; i <= 40; i++) {
      out[`secteur_${i}`] = i <= 24 ? 'comprendre le pourquoi' : 'structurées';
    }
    return out;
  })(),
  answers_metier_common: (() => {
    const out: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      out[`metier_common_${i}`] = 'maîtrises des outils précis (technique)';
    }
    return out;
  })(),
  expected_secteur: {
    secteurId: 'ingenierie_tech',
    confidenceMin: 0.5,
  },
  expected_job_in_sector: ['developpeur', 'data_scientist', 'cybersecurity', 'devops', 'tech_lead', 'architect_software'],
};

export const FIXTURE_2_CREA_DESIGN = {
  name: 'créa/design → creation_design',
  answers_secteur: (() => {
    const out: Record<string, string> = {};
    for (let i = 1; i <= 40; i++) {
      out[`secteur_${i}`] = i <= 24 ? 'créer' : 'flexibles';
    }
    return out;
  })(),
  answers_metier_common: (() => {
    const out: Record<string, string> = {};
    for (let i = 1; i <= 12; i++) {
      out[`metier_common_${i}`] = 'inventes des idées (créatif)';
    }
    return out;
  })(),
  expected_secteur: {
    secteurId: 'creation_design',
    confidenceMin: 0.5,
  },
  expected_job_in_sector: ['graphiste', 'webdesigner', 'designer', 'ux_designer', 'directeur_artistique', 'motion_designer'],
};

export const FIXTURE_3_AMBIVALENT = {
  name: 'ambivalent → undetermined',
  answers_secteur: (() => {
    const out: Record<string, string> = {};
    const opts = ['comprendre le pourquoi', 'créer', 'tester directement'];
    for (let i = 1; i <= 40; i++) {
      out[`secteur_${i}`] = opts[i % 3];
    }
    return out;
  })(),
  answers_metier_common: (() => {
    const out: Record<string, string> = {};
    const opts = ['maîtrises des outils précis (technique)', 'inventes des idées (créatif)', 'agis vite sur le terrain (opérationnel)'];
    for (let i = 1; i <= 12; i++) {
      out[`metier_common_${i}`] = opts[i % 3];
    }
    return out;
  })(),
  expected_secteur: {
    secteurId: 'undetermined',
    confidenceMax: 0.35,
  },
};

export function getFixtureAnswersHash(fixture: typeof FIXTURE_1_TECH_DATA): string {
  return stableAnswersHash({ ...fixture.answers_secteur, ...fixture.answers_metier_common });
}
