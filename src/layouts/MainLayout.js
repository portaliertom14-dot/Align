import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { theme } from '../styles/theme';
import OnboardingGuard from '../components/OnboardingGuard';

// Import des écrans
import FeedScreen from '../screens/Feed';
import QuizScreen from '../screens/Quiz';
import QuetesScreen from '../screens/Quetes';
import ProfilScreen from '../screens/Profil';

const Stack = createNativeStackNavigator();

/**
 * Layout principal
 * Stack navigator pour gérer les écrans principaux
 * La barre de navigation est gérée dans chaque écran individuellement
 * Protégé par OnboardingGuard pour vérifier que l'onboarding est complété
 */
export default function MainLayout() {
  return (
    <OnboardingGuard>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
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
      </Stack.Navigator>
    </OnboardingGuard>
  );
}












