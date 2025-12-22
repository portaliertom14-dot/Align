import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNavigator } from './src/app/navigation';
import { QuizProvider } from './src/context/QuizContext';
import { MetierQuizProvider } from './src/context/MetierQuizContext';

/**
 * Point d'entrée principal de l'application Align
 * Configure la navigation globale, les providers et charge les polices officielles
 * Sur le web, les fonts sont chargées via Google Fonts CDN
 */
function AppContent() {
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

          // Injecter les Google Fonts
          const link = document.createElement('link');
          link.href = 'https://fonts.googleapis.com/css2?family=Bowlby+One+SC&family=Lilita+One&family=Ruluko&display=swap';
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
      } catch (error) {
        console.error('Error injecting Google Fonts:', error);
      }
    }
  }, []);

  return (
    <QuizProvider>
      <MetierQuizProvider>
        <AppNavigator />
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
  const { LilitaOne_400Regular } = require('@expo-google-fonts/lilita-one');
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { BowlbyOneSC_400Regular } = require('@expo-google-fonts/bowlby-one-sc');
  
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [fontsLoaded, fontError] = useFonts({
    LilitaOne_400Regular,
    BowlbyOneSC_400Regular,
  });

  // Écran de chargement si les fonts ne sont pas chargées
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#00AAFF', '#00012F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>Chargement...</Text>
        </LinearGradient>
      </View>
    );
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
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
