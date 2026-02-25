/**
 * Service de suppression de compte (RGPD).
 * Appelle l'Edge Function delete-my-account puis déconnecte et nettoie le cache local.
 */

import { supabase } from './supabase';
import { clearAuthState } from './authState';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ALIGN_KEYS_PREFIX = '@align_';

/**
 * Supprime le compte de l'utilisateur connecté.
 * 1) Appel Edge Function (suppression données + auth.users)
 * 2) SignOut (via signOutFn si fourni, sinon supabase.auth.signOut) — signOutFn = useAuth().signOut pour que le listener applique la déconnexion
 * 3) Nettoyage cache local (AsyncStorage clés @align_*)
 * @param {() => Promise<void>} [signOutFn] - Déconnexion volontaire (ex. useAuth().signOut) pour que AuthContext applique SIGNED_OUT
 * @returns {{ success: boolean, error?: string }}
 */
export async function deleteMyAccount(signOutFn = null) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: 'Non connecté' };
    }

    const { data, error } = await supabase.functions.invoke('delete-my-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      if (__DEV__) console.warn('[accountDeletion] Edge error:', error.message);
      return { success: false, error: error.message || 'Erreur réseau' };
    }

    if (!data?.ok) {
      const msg = data?.error === 'invalid_token' ? 'Session expirée' : data?.error || 'Échec suppression';
      return { success: false, error: msg };
    }

    if (typeof signOutFn === 'function') {
      await signOutFn();
    } else {
      await supabase.auth.signOut();
    }
    await clearAuthState();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const alignKeys = keys.filter((k) => k.startsWith(ALIGN_KEYS_PREFIX));
      await Promise.all(alignKeys.map((k) => AsyncStorage.removeItem(k)));
    } catch (e) {
      if (__DEV__) console.warn('[accountDeletion] Nettoyage AsyncStorage partiel:', e?.message);
    }

    return { success: true };
  } catch (e) {
    if (__DEV__) console.error('[accountDeletion]', e?.message ?? e);
    return { success: false, error: (e?.message ?? e)?.toString() || 'Erreur inattendue' };
  }
}
