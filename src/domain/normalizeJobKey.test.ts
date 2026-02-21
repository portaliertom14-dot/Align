/**
 * Tests anti-régression : normalisation canonique des titres métiers.
 */

import { normalizeJobKey } from './normalizeJobKey';

describe('normalizeJobKey', () => {
  it('"Producteur" et "producteur" donnent la même clé', () => {
    expect(normalizeJobKey('Producteur')).toBe(normalizeJobKey('producteur'));
    expect(normalizeJobKey('Producteur')).toBe('producteur');
  });

  it('"Officier d\'armée" et "officier d\'armee" donnent la même clé', () => {
    const key1 = normalizeJobKey("Officier d'armée");
    const key2 = normalizeJobKey("officier d'armee");
    expect(key1).toBe(key2);
    expect(key1).toBe("officier d'armee");
  });

  it('trim et toLowerCase', () => {
    expect(normalizeJobKey('  Producteur  ')).toBe('producteur');
    expect(normalizeJobKey('PRODUCTEUR')).toBe('producteur');
  });

  it('accents retirés', () => {
    expect(normalizeJobKey('Rédacteur')).toBe('redacteur');
    expect(normalizeJobKey('Médiateur')).toBe('mediateur');
    expect(normalizeJobKey('Éducation')).toBe('education');
  });

  it('espaces multiples réduits à un', () => {
    expect(normalizeJobKey('Producteur   de   contenu')).toBe("producteur de contenu");
  });

  it('input vide ou non-string retourne chaîne vide', () => {
    expect(normalizeJobKey('')).toBe('');
    expect(normalizeJobKey(null as unknown as string)).toBe('');
    expect(normalizeJobKey(undefined as unknown as string)).toBe('');
  });
});
