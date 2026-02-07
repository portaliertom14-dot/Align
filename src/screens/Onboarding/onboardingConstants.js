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
const DESKTOP_BREAKPOINT = 1100;

/** isNarrow = width <= 430 (mobile étroit) */
export function isNarrow(width) {
  return width <= NARROW_BREAKPOINT;
}

/**
 * Tokens typo onboarding — UNIQUEMENT pour écrans onboarding.
 * Même taille titre/sous-texte sur tous les écrans (mascotte, questions, etc.).
 * Desktop = valeurs exactes conservées (pixel-perfect).
 */
export const OB_TITLE_SIZE_MOBILE = 20;
export const OB_SUBTITLE_SIZE_MOBILE = 16;
export const OB_TITLE_SIZE_DESKTOP = 29;
export const OB_SUBTITLE_SIZE_DESKTOP = 20;

/**
 * Typo responsive onboarding — titre et sous-texte UNIFIÉS sur tous les écrans.
 * - Desktop (>=1100px) : valeurs exactes (29/20) — INCHANGÉ
 * - Mobile (<=430px) : 20/16 — lisibles, phrases complètes
 * - Tablet (430–1100px) : interpolation linéaire
 * - Pas de truncation : max-width sur le bloc texte, pas de numberOfLines/line-clamp
 */
export function getOnboardingImageTextSizes(width) {
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const narrow = width <= NARROW_BREAKPOINT;

  let titleFontSize = OB_TITLE_SIZE_DESKTOP;
  let subtitleFontSize = OB_SUBTITLE_SIZE_DESKTOP;

  if (narrow) {
    titleFontSize = OB_TITLE_SIZE_MOBILE;
    subtitleFontSize = OB_SUBTITLE_SIZE_MOBILE;
  } else if (!isDesktop) {
    const t = (width - NARROW_BREAKPOINT) / (DESKTOP_BREAKPOINT - NARROW_BREAKPOINT);
    titleFontSize = Math.round(OB_TITLE_SIZE_MOBILE + t * (OB_TITLE_SIZE_DESKTOP - OB_TITLE_SIZE_MOBILE));
    subtitleFontSize = Math.round(OB_SUBTITLE_SIZE_MOBILE + t * (OB_SUBTITLE_SIZE_DESKTOP - OB_SUBTITLE_SIZE_MOBILE));
  }

  const titleLineHeight = Math.round(titleFontSize * 1.15);
  const subtitleLineHeight = Math.round(subtitleFontSize * 1.25);

  // maxWidth bloc texte : min(92vw, 900px) — wrap naturel, pas de mot isolé
  const textMaxWidth = Math.min(0.92, 900 / width);

  return {
    titleFontSize,
    subtitleFontSize,
    titleLineHeight,
    subtitleLineHeight,
    textMaxWidth,
  };
}
