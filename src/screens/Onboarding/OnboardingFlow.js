import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import UserInfoScreen from './UserInfoScreen';
import SectorQuizIntroScreen from './SectorQuizIntroScreen';
import { upsertUser } from '../../services/userService';
import { saveUserProfile } from '../../lib/userProfile';

/**
 * OnboardingFlow - Gère le flux complet de l'onboarding
 *
 * Ordre :
 * 0. IntroScreen (optionnel)
 * 1. AuthScreen (création/connexion compte)
 * 2. UserInfoScreen (prénom, nom, pseudo)
 * 3. SectorQuizIntroScreen (intro quiz secteur)
 * 4. Redirection vers Quiz Secteur
 */
export default function OnboardingFlow() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(null);

  const handleIntroNext = () => {
    setCurrentStep(1);
  };

  const handleAuthNext = (newUserId, userEmail) => {
    setUserId(newUserId);
    setEmail(userEmail);
    setCurrentStep(2);
  };

  const handleUserInfoNext = async (info) => {
    try {
      console.log('[OnboardingFlow] 📝 Sauvegarde des données onboarding...');
      console.log('[OnboardingFlow] userId:', userId);
      console.log('[OnboardingFlow] email:', email);
      
      // BUG FIX: Sauvegarder toutes les données utilisateur en base Supabase
      // IMPORTANT: Ne PAS marquer onboarding_completed=true ici
      // L'onboarding n'est complété qu'après les quiz (secteur, métier, etc)
      const { error } = await upsertUser(userId, {
        email: email,
        first_name: info.firstName,
        last_name: info.lastName,
        username: info.username,
        onboarding_step: 2,
        onboarding_completed: false,
      });

      if (error) {
        console.error('[OnboardingFlow] ❌ Erreur lors de la sauvegarde:', error);
        Alert.alert(
          'Erreur',
          'Une erreur est survenue. Réessaie dans quelques secondes.'
        );
        return;
      }
      
      console.log('[OnboardingFlow] ✅ Données sauvegardées en base');

      // Sauvegarder aussi dans le cache local (userProfile) pour l'écran Profil
      await saveUserProfile({
        firstName: info.firstName,
        lastName: info.lastName,
        username: info.username,
        email: email,
      });

      // NOTE: L'email de bienvenue est maintenant envoyé dans UserInfoScreen.handleNext()
      // exactement au submit de Prénom/Nom, avant d'appeler onNext

      console.log('[OnboardingFlow] ✅ Infos utilisateur sauvegardées, écran intro quiz secteur');
      setCurrentStep(3);
    } catch (error) {
      console.error('[OnboardingFlow] ❌ Erreur lors de la finalisation:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger tes données. Vérifie ta connexion.'
      );
    }
  };

  return (
    <View style={styles.container}>
      {currentStep === 0 && <IntroScreen onNext={handleIntroNext} />}
      {currentStep === 1 && (
        <AuthScreen
          onNext={handleAuthNext}
          onBack={() => navigation.goBack()}
        />
      )}
      {currentStep === 2 && (
        <UserInfoScreen
          onNext={handleUserInfoNext}
          onBack={() => setCurrentStep(1)}
          userId={userId}
          email={email}
        />
      )}
      {currentStep === 3 && (
        <SectorQuizIntroScreen onBack={() => setCurrentStep(2)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

