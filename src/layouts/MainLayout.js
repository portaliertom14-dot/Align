import React, { useCallback } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import OnboardingGuard from '../components/OnboardingGuard';
import { isPaywallEnabled } from '../config/appConfig';
import { fetchMainFeedPremiumFromSupabaseStrict } from '../services/stripeService';
import { navigationRef } from '../navigation/navigationRef';

// Import des écrans
import FeedScreen from '../screens/Feed';
import QuizScreen from '../screens/Quiz';
import QuetesScreen from '../screens/Quetes';
import ProfilScreen from '../screens/Profil';
import SettingsScreen from '../screens/Settings';

const Stack = createNativeStackNavigator();

/**
 * Layout principal
 * Stack navigator pour gérer les écrans principaux
 * La barre de navigation est gérée dans chaque écran individuellement
 * Protégé par OnboardingGuard pour vérifier que l'onboarding est complété
 * Settings est dans ce stack pour que le bouton Paramètres (Feed) ouvre l'écran Paramètres.
 */
export default function MainLayout() {
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        if (!isPaywallEnabled()) return;
        const ok = await fetchMainFeedPremiumFromSupabaseStrict();
        if (!alive || ok) return;
        if (navigationRef.isReady()) {
          try {
            navigationRef.navigate('Paywall');
          } catch (_) {}
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  return (
    <OnboardingGuard>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A1B23', flex: 1 },
        }}
      >
        <Stack.Screen
          name="Feed"
          component={FeedScreen}
        />
        <Stack.Screen
          name="Quiz"
          component={QuizScreen}
        />
        <Stack.Screen
          name="Quetes"
          component={QuetesScreen}
        />
        <Stack.Screen
          name="Profil"
          component={ProfilScreen}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
        />
      </Stack.Navigator>
    </OnboardingGuard>
  );
}












