import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import AnswerCard from '../AnswerCard';

const { width } = Dimensions.get('window');
const CONTENT_MAX_WIDTH = Math.min(width * 0.7, 520);
const PROGRESS_BAR_HEIGHT = 22;
// Même largeur que la barre des modules : wrapper pleine largeur avec padding 24
const SCROLL_PADDING_H = 24;

/**
 * Layout commun des écrans de questions onboarding Align
 * Design strict : header ALIGN, barre de progression 6 étapes, question, texte explicatif, blocs de réponses
 * Un clic sur une réponse appelle onSelectAnswer(value) et avance (pas de bouton Continuer)
 */
export default function OnboardingQuestionLayout({
  currentStep,
  totalSteps = 6,
  question,
  explanatoryText,
  answers,
  onSelectAnswer,
}) {
  const progressRatio = currentStep / totalSteps;
  const animatedRatio = useRef(new Animated.Value(progressRatio)).current;

  useEffect(() => {
    Animated.timing(animatedRatio, {
      toValue: progressRatio,
      duration: 320,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progressRatio, animatedRatio]);

  const progressWidthPercent = animatedRatio.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header ALIGN — petit, discret */}
        <Text style={styles.header}>ALIGN</Text>

        {/* Barre de progression — même largeur que Module (padding 24) */}
        <View style={styles.progressWrapper}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressGradientWrap, { width: progressWidthPercent }]}>
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
        </View>

        {/* Question principale — Bowlby One SC, blanc, centré, proportionné */}
        <Text style={styles.question}>{question}</Text>

        {/* Texte explicatif — Nunito Black, blanc atténué, plus petit */}
        <Text style={styles.explanatory}>{explanatoryText}</Text>

        {/* Blocs de réponses — AnswerCard (design aligné onboarding/secteur/métier) */}
        <View style={styles.answersWrapper}>
          {answers.map((answer, index) => (
            <AnswerCard
              key={index}
              label={answer}
              onClick={() => onSelectAnswer(answer)}
              isSelected={false}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
    maxWidth: '100%',
  },
  header: {
    fontFamily: theme.fonts.title,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  progressWrapper: {
    width: '100%',
    marginHorizontal: -SCROLL_PADDING_H,
    paddingHorizontal: SCROLL_PADDING_H,
    marginBottom: 28,
  },
  progressTrack: {
    width: '100%',
    height: PROGRESS_BAR_HEIGHT,
    backgroundColor: '#3D4150',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressGradientWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  question: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(Math.max(width * 0.042, 18), 24),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
    lineHeight: Math.min(Math.max(width * 0.052, 22), 30) * 1.1,
  },
  explanatory: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.035, 14), 18),
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    lineHeight: Math.min(Math.max(width * 0.044, 18), 24) * 1.2,
  },
  answersWrapper: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
  },
});
