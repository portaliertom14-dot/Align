import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, BackHandler, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import IntroScreen from './IntroScreen';
import AuthScreen from './AuthScreen';
import UserInfoScreen from './UserInfoScreen';
import SectorQuizIntroScreen from './SectorQuizIntroScreen';
import { upsertUser, getUser, normaliseUsername } from '../../services/userService';
import { saveUserProfile } from '../../lib/userProfile';
import { useAuth } from '../../context/AuthContext';
import { getCurrentUser } from '../../services/auth';
import { loadDraft } from '../../lib/onboardingDraftStore';
import { getCurrentUserProfile } from '../../services/userProfileService';
import { sanitizeOnboardingStep, ONBOARDING_MAX_STEP } from '../../lib/onboardingSteps';
import { updateOnboardingStep } from '../../services/authState';

/**
 * OnboardingFlow - Gère le flux complet de l'onboarding
 *
 * Règles absolues :
 * - Pas de retour en arrière : BackHandler bloque, step ne peut qu'augmenter.
 * - Une seule direction : 0 → 1 → 2 → 3 (puis Quiz via SectorQuizIntroScreen).
 * - Aucun écran ne doit dépendre d'un state non garanti (initialStep dérivé de auth + route uniquement).
 *
 * Ordre :
 * 0. IntroScreen (optionnel)
 * 1. AuthScreen (création/connexion compte)
 * 2. UserInfoScreen (prénom, nom, pseudo)
 * 3. SectorQuizIntroScreen (intro quiz secteur) → navigation.replace('Quiz')
 */
export default function OnboardingFlow() {
  const navigation = useNavigation();
  const route = useRoute();
  const { onboardingStep: authStep, setOnboardingStep, user: authUser } = useAuth();
  const rawStep = route.params?.step;
  const safeStep = sanitizeOnboardingStep(rawStep);
  const fromAuth = authStep >= 2 ? authStep : null;
  const initialStep = fromAuth ?? (rawStep != null && safeStep >= 2 ? safeStep : 1);
  if (rawStep != null && (safeStep === 1 && Number(rawStep) !== 1 || !Number.isFinite(Number(rawStep)) || Number(rawStep) > ONBOARDING_MAX_STEP)) {
    console.warn('[OnboardingFlow] step invalide ou hors limite, fallback step 1', { rawStep, safeStep, max: ONBOARDING_MAX_STEP });
  }
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [userId, setUserId] = useState(() => authUser?.id ?? null);
  const [email, setEmail] = useState(() => authUser?.email ?? authUser?.user_metadata?.email ?? null);
  const [userInfoSubmitting, setUserInfoSubmitting] = useState(false);
  const userInfoSubmitInFlightRef = useRef(false);

  // Quand step >= 2 et pas de userId, hydrater depuis session (ex. retour login ou contexte pas encore prêt)
  useEffect(() => {
    if (initialStep >= 2 && !userId && (authUser?.id || route.params?.step >= 2)) {
      getCurrentUser().then((user) => {
        if (user?.id) {
          setUserId(user.id);
          setEmail(user.email ?? user.user_metadata?.email ?? null);
        }
      });
    }
  }, [initialStep, userId, authUser?.id, route.params?.step]);

  const handleIntroNext = () => {
    setCurrentStep(1);
  };

  const handleAuthNext = (newUserId, userEmail) => {
    setUserId(newUserId);
    setEmail(userEmail);
    setCurrentStep(2);
  };

  const handleUserInfoNext = async (info) => {
    if (userInfoSubmitInFlightRef.current) return;
    userInfoSubmitInFlightRef.current = true;
    setUserInfoSubmitting(true);
    const timeoutId = setTimeout(() => {
      if (userInfoSubmitInFlightRef.current) {
        userInfoSubmitInFlightRef.current = false;
        setUserInfoSubmitting(false);
        if (__DEV__) console.warn('[OnboardingFlow] userInfo submit timeout — lock released');
      }
    }, 20000);
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

      // Ne pas écraser les champs déjà en DB : récupérer l'existant et fusionner
      const { data: existingProfile } = await getUser(uid);
      const birthdate = draft?.dob ?? existingProfile?.birthdate ?? undefined;
      const schoolLevel = draft?.schoolLevel ?? existingProfile?.school_level ?? undefined;

      if (__DEV__) {
        console.log('[OnboardingFlow] 📝 Sauvegarde onboarding — uid:', uid, 'birthdate:', birthdate ?? '(absent)', 'school_level:', schoolLevel ?? '(absent)', 'payload:', {
          first_name: info.firstName,
          username: info.username,
          email: userEmail != null ? '(présent)' : '(absent)',
          school_level: schoolLevel ?? '(absent)',
        });
      }

      const normalisedUsername = normaliseUsername(info.username);
      if (info.username?.trim() && !normalisedUsername) {
        Alert.alert('Pseudo invalide', 'Le pseudo doit contenir au moins 2 caractères (lettres, chiffres, tirets bas).');
        return;
      }

      // Sauvegarder en base (birthdate/school_level : brouillon ou existant, jamais écrasé par vide)
      const { error } = await upsertUser(uid, {
        email: userEmail,
        first_name: info.firstName?.trim() || undefined,
        last_name: (info.lastName?.trim()) || undefined,
        username: normalisedUsername || info.username?.trim() || undefined,
        birthdate,
        school_level: schoolLevel,
        onboarding_step: 2,
        onboarding_completed: false,
      });

      if (error) {
        const isUsernameTaken = error.code === '23505' || (error.message && /pseudo|username|déjà pris|already taken/i.test(error.message));
        if (isUsernameTaken) {
          Alert.alert('Pseudo indisponible', 'Ce pseudo est déjà pris. Choisis-en un autre.');
          return;
        }
        console.error('[OnboardingFlow] ❌ Erreur lors de la sauvegarde:', error);
        Alert.alert(
          'Erreur',
          'Une erreur est survenue. Réessaie dans quelques secondes.'
        );
        return;
      }

      if (__DEV__) console.log('[OnboardingFlow] ✅ Succès DB (user_profiles)');

      const nextStep = 3;
      setOnboardingStep(nextStep);
      updateOnboardingStep(nextStep).catch(() => {});
      setCurrentStep(nextStep);

      getCurrentUserProfile({ force: true }).catch(() => {});

      if (!userId) setUserId(uid);
      if (email == null && userEmail != null) setEmail(userEmail);

      saveUserProfile({
        firstName: info.firstName?.trim(),
        lastName: (info.lastName?.trim()) || undefined,
        username: normalisedUsername || info.username?.trim(),
        email: userEmail,
        birthdate: birthdate ?? undefined,
        dateNaissance: birthdate ?? undefined,
        schoolLevel: schoolLevel ?? undefined,
      }).catch((e) => { if (__DEV__) console.warn('[OnboardingFlow] saveUserProfile (non bloquant):', e?.message); });
    } catch (error) {
      console.error('[OnboardingFlow] ❌ Erreur lors de la finalisation:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger tes données. Vérifie ta connexion.'
      );
    } finally {
      clearTimeout(timeoutId);
      userInfoSubmitInFlightRef.current = false;
      setUserInfoSubmitting(false);
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
          submitting={userInfoSubmitting}
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

