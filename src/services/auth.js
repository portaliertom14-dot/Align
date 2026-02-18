import { supabase } from './supabase';

/**
 * Service d'authentification Supabase
 * Gère la création de compte et la connexion
 */

/**
 * Crée un nouveau compte utilisateur
 * CRITICAL: Vérifie si l'email existe déjà avant de créer le compte
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @param {string} [referralCode] - Code de parrainage optionnel (récompense +30⭐ au parrain)
 * @returns {Promise<{user: object, error: object}>}
 */
export async function signUp(email, password, referralCode = null) {
  try {
    // STEP 1: Vérifier si l'email existe déjà via RPC (timeout strict pour ne jamais bloquer)
    const RPC_TIMEOUT_MS = 2000;
    try {
      const rpcPromise = supabase.rpc('check_email_exists', { check_email: email });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('RPC_TIMEOUT')), RPC_TIMEOUT_MS));
      const { data: emailExists, error: rpcError } = await Promise.race([rpcPromise, timeoutPromise]);
      if (!rpcError && emailExists === true) {
        console.log('[signUp] Email déjà utilisé (via RPC):', email);
        return {
          user: null,
          error: {
            message: 'Un compte existe déjà avec cet email. Connecte-toi.',
            code: 'user_already_exists'
          }
        };
      }
    } catch (rpcError) {
      const isTimeout = rpcError?.message === 'RPC_TIMEOUT';
      if (isTimeout) {
        console.warn(JSON.stringify({ phase: 'AUTH_WARN_RPC_TIMEOUT', message: 'check_email_exists timeout, continuing to signUp', durationMs: RPC_TIMEOUT_MS }));
      } else {
        console.warn('[signUp] RPC check_email_exists non disponible:', rpcError?.message ?? rpcError);
      }
      // Ne jamais bloquer : on continue, Supabase Auth renverra une erreur si email déjà pris
    }
    
    // STEP 2: Créer le compte avec Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      const msg = (error.message || error.msg || '').toString().toLowerCase();
      const status = error.status ?? error.statusCode;
      const isDuplicate =
        status === 422 ||
        msg.includes('already') ||
        msg.includes('already registered') ||
        msg.includes('duplicate') ||
        error.code === '23505' ||
        error.code === 'user_already_exists';
      if (isDuplicate) {
        return {
          user: null,
          error: {
            message: 'Un compte existe déjà avec cet email. Connecte-toi.',
            code: 'user_already_exists'
          }
        };
      }
      console.error('[signUp] Erreur Supabase:', error);
      throw error;
    }

    console.log('[signUp] Compte créé avec succès:', data.user?.email);
    
    // CRITICAL: Créer automatiquement les profils user_profiles après signup
    // avec retry pour gérer la race condition FK (le trigger Supabase peut prendre du temps)
    if (data.user?.id) {
      const createProfile = async (retryCount = 0) => {
        const MAX_RETRIES = 5;
        const INITIAL_DELAY = 300;
        
        try {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert({
              id: data.user.id,
              email: data.user.email,
              onboarding_completed: false,
              first_name: 'Utilisateur',
              username: 'user_' + data.user.id.replace(/-/g, '').slice(0, 8),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'id',
              ignoreDuplicates: false,
            });
          
          // Si FK violation, retenter avec délai
          if (profileError && profileError.code === '23503' && retryCount < MAX_RETRIES) {
            const delay = INITIAL_DELAY * Math.pow(2, retryCount);
            console.log(`[signUp] FK violation, retry ${retryCount + 1}/${MAX_RETRIES} après ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return createProfile(retryCount + 1);
          }
          
          if (profileError && profileError.code !== '23505' && profileError.code !== '23503') {
            console.warn('[signUp] Erreur lors de la création du profil (non bloquant):', profileError);
          }
          
          if (!profileError) {
            console.log('[signUp] ✅ Profil créé avec succès');
          }
        } catch (createError) {
          console.warn('[signUp] Erreur lors de la création automatique des profils (non bloquant):', createError);
        }
      };
      
      // Lancer la création du profil puis appliquer parrainage si code fourni
      await createProfile();
      if (referralCode && typeof referralCode === 'string' && referralCode.trim()) {
        try {
          const { data: refData, error: refError } = await supabase.rpc('apply_referral_if_any', {
            p_invited_user_id: data.user.id,
            p_referral_code: referralCode.trim(),
          });
          if (!refError && refData?.success) {
            console.log('[signUp] Parrainage appliqué: +30⭐ au parrain');
          }
        } catch (refErr) {
          console.warn('[signUp] apply_referral_if_any (non bloquant):', refErr);
        }
      }
    }
    
    return { user: data.user, error: null };
  } catch (error) {
    console.error('[signUp] Erreur lors de la création du compte:', error);
    return { user: null, error };
  }
}

/**
 * Connecte un utilisateur existant
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<{user: object, error: object}>}
 */
export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Gérer spécifiquement le cas où l'email n'est pas confirmé
      if (error.message?.includes('Email not confirmed') || 
          error.message?.includes('email_not_confirmed') ||
          error.code === 'email_not_confirmed') {
        return { 
          user: null, 
          error: {
            message: 'Ton email n\'est pas encore confirmé. Vérifie ta boîte mail et clique sur le lien de confirmation.',
            code: 'email_not_confirmed'
          }
        };
      }
      throw error;
    }

    // CRITICAL: Créer automatiquement les profils user_profiles et user_progress après signin
    // (au cas où ils n'auraient pas été créés lors du signup)
    if (data.user?.id) {
      try {
        // Créer user_profiles si n'existe pas
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            onboarding_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });
        
        if (profileError && profileError.code !== '23505' && profileError.status !== 406) {
          console.warn('[signIn] Erreur lors de la création du profil (non bloquant):', profileError);
        }
        
        // CRITICAL FIX: Ne PAS créer/écraser user_progress lors du signIn
        // La progression sera créée à la demande par getUserProgress si elle n'existe pas
        // Cela évite d'écraser les valeurs existantes (xp, etoiles) si l'utilisateur a déjà progressé
        // 
        // AVANT (BUG): upsert avec xp:0, etoiles:0, ignoreDuplicates:false écrasait les valeurs existantes
        // APRÈS (FIX): Vérifier d'abord si la progression existe, ne créer que si elle n'existe pas
        const { data: existingProgress } = await supabase
          .from('user_progress')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        
        // Seulement créer si la progression n'existe PAS
        if (!existingProgress) {
          console.log('[signIn] Création de la progression initiale pour nouvel utilisateur');
          const { error: progressError } = await supabase
            .from('user_progress')
            .insert({
              id: data.user.id,
              niveau: 1,
              xp: 0,
              etoiles: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          
          if (progressError && progressError.code !== '23505' && progressError.status !== 406) {
            console.warn('[signIn] Erreur lors de la création de la progression (non bloquant):', progressError);
          }
        } else {
          console.log('[signIn] Progression existante trouvée, pas d\'écrasement');
        }
      } catch (createError) {
        // Ne pas bloquer le signin si la création des profils échoue
        console.warn('[signIn] Erreur lors de la création automatique des profils (non bloquant):', createError);
      }
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return { user: null, error };
  }
}

/**
 * Récupère la session courante (pour vérification après signIn/signUp).
 * LoginScreen l’utilise pour s’assurer que la session est bien présente après connexion.
 * @param {boolean} [_refresh] - Ignoré (Supabase getSession ne prend pas de paramètre).
 * @returns {Promise<{session: object|null}>}
 */
export async function getSession(_refresh) {
  const res = await supabase.auth.getSession();
  return res?.data ?? { session: null };
}

/**
 * Récupère l'utilisateur actuellement connecté.
 * Utilise getSession() puis getUser() (Supabase). Pas de refresh manuel ni signOut sur 403.
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes?.data?.session ?? null;
    const userRes = await supabase.auth.getUser();
    const user = userRes?.data?.user ?? null;
    const error = userRes?.error ?? null;

    if (user && !error) {
      return user;
    }

    // 403/401 → return null (pas de cache) pour éviter boucle avec mode zéro session au boot
    if (error?.status === 403 || error?.status === 401) {
      if (__DEV__) console.log('[getCurrentUser] status=' + (error?.status ?? '') + ', return null (no cache)');
      return null;
    }

    if (error && error.message?.includes?.('user_not_found')) {
      console.warn('[getCurrentUser] user_not_found, déconnexion automatique');
      await supabase.auth.signOut();
      return null;
    }

    if (error && typeof error.message === 'string') {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes('refresh') || (errMsg.includes('invalid') && errMsg.includes('token')) || errMsg.includes('jwt expired')) {
        // Invalid refresh token : ne pas signOut si on a une session valide en cache
        if (session?.user) {
          if (__DEV__) console.log('[getCurrentUser] token invalide mais session en cache, continuation');
          return session.user;
        }
        console.warn('[getCurrentUser] Token invalide et pas de session, déconnexion');
        try { await supabase.auth.signOut(); } catch (_) {}
        return null;
      }
    }

    return session?.user ?? null;
  } catch (error) {
    console.error('[getCurrentUser] Erreur:', error?.message ?? error);
    try {
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes?.data?.session ?? null;
      return session?.user ?? null;
    } catch (_) {
      return null;
    }
  }
}

/**
 * Envoie un email de réinitialisation du mot de passe (Supabase Auth).
 * @param {string} email - Adresse email du compte
 * @param {object} [options] - { redirectTo } URL de redirection après clic sur le lien (recommandé sur web)
 * @returns {Promise<{data: object, error: object}>}
 */
export async function resetPasswordForEmail(email, options = {}) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), options);
    return { data, error };
  } catch (error) {
    console.error('Erreur envoi email reset password:', error);
    return { data: null, error: error };
  }
}

/**
 * Met à jour le mot de passe de l'utilisateur (après clic sur lien recovery).
 * À appeler quand l'utilisateur a une session valide (recovery).
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<{data: object, error: object}>}
 */
export async function updateUserPassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  } catch (error) {
    console.error('Erreur update password:', error);
    return { data: null, error: error };
  }
}

/**
 * Déconnecte l'utilisateur actuel
 * @returns {Promise<{error: object}>}
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    return { error };
  }
}

