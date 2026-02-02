import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

// Padding horizontal : clamp(24px, 3vw, 48px) → équivalent en RN (3vw ≈ width * 0.03)
const PADDING_H = Math.min(Math.max(width * 0.03, 24), 48);
// Layout global : maxWidth 1400px si très large (on laisse 100% en RN, pas de max en px fixe)
const LAYOUT_MAX_WIDTH = Math.min(width, 1400);
// Même largeur que la barre des modules : wrapper avec padding 24
const MODULE_PROGRESS_PADDING = 24;

const PROGRESS_BAR_HEIGHT = 14;
const PROGRESS_BAR_RADIUS = 22;
const PILL_RADIUS = 80;
const PILL_HEIGHT = 52;
const PILL_PADDING_LEFT = 22;
const GAP_PILLS = 12;

/**
 * Composant réutilisable : un écran de question onboarding Align
 * Layout plein largeur : logo → barre → question → helper → liste réponses (pills pleine largeur)
 *
 * Props:
 * - progress: number (0..1)
 * - title: string (question)
 * - subtitle: string (helper text)
 * - choices: string[]
 * - onSelect(choice: string): void
 */
export default function OnboardingQuestionScreen({
  progress,
  title,
  subtitle,
  choices,
  onSelect,
}) {
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

        {/* Question — centrée, Bowlby One SC, marge top 26px */}
        <Text style={styles.question}>{title}</Text>

        {/* Sous-texte (helper) — centré, plus petit, marge top 10px */}
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Liste réponses — pleine largeur, pills #2D3241, texte à gauche */}
        <View style={styles.choicesWrapper}>
          {choices.map((choice, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.pill, index < choices.length - 1 && styles.pillSpacer]}
              onPress={() => onSelect(choice)}
              activeOpacity={0.85}
            >
              <Text style={styles.pillText}>{choice}</Text>
            </TouchableOpacity>
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
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: PADDING_H,
    paddingTop: 44,
    paddingBottom: 44,
    alignItems: 'center',
    width: '100%',
    maxWidth: LAYOUT_MAX_WIDTH,
    alignSelf: 'center',
  },
  header: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(Math.max(width * 0.04, 14), 20),
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
    fontSize: Math.min(Math.max(width * 0.048, 16), 22),
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: Math.min(Math.max(width * 0.048, 16), 22) * 1.15,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.028, 11), 14),
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
    lineHeight: Math.min(Math.max(width * 0.034, 13), 17) * 1.2,
  },
  choicesWrapper: {
    width: '100%',
    marginTop: 12,
  },
  pill: {
    backgroundColor: '#2D3241',
    borderRadius: PILL_RADIUS,
    minHeight: PILL_HEIGHT,
    paddingLeft: PILL_PADDING_LEFT,
    paddingRight: 22,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  pillSpacer: {
    marginBottom: GAP_PILLS,
  },
  pillText: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.032, 13), 15),
    color: '#FFFFFF',
    textAlign: 'left',
  },
});
