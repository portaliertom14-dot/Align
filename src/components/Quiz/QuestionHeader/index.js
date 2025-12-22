import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../styles/theme';

/**
 * Composant QuestionHeader
 * Affiche "QUESTION #X" avec Bowlby One SC et la barre de progression
 */
export default function QuestionHeader({ questionNumber, totalQuestions }) {
  const progress = (questionNumber / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      {/* Titre QUESTION #X - Bowlby One SC */}
      <Text style={styles.title}>QUESTION #{questionNumber}</Text>

      {/* Barre de progression */}
      <View style={styles.progressContainer}>
        <LinearGradient
          colors={['#FF7B2B', '#FF852D', '#FFD93F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBar, { width: `${progress}%` }]}
        />
      </View>
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
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});











