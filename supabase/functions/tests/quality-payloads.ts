/**
 * Tests manuels — Qualité & standardisation (ÉTAPE 6)
 *
 * Vérifications à faire pour chaque payload :
 * - JSON valide (structure attendue par l’Edge Function)
 * - secteurId / jobId dans la whitelist (_shared/prompts.ts)
 * - description (si présente) ≤ 240 caractères, 2–3 phrases
 *
 * Utilisation : copier un payload dans le body des appels POST vers
 * - analyze-sector  → POST .../analyze-sector
 * - analyze-job    → POST .../analyze-job
 */

import { SECTOR_IDS, JOB_IDS } from '../_shared/prompts.ts';
import { DESCRIPTION_MAX_LENGTH } from '../_shared/validation.ts';

// --- Payloads types pour analyze-sector ---

export const sectorPayload1 = {
  answers: {
    Q1: 'Travailler en équipe sur des projets techniques',
    Q2: 'Résoudre des problèmes complexes',
    Q3: 'Innover et créer des outils',
  },
  questions: [
    { id: 'Q1', question: 'Tu préfères…', options: ['A', 'B', 'C'] },
    { id: 'Q2', question: 'Tu aimes…', options: ['A', 'B', 'C'] },
    { id: 'Q3', question: 'Tu vises…', options: ['A', 'B', 'C'] },
  ],
};

export const sectorPayload2 = {
  answers: {
    Q1: 'Négocier et convaincre',
    Q2: 'Gérer des budgets',
    Q3: 'Développer une activité',
  },
  questions: [
    { id: 'Q1', question: 'Tu préfères…', options: ['A', 'B', 'C'] },
    { id: 'Q2', question: 'Tu aimes…', options: ['A', 'B', 'C'] },
    { id: 'Q3', question: 'Tu vises…', options: ['A', 'B', 'C'] },
  ],
};

/** Payload avec description longue (à reformater côté fonction : max 240 car.) */
export const sectorPayload3 = {
  answers: {
    Q1: 'Aider les autres',
    Q2: 'Comprendre les comportements',
    Q3: 'Enseigner ou former',
  },
  questions: [
    { id: 'Q1', question: 'Tu préfères…', options: ['A', 'B', 'C'] },
    { id: 'Q2', question: 'Tu aimes…', options: ['A', 'B', 'C'] },
    { id: 'Q3', question: 'Tu vises…', options: ['A', 'B', 'C'] },
  ],
};

// --- Payloads types pour analyze-job ---

export const jobPayload1 = {
  answers_job: {
    Q1: { label: 'Coder des fonctionnalités', value: 'A' },
    Q2: { label: 'Travailler en agile', value: 'B' },
    Q3: { label: 'Monter en compétence technique', value: 'C' },
  },
  questions: [
    { id: 'Q1', question: 'Tu préfères…', options: [{ label: 'A', value: 'A' }, { label: 'B', value: 'B' }, { label: 'C', value: 'C' }] },
    { id: 'Q2', question: 'Tu aimes…', options: [] },
    { id: 'Q3', question: 'Tu vises…', options: [] },
  ],
};

export const jobPayload2 = {
  answers_job: {
    Q1: 'Plaidoyer et défendre des clients',
    Q2: 'Analyser des dossiers',
    Q3: 'Rédiger des actes',
  },
  questions: [
    { id: 'Q1', question: 'Tu préfères…', options: [] },
    { id: 'Q2', question: 'Tu aimes…', options: [] },
    { id: 'Q3', question: 'Tu vises…', options: [] },
  ],
};

export const jobPayload3 = {
  answers_job: {
    Q1: 'Créer des visuels',
    Q2: 'Travailler avec des outils numériques',
    Q3: 'Gérer des projets créatifs',
  },
  questions: [],
};

// --- Assertions / vérifications (à exécuter manuellement ou dans un test runner) ---

export function assertSectorWhitelist(secteurId: string): boolean {
  return (SECTOR_IDS as readonly string[]).includes(secteurId);
}

export function assertJobWhitelist(jobId: string): boolean {
  return (JOB_IDS as readonly string[]).includes(jobId);
}

export function assertDescriptionLength(description: string): boolean {
  return typeof description === 'string' && description.length <= DESCRIPTION_MAX_LENGTH;
}

/** Vérifier la réponse attendue de analyze-sector (JSON + whitelist + longueur). */
export function checkSectorResponse(body: { secteurId?: string; secteurName?: string; description?: string }): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    errors.push('Réponse non-objjet');
    return { ok: false, errors };
  }
  if (!body.secteurId) errors.push('secteurId manquant');
  else if (!assertSectorWhitelist(body.secteurId)) errors.push(`secteurId "${body.secteurId}" hors whitelist`);
  if (body.description !== undefined && !assertDescriptionLength(body.description)) {
    errors.push(`description trop longue: ${(body.description as string).length} > ${DESCRIPTION_MAX_LENGTH}`);
  }
  return { ok: errors.length === 0, errors };
}

/** Vérifier la réponse attendue de analyze-job (JSON + whitelist + longueur). */
export function checkJobResponse(body: { jobId?: string; jobName?: string; description?: string }): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    errors.push('Réponse non-objjet');
    return { ok: false, errors };
  }
  if (!body.jobId) errors.push('jobId manquant');
  else if (!assertJobWhitelist(body.jobId)) errors.push(`jobId "${body.jobId}" hors whitelist`);
  if (body.description !== undefined && !assertDescriptionLength(body.description)) {
    errors.push(`description trop longue: ${(body.description as string).length} > ${DESCRIPTION_MAX_LENGTH}`);
  }
  return { ok: errors.length === 0, errors };
}
