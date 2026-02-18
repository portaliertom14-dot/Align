/**
 * Mapping central des erreurs Auth (Login + SignUp Supabase) vers messages utilisateur.
 * Un seul endroit pour convertir error -> message affichable.
 *
 * @typedef {'login' | 'signup'} AuthMode
 * @typedef {{ title?: string; message: string; code?: string }} AuthErrorResult
 */

/**
 * @param {any} err - Erreur Supabase ou réseau (objet ou throw)
 * @param {AuthMode} mode - 'login' | 'signup'
 * @returns {AuthErrorResult}
 */
export function mapAuthError(err, mode) {
  if (!err) {
    return { message: 'Une erreur est survenue. Réessaie.' };
  }

  const msg = (err?.message || err?.msg || '').toString();
  const status = err?.status ?? err?.code;
  const name = err?.name || '';

  // A) Timeout auth (Promise.race)
  if (msg === 'AUTH_TIMEOUT' || name === 'AUTH_TIMEOUT' || msg === 'SIGNUP_REQUEST_TIMEOUT') {
    return { message: 'Problème réseau. Réessaie dans quelques secondes.', code: 'timeout' };
  }

  // B) Erreurs réseau (fetch)
  if (
    name.includes('AuthRetryableFetchError') ||
    msg.includes('Load failed') ||
    (msg.includes('TypeError') && msg.includes('Load failed')) ||
    msg.includes('Network request failed') ||
    msg.includes('Failed to fetch') ||
    msg.toLowerCase().includes('network')
  ) {
    return { message: 'Problème de connexion. Vérifie internet et réessaie.', code: 'network' };
  }

  // C) Rate limit
  if (status === 429 || msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
    return { message: 'Trop de tentatives. Réessaie dans quelques minutes.', code: 'rate_limit' };
  }

  const msgLower = msg.toLowerCase();

  // D) LOGIN
  if (mode === 'login') {
    if (msgLower.includes('invalid login credentials') || msgLower.includes('invalid password')) {
      return { message: 'Email ou mot de passe incorrect.', code: 'invalid_credentials' };
    }
    if (msgLower.includes('email not confirmed')) {
      return { message: 'Confirme ton email avant de te connecter.', code: 'email_not_confirmed' };
    }
  }

  // E) SIGNUP
  if (mode === 'signup') {
    if (msgLower.includes('user already registered') || msgLower.includes('already registered') || err?.code === 'user_already_exists') {
      return { message: 'Un compte existe déjà avec cet email. Connecte-toi.', code: 'user_already_registered' };
    }
    if (msgLower.includes('signup is disabled') || msgLower.includes('signups not allowed')) {
      return { message: 'La création de compte est désactivée pour le moment.', code: 'signup_disabled' };
    }
    if (
      msgLower.includes('password should be at least') ||
      msgLower.includes('weak password') ||
      msgLower.includes('password is too short')
    ) {
      return { message: 'Choisis un mot de passe plus sécurisé (8 caractères minimum).', code: 'weak_password' };
    }
  }

  // F) Email invalide (commun)
  if (msgLower.includes('invalid email') || msgLower.includes('email address is invalid')) {
    return { message: "Ton email n'est pas valide.", code: 'invalid_email' };
  }

  // G) Fallback
  const statusNum = typeof status === 'number' ? status : parseInt(String(status), 10);
  if (!isNaN(statusNum) && statusNum >= 500) {
    return { message: 'Serveur temporairement indisponible. Réessaie.', code: 'server_error' };
  }

  return { message: 'Une erreur est survenue. Réessaie.', code: 'unknown' };
}
