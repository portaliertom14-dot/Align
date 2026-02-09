/**
 * Constantes et helpers pour les steps onboarding (éviter steps corrompus => écran vide).
 * Aucune dépendance vers auth/navigation pour éviter cycles.
 */

/** Nombre réel d'étapes dans OnboardingFlow (0=Intro, 1=Auth, 2=UserInfo, 3=SectorQuizIntro) */
export const ONBOARDING_MAX_STEP = 3;

/**
 * Sanitize le step onboarding.
 * @param {*} step - valeur brute (number, string, undefined)
 * @returns {number} step dans [1, ONBOARDING_MAX_STEP]
 */
export function sanitizeOnboardingStep(step) {
  let s = Number(step);
  if (!Number.isFinite(s)) return 1;
  s = Math.floor(s);
  if (s < 1) return 1;
  if (s > ONBOARDING_MAX_STEP) return 1;
  return s;
}
