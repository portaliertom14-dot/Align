import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Initialise et retourne le client Supabase avec persistance de session
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function initSupabase() {
  // Récupérer les variables d'environnement ou utiliser les valeurs par défaut
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://yuqybxhqhgmeqmcpgtvw.supabase.co';
  // Note: Utiliser la clé API publishable (nouveau format Supabase) ou anon key (ancien format)
  // Le format publishable commence par "sb_publishable_" ou "eyJ" pour JWT
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1cXlieGhxaGdtZXFtY3BndHZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NjU2MDAsImV4cCI6MjA1MDE0MTYwMH0.9ycoZ9z7IF1SByxg-oT6XA_3H07NgND';
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials not configured - URL or API key is missing');
    throw new Error('Supabase credentials not configured');
  }
  
  // Créer le client avec AsyncStorage pour la persistance de session
  // Le client Supabase ajoute automatiquement la clé API dans les en-têtes
  // Pour le web, on utilise localStorage au lieu d'AsyncStorage si disponible
  const storageAdapter = typeof window !== 'undefined' && window.localStorage 
    ? {
        getItem: (key) => {
          try {
            return window.localStorage.getItem(key);
          } catch (e) {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            // Ignore storage errors
          }
        },
        removeItem: (key) => {
          try {
            window.localStorage.removeItem(key);
          } catch (e) {
            // Ignore storage errors
          }
        },
      }
    : AsyncStorage;
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    // Ajouter des options pour améliorer la gestion des erreurs réseau
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
  
  // Vérifier que le client est correctement initialisé
  if (!supabase || !supabase.auth) {
    throw new Error('Failed to initialize Supabase client');
  }
  
  return supabase;
}

// Export du client par défaut
export const supabase = initSupabase();













