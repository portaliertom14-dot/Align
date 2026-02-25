/**
 * Récupère la description métier (3–5 phrases, 300–520 caractères) via edge job-description.
 * Accepte tout jobTitle (pas de whitelist bloquante). Log [JOB_DESC] request payload, [EDGE_CALL], [JOB_DESC_INVALID] avec reason + statusCode.
 */

import { supabase } from './supabase';
import { normalizeJobKey } from '../domain/normalizeJobKey';

const EDGE_NAME = 'job-description';
const TIMEOUT_MS = 10000;

async function invokeJobDescription(body) {
  const startMs = Date.now();
  const result = await Promise.race([
    supabase.functions.invoke(EDGE_NAME, { body }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('job-description timeout')), TIMEOUT_MS)),
  ]).catch((e) => ({ data: null, error: e }));
  const durationMs = Date.now() - startMs;
  const { data, error } = result || { data: null, error: new Error('unknown') };
  const statusCode = error ? (error?.context?.status ?? 0) : (data?.ok ? 200 : (data?.reason ? 200 : 0));
  const status = statusCode || (error ? 'error' : (data?.ok ? 200 : (data?.reason ? 200 : 'no_text')));
  if (typeof console !== 'undefined' && console.log) {
    console.log('[EDGE_CALL]', EDGE_NAME, status === 200 ? '200' : status, 'durationMs', durationMs);
  }
  return { data, error, durationMs, statusCode: statusCode || (data?.ok ? 200 : 200) };
}

/**
 * @param {{ sectorId: string, jobTitle: string }} opts
 * @returns {Promise<{ text: string } | null>}
 */
function _reasonFromResponse(data, error, statusCode) {
  if (error) return statusCode === 400 ? 'edge_400' : statusCode >= 500 ? 'edge_500' : 'error';
  if (data?.ok === false && data?.reason) return data.reason;
  if (data?.ok && !(data?.text && String(data.text).trim())) return 'empty';
  if (!data?.text && !data?.description) return 'invalid';
  return 'empty';
}

export async function getJobDescription({ sectorId, jobTitle }) {
  if (!jobTitle || typeof jobTitle !== 'string' || !jobTitle.trim()) {
    return null;
  }
  const requestId = `jd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const normalizedKey = normalizeJobKey(jobTitle.trim());
  const body = {
    sectorId: (sectorId && typeof sectorId === 'string') ? sectorId.trim() : '',
    jobTitle: jobTitle.trim(),
    requestId,
  };
  if (typeof console !== 'undefined' && console.log) {
    console.log('[JOB_DESC] request payload', { jobTitle: body.jobTitle, normalizedKey, sectorId: body.sectorId, requestId });
  }
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const { data, error, statusCode } = await invokeJobDescription(body);
      if (error) {
        const code = statusCode || error?.context?.status || 0;
        const reason = code === 400 ? 'edge_400' : code >= 500 ? 'edge_500' : 'error';
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[JOB_DESC] FAIL', { error: error?.message ?? String(error), attempt: attempt + 1 });
          console.log('[JOB_DESC_INVALID]', { reason, statusCode: code || null, jobTitle: body.jobTitle, sectorId: body.sectorId });
        }
        if (attempt === 0) continue;
        return null;
      }
      if (data?.ok === false) {
        const reason = data.reason || 'ok_false';
        if (typeof console !== 'undefined' && console.log) {
          console.log('[JOB_DESC_INVALID]', { reason, statusCode: 200, jobTitle: body.jobTitle, sectorId: body.sectorId });
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
      const valid = text && text.trim().length > 0;
      if (!valid) {
        const reason = _reasonFromResponse(data, null, statusCode);
        if (typeof console !== 'undefined' && console.log) {
          console.log('[JOB_DESC_INVALID]', { reason: reason || 'empty', statusCode: statusCode ?? 200, jobTitle: body.jobTitle, sectorId: body.sectorId });
        }
        if (attempt === 0) continue;
        return null;
      }
      return { text: text.trim() };
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[JOB_DESC] FAIL', { error: err?.message ?? String(err), attempt: attempt + 1 });
        console.log('[JOB_DESC_INVALID]', { reason: 'exception', statusCode: null, jobTitle: body.jobTitle, sectorId: body.sectorId });
      }
      if (attempt === 0) continue;
      return null;
    }
  }
  if (typeof console !== 'undefined' && console.log) {
    console.log('[JOB_DESC_INVALID]', { reason: 'null_after_retries', statusCode: null, jobTitle: body.jobTitle, sectorId: body.sectorId });
  }
  return null;
}
