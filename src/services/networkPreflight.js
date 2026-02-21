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
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify({ sessionId: '89e9d0', location: 'networkPreflight.js:preflightOK', message: 'preflight success', data: { requestId, status: r.status }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
    } catch (_) {}
    // #endregion
    return { ok: true };
  } catch (e) {
    console.warn('[NET] PREFLIGHT WARN', requestId, e?.name || e?.message || e);
    // #region agent log
    try {
      fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify({ sessionId: '89e9d0', location: 'networkPreflight.js:preflightCatch', message: 'preflight failed', data: { requestId, errorName: e?.name, errorMessage: (e?.message || '').slice(0, 200), isAbort: e?.name === 'AbortError' }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
    } catch (_) {}
    // #endregion
    return { ok: false };
  } finally {
    clearTimeout(t);
  }
}
