import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import AnimatedProgressBar from '../../AnimatedProgressBar';

/**
 * Composant QuestionHeader
 * Affiche "QUESTION #X" avec Bowlby One SC et la barre de progression animée
 */
export default function QuestionHeader({ questionNumber, totalQuestions }) {
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      {/* Titre QUESTION #X - Bowlby One SC */}
      <Text style={styles.title}>QUESTION #{questionNumber}</Text>

      {/* Barre de progression animée avec transition fluide */}
      <AnimatedProgressBar 
        progress={progress}
        colors={['#FF7B2B', '#FF852D', '#FFD93F']}
      />
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
});











