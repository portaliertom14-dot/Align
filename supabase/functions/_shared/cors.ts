/**
 * CORS pour Edge Functions : autoriser uniquement les origines configurées (pas "*").
 * Définir dans les secrets Supabase : ALLOWED_ORIGINS (liste séparée par des virgules)
 * ou WEB_URL_PROD + WEB_URL_DEV.
 */
const ALLOWED_ORIGINS = (() => {
  const fromEnv = Deno.env.get('ALLOWED_ORIGINS');
  if (fromEnv && typeof fromEnv === 'string') {
    return fromEnv.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  }
  const prod = Deno.env.get('WEB_URL_PROD')?.trim().replace(/\/$/, '');
  const dev = Deno.env.get('WEB_URL_DEV')?.trim().replace(/\/$/, '');
  const preview = Deno.env.get('WEB_URL_PREVIEW')?.trim().replace(/\/$/, '');
  return [prod, dev, preview].filter(Boolean) as string[];
})();

const CORS_HEADERS = 'authorization, x-client-info, apikey, content-type';

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.length > 0
    ? (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])
    : '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': CORS_HEADERS,
  };
}
