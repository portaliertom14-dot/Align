/**
 * Analyse métier — point d'entrée IA à la fin du quiz métier
 *
 * Sortie STRICTE : { jobId, jobName, description }
 * Appel IA uniquement via Supabase Edge Function "analyze-job".
 * Aucune clé OpenAI côté client.
 */

import { supabase } from './supabase';
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
    if (__DEV__) console.warn('[analyzeJob] Edge Function error:', err?.message ?? err);
    throw new Error('Analyse indisponible. Réessaie dans 1 min.');
  }
}
