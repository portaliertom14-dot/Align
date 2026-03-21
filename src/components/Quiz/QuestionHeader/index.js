import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import AnimatedProgressBar from '../../AnimatedProgressBar';

/**
 * Composant QuestionHeader
 * Affiche "QUESTION #X" avec Bowlby One SC, la barre de progression animée et "X/Y" à droite (comme onboarding).
 */
export default function QuestionHeader({ questionNumber, totalQuestions }) {
  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Titre QUESTION #X - Bowlby One SC */}
      <Text style={styles.title}>QUESTION #{questionNumber}</Text>

      {/* Barre de progression animée + indicateur 1/50, 1/30, etc. à droite */}
      <AnimatedProgressBar 
        progress={progress}
        colors={['#FF7B2B', '#FF852D', '#FFD93F']}
      />
      {typeof questionNumber === 'number' && typeof totalQuestions === 'number' && totalQuestions > 0 && (
        <Text style={styles.progressLabel}>{`${questionNumber}/${totalQuestions}`}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  title: {
    ...theme.typography.h3,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    marginTop: 8,
    fontFamily: theme.fonts.button,
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
});











