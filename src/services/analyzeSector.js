/**
 * Analyse secteur — point d'entrée IA à la fin du quiz secteur
 * Sortie STRICTE : { secteurId, secteurName, description }
 * Appel IA uniquement via Supabase Edge Function "analyze-sector".
 * CORS/Auth : supabase.functions.invoke() envoie automatiquement Authorization Bearer si session.
 */

import { supabase } from './supabase';
import { SECTOR_NAMES } from '../lib/sectorAlgorithm';
import { quizSecteurQuestions } from '../data/quizSecteurQuestions';

/** Nombre de réponses attendues (46 questions dont Q41–Q46 domaine cognitif). */
const EXPECTED_ANSWERS_COUNT = 50;
const MIN_EXPECTED_ANSWERS = 20;
/** IDs Q41–Q46. Réponses envoyées en { label, value } : le label (texte de l’option) est requis pour computeDomainTagsServer côté Edge. */
const DOMAIN_QUESTION_IDS = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'];
/** IDs Q47–Q50 pour computeMicroDomainScores côté Edge. */
const MICRO_DOMAIN_QUESTION_IDS = ['secteur_47', 'secteur_48', 'secteur_49', 'secteur_50'];
/** Timeout client (Edge a un timeout OpenAI 20s, on laisse marge réseau) */
const EDGE_TIMEOUT_MS = 35000;
/** Timeout affinage (micro-questions) — un peu plus court pour débloquer l'UI plus vite */
const EDGE_REFINEMENT_TIMEOUT_MS = 25000;
/** Nombre de retries en cas d'échec réseau/CORS (1 = 1 tentative supplémentaire) */
const MAX_RETRIES = 1;

/** Activer les logs détaillés (URL, headers, status, body, erreur). Mettre true en dev pour debug CORS/auth. */
export const DEBUG_ANALYZE_SECTOR = typeof __DEV__ !== 'undefined' && __DEV__ && (typeof process !== 'undefined' && process.env?.DEBUG_ANALYZE_SECTOR === 'true');

/** Single-flight guard : évite double invocation (double submit / double effect) */
let _inFlightSector = null;

/** Cache résultat par (answersHash + opts) pour éviter recalcul identique. Utilisé uniquement en dev pour ne pas réutiliser en prod une ancienne réponse (ex. sectorRanked court). */
let _lastAnalyzeSectorKey = null;
let _lastAnalyzeSectorResult = null;

/** Génère un requestId unique (UUID v4–like) pour traçabilité client/serveur */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Normalise une réponse en string (label) pour affichage. */
function normalizeAnswer(a) {
  if (a == null) return '';
  if (typeof a === 'string' || typeof a === 'number' || typeof a === 'boolean') return String(a);
  return String(a.label ?? a.text ?? a.value ?? a.id ?? JSON.stringify(a));
}

/**
 * Mappe la réponse utilisateur vers { label, value } avec value = "A"|"B"|"C" selon l'index de l'option.
 * Évite le match texte fragile. Si aucune option ne correspond → null (appelant doit throw).
 */
function mapAnswerToLabelValue(questionId, rawAnswer, questionOptions) {
  const opts = Array.isArray(questionOptions) ? questionOptions : [];
  const label = normalizeAnswer(rawAnswer).trim();
  const valueMap = { 0: 'A', 1: 'B', 2: 'C' };
  if (label === 'A' || label === 'B' || label === 'C') {
    const idx = { A: 0, B: 1, C: 2 }[label];
    if (opts[idx] != null) {
      const o = opts[idx];
      const optLabel = typeof o === 'object' && o != null ? String(o.label ?? o.value ?? '') : String(o);
      return { label: optLabel.trim() || label, value: label };
    }
  }
  for (let i = 0; i < opts.length; i++) {
    const opt = opts[i];
    const optLabel = typeof opt === 'object' && opt != null && (opt.label != null || opt.value != null)
      ? String(opt.label ?? opt.value ?? '')
      : String(opt ?? '');
    if (optLabel.trim() === label || (typeof rawAnswer === 'object' && rawAnswer != null && rawAnswer.value === valueMap[i])) {
      return { label: optLabel.trim() || valueMap[i], value: valueMap[i] ?? ['A', 'B', 'C'][i] };
    }
  }
  return null;
}

