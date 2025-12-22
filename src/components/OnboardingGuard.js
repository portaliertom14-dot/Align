import React from 'react';

/**
 * OnboardingGuard - Guard de navigation simplifié
 * 
 * NOTE: La vérification d'onboarding complété a été retirée temporairement.
 * L'intégration de cette vérification sera faite avec l'IA plus tard.
 * Pour l'instant, on autorise toujours l'accès à Main pour éviter les boucles de redirection.
 */
export default function OnboardingGuard({ children }) {
  // Autoriser toujours l'accès pour éviter les boucles de redirection
  // La vérification d'onboarding sera réintégrée avec l'IA
  return children;
}
