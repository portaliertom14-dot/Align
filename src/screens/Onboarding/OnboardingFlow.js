import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import BirthdateScreen from './BirthdateScreen';
import SchoolLevelScreen from './SchoolLevelScreen';
import ProfessionalProjectScreen from './ProfessionalProjectScreen';
import SimilarAppsScreen from './SimilarAppsScreen';
import UserInfoScreen from './UserInfoScreen';
import { upsertUser } from '../../services/userService';
import { markOnboardingCompleted } from '../../services/userStateService';
import { saveUserProfile } from '../../lib/userProfile';

// 🆕 SYSTÈME AUTH/REDIRECTION V1
import { completeOnboardingAndRedirect } from '../../services/authFlow';

/**
 * OnboardingFlow - Gère le flux complet de l'onboarding
 * 
 * Ordre strict :
 * 1. Auth (création/compte)
 * 2. Date de naissance
 * 3. Situation scolaire
 * 4. Projet professionnel
 * 5. Applications similaires
 * 6. Informations utilisateur (prénom, nom, username)
 * 7. Redirection vers Quiz Secteur
 */
export default function OnboardingFlow() {
  const navigation = useNavigation();
  // Démarrer directement sur l'écran de connexion (step 1 = AuthScreen)
  const [currentStep, setCurrentStep] = useState(1);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(null);
  const [birthdate, setBirthdate] = useState(null);
  const [schoolLevel, setSchoolLevel] = useState(null);
  const [professionalProject, setProfessionalProject] = useState(null);
  const [similarApps, setSimilarApps] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

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

  const handleSchoolLevelNext = async (newUserId, userEmail, userBirthdate, level) => {
    setUserId(newUserId);
    setEmail(userEmail);
    setBirthdate(userBirthdate);
    setSchoolLevel(level);
    setCurrentStep(4);
  };

  const handleProfessionalProjectNext = (answer) => {
    setProfessionalProject(answer);
    setCurrentStep(5);
  };

  const handleSimilarAppsNext = (answer) => {
    setSimilarApps(answer);
    setCurrentStep(6);
  };

  const handleUserInfoNext = async (info) => {
    setUserInfo(info);
    
    try {
      console.log('[OnboardingFlow] 📝 Sauvegarde des données onboarding...');
      console.log('[OnboardingFlow] userId:', userId);
      console.log('[OnboardingFlow] email:', email);
      console.log('[OnboardingFlow] birthdate:', birthdate);
      console.log('[OnboardingFlow] schoolLevel:', schoolLevel);
      
      // BUG FIX: Sauvegarder toutes les données utilisateur en base Supabase
      // IMPORTANT: Ne PAS marquer onboarding_completed=true ici
      // L'onboarding n'est complété qu'après les quiz (secteur, métier, etc)
      const { error } = await upsertUser(userId, {
        email: email,
        birthdate: birthdate,  // Format YYYY-MM-DD
        school_level: schoolLevel,
        professional_project: professionalProject,
        similar_apps: similarApps,
        first_name: info.firstName,
        last_name: info.lastName,
        username: info.username,
        onboarding_step: 6,  // Étape après infos user, avant quiz
        onboarding_completed: false,  // BUG FIX: Ne pas marquer comme complété, les quiz restent à faire
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
        birthdate: birthdate,
        schoolLevel: schoolLevel,
      });

      // NOTE: L'email de bienvenue est maintenant envoyé dans UserInfoScreen.handleNext()
      // exactement au submit de Prénom/Nom, avant d'appeler onNext

      // BUG FIX: Rediriger vers Quiz Secteur au lieu de Main/Feed
      // L'onboarding n'est pas complété tant que les quiz ne sont pas finis
      console.log('[OnboardingFlow] ✅ Infos utilisateur sauvegardées, redirection vers Quiz Secteur');
      navigation.replace('Quiz');
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
      {currentStep === 4 && (
        <ProfessionalProjectScreen
          onNext={handleProfessionalProjectNext}
        />
      )}
      {currentStep === 5 && (
        <SimilarAppsScreen
          onNext={handleSimilarAppsNext}
        />
      )}
      {currentStep === 6 && (
        <UserInfoScreen
          onNext={handleUserInfoNext}
          userId={userId}
          email={email}
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

