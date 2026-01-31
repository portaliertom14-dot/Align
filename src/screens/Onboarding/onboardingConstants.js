import { Dimensions } from 'react-native';

/**
 * Dimensions du bouton CONTINUER partagées entre Interlude et Birthdate
 * pour garantir la même taille sur tous les écrans onboarding.
 */
export function getContinueButtonDimensions() {
  const { width } = Dimensions.get('window');
  const buttonWidth = Math.min(Math.min(width * 0.24, 330) + 75, 405);
  const buttonHeight = Math.min(Math.max(width * 0.06, 48), 66);
  const buttonTextSize = Math.min(Math.max(width * 0.045, 18), 28);
  return { buttonWidth, buttonHeight, buttonTextSize };
}
