/**
 * Analyse métier — point d'entrée hybride (scoring + IA) à la fin du quiz métier
 *
 * Sortie : { jobId, jobName, description, reasonShort?, clusterId? }
 * Edge : scoring déterministe → clusters → candidats → OpenAI choisit 1 + rédaction.
 * Instrumentation : requestId, answersHash, single-flight, logs structurés.
 */

import { supabase } from './supabase';
import { updateUserProgress } from '../lib/userProgress';

const MIN_EXPECTED_ANSWERS = 10;

/** Génère un requestId unique (UUID v4–like) pour traçabilité client/serveur */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Normalise une réponse en string exploitable (évite "[object Object]") */
function normalizeAnswer(a) {
  if (a == null) return '';
  if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return String(a);
  return String(a.label ?? a.text ?? a.value ?? a.id ?? JSON.stringify(a));
}

/** Hash déterministe pour détecter si le payload change (canonical JSON → hex) */
function stableHash(obj) {
  const str = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/** Single-flight guard : évite double invocation (double submit / double effect) */
let _inFlightJob = null;

/** Timeout Edge (ms) : garantit que la Promise se résout ou rejette toujours */
const EDGE_TIMEOUT_MS = 22000;

/**
 * @typedef { { jobId: string, jobName: string, description: string } } AnalyzeJobResult
 */

/**
 * Analyse les réponses du quiz métier et retourne le métier proposé (format strict).
 *
 * @param {Object} answers_job - Réponses du quiz métier { questionId: optionTexte }
 * @param {Array} questions - Liste des questions (id, question, options) pour le contexte IA
 * @param {{ sectorId?: string, lockedSectorId?: string }} [opts] - optionnel : sectorId (legacy), lockedSectorId (secteur verrouillé avant quiz métier)
 * @returns {Promise<AnalyzeJobResult>}
 */
export async function analyzeJob(answers_job, questions, opts = {}) {
  if (_inFlightJob) {
    console.warn('[IA_JOB] GUARD — déjà en cours');
    return _inFlightJob;
  }

  await updateUserProgress({ metierQuizAnswers: answers_job });

  const requestId = generateRequestId();
  const rawAnswers = answers_job || {};
  const answerKeys = Object.keys(rawAnswers);
  const answerCount = answerKeys.length;
  const questionCount = questions?.length ?? 0;
  const questionsList = questions || [];

  const normalizedAnswers = Object.fromEntries(
    answerKeys.map((k) => [k, normalizeAnswer(rawAnswers[k])])
  );
  const canonical = { answers: normalizedAnswers, questionIds: questionsList.map((q) => q.id).sort() };
  const answersHash = stableHash(canonical);
  const sample = answerKeys.slice(0, 5).map((k) => {
    const q = questionsList.find((qu) => qu.id === k);
    return {
      id: k,
      question: (q?.question ?? q?.texte ?? k).toString().slice(0, 80),
      answer: normalizeAnswer(rawAnswers[k]).slice(0, 60),
    };
  });

  console.log('[IA_JOB] payload', JSON.stringify({ requestId, answerCount, questionCount, sample, answersHash }, null, 2));

  if (answerCount < MIN_EXPECTED_ANSWERS) {
    const MIN_EXPECTED = MIN_EXPECTED_ANSWERS;
    console.warn('[IA_JOB] INVALID_PAYLOAD', { requestId, answerCount, MIN_EXPECTED });
    throw new Error(`Réponses insuffisantes (${answerCount}/${MIN_EXPECTED}). Complète le quiz métier.`);
  }

  const body = {
    requestId,
    answers: rawAnswers,
    questions: questionsList,
  };
  const lockedSectorId = opts?.lockedSectorId ?? opts?.sectorId;
  if (lockedSectorId) {
    body.lockedSectorId = lockedSectorId;
  }
  // DEBUG
  console.log('[IA_JOB] bodySent →', JSON.stringify(body, null, 2));

  const run = async () => {
    const { data, error } = await supabase.functions.invoke('analyze-job', {
      body,
    });
    if (error) throw error;
    if (data?.source === 'disabled' || data?.source === 'quota' || data?.source === 'error_openai' || data?.source === 'invalid_payload') {
      throw new Error(data?.message ?? `IA indisponible (${data?.source}). Réessaie plus tard.`);
    }
    const picked = data?.pickedJobId ?? data?.jobId;
    if (!data || (data.source !== 'ok' && data.ok !== true) || typeof picked !== 'string') {
      throw new Error(data?.error ?? data?.message ?? 'Réponse invalide');
    }
    const result = {
      jobId: String(picked),
      pickedJobId: String(picked),
      jobName: String(data.jobName ?? data.jobId ?? picked),
      description: String(data.description ?? ''),
      reasonShort: typeof data.reasonShort === 'string' ? data.reasonShort.trim() : undefined,
      clusterId: typeof data.clusterId === 'string' ? data.clusterId : undefined,
      sectorIdLocked: typeof data.sectorIdLocked === 'string' ? data.sectorIdLocked : undefined,
      confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
      jobRanked: Array.isArray(data.jobRanked) ? data.jobRanked : undefined,
      top3: Array.isArray(data.jobRanked) ? data.jobRanked : Array.isArray(data.top3) ? data.top3 : undefined,
      undeterminedReason: typeof data.undeterminedReason === 'string' ? data.undeterminedReason : undefined,
      debug: data?.debug && typeof data.debug === 'object' ? data.debug : undefined,
      bullets: data.bullets && typeof data.bullets === 'object'
        ? { what_you_do: data.bullets.what_you_do ?? [], youll_like_if: data.bullets.youll_like_if ?? [] }
        : undefined,
    };
    console.log('[IA_JOB] response', JSON.stringify({
      requestId,
      jobId: result.jobId,
      clusterId: result.clusterId,
      reasonShort: result.reasonShort ? result.reasonShort.slice(0, 80) + (result.reasonShort.length > 80 ? '…' : '') : null,
    }));
    return result;
  };

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('JOB_TIMEOUT')), EDGE_TIMEOUT_MS);
  });

  _inFlightJob = (async () => {
    try {
      console.log('[IA_JOB] START', requestId);
      const result = await Promise.race([run(), timeoutPromise]);
      return result;
    } catch (err) {
      console.error('[IA_JOB] FATAL ERROR', err);
      throw err;
    } finally {
      console.log('[IA_JOB] END', requestId);
      _inFlightJob = null;
    }
  })();

  return _inFlightJob;
}
