import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Client Supabase — Session persistée (AsyncStorage), pas d'auto-login au boot.
 * persistSession: true pour garder la session (reconnexion manuelle récupère la progression).
 * L'UI force l'écran Auth à chaque lancement via manualLoginRequired dans AuthContext.
 */
export function initSupabase() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cXlieGhxaGdtZXFtY3BndHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjU2MDAsImV4cCI6MjA1MDE0MTYwMH0.9ycoZ9z7IF1SByxg-oT6XA_3H07NgND';

  if (!supabaseUrl || !supabaseAnonKey) {
    if (__DEV__) console.error('Supabase: URL or API key missing');
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
