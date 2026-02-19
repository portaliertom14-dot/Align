/**
 * Tests : calcul du profil utilisateur (vecteur 8 axes) à partir des réponses quiz métier V2.
 */

import { computeJobProfile } from './computeJobProfile';

function makeAnswers(overrides: Record<string, 'A' | 'B' | 'C'>): Record<string, { value: string }> {
  const out: Record<string, { value: string }> = {};
  for (let i = 1; i <= 30; i++) {
    out[`metier_${i}`] = { value: overrides[`metier_${i}`] ?? 'B' };
  }
  return out;
}

describe('computeJobProfile', () => {
  it('retourne un vecteur avec 8 axes entre 0 et 10', () => {
    const answers = makeAnswers({});
    const v = computeJobProfile(answers);
    expect(Object.keys(v)).toHaveLength(8);
    for (const key of Object.keys(v)) {
      expect((v as Record<string, number>)[key]).toBeGreaterThanOrEqual(0);
      expect((v as Record<string, number>)[key]).toBeLessThanOrEqual(10);
    }
  });

  it('les scores changent quand on modifie une réponse', () => {
    const base = makeAnswers({});
    const allA = makeAnswers({});
    for (let i = 1; i <= 30; i++) {
      (allA as Record<string, { value: string }>)[`metier_${i}`] = { value: 'A' };
    }
    const allC = makeAnswers({});
    for (let i = 1; i <= 30; i++) {
      (allC as Record<string, { value: string }>)[`metier_${i}`] = { value: 'C' };
    }

    const vecBase = computeJobProfile(base);
    const vecA = computeJobProfile(allA);
    const vecC = computeJobProfile(allC);

    expect(vecA).not.toEqual(vecC);
    expect(vecBase).not.toEqual(vecA);
    expect(vecBase).not.toEqual(vecC);

    // A pousse STRUCTURE/ANALYSE/STABILITE, C pousse ACTION
    expect(vecA.STRUCTURE).toBeGreaterThanOrEqual(vecC.STRUCTURE);
    expect(vecC.ACTION).toBeGreaterThanOrEqual(vecA.ACTION);
  });

  it('une seule réponse différente produit un vecteur différent', () => {
    const a1 = makeAnswers({ metier_1: 'A' });
    const a2 = makeAnswers({ metier_1: 'C' });
    const v1 = computeJobProfile(a1);
    const v2 = computeJobProfile(a2);
    expect(v1).not.toEqual(v2);
  });
});
