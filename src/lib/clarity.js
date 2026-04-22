/**
 * Microsoft Clarity — chargé uniquement en production web.
 * Un seul point d'intégration : initClarityIfEnabled() appelé depuis App.js (web).
 * - Ne jamais logger l'ID projet en prod (RGPD).
 * - Garde anti double-injection : un seul script dans le head.
 * EXPO_PUBLIC_CLARITY_PROJECT_ID doit être défini en build production uniquement.
 */
const CLARITY_SCRIPT_SELECTOR = 'script[data-clarity-injected="true"]';

export function initClarityIfEnabled() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const projectId = process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
  const isProd = process.env.NODE_ENV === 'production';
  if (!projectId || !isProd) return;
  // Garde défensif : éviter toute init avant que la racine web existe.
  const rootEl = document.getElementById('root');
  if (!rootEl) return;

  // Éviter toute double injection (Strict Mode / remount)
  if (document.querySelector(CLARITY_SCRIPT_SELECTOR) || (typeof window.clarity === 'function') || window.__ALIGN_CLARITY_INIT__) return;
  window.__ALIGN_CLARITY_INIT__ = true;

  try {
    const id = String(projectId).trim();
    // IDs Clarity : caractères sûrs uniquement (évite injection si la variable de build est compromise).
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      if (__DEV__) console.warn('[Clarity] project id invalide, init ignorée');
      return;
    }
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-clarity-injected', 'true');
    // Snippet officiel ; `text` plutôt que `innerHTML` (même effet, moins sensible aux scanners DOM XSS).
    script.text = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(id)});`;
    document.head.appendChild(script);
  } catch (e) {
    if (__DEV__) console.warn('[Clarity] init skip', e?.message);
  }
}