/** Hash déterministe pour détecter si le payload change (canonical JSON → hex) */
function stableHash(obj) {
  const str = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/**
 * Audit des réponses : identifie les IDs manquants pour éviter 45/46.
 * actualIds = ids pour lesquels answers[id] a une valeur (value ou label non vide).
 */
function computeMissingIds(questions, answers) {
  const expectedIds = (questions || []).map((q) => q.id);
  const actualIds = expectedIds.filter((id) => {
    const a = answers[id];
    if (a == null) return false;
    const v = (a && (a.value ?? a.label ?? (typeof a === 'string' ? a : '')));
    const s = typeof v === 'string' ? v.trim() : String(v || '').trim();
    return s.length > 0;
  });
  const missing = expectedIds.filter((id) => !actualIds.includes(id));
  const lastAnsweredId = actualIds.length > 0 ? actualIds[actualIds.length - 1] : null;
  const domaineIdsPresent = DOMAIN_QUESTION_IDS.filter((id) => actualIds.includes(id));
  return {
    expectedCount: expectedIds.length,
    actualCount: actualIds.length,
    missing,
    expectedIds,
    actualIds,
    lastAnsweredId,
    domaineIdsPresent,
  };
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
  const rawAnswers = answers ?? {};
  const questionsList = (questions ?? []).length > 0 ? (questions ?? []) : quizSecteurQuestions;
  if (!questionsList || questionsList.length === 0) {
    throw new Error('questions manquantes dans analyzeSector: impossible de valider 46 ids');
  }

  const expectedIds = questionsList.map((q) => q.id).filter(Boolean);
  const actualIds = Object.keys(rawAnswers).filter((id) => {
    const a = rawAnswers[id];
    const v = a != null && (a.value ?? a.label ?? (typeof a === 'string' ? a : ''));
    return String(v ?? '').trim().length > 0;
  });
  const missingIds = expectedIds.filter((id) => !actualIds.includes(id));
  const extraIds = actualIds.filter((id) => !expectedIds.includes(id));
  const lastAnsweredId = expectedIds.filter((id) => actualIds.includes(id)).pop() ?? null;
  const hasDomain = expectedIds.slice(-6);

  console.log('[IA_SECTOR_DEBUG]', {
    expectedCount: expectedIds.length,
    actualCount: actualIds.length,
    missingIds,
    extraIds,
    lastAnsweredId,
    hasDomain,
  });

  const answerKeys = Object.keys(rawAnswers);
  const answerCount = answerKeys.length;
  const questionCount = questionsList.length;
  const { microAnswers, candidateSectors, refinementCount: refinementCountOpt } = opts;
  const refinementCount = typeof refinementCountOpt === 'number' && refinementCountOpt >= 0 ? Math.min(10, Math.floor(refinementCountOpt)) : 0;

  const isRefinementCall = microAnswers && typeof microAnswers === 'object' && Object.keys(microAnswers).length > 0 && Array.isArray(candidateSectors) && candidateSectors.length >= 2;
  const idsSent = Object.keys(rawAnswers).sort();
  const domaineAnswers = DOMAIN_QUESTION_IDS.reduce((acc, id) => {
    const a = rawAnswers[id];
    acc[id] = a != null ? (a && (a.value ?? a.label ?? (typeof a === 'string' ? a : ''))) : undefined;
    return acc;
  }, {});

  console.log('[IA_SECTOR] AUDIT_INPUT', JSON.stringify({
    requestId,
    expectedCount: expectedIds.length,
    actualCount: actualIds.length,
    missingIds: missingIds.length > 0 ? missingIds : undefined,
    lastAnsweredId,
    domaineIdsPresent: DOMAIN_QUESTION_IDS.filter((id) => actualIds.includes(id)),
    idsSent: idsSent.length <= 16 ? idsSent : [...idsSent.slice(0, 8), '...', ...idsSent.slice(-8)],
    domaineAnswers: Object.keys(domaineAnswers).length ? domaineAnswers : undefined,
  }));

  if (!isRefinementCall && missingIds.length > 0) {
    console.warn('[IA_SECTOR] INVALID_PAYLOAD', { requestId, expectedCount, actualCount, missingIds });
    throw new Error(`Réponses insuffisantes (${actualIds.length}/${expectedIds.length}). Missing: ${missingIds.join(', ')}`);
  }
  if (!isRefinementCall && actualIds.length < MIN_EXPECTED_ANSWERS) {
    throw new Error(`Réponses insuffisantes (${actualIds.length}/${MIN_EXPECTED_ANSWERS}). Complète le quiz secteur.`);
  }
  if (!isRefinementCall && DOMAIN_QUESTION_IDS.some((id) => !rawAnswers[id] || String(rawAnswers[id]?.value ?? rawAnswers[id]?.label ?? rawAnswers[id] ?? '').trim() === '')) {
    const missingDomain = DOMAIN_QUESTION_IDS.filter((id) => !rawAnswers[id] || String(rawAnswers[id]?.value ?? rawAnswers[id]?.label ?? rawAnswers[id] ?? '').trim() === '');
    throw new Error(`Réponses domaine manquantes (Q41–Q46) : ${missingDomain.join(', ')}. Réponds aux questions du quiz.`);
  }
  if (!isRefinementCall && MICRO_DOMAIN_QUESTION_IDS.some((id) => !rawAnswers[id] || String(rawAnswers[id]?.value ?? rawAnswers[id]?.label ?? rawAnswers[id] ?? '').trim() === '')) {
    const missingMicro = MICRO_DOMAIN_QUESTION_IDS.filter((id) => !rawAnswers[id] || String(rawAnswers[id]?.value ?? rawAnswers[id]?.label ?? rawAnswers[id] ?? '').trim() === '');
    throw new Error(`Réponses micro-domaine manquantes (Q47–Q50) : ${missingMicro.join(', ')}. Réponds aux 4 dernières questions.`);
  }

  const normalizedAnswers = {};
  for (const q of questionsList) {
    const qId = q.id;
    const raw = rawAnswers[qId];
    if (raw == null && isRefinementCall) continue;
    if (raw == null || String(raw).trim() === '') {
      if (!isRefinementCall) throw new Error(`Réponse manquante pour la question ${qId}. Complète toutes les questions.`);
      continue;
    }
    const options = q.options ?? [];
    const mapped = mapAnswerToLabelValue(qId, raw, options);
    if (!mapped) {
      const preview = normalizeAnswer(raw).slice(0, 50);
      throw new Error(`Réponse invalide pour la question ${qId}: aucune option ne correspond à « ${preview} ». Choisis une des options proposées (A, B ou C).`);
    }
    normalizedAnswers[qId] = mapped;
  }
  const canonical = { answers: normalizedAnswers, questionIds: expectedIds };
  const answersHash = stableHash(canonical);

  const coreIds = expectedIds.filter((id) => !DOMAIN_QUESTION_IDS.includes(id));
  const coreAnswers = {};
  coreIds.forEach((id) => { if (normalizedAnswers[id]) coreAnswers[id] = normalizedAnswers[id]; });
  const domainAnswersPayload = {};
  DOMAIN_QUESTION_IDS.forEach((id) => {
    if (normalizedAnswers[id]) domainAnswersPayload[id] = normalizedAnswers[id];
  });
  if (DOMAIN_QUESTION_IDS.some((id) => !domainAnswersPayload[id]?.label && !isRefinementCall)) {
    console.warn('[IA_SECTOR] domain answers should include label for server-side domain tags (Q41–Q46)');
  }

  console.log('[IA_SECTOR] payload', JSON.stringify({ requestId, answerCount, questionCount, isRefinementCall, answersHash, coreCount: Object.keys(coreAnswers).length, domainCount: Object.keys(domainAnswersPayload).length }, null, 2));

  const sectorCacheKey = stableHash({
    answersHash,
    micro: isRefinementCall ? (microAnswers ?? {}) : {},
    candidates: (candidateSectors ?? []).slice(0, 2),
    refinementCount,
  });
  const useCache = typeof __DEV__ !== 'undefined' && __DEV__;
  if (useCache && _lastAnalyzeSectorKey === sectorCacheKey && _lastAnalyzeSectorResult) {
    if (__DEV__) console.log('[CACHE_HIT] analyzeSector — same inputs, skip API');
    return Promise.resolve({ ..._lastAnalyzeSectorResult });
  }

  const body = {
    requestId,
    answersHash,
    answers: normalizedAnswers,
    coreAnswers,
    domainAnswers: domainAnswersPayload,
    questions: (questionsList ?? []).map((q) => ({ id: q.id, question: q.texte ?? q.question, options: q.options ?? [] })),
  };
  if (isRefinementCall) {
    body.microAnswers = microAnswers;
    body.candidateSectors = candidateSectors.slice(0, 2);
    body.refinementCount = refinementCount;
  }

  const timeoutMs = isRefinementCall ? EDGE_REFINEMENT_TIMEOUT_MS : EDGE_TIMEOUT_MS;

  _inFlightSector = (async () => {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const startMs = Date.now();
      try {
        console.log('[IA_SECTOR] START', requestId, attempt > 0 ? `(retry ${attempt})` : '');
        if (DEBUG_ANALYZE_SECTOR) {
          const baseUrl = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL
            ? process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '')
            : 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
          const url = `${baseUrl}/functions/v1/analyze-sector`;
          const { data: sessionData } = await supabase.auth.getSession();
          const hasAuth = !!sessionData?.session?.access_token;
          console.log('[IA_SECTOR] DEBUG', { url, hasAuthorization: hasAuth, attempt, requestId });
        }
        const invokePromise = supabase.functions.invoke('analyze-sector', { body });
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("L'analyse a pris trop de temps. Réessaie.")), timeoutMs);
        });
        const result = await Promise.race([invokePromise, timeoutPromise]);
        const { data, error } = result || {};
        const durationMs = Date.now() - startMs;

        if (DEBUG_ANALYZE_SECTOR) {
          console.log('[IA_SECTOR] DEBUG response', { requestId, durationMs, hasData: !!data, hasError: !!error, errorName: error?.name, errorMessage: error?.message, status: data?.ok === true ? 'ok' : data?.source ?? 'unknown' });
        }
        console.log('[IA_SECTOR] response', JSON.stringify({ requestId, durationMs, source: data?.source, secteurId: data?.secteurId, ok: data?.ok ?? (data?.source === 'ok') }, null, 2));

        if (error) {
          lastError = error;
          const name = error?.name ?? '';
          const msg = String(error?.message ?? '');
          const isNetworkOrFetch =
            name === 'FunctionsFetchError' ||
            /fetch|network|request|access control|cors/i.test(name) ||
            /fetch|network|request|connexion|connection|perdu|lost|access control/i.test(msg);
          if (isNetworkOrFetch && attempt < MAX_RETRIES) {
            console.warn('[IA_SECTOR] retry after network error', { requestId, attempt: attempt + 1 });
            await new Promise((r) => setTimeout(r, 800));
            continue;
          }
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
        const sectorRankedCore = Array.isArray(data.sectorRankedCore) ? data.sectorRankedCore : [];
        const microQuestions = Array.isArray(data.refinementQuestions) ? data.refinementQuestions : (Array.isArray(data.microQuestions) ? data.microQuestions : []);
        const needsRefinement = data.needsRefinement === true;
        const refinementRequired = data.refinementRequired === true;
        const forcedDecision = data.forcedDecision === true;
        const confidenceVal = typeof data.confidence === 'number' ? data.confidence : 0;
        const top2 = sectorRanked.slice(0, 2);
        console.log('[IA_SECTOR] result', JSON.stringify({ requestId, coreTop5: sectorRankedCore.slice(0, 5), finalTop: top2, confidence: confidenceVal }));
        const sectorResult = {
          secteurId: String(picked),
          pickedSectorId: String(picked),
          secteurName: String(data.secteurName ?? SECTOR_NAMES[picked] ?? picked),
          description: String(data.description ?? ''),
          sectorDescriptionText: typeof data.sectorDescriptionText === 'string' ? data.sectorDescriptionText.trim() : undefined,
          confidence: confidenceVal,
          sectorRanked,
          sectorRankedCore: sectorRankedCore.length > 0 ? sectorRankedCore : undefined,
          reasoningShort: typeof data.reasoningShort === 'string' ? data.reasoningShort : undefined,
          top2,
          microQuestions,
          needsRefinement: needsRefinement || refinementRequired,
          refinementRequired,
          forcedDecision,
          profileSummary: typeof data.profileSummary === 'string' ? data.profileSummary : undefined,
          contradictions: Array.isArray(data.contradictions) ? data.contradictions : undefined,
          debug: data?.debug && typeof data.debug === 'object' ? data.debug : undefined,
        };
        if (useCache) {
          _lastAnalyzeSectorKey = sectorCacheKey;
          _lastAnalyzeSectorResult = { ...sectorResult };
        }
        return sectorResult;
      } catch (err) {
        lastError = err;
        const durationMs = Date.now() - startMs;
        console.error('[IA_SECTOR] FATAL ERROR', { requestId, attempt, durationMs, errorCode: err?.message ?? err?.name });
        if (DEBUG_ANALYZE_SECTOR) {
          console.log('[IA_SECTOR] DEBUG error', { requestId, errorName: err?.name, errorMessage: err?.message });
        }
        const isNetwork = /connexion|temps|réseau|network|fetch|access control|cors/i.test(String(err?.message ?? ''));
        if (isNetwork && attempt < MAX_RETRIES) {
          console.warn('[IA_SECTOR] retry after error', { requestId, attempt: attempt + 1 });
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        throw err;
      }
    }
    throw lastError || new Error('Problème de connexion. Vérifie ton réseau et réessaie.');
  })().finally(() => {
    console.log('[IA_SECTOR] END', requestId);
    _inFlightSector = null;
  });

  return _inFlightSector;
}
