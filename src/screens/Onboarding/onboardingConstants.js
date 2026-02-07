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

const NARROW_BREAKPOINT = 430;

/** isNarrow = width <= 430 (mobile étroit) */
export function isNarrow(width) {
  return width <= NARROW_BREAKPOINT;
}

/**
 * Typo responsive pour écrans onboarding avec image (mascotte).
 * - Desktop (>=1100px) : titres +3px, subtitles +2px (lisibilité)
 * - Narrow (<=430px) : titres +2px, subtitles +1px (lisibilité mobile)
 * - maxWidth pour éviter orphelins (1 mot seul sur une ligne)
 */
export function getOnboardingImageTextSizes(width) {
  const isDesktop = width >= 1100;
  const narrow = isNarrow(width);
  const titleBase = Math.min(Math.max(width * 0.022, 16), 26);
  const subtitleBase = Math.min(Math.max(width * 0.015, 15), 20);
  let titleFontSize = isDesktop ? Math.min(titleBase + 3, 30) : titleBase;
  let subtitleFontSize = isDesktop ? Math.min(subtitleBase + 2, 23) : subtitleBase;
  if (narrow) {
    titleFontSize = Math.min(titleBase + 2, 24);
    subtitleFontSize = Math.min(subtitleBase + 1, 20);
  }
  const titleLineHeight = (isDesktop ? Math.max(titleFontSize * 1.15, 28) : Math.min(Math.max(width * 0.026, 20), 30) * 1.05);
  const subtitleLineHeight = Math.max(subtitleFontSize + 4, 22);

  // maxWidth pour éviter orphelins : desktop 75%, tablette 88%, mobile 94%
  let textMaxWidth = 0.94;
  if (width >= 1100) textMaxWidth = 0.75;
  else if (width >= 600) textMaxWidth = 0.88;

  return {
    titleFontSize,
    subtitleFontSize,
    titleLineHeight,
    subtitleLineHeight,
    textMaxWidth,
  };
}
