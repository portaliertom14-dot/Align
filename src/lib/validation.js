/**
 * Utilitaires de validation et sanitization
 * Sécurité : valide et nettoie les inputs utilisateur
 */

/**
 * Valide un email
 * @param {string} email - Email à valider
 * @returns {boolean} True si valide
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Valide un mot de passe
 * @param {string} password - Mot de passe à valider
 * @returns {{valid: boolean, message?: string}} Résultat de validation
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Le mot de passe est requis' };
  }
  
  if (password.length < 6) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins 6 caractères' };
  }
  
  if (password.length > 128) {
    return { valid: false, message: 'Le mot de passe est trop long' };
  }
  
  return { valid: true };
}

/**
 * Sanitize une chaîne de caractères
 * @param {string} str - Chaîne à nettoyer
 * @param {number} maxLength - Longueur maximale
 * @returns {string} Chaîne nettoyée
 */
export function sanitizeString(str, maxLength = 1000) {
  if (!str || typeof str !== 'string') return '';
  
  // Supprimer les caractères de contrôle et limiter la longueur
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Supprimer caractères de contrôle
    .trim()
    .substring(0, maxLength);
}

/**
 * Valide un ID utilisateur (UUID)
 * @param {string} userId - ID à valider
 * @returns {boolean} True si valide
 */
export function isValidUserId(userId) {
  if (!userId || typeof userId !== 'string') return false;
  // Format UUID v4 simplifié
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(userId);
}

/**
 * Valide un objet de progression
 * @param {Object} progress - Objet de progression à valider
 * @returns {{valid: boolean, errors?: string[]}} Résultat de validation
 */
export function validateProgress(progress) {
  const errors = [];
  
  if (!progress || typeof progress !== 'object') {
    return { valid: false, errors: ['Progression invalide'] };
  }
  
  // Valider les types de base
  if (progress.currentXP !== undefined && (typeof progress.currentXP !== 'number' || progress.currentXP < 0)) {
    errors.push('currentXP doit être un nombre positif');
  }
  
  if (progress.totalStars !== undefined && (typeof progress.totalStars !== 'number' || progress.totalStars < 0)) {
    errors.push('totalStars doit être un nombre positif');
  }
  
  if (progress.currentModuleIndex !== undefined && (typeof progress.currentModuleIndex !== 'number' || progress.currentModuleIndex < 0 || progress.currentModuleIndex > 2)) {
    errors.push('currentModuleIndex doit être entre 0 et 2');
  }
  
  if (progress.quizAnswers !== undefined && (typeof progress.quizAnswers !== 'object' || Array.isArray(progress.quizAnswers))) {
    errors.push('quizAnswers doit être un objet');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Valide un objet de profil
 * @param {Object} profile - Profil à valider
 * @returns {{valid: boolean, errors?: string[]}} Résultat de validation
 */
export function validateProfile(profile) {
  const errors = [];
  
  if (!profile || typeof profile !== 'object') {
    return { valid: false, errors: ['Profil invalide'] };
  }
  
  // Valider les champs optionnels mais avec types corrects
  if (profile.firstName !== undefined && typeof profile.firstName !== 'string') {
    errors.push('firstName doit être une chaîne');
  }
  
  if (profile.lastName !== undefined && typeof profile.lastName !== 'string') {
    errors.push('lastName doit être une chaîne');
  }
  
  if (profile.username !== undefined && typeof profile.username !== 'string') {
    errors.push('username doit être une chaîne');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}











