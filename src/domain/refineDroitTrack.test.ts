/**
 * Tests : computeDroitVariantFromRefinement (5 questions, defense_track si defenseScore >= 3).
 */

import { computeDroitVariantFromRefinement, REFINE_DROIT_QUESTION_IDS } from './refineDroitTrack';
import { TOTAL_METIER_QUESTIONS_V2 } from '../data/quizMetierQuestionsV2';

describe('refineDroitTrack', () => {
  describe('computeDroitVariantFromRefinement', () => {
    it('3+ réponses B => defense_track', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: { value: 'B' },
        refine_2: { value: 'B' },
        refine_3: { value: 'B' },
        refine_4: { value: 'A' },
        refine_5: { value: 'A' },
      })).toBe('defense_track');

      expect(computeDroitVariantFromRefinement({
        refine_1: 'B', refine_2: 'B', refine_3: 'B', refine_4: 'B', refine_5: 'A',
      })).toBe('defense_track');
    });

    it('3+ réponses A => default', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: { value: 'A' },
        refine_2: { value: 'A' },
        refine_3: { value: 'A' },
        refine_4: { value: 'B' },
        refine_5: { value: 'B' },
      })).toBe('default');

      expect(computeDroitVariantFromRefinement({
        refine_1: 'A', refine_2: 'A', refine_3: 'A', refine_4: 'A', refine_5: 'B',
      })).toBe('default');
    });

    it('cas mixte : 2B + 3A => default (defenseScore 2 < 3)', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: 'B', refine_2: 'B', refine_3: 'A', refine_4: 'A', refine_5: 'A',
      })).toBe('default');
    });

    it('cas mixte : 3B + 2A => defense_track', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: 'B', refine_2: 'B', refine_3: 'B', refine_4: 'A', refine_5: 'A',
      })).toBe('defense_track');
    });

    it('"ça dépend" (C) compte 0.5 defense : 5×C => defenseScore 2.5 < 3 => default', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: 'C', refine_2: 'C', refine_3: 'C', refine_4: 'C', refine_5: 'C',
      })).toBe('default');
    });

    it('mix A/B/C : 2B + 2C => defense 2 + 1 = 3 => defense_track', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: 'B', refine_2: 'B', refine_3: 'C', refine_4: 'C', refine_5: 'A',
      })).toBe('defense_track');
    });

    it('réponses manquantes ou invalides comptent 0', () => {
      expect(computeDroitVariantFromRefinement({
        refine_1: 'A', refine_2: 'A', refine_3: 'A',
        // refine_4, refine_5 manquants
      })).toBe('default');

      expect(computeDroitVariantFromRefinement({})).toBe('default');
    });
  });

  describe('combined quiz length when needsDroitRefinement', () => {
    it('refinement (5) + métier (30) = 35 questions', () => {
      expect(REFINE_DROIT_QUESTION_IDS.length + TOTAL_METIER_QUESTIONS_V2).toBe(35);
    });
  });
});
