import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client Supabase — Session persistée (AsyncStorage), pas d'auto-login au boot.
 * utilise UNIQUEMENT des clés publiques (anon). Jamais de service_role côté client.
 */
/** Temporaire : désactiver après validation. Vérifier que prod pointe vers le même projet que en local. */
const ENABLE_SUPABASE_PROJECT_CHECK = false;

export function initSupabase() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (__DEV__) console.error('Supabase: EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY missing');
    throw new Error('Supabase credentials not configured');
  }
  if (ENABLE_SUPABASE_PROJECT_CHECK && process.env.NODE_ENV === 'production') {
    console.log('[SUPABASE_PROJECT_CHECK]', supabaseUrl);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      // true : au chargement d’une URL avec #access_token=... (ex. lien reset password), la session est restaurée.
      detectSessionInUrl: false, // on gère le hash manuellement dans ResetPasswordScreen ; évite double SIGNED_IN
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
