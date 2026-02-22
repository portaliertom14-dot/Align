/**
 * Prefetch modules dynamiques en appelant l'Edge Function directement.
 * Single-flight par (sectorId, jobTitle normalisé) ; abort de l'ancien si nouveau couple différent.
 * Timeout 4s ; en cas de timeout / erreur / status != 200 : log "[PREFETCH] FAIL" et return null.
 * Ne jamais throw (évite de bloquer l'UI). À appeler en fire-and-forget (void prefetchDynamicModulesSafe(...)).
 */

import { supabase } from './supabase';
import { normalizeJobKey } from '../domain/normalizeJobKey';
import { getJobsForSectorNormalizedSet } from '../data/jobsBySector';

const PREFETCH_TIMEOUT_MS = 4000;
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cXlieGhxaGdtZXFtY3BndHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjU2MDAsImV4cCI6MjA1MDE0MTYwMH0.9ycoZ9z7IF1SByxg-oT6XA_3H07NgND';

/** Single-flight state: { key, sectorId, jobTitle, controller, promise } */
let inFlight = null;

function isAbortError(e) {
  const name = (e && e.name) || '';
  const msg = (e && e.message) || '';
  return name === 'AbortError' || msg.includes('aborted') || msg.includes('Fetch is aborted');
}

/**
 * @param {string} sectorId - Secteur (ex. communication_media)
 * @param {string} jobTitle - Titre exact du métier renvoyé par le moteur (ex. "Producteur")
 */
export async function prefetchDynamicModulesSafe(sectorId, jobTitle, contentVersion = 'v1') {
  try {
    if (!sectorId || typeof sectorId !== 'string') {
      console.warn('[PREFETCH] SKIP — sectorId invalide');
      return null;
    }
    if (!jobTitle || typeof jobTitle !== 'string') {
      console.warn('[PREFETCH] SKIP — jobTitle invalide');
      return null;
    }

    const sid = sectorId.trim();
    const titleExact = jobTitle.trim();
    const normalizedKey = normalizeJobKey(titleExact);
    let allowed;
    try {
      allowed = getJobsForSectorNormalizedSet(sid, 'default');
    } catch (e) {
      console.warn('[PREFETCH] SKIP — secteur inconnu ou erreur whitelist', sid, e?.message);
      return null;
    }
    if (!allowed.has(normalizedKey)) {
      const whitelistSamples = Array.from(allowed).slice(0, 3);
      console.warn('[PREFETCH] SKIP — jobTitle hors whitelist', {
        jobTitle: titleExact,
        normalizedKey,
        whitelistSamples,
      });
      return null;
    }

    const key = `${sid}|${normalizedKey}`;
    if (inFlight && inFlight.key === key) {
      console.log('[PREFETCH] SKIP — même couple déjà en cours', { sectorId: sid, jobTitle: titleExact });
      return { ok: false, error: 'PREFETCH_SKIPPED', message: 'in-flight' };
    }

    if (inFlight) {
      inFlight.controller.abort();
      inFlight = null;
    }

    const requestId = `prefetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PREFETCH_TIMEOUT_MS);

  const jobKey = normalizedKey;
  const payload = {
    sectorId: sid,
    jobTitle: titleExact,
    jobKey,
    jobId: titleExact,
    version: (contentVersion || 'v1').trim(),
    contentVersion: (contentVersion || 'v1').trim(),
    language: 'fr',
    personaCluster: 'default',
    traceId: requestId,
  };

  if (typeof process !== 'undefined' && process.env?.DEBUG_JOB_GUARD === 'true') {
    console.log('[JOB_GUARD] TRACE prefetch payload', {
      requestId,
      sectorId: sid,
      variant: 'default',
      jobTitle: titleExact,
      jobId: titleExact,
      sourceFn: 'prefetchDynamicModulesSafe',
    });
  }

    const startMs = Date.now();
    const doFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;
      const url = `${SUPABASE_URL}/functions/v1/generate-dynamic-modules`;
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const durationMs = Date.now() - startMs;
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (_) {}
      if (res.status !== 200) {
        console.warn('[PREFETCH] FAIL', {
          status: res.status,
          durationMs,
          error: data?.error ?? null,
          message: data?.message ?? null,
          receivedJobTitle: data?.receivedJobTitle ?? null,
          whitelistSample: data?.whitelistSample ?? null,
        });
        return { ok: false, status: res.status, data, durationMs };
      }
      if (data?.ok === false || data?.error) {
        console.warn('[PREFETCH] FAIL', { body: data?.error ?? data?.message, durationMs });
        return { ok: false, data, durationMs };
      }
      if (typeof process !== 'undefined' && process.env?.DEBUG_JOB_GUARD === 'true') {
        console.log('[JOB_GUARD] TRACE prefetch response', {
          requestId,
          sectorId: sid,
          variant: 'default',
          jobTitle: titleExact,
          sourceFn: 'prefetchDynamicModulesSafe',
          status: res.status,
          durationMs,
        });
      }
      console.log('[PREFETCH] durationMs', durationMs, 'status', res.status);
      return { ok: true, data, durationMs };
    };

    inFlight = { key, sectorId: sid, jobTitle: titleExact, controller, promise: null };
    inFlight.promise = (async () => {
      try {
        return await doFetch();
      } finally {
        clearTimeout(timeoutId);
        if (inFlight && inFlight.key === key) inFlight = null;
      }
    })();

    const result = await inFlight.promise;
    if (!result) return null;
    if (result.ok === false) {
      console.warn('[PREFETCH] FAIL', { error: result.error, status: result.status });
      return null;
    }
    return { ok: true };
  } catch (e) {
    if (isAbortError(e)) {
      console.warn('[PREFETCH] FAIL', 'timeout/abort', e?.message ?? e);
      return null;
    }
    console.warn('[PREFETCH] FAIL', e?.message ?? e);
    return null;
  }
}
