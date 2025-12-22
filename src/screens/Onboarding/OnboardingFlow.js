import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import BirthdateScreen from './BirthdateScreen';
import SchoolLevelScreen from './SchoolLevelScreen';
import { upsertUser } from '../../services/userService';
import { getCurrentUser } from '../../services/auth';
import { isOnboardingCompleted } from '../../services/userService';

/**
 * OnboardingFlow - Gère le flux complet de l'onboarding
 * 
 * Ordre strict :
 * 1. Intro
 * 2. Auth (création/compte)
 * 3. Date de naissance
 * 4. Situation scolaire
 * 5. Redirection vers l'app
 * 
 * PROTECTION : Si l'onboarding est déjà complété, redirige immédiatement vers Main
 */
export default function OnboardingFlow() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(null);
  const [birthdate, setBirthdate] = useState(null);

  // PROTECTION : Vérifier si l'onboarding est déjà complété au montage
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const completed = await isOnboardingCompleted(user.id);
          if (completed) {
            // L'onboarding est déjà complété, rediriger vers Main immédiatement
            navigation.replace('Main');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'onboarding:', error);
        // En cas d'erreur, continuer normalement
      }
    };
    checkOnboardingStatus();
  }, [navigation]);

  const handleIntroNext = () => {
    setCurrentStep(1);
  };

  const handleAuthNext = (newUserId, userEmail) => {
    setUserId(newUserId);
    setEmail(userEmail);
    setCurrentStep(2);
  };

  const handleBirthdateNext = async (newUserId, userEmail, userBirthdate) => {
    setUserId(newUserId);
    setEmail(userEmail);
    setBirthdate(userBirthdate);
    setCurrentStep(3);
  };

  const handleSchoolLevelNext = async (newUserId, userEmail, userBirthdate, schoolLevel) => {
    try {
      // Sauvegarder toutes les données utilisateur en base
      const { error } = await upsertUser(newUserId, {
        email: userEmail,
        birthdate: userBirthdate,
        school_level: schoolLevel,
        onboarding_completed: false, // Pas encore complété, on continue avec l'ancien onboarding
      });

      if (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        // Continuer quand même la redirection
      }

      // Redirection vers l'ancien onboarding (pages existantes)
      navigation.replace('OnboardingOld');
    } catch (error) {
      console.error('Erreur lors de la finalisation:', error);
      // Rediriger quand même vers l'ancien onboarding
      navigation.replace('OnboardingOld');
    }
  };

  return (
    <View style={styles.container}>
      {currentStep === 0 && <IntroScreen onNext={handleIntroNext} />}
      {currentStep === 1 && <AuthScreen onNext={handleAuthNext} />}
      {currentStep === 2 && (
        <BirthdateScreen
          onNext={handleBirthdateNext}
          userId={userId}
          email={email}
        />
      )}
      {currentStep === 3 && (
        <SchoolLevelScreen
          onNext={handleSchoolLevelNext}
          userId={userId}
          email={email}
          birthdate={birthdate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

