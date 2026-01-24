/**
 * Hook pour le tracking d'activité des quêtes
 * Fichier séparé pour éviter problèmes de cache bundler
 */

import { useQuestActivityTracking as useTrackingFromIntegration } from './questIntegrationUnified';

/**
 * Hook pour tracker l'activité utilisateur (temps actif)
 * @returns {{ startTracking: Function, stopTracking: Function }}
 */
export function useQuestActivityTracking() {
  return useTrackingFromIntegration();
}

export default useQuestActivityTracking;
