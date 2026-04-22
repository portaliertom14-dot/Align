import './src/lib/recoveryErrorRedirect';
import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/app/navigation';
import AlignLoading from './src/components/AlignLoading';
import { QuizProvider } from './src/context/QuizContext';
import { MetierQuizProvider } from './src/context/MetierQuizContext';
import { AuthProvider } from './src/context/AuthContext';
import { SoundProvider } from './src/context/SoundContext';
import { devError, devWarn } from './src/utils/devLog';

import { initializeAutoSave, stopAutoSave } from './src/lib/autoSave';
import { captureReferralCodeFromUrl } from './src/utils/referralStorage';
import { initSounds } from './src/services/soundService';
import { initClarityIfEnabled } from './src/lib/clarity';
import { logBuildVersionIfNeeded } from './src/config/buildVersion';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from './src/config/posthog';
import { ensureWebPreloadLinksForModules, preloadImageModules } from './src/lib/imagePreload';

const WEB_FONT_CSS_URL = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Bowlby+One+SC&family=Lato:wght@400;700;900&family=Nunito:wght@700;800;900&family=Ruluko&display=swap';
const CRITICAL_BOOT_IMAGES = [
  require('./assets/icons/star.png'),
  require('./assets/images/star-question.png'),
  require('./assets/images/star-laptop.png'),
  require('./assets/images/star-sector-intro.png'),
  require('./assets/images/onboarding/star-thumbs.png'),
  require('./assets/images/onboarding/onboarding-interlude-1.png'),
  require('./assets/images/onboarding/onboarding-interlude-2.png'),
  require('./assets/images/onboarding/onboarding-interlude-3.png'),
  require('./assets/images/onboarding/onboarding-interlude-4.png'),
];

function ensureWebFontLinks() {
  if (typeof document === 'undefined') return;
  const existingLink = document.querySelector('link[href*="fonts.googleapis.com/css2?family=Bebas+Neue"]');
  if (existingLink) return;

  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  const link = document.createElement('link');
  link.href = WEB_FONT_CSS_URL;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}

async function waitForWebFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || !document.fonts?.load) return;
  ensureWebFontLinks();
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([
    Promise.all([
      document.fonts.load('900 1em Nunito'),
      document.fonts.load('400 1em Bowlby One SC'),
      document.fonts.load('900 1em Lato'),
    ]),
    timeout,
  ]);
}

async function preloadCriticalImages() {
  ensureWebPreloadLinksForModules(CRITICAL_BOOT_IMAGES);
  await preloadImageModules(CRITICAL_BOOT_IMAGES);
}

async function preloadStartupResources() {
  await Promise.all([waitForWebFonts(), preloadCriticalImages()]);
}

function initPostHogWebSnippet() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.posthog && window.posthog.__loaded) return;

  const token = Constants.expoConfig?.extra?.posthogProjectToken;
  const host = Constants.expoConfig?.extra?.posthogHost;
  if (!token || !host) return;

  // Snippet officiel PostHog pour forcer l'initialisation web sous Expo Metro.
  (function (t, e) {
    let o;
    let n;
    let p;
    let r;
    if (e.__SV || (window.posthog && window.posthog.__loaded)) return;
    window.posthog = e;
    e._i = [];
    e.init = function (i, s, a) {
      function g(target, key) {
        const split = key.split('.');
        if (split.length === 2) {
          target = target[split[0]];
          key = split[1];
        }
        target[key] = function () {
          target.push([key].concat(Array.prototype.slice.call(arguments, 0)));
        };
      }
      p = t.createElement('script');
      p.type = 'text/javascript';
      p.crossOrigin = 'anonymous';
      p.async = true;
      p.src = s.api_host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
      r = t.getElementsByTagName('script')[0];
      r.parentNode.insertBefore(p, r);
      let u = e;
      if (a !== undefined) u = e[a] = [];
      else a = 'posthog';
      u.people = u.people || [];
      u.toString = function (isStub) {
        let str = 'posthog';
        if (a !== 'posthog') str += `.${a}`;
        if (!isStub) str += ' (stub)';
        return str;
      };
      u.people.toString = function () {
        return `${u.toString(1)}.people (stub)`;
      };
      o = 'init capture register register_once unregister identify setPersonProperties group resetGroups setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing debug'.split(' ');
      for (n = 0; n < o.length; n += 1) g(u, o[n]);
      e._i.push([i, s, a]);
    };
    e.__SV = 1;
  })(document, window.posthog || []);

  window.posthog.init(token, {
    api_host: host,
    defaults: '2026-01-30',
    capture_pageview: true,
  });
}

