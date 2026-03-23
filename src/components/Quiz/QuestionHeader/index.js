import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';
import AnimatedProgressBar from '../../AnimatedProgressBar';
import QuizEncouragementLine from '../QuizEncouragementLine';

/**
 * Composant QuestionHeader
 * Barre de progression + compteur X/Y en haut à droite (sans libellé "QUESTION #X").
 * Optionnel : ligne d'encouragement animée sous la barre (quiz secteur / métier).
 */
export default function QuestionHeader({
  questionNumber,
  totalQuestions,
  encouragementMessage = null,
  encouragementKey = 0,
}) {
  const progress = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.barWrap}>
          <AnimatedProgressBar
            progress={progress}
            colors={['#FF7B2B', '#FF852D', '#FFD93F']}
          />
        </View>
        {typeof questionNumber === 'number' && typeof totalQuestions === 'number' && totalQuestions > 0 && (
          <Text style={styles.progressLabel}>{`${questionNumber}/${totalQuestions}`}</Text>
        )}
      </View>
      <QuizEncouragementLine message={encouragementMessage} animationKey={encouragementKey} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barWrap: {
    flex: 1,
    minWidth: 0,
  },
  progressLabel: {
    fontFamily: theme.fonts.button,
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
    minWidth: 44,
  },
});











