/**
 * Preflight réseau : vérifie que Supabase est joignable avant un appel auth.
 * NON BLOQUANT : si échoue, retourne false mais l'appel auth sera tenté quand même.
 * Timeout 5s par défaut.
 *
 * @param {Object} options
 * @param {string} [options.requestId] - pour les logs
 * @param {number} [options.timeoutMs=5000]
 * @returns {Promise<{ok: boolean}>}
 */
export async function preflightSupabase({ requestId = '', timeoutMs = 5000 } = {}) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const url = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: anonKey ? { apikey: anonKey } : {},
    });
    console.log('[NET] PREFLIGHT OK', requestId, r.status);
    return { ok: true };
  } catch (e) {
    console.warn('[NET] PREFLIGHT WARN', requestId, e?.name || e?.message || e);
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}
