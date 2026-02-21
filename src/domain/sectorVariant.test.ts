/**
 * Tests : getSectorVariant (droit + defense_track si defense top2, seuils plus stricts).
 */

import { getSectorVariant, THRESHOLD_GAP, MIN_DEFENSE_SCORE } from './sectorVariant';

describe('sectorVariant', () => {
  describe('getSectorVariant', () => {
    // ——— CONDITION 1 stricte (gap <= 0.5)
    it('gap = 0.4 => defense_track', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 35 },
        { id: 'defense_securite_civile', score: 34.6 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('defense_track');
    });

    it('gap = 0.6 et defenseScore = 35 => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 35.6 },
        { id: 'defense_securite_civile', score: 35 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    // ——— CONDITION 2 élargie (gap <= 1.2 et defenseScore >= 36)
    it('gap = 1.1 et defenseScore = 37 => defense_track', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 38.1 },
        { id: 'defense_securite_civile', score: 37 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('defense_track');
    });

    it('gap = 1.1 et defenseScore = 34 => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 35.1 },
        { id: 'defense_securite_civile', score: 34 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    it('gap = 1.3 => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 38 },
        { id: 'defense_securite_civile', score: 36.7 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    it('top2 !== defense => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 10 },
        { id: 'business_entrepreneuriat', score: 8 },
        { id: 'defense_securite_civile', score: 7 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    it('droit top1, defense top2, gap > threshold => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 10 },
        { id: 'defense_securite_civile', score: 5 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    it('droit top1, defense top3 => default', () => {
      const ranked = [
        { id: 'droit_justice_securite', score: 10 },
        { id: 'business_entrepreneuriat', score: 8 },
        { id: 'defense_securite_civile', score: 7 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked })).toBe('default');
    });

    it('autre secteur (ex. creation_design) => default', () => {
      const ranked = [
        { id: 'creation_design', score: 10 },
        { id: 'defense_securite_civile', score: 9.5 },
      ];
      expect(getSectorVariant({ pickedSectorId: 'creation_design', ranked })).toBe('default');
    });

    it('ranked vide ou < 2 => default', () => {
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked: [] })).toBe('default');
      expect(getSectorVariant({ pickedSectorId: 'droit_justice_securite', ranked: [{ id: 'droit_justice_securite', score: 10 }] })).toBe('default');
    });
  });
});
