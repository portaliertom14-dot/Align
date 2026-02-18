/**
 * Analyse secteur — point d'entrée IA à la fin du quiz secteur
 * Sortie STRICTE : { secteurId, secteurName, description }
 * Appel IA uniquement via Supabase Edge Function "analyze-sector".
 */

import { supabase } from './supabase';
import { SECTOR_NAMES } from '../lib/sectorAlgorithm';

const MIN_EXPECTED_ANSWERS = 20;
/** Timeout client (Edge a un timeout OpenAI 20s, on laisse marge réseau) */
const EDGE_TIMEOUT_MS = 35000;

/** Single-flight guard : évite double invocation (double submit / double effect) */
let _inFlightSector = null;

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

/**
 * @param {Object} answers - Réponses { questionId: optionTexte }
 * @param {Array} questions - Liste des questions (id, question/texte, options)
 * @param {Object} [opts] - Options d'affinement : { microAnswers: { refine_1: "A", ... }, candidateSectors: [id1, id2] }
 * @returns {Promise<{ secteurId, secteurName, description, confidence, needsRefinement, sectorRanked, microQuestions }>}
 */
export async function analyzeSector(answers, questions, opts = {}) {
  if (_inFlightSector) {
    console.warn('[IA_SECTOR] GUARD — déjà en cours');
    return _inFlightSector;
  }

  const requestId = generateRequestId();
  const rawAnswers = answers || {};
  const answerKeys = Object.keys(rawAnswers);
  const answerCount = answerKeys.length;
  const questionCount = questions?.length ?? 0;
  const questionsList = questions || [];
  const { microAnswers, candidateSectors } = opts;

  const normalizedAnswers = Object.fromEntries(
    answerKeys.map((k) => [k, normalizeAnswer(rawAnswers[k])])
  );
  const canonical = {
    answers: normalizedAnswers,
    questionIds: questionsList.map((q) => q.id).sort(),
  };
  const answersHash = stableHash(canonical);
  const sample = answerKeys.slice(0, 5).map((k) => {
    const q = questionsList.find((qu) => qu.id === k);
    return {
      id: k,
      question: (q?.texte ?? q?.question ?? k).toString().slice(0, 80),
      answer: normalizeAnswer(rawAnswers[k]).slice(0, 60),
    };
  });

  const isRefinementCall = microAnswers && typeof microAnswers === 'object' && Object.keys(microAnswers).length > 0 && Array.isArray(candidateSectors) && candidateSectors.length >= 2;
  console.log('[IA_SECTOR] payload', JSON.stringify({ requestId, answerCount, questionCount, isRefinementCall, sample: sample.slice(0, 2), answersHash }, null, 2));

  if (!isRefinementCall && answerCount < MIN_EXPECTED_ANSWERS) {
    const MIN_EXPECTED = MIN_EXPECTED_ANSWERS;
    console.warn('[IA_SECTOR] INVALID_PAYLOAD', { requestId, answerCount, MIN_EXPECTED });
    throw new Error(`Réponses insuffisantes (${answerCount}/${MIN_EXPECTED}). Complète le quiz secteur.`);
  }

  const body = {
    requestId,
    answersHash,
    answers: normalizedAnswers,
    questions: (questions || []).map((q) => ({ id: q.id, question: q.texte ?? q.question, options: q.options ?? [] })),
  };
  if (isRefinementCall) {
    body.microAnswers = microAnswers;
    body.candidateSectors = candidateSectors.slice(0, 2);
  }

  _inFlightSector = (async () => {
    try {
      console.log('[IA_SECTOR] START', requestId);
      const invokePromise = supabase.functions.invoke('analyze-sector', { body });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("L'analyse a pris trop de temps. Réessaie.")), EDGE_TIMEOUT_MS);
      });
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]);

      console.log('[IA_SECTOR] response', JSON.stringify({ requestId, source: data?.source, secteurId: data?.secteurId, secteurName: data?.secteurName, ok: data?.ok ?? (data?.source === 'ok'), promptVersion: data?.promptVersion, whitelistVersion: data?.whitelistVersion }, null, 2));

      if (error) {
        console.error('[IA_SECTOR] EDGE ERROR', error);
        const name = error?.name ?? '';
        const msg = String(error?.message ?? '');
        // FunctionsFetchError + "access control" = souvent requête échouée avant réponse (connexion perdue, pas de CORS dans la réponse)
        const isNetworkOrFetch =
          name === 'FunctionsFetchError' ||
          /fetch|network|request|access control|cors/i.test(name) ||
          /fetch|network|request|connexion|connection|perdu|lost|access control/i.test(msg);
        if (isNetworkOrFetch) {
          throw new Error('Problème de connexion. Vérifie ton réseau et réessaie.');
        }
        throw error;
      }
      if (data?.source === 'disabled' || data?.source === 'quota' || data?.source === 'error_openai' || data?.source === 'invalid_payload') {
        throw new Error(data?.message ?? `IA indisponible (${data?.source}). Réessaie plus tard.`);
      }
      const picked = data?.pickedSectorId ?? data?.secteurId;
      if (!data || data.ok !== true || typeof picked !== 'string') {
        const msg = data?.error ?? data?.message;
        if (data?.ok === false && !msg) {
          throw new Error('Problème de connexion. Vérifie ton réseau et réessaie.');
        }
        throw new Error(msg ?? 'Réponse invalide');
      }

      const sectorRanked = Array.isArray(data.sectorRanked) ? data.sectorRanked : (Array.isArray(data.top2) ? data.top2 : []);
      const microQuestions = Array.isArray(data.microQuestions) ? data.microQuestions : [];
      const needsRefinement = data.needsRefinement === true;
      return {
        secteurId: String(picked),
        pickedSectorId: String(picked),
        secteurName: String(data.secteurName ?? SECTOR_NAMES[picked] ?? picked),
        description: String(data.description ?? ''),
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        sectorRanked,
        top2: sectorRanked.slice(0, 2),
        microQuestions,
        needsRefinement,
        profileSummary: typeof data.profileSummary === 'string' ? data.profileSummary : undefined,
        contradictions: Array.isArray(data.contradictions) ? data.contradictions : undefined,
        debug: data?.debug && typeof data.debug === 'object' ? data.debug : undefined,
      };
    } catch (err) {
      console.error('[IA_SECTOR] FATAL ERROR', err);
      throw err;
    } finally {
      console.log('[IA_SECTOR] END', requestId);
      _inFlightSector = null;
    }
  })();

  return _inFlightSector;
}
