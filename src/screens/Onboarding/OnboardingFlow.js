import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, BackHandler, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import UserInfoScreen from './UserInfoScreen';
import SectorQuizIntroScreen from './SectorQuizIntroScreen';
import { upsertUser } from '../../services/userService';
import { saveUserProfile } from '../../lib/userProfile';
import { getCurrentUser } from '../../services/auth';
import { loadDraft } from '../../lib/onboardingDraftStore';
import { sanitizeOnboardingStep, ONBOARDING_MAX_STEP } from '../../lib/onboardingSteps';

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
  const route = useRoute();
  const rawStep = route.params?.step;
  const safeStep = sanitizeOnboardingStep(rawStep);
  const initialStep = rawStep != null && safeStep >= 2 ? safeStep : 1;
  if (rawStep != null && (safeStep === 1 && Number(rawStep) !== 1 || !Number.isFinite(Number(rawStep)) || Number(rawStep) > ONBOARDING_MAX_STEP)) {
    console.warn('[OnboardingFlow] step invalide ou hors limite, fallback step 1', { rawStep, safeStep, max: ONBOARDING_MAX_STEP });
  }
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState(null);

  // Quand step >= 2 (UserInfo ou SectorQuizIntro), charger userId/email depuis la session (redirect login)
  useEffect(() => {
    if (initialStep >= 2 && !userId) {
      getCurrentUser().then((user) => {
        if (user?.id) {
          setUserId(user.id);
          setEmail(user.email ?? user.user_metadata?.email ?? null);
        }
      });
    }
  }, [initialStep]);

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
      // Résoudre uid/email depuis la session si pas encore en state (évite race après redirect ou submit rapide)
      const user = await getCurrentUser();
      const uid = userId || user?.id;
      const userEmail = email ?? user?.email ?? user?.user_metadata?.email ?? null;

      if (!uid) {
        console.error('[OnboardingFlow] ❌ userId manquant (session introuvable)');
        Alert.alert('Erreur', 'Session introuvable. Reconnecte-toi puis réessaie.');
        return;
      }

      // Log temporaire (désactivable) : payload + uid pour debug persistance
      // Inclure le brouillon pré-compte (7 questions + DOB) : dans ce flux le profil est créé ici, pas au signup
      let draft = {};
      try {
        draft = await loadDraft();
      } catch (e) {
        console.warn('[OnboardingFlow] loadDraft (non bloquant):', e);
      }

      if (__DEV__) {
        console.log('[OnboardingFlow] 📝 Sauvegarde onboarding — uid:', uid, 'birthdate:', draft?.dob ?? '(absent)', 'payload:', {
          first_name: info.firstName,
          username: info.username,
          email: userEmail != null ? '(présent)' : '(absent)',
        });
      }

      // Sauvegarder en base (birthdate/school_level du brouillon inclus)
      const { error } = await upsertUser(uid, {
        email: userEmail,
        first_name: info.firstName,
        last_name: info.lastName ?? '',
        username: info.username,
        birthdate: draft?.dob ?? undefined,
        school_level: draft?.schoolLevel ?? undefined,
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

      if (__DEV__) console.log('[OnboardingFlow] ✅ Succès DB (user_profiles)');

      // Cache local + sync Supabase pour écran Profil / Paramètres
      await saveUserProfile({
        firstName: info.firstName,
        lastName: info.lastName ?? '',
        username: info.username,
        email: userEmail,
        birthdate: draft?.dob ?? undefined,
        dateNaissance: draft?.dob ?? undefined,
        schoolLevel: draft?.schoolLevel ?? undefined,
      });

      // Garder le state à jour pour la suite du flux
      if (!userId) setUserId(uid);
      if (email == null && userEmail != null) setEmail(userEmail);

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

  // Pendant l'onboarding : interdire sortie par back (Android) et Escape (web)
  useEffect(() => {
    if (currentStep === 0) return;
    const onBack = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    let removeKeyDown;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onKeyDown = (e) => { if (e.key === 'Escape') e.preventDefault(); };
      window.addEventListener('keydown', onKeyDown, true);
      removeKeyDown = () => window.removeEventListener('keydown', onKeyDown, true);
    }
    return () => {
      sub.remove();
      if (removeKeyDown) removeKeyDown();
    };
  }, [currentStep]);

  return (
    <View style={styles.container}>
      {currentStep === 0 && <IntroScreen onNext={handleIntroNext} />}
      {currentStep === 1 && (
        <AuthScreen onNext={handleAuthNext} />
      )}
      {currentStep === 2 && (
        <UserInfoScreen
          onNext={handleUserInfoNext}
          userId={userId}
          email={email}
        />
      )}
      {currentStep === 3 && (
        <SectorQuizIntroScreen />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

