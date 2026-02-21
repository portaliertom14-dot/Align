/**
 * Garde-fous IA : feature flag AI_ENABLED + quotas par user et global.
 * Utilisé par analyze-sector, analyze-job, generate-dynamic-modules.
 */

const DEFAULT_MAX_PER_USER = 3;
const DEFAULT_MAX_GLOBAL = 500;

/**
 * IA activée sauf si AI_ENABLED === "false" (string).
 * "false" est une string truthy en JS → on teste explicitement !== "false".
 */
export function getAIGuardrailsEnv(): {
  aiEnabled: boolean;
  maxPerUser: number;
  maxGlobal: number;
} {
  const aiEnabled = Deno.env.get('AI_ENABLED') !== 'false';
  const maxPerUser = Math.max(1, parseInt(Deno.env.get('MAX_CALLS_PER_USER_PER_DAY') ?? String(DEFAULT_MAX_PER_USER), 10) || DEFAULT_MAX_PER_USER);
  const maxGlobal = Math.max(1, parseInt(Deno.env.get('MAX_CALLS_GLOBAL_PER_DAY') ?? String(DEFAULT_MAX_GLOBAL), 10) || DEFAULT_MAX_GLOBAL);
  return { aiEnabled, maxPerUser, maxGlobal };
}

/**
 * Extrait user_id du JWT (Authorization: Bearer <token>). Pas de vérification de signature.
 */
export function getUserIdFromRequest(req: Request): string | null {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(payload));
    const sub = decoded?.sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkQuota(
  supabase: any,
  userId: string | null,
  maxPerUser: number,
  maxGlobal: number
): Promise<{ allowed: boolean; userCount: number; globalCount: number }> {
  const date = todayISO();
  const globalQuery = supabase.from('ai_usage').select('count').eq('date', date).is('user_id', null).maybeSingle();
  const userQuery =
    userId != null
      ? supabase.from('ai_usage').select('count').eq('date', date).eq('user_id', userId).maybeSingle()
      : globalQuery;
  const [userRes, globalRes] = await Promise.all([
    userQuery,
    userId != null ? globalQuery : Promise.resolve({ data: null }),
  ]);
  const userCount = userRes?.data?.count != null ? Number(userRes.data.count) : 0;
  const globalCount =
    userId != null && globalRes?.data?.count != null ? Number(globalRes.data.count) : userCount;
  const allowed = userCount < maxPerUser && globalCount < maxGlobal;
  return { allowed, userCount, globalCount };
}

export async function incrementUsage(supabase: any, userId: string | null): Promise<void> {
  const date = todayISO();
  await Promise.all([
    supabase.rpc('increment_ai_usage', { p_date: date, p_user_id: userId }),
    supabase.rpc('increment_ai_usage', { p_date: date, p_user_id: null }),
  ]);
}

export function logUsage(
  functionName: string,
  userId: string | null,
  aiEnabled: boolean,
  quotaOk: boolean,
  calledOpenai: boolean
): void {
  console.log(JSON.stringify({
    function_name: functionName,
    user_id: userId ?? undefined,
    ai_enabled: aiEnabled,
    quota_ok: quotaOk,
    called_openai: calledOpenai,
  }));
}
