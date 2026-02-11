/**
 * Chargement des modules dynamiques (simulation métier + test secteur) par chapitre.
 * Appel Edge Function generate-dynamic-modules — cache côté serveur (content_cache).
 * En cas de disabled/invalid/error : fallback sur le flux existant (questionGenerator) sans crash.
 */

import { supabase } from './supabase';

const DEFAULT_CONTENT_VERSION = 'v1';
const PERSONA_CLUSTER_DEFAULT = 'default';

/** Cache mémoire par clé (sectorId:jobId:contentVersion:personaCluster). */
const memoryCache = new Map();

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
 * Appelle l’Edge Function et retourne le payload ou un objet { source } en cas d’échec.
 * Le contenu dépend du profil utilisateur (personaCluster) ; absent => "default".
 *
 * @param {string} sectorId
 * @param {string} jobId
 * @param {string} [contentVersion='v1']
 * @param {string} [personaCluster] - identifiant profil (8 car. max), absent => "default"
 * @returns {Promise<{ source: 'ok', sectorId, jobId, personaCluster, contentVersion, language, chapters } | { source: 'disabled'|'invalid'|'error' }>}
 */
export async function fetchDynamicModules(sectorId, jobId, contentVersion = DEFAULT_CONTENT_VERSION, personaCluster) {
  const cluster = normalizePersonaCluster(personaCluster);
  const key = `${sectorId}:${jobId}:${contentVersion}:${cluster}`;
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  try {
    const { data, error } = await supabase.functions.invoke('generate-dynamic-modules', {
      body: {
        sectorId: (sectorId || '').trim(),
        jobId: (jobId || '').trim(),
        contentVersion: (contentVersion || DEFAULT_CONTENT_VERSION).trim(),
        language: 'fr',
        personaCluster: cluster,
      },
    });

    if (error) {
      memoryCache.set(key, { source: 'error' });
      return { source: 'error' };
    }

    if (!data || data.source !== 'ok') {
      const source = data?.source ?? 'error';
      memoryCache.set(key, { source });
      return { source };
    }

    const result = {
      source: 'ok',
      sectorId: data.sectorId,
      jobId: data.jobId,
      personaCluster: data.personaCluster ?? cluster,
      contentVersion: data.contentVersion,
      language: data.language ?? 'fr',
      chapters: data.chapters ?? [],
    };
    memoryCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('[fetchDynamicModules]', err?.message ?? err);
    memoryCache.set(key, { source: 'error' });
    return { source: 'error' };
  }
}

/**
 * Construit le bloc "items" au format attendu par l’écran Module à partir d’un chapitre dynamique.
 * @param {Array} questions - tableau { id, prompt, choices: [{id, text}], correctChoiceId?, explanation? }
 * @returns {Array} items au format { id, question, options: string[], reponse_correcte: 0|1|2, explication? }
 */
function dynamicQuestionsToItems(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return [];
  return questions.map((q) => {
    const options = (q.choices || []).map((c) => (typeof c === 'object' && c?.text != null ? c.text : String(c)));
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
 * Retourne un module au format attendu par l’écran Module (comme generatePersonalizedModule)
 * à partir du cache dynamique, pour un chapitre et un type de module donnés.
 * Si pas de données dynamiques, retourne null.
 *
 * @param {{ source: string, chapters: Array }} dynamicPayload - résultat de fetchDynamicModules
 * @param {number} chapterIndex - index du chapitre (1..10)
 * @param {number} moduleOrder - 1=apprentissage, 2=test_secteur, 3=mini_simulation
 * @param {{ id: number, title: string }}} chapter - infos chapitre pour titre
 * @returns {object|null} module { id, titre, objectif, type, chapitre, moduleIndex, items, feedback_final } ou null
 */
export function buildModuleFromDynamicPayload(dynamicPayload, chapterIndex, moduleOrder, chapter) {
  if (!dynamicPayload || dynamicPayload.source !== 'ok' || !Array.isArray(dynamicPayload.chapters)) return null;
  const chapterBlock = dynamicPayload.chapters[chapterIndex - 1];
  if (!chapterBlock) return null;

  const moduleIndex = moduleOrder - 1; // 0-based
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
        xp: 50 + (chapterIndex * 10),
        etoiles: 2 + Math.floor(chapterIndex / 3),
      },
    },
  };
}
