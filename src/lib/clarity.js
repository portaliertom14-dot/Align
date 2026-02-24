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

  // Éviter toute double injection (Strict Mode / remount)
  if (document.querySelector(CLARITY_SCRIPT_SELECTOR) || (typeof window.clarity === 'function')) return;

  try {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-clarity-injected', 'true');
    script.innerHTML = `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${projectId}");
`;
    document.head.appendChild(script);
  } catch (e) {
    if (__DEV__) console.warn('[Clarity] init skip', e?.message);
  }
}
