import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
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

  const handleComplete = async (answers) => {
    console.log('[OnboardingQuestions] Réponses:', answers);
    // Persister school_level en DB si l'utilisateur est déjà connecté (flux: Auth → UserInfo → … → Questions)
    // Question 4 (index 3) = niveau scolaire (DRAFT_KEYS_BY_INDEX[3] === 'schoolLevel')
    const schoolLevelFromAnswers = Array.isArray(answers) && answers[3] ? String(answers[3]).trim() : null;
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
    navigation.navigate('OnboardingInterlude');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <OnboardingQuestionsFlow onComplete={handleComplete} resetSeed={resetSeed} />
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
