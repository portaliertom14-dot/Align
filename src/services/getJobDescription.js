/**
 * Récupère la description métier (3–5 phrases, 300–520 caractères) via edge job-description.
 * Log [EDGE_CALL] status + durationMs, [JOB_DESC] CACHE_HIT / CACHE_MISS / FAIL.
 * Retry une fois en cas d'échec (timeout / réseau).
 */

import { supabase } from './supabase';

const EDGE_NAME = 'job-description';
const TIMEOUT_MS = 4000;

async function invokeJobDescription(body) {
  const startMs = Date.now();
  const result = await Promise.race([
    supabase.functions.invoke(EDGE_NAME, { body }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('job-description timeout')), TIMEOUT_MS)),
  ]).catch((e) => ({ data: null, error: e }));
  const durationMs = Date.now() - startMs;
  const { data, error } = result || { data: null, error: new Error('unknown') };
  const status = error ? (error?.context?.status ?? 'error') : (data?.ok ? 200 : data?.error ? 400 : 200);
  if (typeof console !== 'undefined' && console.log) {
    console.log('[EDGE_CALL]', EDGE_NAME, status === 200 ? '200' : status, 'durationMs', durationMs);
  }
  return { data, error, durationMs };
}

/**
 * @param {{ sectorId: string, jobTitle: string }} opts
 * @returns {Promise<{ text: string } | null>}
 */
export async function getJobDescription({ sectorId, jobTitle }) {
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return null;
  }
  const body = {
    sectorId: (sectorId && typeof sectorId === 'string') ? sectorId.trim() : '',
    jobTitle: jobTitle.trim(),
  };
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const { data, error } = await invokeJobDescription(body);
      if (error) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[JOB_DESC] FAIL', { error: error?.message ?? String(error), attempt: attempt + 1 });
        }
        if (attempt === 0) continue;
        return null;
      }
      const text = typeof data?.text === 'string' ? data.text : (typeof data?.description === 'string' ? data.description : '');
      const cached = data?.cached === true;
      if (typeof console !== 'undefined' && console.log) {
        if (cached) console.log('[JOB_DESC] CACHE_HIT');
        else if (data?.ok) console.log('[JOB_DESC] CACHE_MISS');
      }
      if (!text) {
        if (attempt === 0) continue;
        return null;
      }
      return { text };
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_DESC] FAIL', { error: err?.message ?? String(err), attempt: attempt + 1 });
      }
      if (attempt === 0) continue;
      return null;
    }
  }
  return null;
}
