import { Dimensions } from 'react-native';

/**
 * Dimensions des boutons CTA onboarding — identiques à AuthScreen
 * width 76%, paddingVertical 16, fontSize 16
 */
export function getContinueButtonDimensions() {
  const { width } = Dimensions.get('window');
  const buttonWidth = Math.min(width * 0.76, 400);
  const buttonHeight = undefined; // dérivé de paddingVertical 16
  const buttonTextSize = 16;
  return { buttonWidth, buttonHeight, buttonTextSize };
}
