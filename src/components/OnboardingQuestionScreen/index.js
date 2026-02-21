import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getOnboardingQuestionTextSizes } from '../../screens/Onboarding/onboardingConstants';
import AnswerCard from '../AnswerCard';

const { width: INITIAL_WIDTH } = Dimensions.get('window');
// Padding horizontal : clamp(24px, 3vw, 48px) → équivalent en RN (3vw ≈ width * 0.03)
const PADDING_H = Math.min(Math.max(INITIAL_WIDTH * 0.03, 24), 48);
// Layout : pleine largeur, responsive au niveau des composants uniquement
// Même largeur que la barre des modules : wrapper avec padding 24
const MODULE_PROGRESS_PADDING = 24;

const PROGRESS_BAR_HEIGHT = 6;
const PROGRESS_BAR_RADIUS = 3;

/**
 * Composant réutilisable : un écran de question onboarding Align
 * Layout plein largeur : logo → barre → question → helper → liste réponses (pills pleine largeur)
 * État sélection : bordure orange #FF7B2B uniquement sur le bloc sélectionné ; pas de fond orange, pas de bouton Suivant.
 *
 * Props:
 * - progress: number (0..1)
 * - title: string (question)
 * - subtitle: string (helper text)
 * - choices: string[]
 * - selectedChoice: string | null (réponse sélectionnée pour cet écran)
 * - onSelect(choice: string): void (sélection visuelle)
 * - onNext(choice?: string): void | null (si fourni, appelé après sélection pour avancer)
 * - flashDelayMs: number (délai entre clic et avancement, défaut 200)
 */
export default function OnboardingQuestionScreen({
  progress,
  title,
  subtitle,
  choices,
  selectedChoice,
  onSelect,
  onNext,
  flashDelayMs = 200,
}) {
  const { width } = useWindowDimensions();
  const textSizes = getOnboardingQuestionTextSizes(width);

  const handleChoicePress = (choice) => {
    onSelect(choice);
    if (onNext) {
      setTimeout(() => onNext(choice), flashDelayMs);
    }
  };
  const animatedRatio = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(animatedRatio, {
      toValue: progress,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress, animatedRatio]);

  const progressWidthPercent = animatedRatio.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.entranceWrap}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo ALIGN — en haut, centré, marge top ~36px */}
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

        {/* Bloc question + sous-texte — maxWidth pour wrap naturel, pas de truncation */}
        <View style={[styles.questionBlock, { maxWidth: Math.min(width * 0.92, 900) }]}>
          <Text style={[styles.question, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{title}</Text>
          <Text style={[styles.subtitle, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{subtitle}</Text>
        </View>

        {/* Liste réponses — design AnswerCard (aligné secteur/métier) */}
        <View style={styles.choicesWrapper}>
          {choices.map((choice, index) => (
            <AnswerCard
              key={index}
              label={choice}
              onClick={() => handleChoicePress(choice)}
              isSelected={selectedChoice === choice}
            />
          ))}
        </View>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A1B23',
    width: '100%',
  },
  entranceWrap: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PADDING_H,
    paddingTop: 44,
    paddingBottom: 44,
    alignItems: 'center',
    width: '100%',
  },
  header: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(Math.max(INITIAL_WIDTH * 0.04, 14), 20),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  progressWrapper: {
    width: '100%',
    marginHorizontal: -PADDING_H,
    paddingHorizontal: MODULE_PROGRESS_PADDING,
    marginBottom: 38,
  },
  questionBlock: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: PROGRESS_BAR_HEIGHT,
    backgroundColor: '#2D3241',
    borderRadius: PROGRESS_BAR_RADIUS,
    overflow: 'hidden',
  },
  progressGradientWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: PROGRESS_BAR_RADIUS,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
    borderRadius: PROGRESS_BAR_RADIUS,
  },
  question: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: '100%',
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
    width: '100%',
    maxWidth: '100%',
  },
  choicesWrapper: {
    width: '100%',
    maxWidth: '100%',
    marginTop: 12,
  },
});
