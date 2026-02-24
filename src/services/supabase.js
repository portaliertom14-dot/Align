import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client Supabase — Session persistée (AsyncStorage), pas d'auto-login au boot.
 * persistSession: true pour garder la session (reconnexion manuelle récupère la progression).
 * L'UI force l'écran Auth à chaque lancement via manualLoginRequired dans AuthContext.
 */
/**
 * Client Supabase — utilise UNIQUEMENT des clés publiques (anon).
 * Jamais de service_role ou clé secrète côté client.
 */
export function initSupabase() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (__DEV__) console.error('Supabase: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing');
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  if (!supabase || !supabase.auth) {
    throw new Error('Failed to initialize Supabase client');
  }

  return supabase;
}

export const supabase = initSupabase();
