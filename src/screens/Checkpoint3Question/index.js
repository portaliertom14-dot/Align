/**
 * Écran questions Checkpoint 3 — 3 questions (Q1, Q2, Q3).
 * Après Q3 : marquer onboarding complété et naviguer vers FinCheckpoints.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/Header';
import AnimatedProgressBar from '../../components/AnimatedProgressBar';
import { theme } from '../../styles/theme';
import { CHECKPOINT_3_QUESTIONS, SUBTITLE } from '../../data/checkpointQuestions';
import { saveCheckpointAnswer } from '../../lib/checkpointAnswers';
import { getCurrentUser } from '../../services/auth';
import { upsertUser } from '../../services/userService';

const CHECKPOINT_COLOR = '#EC3912';
const QUESTIONS = CHECKPOINT_3_QUESTIONS;

export default function Checkpoint3QuestionScreen() {
  const navigation = useNavigation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const progressPercent = ((currentQuestionIndex + 1) / 3) * 100;
  const isLastQuestion = currentQuestionIndex === 2;

  const handleSelect = async (option) => {
    setSelectedAnswer(option);
    saveCheckpointAnswer('checkpoint3', currentQuestionIndex, option);
    if (isLastQuestion) {
      try {
        const user = await getCurrentUser();
        if (user?.id) {
          await upsertUser(user.id, {
            onboarding_completed: true,
            onboarding_step: 999,
          });
        }
      } catch (error) {
        console.error('[Checkpoint3Question] Erreur marquage onboarding:', error);
      }
    }
    setTimeout(() => {
      if (isLastQuestion) {
        navigation.replace('FinCheckpoints');
      } else {
        setCurrentQuestionIndex((i) => i + 1);
        setSelectedAnswer(null);
      }
    }, 300);
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header alignWithOnboarding />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressContainer}>
          <AnimatedProgressBar
            progress={progressPercent}
            colors={['#FFD93F', '#FF7B2B']}
          />
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} / 3
          </Text>
        </View>
        <Text style={[styles.checkpointLabel, { color: CHECKPOINT_COLOR }]}>
          CHECKPOINT #3
        </Text>
        <Text style={styles.question}>{currentQuestion.question}</Text>
        <Text style={styles.subtitle}>{SUBTITLE}</Text>
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.optionButton, selectedAnswer === option && styles.optionButtonSelected]}
              onPress={() => handleSelect(option)}
              activeOpacity={0.8}
              disabled={!!selectedAnswer}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  progressContainer: { marginTop: 24, marginBottom: 24 },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: theme.fonts.body,
    textAlign: 'right',
    marginTop: 8,
  },
  checkpointLabel: {
    fontSize: 22,
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    marginBottom: 24,
  },
  question: {
    fontSize: 20,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 16,
    lineHeight: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 32,
    lineHeight: 22,
    textAlign: 'center',
  },
  optionsContainer: { marginBottom: 24 },
  optionButton: {
    backgroundColor: '#2D3241',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: CHECKPOINT_COLOR,
    backgroundColor: 'rgba(236, 57, 18, 0.15)',
  },
  optionText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    lineHeight: 22,
    textAlign: 'center',
  },
});
