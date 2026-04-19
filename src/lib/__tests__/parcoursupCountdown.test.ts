import {
  SCHOOL_LEVEL_LABELS,
  getParisCalendarParts,
  diffCalendarDaysParis,
  getParcoursupSlide2Result,
  buildParcoursupSlide2Body,
  getParcoursupSlide2Title,
} from '../parcoursupCountdown';

/** Instant où la date civile Paris est le jour indiqué (midi heure locale approx.). */
function parisDate(year: number, month: number, day: number) {
  return new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+02:00`);
}

describe('parcoursupCountdown — calendrier Paris', () => {
  test('getParisCalendarParts lit une date en Europe/Paris', () => {
    const d = parisDate(2026, 4, 19);
    expect(getParisCalendarParts(d)).toEqual({ year: 2026, month: 4, day: 19 });
  });

  test('diffCalendarDaysParis compte des jours civils entiers', () => {
    const a = { year: 2026, month: 4, day: 19 };
    const b = { year: 2026, month: 6, day: 2 };
    expect(diffCalendarDaysParis(a, b)).toBe(44);
  });
});

describe('parcoursupCountdown — slide 2', () => {
  test('Terminale le 2 juin (Paris) → phrase spéciale, pas 0 jour', () => {
    const now = parisDate(2026, 6, 2);
    const r = getParcoursupSlide2Result({
      schoolLevel: SCHOOL_LEVEL_LABELS.TERMINALE,
      now,
    });
    expect(r).toEqual({ kind: 'today_terminale' });
    const body = buildParcoursupSlide2Body({
      schoolLevel: SCHOOL_LEVEL_LABELS.TERMINALE,
      now,
    });
    expect(body).toContain("Les résultats Parcoursup, c'est aujourd'hui.");
    expect(body).not.toMatch(/^Dans 0 /);
  });

  test('Première le 19 avril 2026 → cible 2 juin année scolaire suivante (Y+1 Paris)', () => {
    const now = parisDate(2026, 4, 19);
    const r = getParcoursupSlide2Result({
      schoolLevel: SCHOOL_LEVEL_LABELS.PREMIERE,
      now,
    });
    expect(r).toEqual({ kind: 'countdown', days: 409 });
  });

  test('Seconde le 19 avril 2026 → cible 2 juin dans deux ans civils (Y+2 Paris)', () => {
    const now = parisDate(2026, 4, 19);
    const r = getParcoursupSlide2Result({
      schoolLevel: SCHOOL_LEVEL_LABELS.SECONDE,
      now,
    });
    expect(r).toEqual({ kind: 'countdown', days: 775 });
  });

  test('Post-bac → copy dédiée (titre + texte, sans compteur)', () => {
    const now = parisDate(2026, 4, 19);
    const r = getParcoursupSlide2Result({
      schoolLevel: SCHOOL_LEVEL_LABELS.POST_BAC,
      now,
    });
    expect(r.kind).toBe('postbac');
    if (r.kind === 'postbac') {
      expect(r.text.length).toBeGreaterThan(40);
    }
    const body = buildParcoursupSlide2Body({ schoolLevel: SCHOOL_LEVEL_LABELS.POST_BAC, now });
    expect(body).toContain('étudiants');
    expect(body).toContain('rattraper');
    expect(getParcoursupSlide2Title({ schoolLevel: SCHOOL_LEVEL_LABELS.POST_BAC })).toBe(
      'TU N\u2019AS PAS FAIT LE BON CHOIX'
    );
    expect(getParcoursupSlide2Title({ schoolLevel: SCHOOL_LEVEL_LABELS.PREMIERE })).toBe(
      'TU N\u2019AS PLUS LE TEMPS'
    );
  });

  test('niveau inconnu → fallback', () => {
    const now = parisDate(2026, 4, 19);
    const r = getParcoursupSlide2Result({ schoolLevel: 'BTS', now });
    expect(r.kind).toBe('fallback');
  });

  test('compte à rebours utilise jour / jours', () => {
    const oneDay = buildParcoursupSlide2Body({
      schoolLevel: SCHOOL_LEVEL_LABELS.TERMINALE,
      now: parisDate(2026, 6, 1),
    });
    expect(oneDay).toContain('Dans 1 jour');
    const many = buildParcoursupSlide2Body({
      schoolLevel: SCHOOL_LEVEL_LABELS.PREMIERE,
      now: parisDate(2026, 4, 19),
    });
    expect(many).toContain('409 jours');
  });
});
