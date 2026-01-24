/**
 * Point d'entrée pour l'initialisation du système de quêtes
 * 
 * Note: Ce fichier a été créé pour contourner un problème de cache persistant
 * du bundler Metro avec index.js. Il forward simplement vers questIntegrationUnified.
 */

import { initializeQuests as initFromIntegration } from './questIntegrationUnified';

/**
 * Initialise le système de quêtes
 * @returns {Promise<void>}
 */
export async function initializeQuests() {
  return initFromIntegration();
}
