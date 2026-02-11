/**
 * Analyse secteur — point d'entrée IA à la fin du quiz secteur
 *
 * Sortie STRICTE : { secteurId, secteurName, description }
 * - description : 2–3 lignes max. Pas de métier, cache, confiance ni autres champs.
 *
 * Appel IA réel via Supabase Edge Function "analyze-sector".
 * Fallback sur wayMock si la fonction n'est pas déployée ou en erreur.
 */

import { supabase } from './supabase';
import { wayDetermineSecteur } from './wayMock';
import { SECTOR_NAMES } from '../lib/sectorAlgorithm';

/**
 * @typedef { { secteurId: string, secteurName: string, description: string } } AnalyzeSectorResult
 */

/**
 * Analyse les réponses du quiz secteur et retourne le secteur dominant (format strict).
 *
 * @param {Object} answers - Réponses du quiz { questionId: optionTexte }
 * @param {Array} questions - Liste des questions (id, question, options) pour le contexte IA
 * @returns {Promise<AnalyzeSectorResult>}
 */
export async function analyzeSector(answers, questions) {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-sector', {
      body: { answers, questions: questions?.map((q) => ({ id: q.id, question: q.texte ?? q.question, options: q.options ?? [] })) },
    });

    if (error) throw error;
    if (!data || typeof data.secteurId !== 'string') {
      throw new Error(data?.error ?? 'Réponse invalide');
    }

    return {
      secteurId: String(data.secteurId),
      secteurName: String(data.secteurName ?? SECTOR_NAMES[data.secteurId] ?? data.secteurId),
      description: String(data.description ?? ''),
    };
  } catch (err) {
    console.warn('[analyzeSector] Fallback wayMock:', err?.message ?? err);
    const wayResult = await wayDetermineSecteur();
    return {
      secteurId: wayResult.secteurId,
      secteurName: wayResult.secteur || SECTOR_NAMES[wayResult.secteurId] || wayResult.secteur,
      description: wayResult.resume ?? 'Ton profil correspond à ce secteur.',
    };
  }
}
