import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

/**
 * Écran d'introduction QUIZ MÉTIER
 * Identique visuellement à l'écran QUIZ SECTEUR de l'onboarding
 * Affiche "QUIZ MÉTIER" avec le même style et layout
 */
export default function QuizMetierIntroScreen() {
  const navigation = useNavigation();

  // Transition automatique vers le quiz métier après 2 secondes
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('QuizMetier');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screen}
    >
      <View style={styles.finalScreenContent}>
        {/* QUIZ avec dégradé dans la typographie */}
        <GradientText
          colors={['#FFD93F', '#FF7B2B']}
          style={styles.quizTextGradient}
        >
          QUIZ
        </GradientText>
        <Text style={styles.metierText}>MÉTIER</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  finalScreenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quizTextGradient: {
    fontSize: 80,
    fontFamily: theme.fonts.title, // Bowlby One SC
    letterSpacing: 4,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  metierText: {
    fontSize: 24,
    fontFamily: 'sans-serif',
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
});

