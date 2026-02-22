/**
 * Récupère la description secteur (3–5 phrases, 300–520 caractères) via edge sector-description.
 * Log [EDGE_CALL] + [SECTOR_DESC] OK / FAIL.
 */

import { supabase } from './supabase';

const EDGE_NAME = 'sector-description';
const TIMEOUT_MS = 8000;

/**
 * @param {{ sectorId: string }} opts
 * @returns {Promise<{ text: string } | null>}
 */
export async function getSectorDescription({ sectorId }) {
  if (!sectorId || typeof sectorId !== 'string' || !sectorId.trim()) {
    return null;
  }
  const startMs = Date.now();
  try {
    const body = { sectorId: sectorId.trim() };
    const result = await Promise.race([
      supabase.functions.invoke(EDGE_NAME, { body }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('sector-description timeout')), TIMEOUT_MS)),
    ]).catch((e) => ({ data: null, error: e }));
    const durationMs = Date.now() - startMs;
    const { data, error } = result || { data: null, error: new Error('unknown') };
    const status = error ? (error?.context?.status ?? 'error') : (data?.ok ? 200 : 400);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[EDGE_CALL]', EDGE_NAME, status === 200 ? '200' : status, 'durationMs', durationMs);
    }
    if (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[SECTOR_DESC] FAIL', { error: error?.message ?? String(error) });
      }
      return null;
    }
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (text) {
      if (typeof console !== 'undefined' && console.log) console.log('[SECTOR_DESC] OK');
      return { text };
    }
    return null;
  } catch (err) {
    const durationMs = Date.now() - startMs;
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[EDGE_CALL]', EDGE_NAME, 'error', err?.message ?? String(err), 'durationMs', durationMs);
      console.warn('[SECTOR_DESC] FAIL', { error: err?.message ?? String(err) });
    }
    return null;
  }
}
