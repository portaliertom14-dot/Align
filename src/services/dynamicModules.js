/**
 * Chargement des modules dynamiques (simulation métier + test secteur) par chapitre.
 * Appel Edge Function generate-dynamic-modules — cache côté serveur (content_cache).
 * AUCUN fallback silencieux : si l'IA échoue → throw + UI "Génération indisponible" + Réessayer.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const DEFAULT_CONTENT_VERSION = 'v1';
const PERSONA_CLUSTER_DEFAULT = 'default';
const CALL_TIMEOUT_MS = 25000;

/** Cache mémoire par clé (sectorId:jobId:contentVersion:personaCluster). */
const memoryCache = new Map();

/** Génère un traceId unique pour tracer l'appel et la réponse. */
function genTraceId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Normalise personaCluster : absent ou vide => "default", max 8 caractères.
 * @param {string} [personaCluster]
 * @returns {string}
 */
function normalizePersonaCluster(personaCluster) {
  const s = typeof personaCluster === 'string' ? personaCluster.trim() : '';
  return s ? s.slice(0, 8) : PERSONA_CLUSTER_DEFAULT;
}

/**
 * Appelle l'Edge Function et retourne le payload.
 * THROW en cas d'erreur — aucun fallback. L'appelant doit afficher "Génération indisponible" + Réessayer.
 *
 * @param {string} sectorId
 * @param {string} jobId
 * @param {string} [contentVersion='v1']
 * @param {string} [personaCluster]
 * @param {{ chapitreId?: string|number, moduleIndex?: number }} [context] - pour logs uniquement
 * @returns {Promise<{ source: 'ok', sectorId, jobId, personaCluster, contentVersion, language, chapters }>}
 */
export async function fetchDynamicModules(
  sectorId,
  jobId,
  contentVersion = DEFAULT_CONTENT_VERSION,
  personaCluster,
  context = {}
) {
  const traceId = genTraceId();
  const env = {
    __DEV__: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
    platform: Platform.OS,
    appVersion: Constants.expoConfig?.version ?? '1.0.0',
  };
  const cluster = normalizePersonaCluster(personaCluster);
  const key = `${(sectorId || '').trim()}:${(jobId || '').trim()}:${(contentVersion || DEFAULT_CONTENT_VERSION).trim()}:${cluster}`;

  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (cached.source === 'ok') return cached;
    throw new Error('Génération indisponible. Réessayez.');
  }

  const payload = {
    sectorId: (sectorId || '').trim(),
    jobId: (jobId || '').trim(),
    contentVersion: (contentVersion || DEFAULT_CONTENT_VERSION).trim(),
    language: 'fr',
    personaCluster: cluster,
    traceId,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadSizeBytes = new TextEncoder().encode(payloadStr).length;
  const payloadKeys = Object.keys(payload);

  let userId = null;
  try {
    const { data: session } = await supabase.auth.getSession();
    userId = session?.session?.user?.id ?? null;
  } catch (_) {}

  let responseStatus = null;
  let hasData = false;
  let hasError = false;
  let errorCode = null;
  let errorMessage = null;
  let responseHeadersJson = null;

  try {
    const { data, error, response } = await supabase.functions.invoke('generate-dynamic-modules', {
      body: payload,
      timeout: CALL_TIMEOUT_MS,
    });

    const resp = response ?? error?.context;
    if (resp) {
      responseStatus = resp.status ?? responseStatus;
      try {
        const h = {};
        resp.headers?.forEach?.((v, k) => { h[k] = v; });
        responseHeadersJson = Object.keys(h).length ? h : null;
      } catch (_) {}
    }
    if (error) {
      hasError = true;
      errorMessage = error?.message ?? String(error);
      if (error?.context) {
        try {
          errorCode = error.context?.status ?? error.context?.statusText ?? null;
          if (responseStatus == null && error.context?.status != null)
            responseStatus = error.context.status;
        } catch (_) {}
      }
    }
    hasData = data != null;

    if (error) {
      const status = responseStatus ?? errorCode;
      const msg = status === 504
        ? 'Le serveur a mis trop de temps à répondre. Réessayez.'
        : status === 546
          ? `Erreur réseau (${status}). Le service peut être temporairement indisponible.`
          : `Génération indisponible (${status ?? 'erreur'}). Réessayez.`;
      const e = new Error(msg);
      e.status = status;
      e.code = status === 503 ? 'AI_DISABLED' : status === 429 ? 'QUOTA_EXCEEDED' : 'ERROR';
      throw e;
    }

    if (responseStatus && responseStatus !== 200) {
      const e = new Error(`Génération indisponible (status ${responseStatus}). Réessayez.`);
      e.status = responseStatus;
      e.code = responseStatus === 503 ? 'AI_DISABLED' : responseStatus === 429 ? 'QUOTA_EXCEEDED' : 'ERROR';
      throw e;
    }

    if (!data) {
      const e = new Error('Génération indisponible. Réessayez.');
      e.code = 'ERROR';
      throw e;
    }
    if (data.ok === false || data.error) {
      const err = data.error ?? {};
      const msg = err.message ?? data.error?.message ?? 'Génération indisponible. Réessayez.';
      const e = new Error(msg);
      e.code = data.error?.code ?? data.source ?? 'ERROR';
      e.status = data.error?.status ?? responseStatus;
      throw e;
    }

    if (data.source !== 'ok' && !data.ok) {
      const source = data.source ?? 'error';
      memoryCache.set(key, { source });
      const msg = source === 'disabled'
        ? 'Génération temporairement désactivée.'
        : source === 'invalid'
          ? 'Données invalides. Réessayez.'
          : 'Génération indisponible. Réessayez.';
      const e = new Error(msg);
      e.code = source === 'disabled' ? 'AI_DISABLED' : source === 'quota' ? 'QUOTA_EXCEEDED' : 'ERROR';
      e.status = responseStatus;
      throw e;
    }

    const payload = data.data ?? data;
    const result = {
      source: 'ok',
      sectorId: payload.sectorId ?? data.sectorId,
      jobId: payload.jobId ?? data.jobId,
      personaCluster: payload.personaCluster ?? data.personaCluster ?? cluster,
      contentVersion: payload.contentVersion ?? data.contentVersion ?? contentVersion,
      language: payload.language ?? data.language ?? 'fr',
      chapters: payload.chapters ?? data.chapters ?? [],
    };
    memoryCache.set(key, result);
    return result;
  } catch (err) {
    if (err?.name === 'AbortError' || err?.message?.includes?.('aborted')) {
      throw new Error('La requête a expiré (25s). Réessayez.');
    }
    if (err instanceof Error && err.message.startsWith('Génération')) {
      throw err;
    }
    memoryCache.set(key, { source: 'error' });
    const e = new Error(err?.message ?? 'Génération indisponible. Réessayez.');
    e.code = err?.code ?? 'ERROR';
    e.status = err?.status;
    throw e;
  }
}

