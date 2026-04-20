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
 * À la fin des 6 réponses, redirige directement vers la suite de l'onboarding.
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
    /**
     * COUPLAGE CRITIQUE — index volontairement hardcodé.
     * `ONBOARDING_QUESTIONS[1]` dans `src/data/onboardingQuestions.js` est la question « niveau scolaire »
     * (`id: 'school_level'`). `answers[1]` doit rester aligné sur cet index (même ordre que le flow).
     * Si tu réordonnes `ONBOARDING_QUESTIONS`, mets à jour **cet index** ici (et vérifie la clé draft
     * `schoolLevel` dans le flow / `onboardingDraftStore`). Sinon `schoolLevel` part à `null`, navigation
     * sans erreur visible, et le texte Parcoursup de l’interlude retombe sur le fallback.
     */
    const schoolLevelFromAnswers =
      Array.isArray(answers) && answers[1] != null && String(answers[1]).trim() !== ''
        ? String(answers[1]).trim()
        : null;
    // Ne jamais attendre l’auth / la DB avant la navigation : sinon blocage apparent sur la dernière question si getSession/getUser ou upsert est lent.
    navigation.navigate('Onboarding', { step: 1 });

    // Persister school_level en DB si l'utilisateur est déjà connecté (flux: Auth → UserInfo → … → Questions)

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
