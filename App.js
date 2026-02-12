import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AppNavigator } from './src/app/navigation';
import AlignLoading from './src/components/AlignLoading';
import { QuizProvider } from './src/context/QuizContext';
import { MetierQuizProvider } from './src/context/MetierQuizContext';

// 🆕 SYSTÈMES V3 - Imports
import { initializeQuests } from './src/lib/quests/initQuests';
import { initializeModules } from './src/lib/modules';
import { setupAuthStateListener } from './src/services/authFlow';
import { initializeAutoSave, stopAutoSave } from './src/lib/autoSave';
import { captureReferralCodeFromUrl } from './src/utils/referralStorage';

/**
 * Point d'entrée principal de l'application Align
 * Configure la navigation globale, les providers et charge les polices officielles
 * Sur le web, les fonts sont chargées via Google Fonts CDN
 */
function AppContent() {
  const navigationRef = useRef(null);
  const [systemsReady, setSystemsReady] = React.useState(false);

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

  // 🆕 SYSTÈMES V3 - Initialisation
  useEffect(() => {
    const initializeSystems = async () => {
      try {
        console.log('[App] 🚀 Initialisation des systèmes V3...');
        
        // 1. Initialiser quêtes et modules en parallèle (réduit le temps de chargement)
        await Promise.all([initializeQuests(), initializeModules()]);
        console.log('[App] ✅ Systèmes quêtes et modules initialisés');

        // 3. Configurer le listener d'authentification (redirections auto) APRÈS l'initialisation
        if (navigationRef.current) {
          setupAuthStateListener(navigationRef.current);
          console.log('[App] ✅ Listener d\'authentification configuré');
        }

        // 4. CRITICAL: NE PLUS initialiser AutoSave ici
        // AutoSave sera initialisé APRÈS la connexion utilisateur dans authNavigation.js
        // Cela évite d'initialiser avec des valeurs à 0 avant que la progression DB soit chargée
        console.log('[App] ⏸️ AutoSave sera initialisé après la connexion utilisateur');

        console.log('[App] 🎉 Tous les systèmes V3 sont prêts !');
        setSystemsReady(true);
      } catch (error) {
        console.error('[App] ❌ Erreur lors de l\'initialisation:', error);
        // En cas d'erreur, permettre quand même l'affichage
        setSystemsReady(true);
      }
    };

    initializeSystems();
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
        console.error('Error injecting Google Fonts:', error);
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

  // Afficher un écran de chargement tant que les systèmes ne sont pas prêts
  if (!systemsReady) {
    return <AlignLoading />;
  }

  return (
    <QuizProvider>
      <MetierQuizProvider>
        <View style={[styles.appRoot, Platform.OS === 'web' && styles.appRootWeb]}>
          <AppNavigator navigationRef={navigationRef} />
        </View>
      </MetierQuizProvider>
    </QuizProvider>
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

  // Log l'erreur si elle existe
  if (fontError) {
    console.warn('Erreur de chargement des fonts:', fontError);
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
  },
});