/**
 * Point d'entrée principal de l'application Align
 * Configure la navigation globale, les providers et charge les polices officielles
 * Sur le web, les fonts sont chargées via Google Fonts CDN
 */
function AppContent() {
  const [startupReady, setStartupReady] = React.useState(Platform.OS !== 'web');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await preloadStartupResources();
      } catch (error) {
        devWarn('Startup preload:', error);
      } finally {
        if (!cancelled) setStartupReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      stopAutoSave();
    };
  }, []);

  // Afficher la version du build en console (dev ou ?showVersion=1) pour vérifier le bundle chargé
  useEffect(() => {
    logBuildVersionIfNeeded();
  }, []);

  // Capturer ref= en URL au démarrage (parrainage)
  useEffect(() => {
    captureReferralCodeFromUrl();
  }, []);

  // Charger les sons de feedback (quiz) une seule fois au démarrage
  useEffect(() => {
    initSounds().catch(() => {});
  }, []);

  // Microsoft Clarity (analytics) — production web uniquement, pas de PII
  useEffect(() => {
    if (Platform.OS === 'web') initClarityIfEnabled();
  }, []);

  // PostHog Session Replay web (Expo Metro n'utilise pas web/index.html comme source principale).
  useEffect(() => {
    if (Platform.OS === 'web') initPostHogWebSnippet();
  }, []);

  // Injecter les Google Fonts dans le head sur le web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        ensureWebFontLinks();
      } catch (error) {
        devError('Google Fonts:', error);
      }
    }
  }, []);

  // Effet hover lift (respiration) : 520ms cubic-bezier, translateY(-3px) + shadow. Voir aussi src/index.css.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    if (document.getElementById('align-hover-styles')) return;
    const style = document.createElement('style');
    style.id = 'align-hover-styles';
    style.textContent = `
:root{--shadow-md:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1);--shadow-lg:0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -4px rgba(0,0,0,0.1);}
.hover-lift{transform:translateY(0) translateZ(0);box-shadow:var(--shadow-md);transition:transform 300ms ease,box-shadow 300ms ease !important;will-change:transform,box-shadow;}
.hover-lift:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg);}
.hover-lift:active{transform:translateY(-1px);box-shadow:var(--shadow-md);}
.hover-lift:focus,.hover-lift:focus-visible{outline:none !important;}
@media (hover:none){.hover-lift:hover{transform:translateY(0) translateZ(0);box-shadow:var(--shadow-md);}}
.nav-item-hover{transition:background-color 200ms ease;border-radius:9999px;cursor:pointer;}
.nav-item-hover:hover{background-color:rgba(255,255,255,0.08);}
.nav-item-hover:focus,.nav-item-hover:focus-visible{outline:none;}
`;
    document.head.appendChild(style);
  }, []);

  if (!startupReady) {
    return <AlignLoading />;
  }

  return (
    <PostHogProvider client={posthog} autocapture={{ captureScreens: false, captureTouches: true }}>
    <SafeAreaProvider>
      <AuthProvider>
        <SoundProvider>
          <QuizProvider>
            <MetierQuizProvider>
              <View style={[styles.appRoot, Platform.OS === 'web' && styles.appRootWeb]}>
                <RootNavigator />
              </View>
            </MetierQuizProvider>
          </QuizProvider>
        </SoundProvider>
      </AuthProvider>
    </SafeAreaProvider>
    </PostHogProvider>
  );
}

/**
 * Composant pour mobile qui charge les fonts via useFonts
 */
function MobileApp() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { useFonts } = require('expo-font');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { Nunito_700Bold, Nunito_900Black } = require('@expo-google-fonts/nunito');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { BowlbyOneSC_400Regular } = require('@expo-google-fonts/bowlby-one-sc');
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_900Black,
    BowlbyOneSC_400Regular,
  });

  // Écran de chargement si les fonts ne sont pas chargées
  if (!fontsLoaded) {
    return <AlignLoading />;
  }

  if (fontError) {
    devWarn('Fonts:', fontError);
  }

  return <AppContent />;
}

/**
 * Point d'entrée principal - sélectionne le bon composant selon la plateforme
 */
export default function App() {
  const isWeb = Platform.OS === 'web';

  // Sur le web, on n'utilise pas useFonts() car cela peut causer des erreurs
  // Les fonts sont chargées via Google Fonts CDN
  if (isWeb) {
    return <AppContent />;
  }

  // Sur mobile, on charge les fonts via useFonts
  return <MobileApp />;
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
  },
  appRootWeb: {
    minHeight: '100vh',
    minHeight: '100dvh', /* override pour iOS Safari (viewport correct) */
  },
});
