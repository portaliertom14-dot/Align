import { createClient } from '@supabase/supabase-js';

/**
 * Initialise et retourne le client Supabase
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function initSupabase() {
  // Récupérer les variables d'environnement ou utiliser les valeurs par défaut
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_9ycoZ9z7IF1SByxg-oT6XA_3H07NgND';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured');
  }
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  return supabase;
}

// Export du client par défaut
export const supabase = initSupabase();













