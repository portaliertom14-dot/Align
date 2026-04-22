import { sanitizeReferralCodeForStorage } from './safeReferralCode';

describe('safeReferralCode', () => {
  it('accepte alphanum + tirets/underscores', () => {
    expect(sanitizeReferralCodeForStorage('abc-XYZ_09')).toBe('abc-XYZ_09');
  });

  it('rejette les caractères hors liste', () => {
    expect(sanitizeReferralCodeForStorage('a<script>')).toBeNull();
    expect(sanitizeReferralCodeForStorage('foo bar')).toBeNull();
  });

  it('rejette trop long', () => {
    expect(sanitizeReferralCodeForStorage('a'.repeat(81))).toBeNull();
  });

  it('rejette vide', () => {
    expect(sanitizeReferralCodeForStorage('')).toBeNull();
    expect(sanitizeReferralCodeForStorage('   ')).toBeNull();
  });
});
