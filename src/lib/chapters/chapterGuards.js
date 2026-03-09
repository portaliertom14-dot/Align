/**
 * Guards de sécurité pour le système de chapitres
 * Bloque l'accès aux modules/chapitres verrouillés
 */

import { isChapterUnlocked, isModuleAccessible } from './chapterSystem';
import { getPremiumAccessState } from '../../services/stripeService';

/**
 * Vérifie si l'utilisateur peut accéder à un chapitre
 * @param {number} chapterIndex - Index du chapitre (1-10)
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function canAccessChapter(chapterIndex) {
  try {
    const isUnlocked = await isChapterUnlocked(chapterIndex);
    
    if (!isUnlocked) {
      return {
        allowed: false,
        reason: `Le chapitre ${chapterIndex} n'est pas encore déverrouillé. Complète le chapitre précédent pour y accéder.`,
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[ChapterGuards] Erreur vérification chapitre:', error);
    return {
      allowed: false,
      reason: 'Erreur lors de la vérification du déblocage.',
    };
  }
}

/**
 * Vérifie si l'utilisateur peut accéder à un module
 * @param {number} chapterId - ID du chapitre dans Supabase
 * @param {number} moduleOrder - Ordre du module (1, 2, ou 3)
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function canAccessModule(chapterId, moduleOrder) {
  try {
    const isAccessible = await isModuleAccessible(chapterId, moduleOrder);
    
    if (!isAccessible) {
      if (moduleOrder === 1) {
        return {
          allowed: false,
          reason: 'Ce chapitre n\'est pas encore déverrouillé.',
        };
      } else {
        return {
          allowed: false,
          reason: `Le module ${moduleOrder} n'est pas accessible. Complète d'abord le module ${moduleOrder - 1}.`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('[ChapterGuards] Erreur vérification module:', error);
    return {
      allowed: false,
      reason: 'Erreur lors de la vérification du déblocage.',
    };
  }
}

/**
 * Guard pour protéger une route de module
 * Redirige vers Feed si l'accès est refusé
 * @param {Object} navigation - Objet navigation React Navigation
 * @param {number} chapterId - ID du chapitre
 * @param {number} moduleOrder - Ordre du module
 * @returns {Promise<boolean>} - true si accès autorisé, false sinon
 */
export async function guardModuleAccess(navigation, chapterId, moduleOrder) {
  try {
    // 1) Vérifier l'accès premium (abonnement actif ou période encore en cours)
    const { hasAccess } = await getPremiumAccessState();
    if (!hasAccess) {
      console.warn('[ChapterGuards] Accès refusé: no_premium');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/5c2eef27-11e3-4b8c-8e26-574a50e47ac3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fbbe0c' },
        body: JSON.stringify({
          sessionId: 'fbbe0c',
          location: 'chapterGuards.js:guardModuleAccess',
          message: 'GUARD_MODULE_PREMIUM_DENY',
          data: { chapterId, moduleOrder },
          timestamp: Date.now(),
          hypothesisId: 'H2',
        }),
      }).catch(() => {});
      // #endregion
      if (navigation) {
        navigation.navigate('Paywall');
      }
      return false;
    }

    // 2) Vérifier le déblocage du chapitre / module
    const { allowed, reason } = await canAccessModule(chapterId, moduleOrder);
    
    if (!allowed) {
      console.warn('[ChapterGuards] Accès refusé:', reason);
      
      if (navigation) {
        navigation.navigate('Main', { screen: 'Feed' });
      }
      
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ChapterGuards] Erreur guard:', error);
    if (navigation) {
      navigation.navigate('Main', { screen: 'Feed' });
    }
    return false;
  }
}
