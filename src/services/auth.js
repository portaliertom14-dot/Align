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
    // STEP 1: Vérifier si l'email existe déjà via fonction RPC
    // (Cette fonction bypass RLS et vérifie dans user_profiles)
    try {
      const { data: emailExists, error: rpcError } = await supabase
        .rpc('check_email_exists', { check_email: email });
      
      if (!rpcError && emailExists === true) {
        console.log('[signUp] Email déjà utilisé (via RPC):', email);
        return { 
          user: null, 
          error: { 
            message: 'User already registered',
            code: 'user_already_exists'
          } 
        };
      }
    } catch (rpcError) {
      // Si la fonction RPC n'existe pas ou échoue, continuer quand même
      // L'erreur sera catchée par Supabase Auth si l'email existe vraiment
      console.warn('[signUp] RPC check_email_exists non disponible, continuons:', rpcError);
    }
    
    // STEP 2: Créer le compte avec Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[signUp] Erreur Supabase:', error);
      
      // Vérifier si c'est une erreur de duplication
      const isDuplicate = error.message?.includes('already') || error.message?.includes('duplicate') || error.code === '23505';
      
      if (isDuplicate) {
        return {
          user: null,
          error: {
            message: 'User already registered',
            code: 'user_already_exists'
          }
        };
      }
      
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
  const { data } = await supabase.auth.getSession();
  return data;
}

/**
 * Récupère l'utilisateur actuellement connecté
 * Essai multiple : getUser() puis getSession() si getUser() échoue
 * Si l'utilisateur n'existe plus (user_not_found), déconnecte automatiquement
 * @returns {Promise<object|null>}
 */
export async function getCurrentUser() {
  try {
    // Essayer getUser() d'abord (requête au serveur)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Si l'utilisateur n'existe plus (supprimé), déconnecter automatiquement
    if (error && (error.message?.includes('user_not_found') || error.status === 403)) {
      console.warn('[getCurrentUser] Utilisateur supprimé, déconnexion automatique');
      await supabase.auth.signOut();
      return null;
    }
    // Token invalide / expiré (éviter écran noir ou chargement infini au boot)
    if (error && typeof error.message === 'string') {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes('refresh') || (errMsg.includes('invalid') && errMsg.includes('token')) || errMsg.includes('jwt expired')) {
        console.warn('[getCurrentUser] Token invalide ou expiré, déconnexion');
        try { await supabase.auth.signOut(); } catch (_) {}
        return null;
      }
    }
    
    if (user && !error) {
      return user;
    }
    
    // Si getUser() ne fonctionne pas, essayer getSession() (session locale)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    
    // Si l'erreur indique que l'utilisateur n'existe plus, déconnecter
    if (error.message?.includes('user_not_found') || error.status === 403) {
      console.warn('[getCurrentUser] Utilisateur supprimé (catch), déconnexion automatique');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Erreur lors de la déconnexion:', signOutError);
      }
      return null;
    }
    // Token invalide / expiré (éviter écran noir au boot)
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('refresh') || (msg.includes('invalid') && msg.includes('token')) || msg.includes('jwt expired')) {
      console.warn('[getCurrentUser] Token invalide ou expiré (catch), déconnexion');
      try { await supabase.auth.signOut(); } catch (_) {}
      return null;
    }

    // En cas d'erreur, essayer getSession() comme fallback
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user || null;
    } catch (sessionError) {
      console.error('Erreur lors de la récupération de la session:', sessionError);
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

