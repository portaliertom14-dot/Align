/**
 * Utilitaires de retry avec backoff exponentiel
 * Robustesse : gère les erreurs temporaires de réseau/API
 */

/**
 * Exécute une fonction avec retry automatique
 * @param {Function} fn - Fonction à exécuter (doit retourner une Promise)
 * @param {Object} options - Options de retry
 * @param {number} [options.maxRetries=3] - Nombre maximum de tentatives
 * @param {number} [options.initialDelay=1000] - Délai initial en ms
 * @param {number} [options.maxDelay=10000] - Délai maximum en ms
 * @param {Function} [options.shouldRetry] - Fonction pour déterminer si on doit retry (error) => boolean
 * @returns {Promise<*>} Résultat de la fonction
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 2, // Réduit de 3 à 2 pour des performances plus rapides
    initialDelay = 300, // Réduit de 1000ms à 300ms pour des retries plus rapides
    maxDelay = 5000, // Réduit de 10000ms à 5000ms
    shouldRetry = (error) => {
      // Retry par défaut pour les erreurs réseau ou serveur
      const code = error?.code || error?.status;
      const message = error?.message || '';
      
      // Ne jamais retry les erreurs CORS
      const isCorsError = error instanceof TypeError ||
                         message.includes('Load failed') ||
                         message.includes('access control') ||
                         message.includes('CORS') ||
                         message.includes('Failed to fetch');
      if (isCorsError) {
        return false;
      }
      
      // Ne pas retry pour les erreurs client (4xx sauf 429)
      if (code >= 400 && code < 500 && code !== 429) {
        return false;
      }
      
      // Retry pour erreurs réseau, timeout, ou serveur (5xx)
      return (
        code >= 500 ||
        code === 429 ||
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('ECONNREFUSED') ||
        message.includes('ENOTFOUND')
      );
    },
  } = options;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Dernière tentative, ne pas retry
      if (attempt >= maxRetries) {
        break;
      }
      
      // Vérifier si on doit retry
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt),
        maxDelay
      );
      
      // Ajouter un peu de jitter pour éviter le thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const finalDelay = delay + jitter;
      
      console.log(`[RETRY] Tentative ${attempt + 1}/${maxRetries} échouée, nouvelle tentative dans ${Math.round(finalDelay)}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  throw lastError;
}

/**
 * Wrapper pour les appels Supabase avec retry
 * @param {Function} supabaseCall - Fonction qui retourne une Promise Supabase
 * @param {Object} [options] - Options de retry
 * @returns {Promise<{data: *, error: *}>} Résultat Supabase
 */
export async function supabaseWithRetry(supabaseCall, options = {}) {
  try {
    const result = await withRetry(supabaseCall, options);
    return result;
  } catch (error) {
    // Formater l'erreur au format Supabase
    return {
      data: null,
      error: {
        message: error.message || 'Erreur inconnue',
        code: error.code || error.status,
        ...error,
      },
    };
  }
}





