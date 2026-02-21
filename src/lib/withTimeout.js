/**
 * Wrapper timeout pour promesses — évite blocages infinis.
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} [errorCode] - Code d'erreur rejeté (défaut: 'TIMEOUT')
 * @returns {Promise}
 */
export function withTimeout(promise, ms, errorCode = 'TIMEOUT') {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(errorCode)), ms));
  return Promise.race([promise, timeout]);
}
