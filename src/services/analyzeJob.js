/**
 * Analyse métier — point d'entrée IA à la fin du quiz métier
 *
 * Sortie STRICTE : { jobId, jobName, description }
 * - description : 2–3 lignes max. Pas de cache, top3, confidence ni autres champs.
 *
 * Appel IA réel via Supabase Edge Function "analyze-job".
 * Fallback sur wayProposeMetiers (wayMock) si la fonction n'est pas déployée ou en erreur.
 */

import { supabase } from './supabase';
import { wayProposeMetiers } from './wayMock';
import { updateUserProgress, getUserProgress } from '../lib/userProgress';

/**
 * @typedef { { jobId: string, jobName: string, description: string } } AnalyzeJobResult
 */

/**
 * Analyse les réponses du quiz métier et retourne le métier proposé (format strict).
 *
 * @param {Object} answers_job - Réponses du quiz métier { questionId: optionTexte }
 * @param {Array} questions - Liste des questions (id, question, options) pour le contexte IA
 * @returns {Promise<AnalyzeJobResult>}
 */
export async function analyzeJob(answers_job, questions) {
  await updateUserProgress({ metierQuizAnswers: answers_job });

  try {
    const { data, error } = await supabase.functions.invoke('analyze-job', {
      body: {
        answers_job,
        questions: questions?.map((q) => ({
          id: q.id,
          question: q.question ?? q.texte,
          options: q.options ?? [],
        })),
      },
    });

    if (error) throw error;
    if (!data || typeof data.jobId !== 'string') {
      throw new Error(data?.error ?? 'Réponse invalide');
    }

    return {
      jobId: String(data.jobId),
      jobName: String(data.jobName ?? data.jobId),
      description: String(data.description ?? ''),
    };
  } catch (err) {
    console.warn('[analyzeJob] Fallback wayMock:', err?.message ?? err);
    const progress = await getUserProgress();
    const secteurId = progress.activeSerie || progress.activeDirection || 'tech';
    const secteurNom = typeof secteurId === 'string' && !secteurId.includes('_') ? secteurId : (progress.activeDirection || 'Tech');
    const wayResult = await wayProposeMetiers(secteurId, secteurNom);
    return {
      jobId: wayResult.id,
      jobName: wayResult.nom || wayResult.id,
      description: wayResult.resume ?? 'Ce métier correspond à ton profil.',
    };
  }
}
