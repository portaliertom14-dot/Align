/**
 * Compte à rebours « Parcoursup » pour l’interlude onboarding (slide 2).
 *
 * Modèle simplifié : date cible = **2 juin** (début de journée civile **Europe/Paris**).
 * Ce n’est pas une reproduction juridique du calendrier Parcoursup — à ajuster si les dates officielles changent.
 *
 * NOTE PRODUIT (non géré par le code) : un élève en **Seconde qui redouble** reste une année de plus en Seconde :
 * la cible `Y+2` depuis l’année civile courante peut alors être **décalée d’un an** par rapport à sa réalité.
 * Si un jour on veut affiner, il faudra une donnée explicite (ex. année du bac attendu).
 */

/** Libellés exacts de la question 2 onboarding (`src/data/onboardingQuestions.js`). */
export const SCHOOL_LEVEL_LABELS = {
  SECONDE: 'Seconde',
  PREMIERE: 'Première',
  TERMINALE: 'Terminale',
  POST_BAC: 'Post-bac / Autre',
} as const;

const POST_BAC_PLACEHOLDER =
  "La plupart des étudiants le savent au bout de 6 mois. Ils continuent quand même, par peur de tout recommencer. Chaque mois passé dans une voie qui ne te correspond pas, c'est un mois de plus à rattraper après.";

const FALLBACK_NO_LEVEL =
  "Parcoursup et l'orientation, ça va vite. Si tu n'as pas réfléchi à ce que tu veux vraiment, tu risques d'accepter la première formation qui dit oui et de te retrouver dans des études qui ne te plaisent pas forcément.";

const SHARED_TAIL =
  " Si tu n'as pas réfléchi à ce que tu veux vraiment, tu vas accepter la première formation qui dit oui et te retrouver dans des études qui ne te plaisent pas forcément.";

const TODAY_TERMINALE = "Les résultats Parcoursup, c'est aujourd'hui." + SHARED_TAIL;

export type ParisCalendarDay = { year: number; month: number; day: number };

export function getParisCalendarParts(date: Date | string | number): ParisCalendarDay {
  const d = date instanceof Date ? date : new Date(date);
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
  const [y, m, day] = formatted.split('-').map((x) => parseInt(x, 10));
  return { year: y, month: m, day };
}

/**
 * Différence en jours entiers entre deux dates **civiles** Paris (A → B, B après A donne > 0).
 * Utilise midi UTC pour éviter les pièges DST.
 */
export function diffCalendarDaysParis(a: ParisCalendarDay, b: ParisCalendarDay): number {
  const ta = Date.UTC(a.year, a.month - 1, a.day, 12, 0, 0, 0);
  const tb = Date.UTC(b.year, b.month - 1, b.day, 12, 0, 0, 0);
  return Math.round((tb - ta) / 86400000);
}

export type NormalizedSchoolLevel = 'seconde' | 'premiere' | 'terminale' | 'postbac';

export function normalizeSchoolLevel(raw: string | null | undefined): NormalizedSchoolLevel | null {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return null;
  if (t === SCHOOL_LEVEL_LABELS.POST_BAC) return 'postbac';
  if (t === SCHOOL_LEVEL_LABELS.SECONDE) return 'seconde';
  if (t === SCHOOL_LEVEL_LABELS.PREMIERE) return 'premiere';
  if (t === SCHOOL_LEVEL_LABELS.TERMINALE) return 'terminale';
  return null;
}

/**
 * Année du 2 juin cible pour Seconde / Première (dérivé de l’année civile Paris courante).
 */
export function targetJuneYearForNonTerminale(
  level: NormalizedSchoolLevel,
  parisToday: Pick<ParisCalendarDay, 'year'>
): number {
  const y = parisToday.year;
  if (level === 'seconde') return y + 2;
  if (level === 'premiere') return y + 1;
  return y;
}

/** Année du prochain 2 juin pertinent pour la **Terminale** (hors cas « aujourd’hui 2 juin » géré à part). */
export function targetJuneYearForTerminale(parisToday: ParisCalendarDay): number {
  const { year, month, day } = parisToday;
  if (month < 6 || (month === 6 && day < 2)) return year;
  return year + 1;
}

export function isParcoursupResultsDayParis(parisToday: ParisCalendarDay): boolean {
  return parisToday.month === 6 && parisToday.day === 2;
}

export type ParcoursupSlide2Countdown = { kind: 'countdown'; days: number };
export type ParcoursupSlide2Today = { kind: 'today_terminale' };
export type ParcoursupSlide2Postbac = { kind: 'postbac'; text: string };
export type ParcoursupSlide2Fallback = { kind: 'fallback'; text: string };
export type ParcoursupSlide2Result =
  | ParcoursupSlide2Countdown
  | ParcoursupSlide2Today
  | ParcoursupSlide2Postbac
  | ParcoursupSlide2Fallback;

export type ParcoursupSlide2Input = {
  schoolLevel: string | null | undefined;
  now?: Date;
};

/** Logique métier brute (testable). */
export function getParcoursupSlide2Result(input: ParcoursupSlide2Input): ParcoursupSlide2Result {
  const now = input.now instanceof Date ? input.now : new Date();
  const paris = getParisCalendarParts(now);
  const level = normalizeSchoolLevel(input.schoolLevel);

  if (level === 'postbac') {
    return { kind: 'postbac', text: POST_BAC_PLACEHOLDER };
  }
  if (!level) {
    return { kind: 'fallback', text: FALLBACK_NO_LEVEL };
  }

  if (level === 'terminale' && isParcoursupResultsDayParis(paris)) {
    return { kind: 'today_terminale' };
  }

  let targetYear: number;
  if (level === 'terminale') {
    targetYear = targetJuneYearForTerminale(paris);
  } else {
    targetYear = targetJuneYearForNonTerminale(level, paris);
  }

  const target: ParisCalendarDay = { year: targetYear, month: 6, day: 2 };
  const days = diffCalendarDaysParis(paris, target);

  if (days <= 0) {
    return { kind: 'fallback', text: FALLBACK_NO_LEVEL };
  }
  return { kind: 'countdown', days };
}

/** Texte complet du paragraphe du slide 2 (corps uniquement). */
export function buildParcoursupSlide2Body(input: ParcoursupSlide2Input): string {
  const r = getParcoursupSlide2Result(input);
  if (r.kind === 'postbac' || r.kind === 'fallback') {
    return r.text;
  }
  if (r.kind === 'today_terminale') {
    return TODAY_TERMINALE;
  }
  const jourLabel = r.days > 1 ? 'jours' : 'jour';
  return `Dans ${r.days} ${jourLabel}, Parcoursup t'envoie ses réponses, et ça va passer très vite.${SHARED_TAIL}`;
}

/** Titre du slide 2 : variante post-bac vs Parcoursup (lycée). */
export function getParcoursupSlide2Title(input: Pick<ParcoursupSlide2Input, 'schoolLevel'>): string {
  return normalizeSchoolLevel(input.schoolLevel) === 'postbac'
    ? 'TU N\u2019AS PAS FAIT LE BON CHOIX'
    : 'TU N\u2019AS PLUS LE TEMPS';
}
