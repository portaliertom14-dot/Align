import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingQuestionsFlow from './OnboardingQuestionsFlow';
import { getCurrentUser } from '../../services/auth';
import { upsertUser } from '../../services/userService';
import { getCurrentUserProfile } from '../../services/userProfileService';

/**
 * Écran des 6 questions onboarding (affiché après "C'EST PARTI !")
 * À la fin des 6 réponses, redirige vers OnboardingInterlude ("Ça tombe bien...")
 * Si l'utilisateur est connecté, on persiste school_level dans user_profiles.
 */
export default function OnboardingQuestionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const resetSeed = route.params?.resetSeed ?? null;
  const flowRef = useRef(null);

  const handleExitFirstStep = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('PreQuestions');
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        const handled = flowRef.current?.goBack?.();
        return handled === true;
      });
      return () => sub.remove();
    }, [])
  );

  const handleComplete = (answers) => {
    console.log('[OnboardingQuestions] Réponses:', answers);
    // Ne jamais attendre l’auth / la DB avant la navigation : sinon blocage apparent sur la dernière question si getSession/getUser ou upsert est lent.
    navigation.navigate('OnboardingInterlude');

    // Persister school_level en DB si l'utilisateur est déjà connecté (flux: Auth → UserInfo → … → Questions)
    // 2e question onboarding = niveau scolaire (ONBOARDING_QUESTIONS[1], clé draft schoolLevel)
    const schoolLevelFromAnswers =
      Array.isArray(answers) && answers[1] != null && String(answers[1]).trim() !== ''
        ? String(answers[1]).trim()
        : null;

    void (async () => {
      try {
        const user = await getCurrentUser();
        if (user?.id && schoolLevelFromAnswers) {
          const { error } = await upsertUser(user.id, { school_level: schoolLevelFromAnswers });
          if (!error) {
            if (__DEV__) console.log('[OnboardingQuestions] school_level sauvegardé:', schoolLevelFromAnswers);
            getCurrentUserProfile({ force: true }).catch(() => {});
          }
        }
      } catch (e) {
        if (__DEV__) console.warn('[OnboardingQuestions] sync school_level (non bloquant):', e?.message);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => flowRef.current?.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <OnboardingQuestionsFlow
        ref={flowRef}
        onComplete={handleComplete}
        resetSeed={resetSeed}
        onExitFirstStep={handleExitFirstStep}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
