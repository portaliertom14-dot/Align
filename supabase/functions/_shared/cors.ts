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
  const list = [prod, dev, preview].filter(Boolean) as string[];
  // Autoriser aussi la variante www du domaine prod (ex. https://www.align-app.fr)
  if (prod && prod.startsWith('http') && !prod.includes('www.')) {
    try {
      const u = new URL(prod);
      u.hostname = `www.${u.hostname}`;
      list.push(u.origin);
    } catch {
      // ignore
    }
  }
  return list;
})();

const CORS_HEADERS = 'authorization, x-client-info, apikey, content-type';

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const originClean = origin.replace(/\/$/, '');
  // En dev : autoriser tout localhost (quel que soit le port)
  let allow: string;
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(originClean)) {
    allow = origin;
  } else if (origin && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(originClean)) {
    // Déploiements Vercel (preview + prod projet, ex. align-kappa.vercel.app)
    allow = origin;
  } else if (ALLOWED_ORIGINS.length > 0) {
    allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  } else {
    allow = '*';
  }
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': CORS_HEADERS,
  };
}