/**
 * Construit le bloc "items" au format attendu par l'écran Module à partir d'un chapitre dynamique.
 */
function dynamicQuestionsToItems(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return [];
  return questions.map((q) => {
    const options = (q.choices || []).map((c) =>
      typeof c === 'object' && c?.text != null ? c.text : String(c)
    );
    const correctChoiceId = (q.correctChoiceId || 'A').toUpperCase();
    const reponse_correcte = correctChoiceId === 'A' ? 0 : correctChoiceId === 'B' ? 1 : 2;
    return {
      id: q.id || `q_${Math.random().toString(36).slice(2)}`,
      question: q.prompt || q.question || '',
      options: options.length >= 3 ? options : [...options, '', '', ''].slice(0, 3),
      reponse_correcte,
      explication: q.explanation || q.explication || '',
    };
  });
}

/**
 * Retourne un module au format attendu par l'écran Module à partir du cache dynamique.
 */
export function buildModuleFromDynamicPayload(dynamicPayload, chapterIndex, moduleOrder, chapter) {
  if (!dynamicPayload || dynamicPayload.source !== 'ok' || !Array.isArray(dynamicPayload.chapters))
    return null;
  const chapterBlock = dynamicPayload.chapters[chapterIndex - 1];
  if (!chapterBlock) return null;

  const moduleIndex = moduleOrder - 1;
  const isTestSecteur = moduleOrder === 2;
  const isSimulation = moduleOrder === 3;
  const block = isTestSecteur ? chapterBlock.sectorTest : isSimulation ? chapterBlock.simulation : null;
  if (!block || !block.questions?.length) return null;

  const type = isTestSecteur ? 'test_secteur' : 'mini_simulation';
  const items = dynamicQuestionsToItems(block.questions);
  if (items.length === 0) return null;

  const titre = isTestSecteur
    ? `Test de secteur - ${chapter?.title || 'Chapitre ' + chapterIndex}`
    : `Mini-simulation - ${chapter?.title || 'Chapitre ' + chapterIndex}`;
  const objectif = isTestSecteur
    ? `Tester tes connaissances sur ce secteur`
    : `Mettre en pratique ce métier`;

  return {
    id: `chapter_${chapterIndex}_module_${moduleOrder}_dynamic_${Date.now()}`,
    titre,
    objectif,
    type,
    chapitre: chapterIndex,
    moduleIndex,
    items,
    feedback_final: {
      message: `✔ Tu as complété le module ${moduleOrder} du chapitre ${chapterIndex}.`,
      recompense: {
        xp: 50 + chapterIndex * 10,
        etoiles: 2 + Math.floor(chapterIndex / 3),
      },
    },
  };
}
