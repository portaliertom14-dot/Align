/**
 * Calculs de mise en page purs pour PostQuestionsBridgeScreen.
 * Extraits pour tests unitaires et garde-fous sur des dimensions invalides.
 */

export const DEFAULT_VIEWPORT_WIDTH = 390;
export const DEFAULT_VIEWPORT_HEIGHT = 844;
/** Délai max avant d'afficher le contenu si l'image ne déclenche pas onLoadEnd (réseau lent, cache). */
export const BRIDGE_VISUAL_REVEAL_MS = 1200;

export type PostQuestionsBridgeLayoutInput = {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
};

export type PostQuestionsBridgeLayout = {
  isSmallScreen: boolean;
  imageSize: number;
  buttonWidth: number;
  topSpacing: number;
  bottomSpacing: number;
  buttonBottomSpacing: number;
  titleFontSize: number;
  titleLineHeight: number;
  middlePadding: number;
};

/** Largeur / hauteur utilisables : valeurs finies et strictement positives, sinon défauts. */
export function sanitizeViewportDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

/** Insets safe-area : finis et >= 0. */
export function sanitizeInset(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/**
 * Taille d'illustration : même formule que l'écran d'origine, avec plancher pour éviter des tailles négatives ou nulles.
 */
export function computeImageSize(width: number): number {
  const raw = Math.min(Math.max(width * 0.24, 300), 430) - 55;
  return Math.max(1, raw);
}

/**
 * Retourne tous les scalaires de style dérivés de la fenêtre et des safe areas.
 */
export function computePostQuestionsBridgeLayout(
  input: PostQuestionsBridgeLayoutInput
): PostQuestionsBridgeLayout {
  const width = sanitizeViewportDimension(input.width, DEFAULT_VIEWPORT_WIDTH);
  const height = sanitizeViewportDimension(input.height, DEFAULT_VIEWPORT_HEIGHT);
  const insetTop = sanitizeInset(input.insetTop);
  const insetBottom = sanitizeInset(input.insetBottom);

  const isSmallScreen = width <= 390;
  const imageSize = computeImageSize(width);
  const buttonWidth = Math.min(width * 0.76, 400);
  const topSpacing = Math.max(insetTop + 66, 78);
  const bottomSpacing = Math.max(insetBottom + 26, 34);
  const buttonBottomSpacing = Math.max(bottomSpacing + 6, 34);
  const titleFontSize = isSmallScreen
    ? Math.min(Math.max(width * 0.058, 19), 24)
    : Math.min(Math.max(width * 0.045, 20), 34);
  const titleLineHeight = Math.round(titleFontSize * 1.28);
  const middlePadding = Math.max(height * 0.04, 22);

  return {
    isSmallScreen,
    imageSize,
    buttonWidth,
    topSpacing,
    bottomSpacing,
    buttonBottomSpacing,
    titleFontSize,
    titleLineHeight,
    middlePadding,
  };
}
