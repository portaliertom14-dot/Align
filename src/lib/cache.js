import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Système de cache simple avec expiration
 * Améliore les performances en évitant les appels API/DB répétés
 */

const CACHE_PREFIX = '@align_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes par défaut

/**
 * Structure d'une entrée de cache
 * @typedef {Object} CacheEntry
 * @property {*} data - Données mises en cache
 * @property {number} timestamp - Timestamp de création
 * @property {number} ttl - Time to live en millisecondes
 */

/**
 * Récupère une valeur du cache
 * @param {string} key - Clé du cache
 * @returns {Promise<*|null>} Données en cache ou null si expiré/inexistant
 */
export async function getCache(key) {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Vérifier si le cache est expiré
    if (age > entry.ttl) {
      await AsyncStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error(`[CACHE] Erreur lors de la récupération de ${key}:`, error);
    return null;
  }
}

/**
 * Met une valeur en cache
 * @param {string} key - Clé du cache
 * @param {*} data - Données à mettre en cache
 * @param {number} [ttl=DEFAULT_TTL] - Time to live en millisecondes
 */
export async function setCache(key, data, ttl = DEFAULT_TTL) {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    const serialized = JSON.stringify(entry);
    
    
    await AsyncStorage.setItem(cacheKey, serialized);
    
  } catch (error) {
    
    // Si erreur de quota, nettoyer les anciennes entrées de cache
    if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
      console.warn(`[CACHE] Quota dépassé pour ${key}, nettoyage des anciennes entrées...`);
      
      try {
        // Nettoyer les anciennes entrées de cache expirées
        await cleanupExpiredCache();
        
        // Réessayer une fois après nettoyage
        const cacheKey = `${CACHE_PREFIX}${key}`;
        const entry = {
          data,
          timestamp: Date.now(),
          ttl,
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
        
        
        return;
      } catch (retryError) {
        // Si ça échoue encore, nettoyer plus agressivement
        console.warn(`[CACHE] Nettoyage agressif nécessaire...`);
        await clearAllCache();
        
        
        // Ne pas réessayer après nettoyage agressif pour éviter une boucle infinie
        console.error(`[CACHE] Erreur lors de la mise en cache de ${key} (quota dépassé même après nettoyage):`, retryError);
      }
    } else {
      console.error(`[CACHE] Erreur lors de la mise en cache de ${key}:`, error);
    }
  }
}

/**
 * Supprime une entrée du cache
 * @param {string} key - Clé du cache
 */
export async function clearCache(key) {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await AsyncStorage.removeItem(cacheKey);
  } catch (error) {
    console.error(`[CACHE] Erreur lors de la suppression de ${key}:`, error);
  }
}

/**
 * Nettoie les entrées de cache expirées
 */
async function cleanupExpiredCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    const now = Date.now();
    const keysToRemove = [];
    
    for (const cacheKey of cacheKeys) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const entry = JSON.parse(cached);
          const age = now - entry.timestamp;
          if (age > entry.ttl) {
            keysToRemove.push(cacheKey);
          }
        }
      } catch (e) {
        // Si on ne peut pas parser, supprimer la clé
        keysToRemove.push(cacheKey);
      }
    }
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`[CACHE] ${keysToRemove.length} entrées expirées supprimées`);
    }
  } catch (error) {
    console.error('[CACHE] Erreur lors du nettoyage du cache:', error);
  }
}

/**
 * Vide tout le cache
 */
export async function clearAllCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`[CACHE] ${cacheKeys.length} entrées de cache supprimées`);
    }
  } catch (error) {
    console.error('[CACHE] Erreur lors du vidage du cache:', error);
  }
}

/**
 * Wrapper pour une fonction avec cache
 * @param {string} cacheKey - Clé du cache
 * @param {Function} fn - Fonction à exécuter si pas de cache
 * @param {number} [ttl=DEFAULT_TTL] - Time to live
 * @returns {Promise<*>} Résultat de la fonction ou du cache
 */
export async function withCache(cacheKey, fn, ttl = DEFAULT_TTL) {
  // Essayer de récupérer depuis le cache
  const cached = await getCache(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Exécuter la fonction et mettre en cache
  const result = await fn();
  await setCache(cacheKey, result, ttl);
  return result;
}











