/**
 * Logs conditionnels — uniquement en développement.
 * En production (__DEV__ === false), aucun effet pour éviter fuites et perfs.
 */
export const devLog = __DEV__ ? (...args) => console.log(...args) : () => {};
export const devWarn = __DEV__ ? (...args) => console.warn(...args) : () => {};
export const devError = __DEV__ ? (...args) => console.error(...args) : () => {};
