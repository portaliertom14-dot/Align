import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getOnboardingQuestionTextSizes } from '../../screens/Onboarding/onboardingConstants';

const { width: INITIAL_WIDTH } = Dimensions.get('window');
// Padding horizontal : clamp(24px, 3vw, 48px) → équivalent en RN (3vw ≈ width * 0.03)
const PADDING_H = Math.min(Math.max(INITIAL_WIDTH * 0.03, 24), 48);
// Layout : pleine largeur, responsive au niveau des composants uniquement
// Même largeur que la barre des modules : wrapper avec padding 24
const MODULE_PROGRESS_PADDING = 24;

const PROGRESS_BAR_HEIGHT = 6;
const PROGRESS_BAR_RADIUS = 3;
const PILL_RADIUS = 80;
const PILL_HEIGHT = 52;
const PILL_PADDING_LEFT = 22;
const GAP_PILLS = 12;

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
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [pressedIndex, setPressedIndex] = useState(null);
  const isWeb = Platform.OS === 'web';

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

        {/* Liste réponses — sélection = bordure orange uniquement */}
        <View style={styles.choicesWrapper}>
          {choices.map((choice, index) => {
            const isSelected = selectedChoice === choice;
            const isHovered = isWeb && hoveredIndex === index;
            const isPressed = isWeb && pressedIndex === index;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pill,
                  isSelected && styles.pillSelected,
                  index < choices.length - 1 && styles.pillSpacer,
                  isHovered && styles.pillHover,
                  isPressed && styles.pillPress,
                ]}
                onPress={() => handleChoicePress(choice)}
                activeOpacity={0.85}
                {...(isWeb ? {
                  onMouseEnter: () => { if (typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches) setHoveredIndex(index); },
                  onMouseLeave: () => { setHoveredIndex(null); setPressedIndex(null); },
                  onPressIn: () => setPressedIndex(index),
                  onPressOut: () => setPressedIndex(null),
                  className: 'align-focus-visible',
                  tabIndex: 0,
                } : {})}
              >
                <Text style={styles.pillText}>{choice}</Text>
              </TouchableOpacity>
            );
          })}
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
  pill: {
    backgroundColor: '#2D3241',
    borderRadius: PILL_RADIUS,
    minHeight: PILL_HEIGHT,
    paddingLeft: PILL_PADDING_LEFT,
    paddingRight: 22,
    paddingVertical: 14,
    justifyContent: 'center',
    maxWidth: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'background-color 200ms ease, box-shadow 200ms ease' } : {}),
  },
  pillHover: {
    ...(Platform.OS === 'web' ? { backgroundColor: '#363b4a', boxShadow: '0 0 0 1px rgba(255, 123, 43, 0.25)' } : {}),
  },
  pillPress: {
    ...(Platform.OS === 'web' ? { backgroundColor: '#2a2e3a' } : {}),
  },
  pillSelected: {
    borderWidth: 2,
    borderColor: '#FF7B2B',
  },
  pillSpacer: {
    marginBottom: GAP_PILLS,
  },
  pillText: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(INITIAL_WIDTH * 0.032, 13), 15),
    color: '#FFFFFF',
    textAlign: 'left',
  },
});
