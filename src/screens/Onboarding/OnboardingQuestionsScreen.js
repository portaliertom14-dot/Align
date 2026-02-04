import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingQuestionsFlow from './OnboardingQuestionsFlow';

/**
 * Écran des 6 questions onboarding (affiché après "C'EST PARTI !")
 * À la fin des 6 réponses, redirige vers OnboardingInterlude ("Ça tombe bien...")
 */
export default function OnboardingQuestionsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const resetSeed = route.params?.resetSeed ?? null;

  const handleComplete = (answers) => {
    console.log('[OnboardingQuestions] Réponses:', answers);
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
