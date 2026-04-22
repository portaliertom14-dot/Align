import {
  BRIDGE_VISUAL_REVEAL_MS,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_VIEWPORT_WIDTH,
  computeImageSize,
  computePostQuestionsBridgeLayout,
  sanitizeInset,
  sanitizeViewportDimension,
} from './postQuestionsBridgeLayout';

describe('postQuestionsBridgeLayout', () => {
  describe('sanitizeViewportDimension', () => {
    it('garde une valeur valide', () => {
      expect(sanitizeViewportDimension(400, 99)).toBe(400);
    });

    it('utilise le fallback pour NaN', () => {
      expect(sanitizeViewportDimension(Number.NaN, 12)).toBe(12);
    });

    it('utilise le fallback pour Infinity', () => {
      expect(sanitizeViewportDimension(Number.POSITIVE_INFINITY, 12)).toBe(12);
    });

    it('utilise le fallback pour zéro ou négatif', () => {
      expect(sanitizeViewportDimension(0, 390)).toBe(390);
      expect(sanitizeViewportDimension(-10, 390)).toBe(390);
    });
  });

  describe('sanitizeInset', () => {
    it('clamp les valeurs négatives à 0', () => {
      expect(sanitizeInset(-5)).toBe(0);
    });

    it('accepte les valeurs positives', () => {
      expect(sanitizeInset(44)).toBe(44);
    });

    it('traite NaN comme 0', () => {
      expect(sanitizeInset(Number.NaN)).toBe(0);
    });
  });

  describe('computeImageSize', () => {
    it('retourne au moins 1', () => {
      expect(computeImageSize(1)).toBeGreaterThanOrEqual(1);
    });

    it('pour une largeur type iPhone, reste dans une plage cohérente', () => {
      const s = computeImageSize(390);
      expect(s).toBeGreaterThan(100);
      expect(s).toBeLessThanOrEqual(400);
    });
  });

  describe('computePostQuestionsBridgeLayout', () => {
    it('calcule isSmallScreen pour largeur <= 390', () => {
      expect(computePostQuestionsBridgeLayout({ width: 390, height: 800, insetTop: 0, insetBottom: 0 }).isSmallScreen).toBe(true);
      expect(computePostQuestionsBridgeLayout({ width: 391, height: 800, insetTop: 0, insetBottom: 0 }).isSmallScreen).toBe(false);
    });

    it('applique les défauts si width/height invalides', () => {
      const layout = computePostQuestionsBridgeLayout({
        width: Number.NaN,
        height: -1,
        insetTop: 0,
        insetBottom: 0,
      });
      expect(layout.titleFontSize).toBeGreaterThan(0);
      expect(layout.middlePadding).toBeGreaterThan(0);
      expect(layout.imageSize).toBeGreaterThan(0);
    });

    it('augmente topSpacing avec insetTop', () => {
      const a = computePostQuestionsBridgeLayout({ width: 400, height: 800, insetTop: 0, insetBottom: 0 });
      const b = computePostQuestionsBridgeLayout({ width: 400, height: 800, insetTop: 50, insetBottom: 0 });
      expect(b.topSpacing).toBeGreaterThan(a.topSpacing);
    });

    it('expose BRIDGE_VISUAL_REVEAL_MS aligné avec l’écran', () => {
      expect(BRIDGE_VISUAL_REVEAL_MS).toBe(1200);
      expect(DEFAULT_VIEWPORT_WIDTH).toBe(390);
      expect(DEFAULT_VIEWPORT_HEIGHT).toBe(844);
    });
  });
});
