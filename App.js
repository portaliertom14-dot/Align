import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
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
import { captureResetPasswordHash } from './src/lib/resetPasswordHashStore';
import { initSounds } from './src/services/soundService';
import { initClarityIfEnabled } from './src/lib/clarity';

/**
 * Point d'entrée principal de l'application Align
 * Configure la navigation globale, les providers et charge les polices officielles
 * Sur le web, les fonts sont chargées via Google Fonts CDN
 */
function AppContent() {
  captureResetPasswordHash();
  // Ne pas initialiser modules/quêtes au boot : uniquement après login (handleLogin / SIGNED_IN).
  // Évite 403 en boucle et appels getCurrentUser quand manualLoginRequired.
  const [systemsReady] = React.useState(true);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      stopAutoSave();
    };
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

  // Injecter les Google Fonts dans le head sur le web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        // Vérifier si les fonts sont déjà injectées
        const existingLink = document.querySelector('link[href*="fonts.googleapis.com"]');
        if (!existingLink) {
          // Injecter les preconnect pour améliorer les performances
          const preconnect1 = document.createElement('link');
          preconnect1.rel = 'preconnect';
          preconnect1.href = 'https://fonts.googleapis.com';
          document.head.appendChild(preconnect1);

          const preconnect2 = document.createElement('link');
          preconnect2.rel = 'preconnect';
          preconnect2.href = 'https://fonts.gstatic.com';
          preconnect2.crossOrigin = 'anonymous';
          document.head.appendChild(preconnect2);

          // Injecter les Google Fonts (Nunito Black = 900)
          const link = document.createElement('link');
          link.href = 'https://fonts.googleapis.com/css2?family=Bowlby+One+SC&family=Lato:wght@400;700;900&family=Nunito:wght@900&family=Ruluko&display=swap';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
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

  return (
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
  );
}

/**
 * Composant pour mobile qui charge les fonts via useFonts
 */
function MobileApp() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { useFonts } = require('expo-font');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { Nunito_900Black } = require('@expo-google-fonts/nunito');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { BowlbyOneSC_400Regular } = require('@expo-google-fonts/bowlby-one-sc');
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [fontsLoaded, fontError] = useFonts({
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
