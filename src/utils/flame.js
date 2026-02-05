/**
 * Utilitaire central pour le streak (flammes).
 * Le streak ne bouge qu'à la fin d'un module complété.
 */

/**
 * Retourne la date du jour en UTC au format YYYY-MM-DD
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function utcDayString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calcule le prochain streak après complétion d'un module aujourd'hui.
 * Règles:
 * - last_flame_day === today => pas d'incrément, pas d'ignition
 * - last_flame_day === yesterday => streak + 1, pas d'ignition
 * - sinon (gap ou premier jour) => streak = 1, isIgnition = true
 *
 * @param {{ streak_count: number; last_flame_day: string|null }} prev - État actuel depuis la DB
 * @param {Date} [now=new Date()]
 * @returns {{ nextStreakCount: number; nextLastFlameDay: string; isIgnition: boolean }}
 */
export function computeStreak(prev, now = new Date()) {
  const today = utcDayString(now);
  const yesterday = utcDayString(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  const streakCount = typeof prev.streak_count === 'number' ? prev.streak_count : 0;
  const lastFlameDay = prev.last_flame_day ?? null;

  if (lastFlameDay === today) {
    return { nextStreakCount: streakCount, nextLastFlameDay: today, isIgnition: false };
  }
  if (lastFlameDay === yesterday) {
    return { nextStreakCount: streakCount + 1, nextLastFlameDay: today, isIgnition: false };
  }
  return { nextStreakCount: 1, nextLastFlameDay: today, isIgnition: true };
}
