/**
 * Tutoriel guidé : FeedContent (dessous) → BlurView (zIndex 10) → FocusOverlay (zIndex 20) → Bubble (zIndex 30).
 * Les éléments focus sont rendus dans FocusOverlay AU-DESSUS du BlurView (clones positionnés via measureInWindow).
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../../screens/Onboarding/onboardingConstants';
import FocusOverlay from '../FocusOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TYPE_SPEED_MS = 28;
const BUTTON_FADE_DURATION = 200;
const BUBBLE_BG = 'rgba(255,123,43,0.70)';
const BUBBLE_RADIUS = 26;

const BLUR_Z_INDEX = 10;
const BUBBLE_Z_INDEX = 30;

/**
 * @param {boolean} visible
 * @param {number} stepIndex 0, 1, 2 (tutorialStep)
 * @param {Array} steps
 * @param {() => void} onNext
 * @param {() => void} onFinish
 * @param {() => Promise<Record<string,{x,y,width,height}>>} getTargetsLayout
 * @param {() => void} onSettingsPress
 */
export default function GuidedTourOverlay({
  visible,
  stepIndex,
  steps,
  onNext,
  onFinish,
  getTargetsLayout,
  onSettingsPress,
}) {
  const [targetLayouts, setTargetLayouts] = useState(null);
  const [displayedText, setDisplayedText] = useState('');
  const [typingComplete, setTypingComplete] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const typingIndexRef = useRef(0);
  const typingTimerRef = useRef(null);

  // Récupérer les coordonnées des cibles (measureInWindow) pour FocusOverlay
  useEffect(() => {
    if (!visible || !getTargetsLayout) return;
    let cancelled = false;
    (async () => {
      try {
        const layouts = await getTargetsLayout();
        if (!cancelled) setTargetLayouts(layouts || null);
      } catch (e) {
        if (!cancelled) setTargetLayouts(null);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, stepIndex, phaseIndex, getTargetsLayout]);

  const step = steps?.[stepIndex];
  const hasPhases = step?.phases?.length > 0;
  const currentPhase = hasPhases ? step.phases[phaseIndex] : null;
  const phase0Text = hasPhases ? (step.phases[0]?.text ?? '') : '';
  const fullText = hasPhases
    ? (currentPhase?.text ?? '')
    : (step?.text ?? '');
  const showButton = step?.showButton === true && typingComplete;

  // Typing : afficher le texte caractère par caractère (Phase A puis Phase B pour step 2)
  useEffect(() => {
    if (!visible) {
      setDisplayedText('');
      setTypingComplete(false);
      typingIndexRef.current = 0;
      return;
    }
    if (hasPhases && phaseIndex === 1) {
      const phase1Text = fullText;
      if (!phase1Text) {
        setTypingComplete(true);
        return;
      }
      setDisplayedText(phase0Text);
      setTypingComplete(false);
      typingIndexRef.current = 0;

      typingTimerRef.current = setInterval(() => {
        typingIndexRef.current += 1;
        const next = phase0Text + phase1Text.slice(0, typingIndexRef.current);
        setDisplayedText(next);
        if (typingIndexRef.current >= phase1Text.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          setTypingComplete(true);
        }
      }, TYPE_SPEED_MS);

      return () => {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      };
    }

    if (!fullText) {
      setDisplayedText('');
      setTypingComplete(false);
      return;
    }

    setDisplayedText('');
    setTypingComplete(false);
    typingIndexRef.current = 0;

    typingTimerRef.current = setInterval(() => {
      typingIndexRef.current += 1;
      const next = fullText.slice(0, typingIndexRef.current);
      setDisplayedText(next);
      if (typingIndexRef.current >= fullText.length) {
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        if (hasPhases && phaseIndex === 0 && step.phases.length > 1) {
          setPhaseIndex(1);
        } else {
          setTypingComplete(true);
        }
      }
    }, TYPE_SPEED_MS);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
  }, [visible, stepIndex, fullText, hasPhases, phaseIndex, phase0Text, step?.phases?.length]);

  useEffect(() => {
    if (!visible) return;
    setPhaseIndex(0);
  }, [visible, stepIndex]);

  useEffect(() => {
    if (showButton) {
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: BUTTON_FADE_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      buttonOpacity.setValue(0);
    }
  }, [showButton, buttonOpacity]);

  if (!visible) return null;

  const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();
  const buttonWrapWidth = Math.min(SCREEN_WIDTH * 0.76, BTN_WIDTH);

  const isWeb = Platform.OS === 'web';

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayRoot, { pointerEvents: 'box-none' }]}>
      {/* 1) BlurView plein écran (zIndex 10) — capture les clics sur le flouté */}
      {isWeb ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.blurFallbackWeb,
            { zIndex: BLUR_Z_INDEX, pointerEvents: 'auto' },
          ]}
        />
      ) : (
        <BlurView
          intensity={100}
          tint="default"
          style={[StyleSheet.absoluteFillObject, { zIndex: BLUR_Z_INDEX, pointerEvents: 'auto' }]}
        />
      )}

      {/* 2) FocusOverlay (zIndex 20) — éléments focus nets et cliquables au-dessus du blur */}
      <FocusOverlay
        step={stepIndex}
        layouts={targetLayouts}
        onModule1Press={stepIndex === 2 ? onFinish : undefined}
        onQuestsPress={() => {}}
        onSettingsPress={onSettingsPress || (() => {})}
      />

      {/* 3) Message + bouton SUIVANT (zIndex 30) */}
      <View
        style={[
          styles.bubbleContainer,
          { zIndex: BUBBLE_Z_INDEX, pointerEvents: 'box-none' },
        ]}
      >
        <View style={styles.bubble}>
          <Text style={styles.bubbleText} numberOfLines={6}>
            {displayedText}
          </Text>
        </View>
        {showButton && (
          <Animated.View style={[styles.buttonWrap, { opacity: buttonOpacity, width: buttonWrapWidth }]}>
            <TouchableOpacity
              style={[styles.nextButton, { width: buttonWrapWidth }]}
              onPress={onNext}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>SUIVANT</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web : expo-blur non fiable → uniquement blur CSS, pas d’assombrissement.
  overlayRoot: {
    zIndex: 9,
    elevation: 9,
  },
  blurFallbackWeb: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }
      : {}),
  },
  bubbleContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 120,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: BUBBLE_BG,
    borderRadius: BUBBLE_RADIUS,
    paddingVertical: 20,
    paddingHorizontal: 24,
    maxWidth: 300,
  },
  bubbleText: {
    fontFamily: theme.fonts.button,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '900',
  },
  buttonWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  nextButton: {
    overflow: 'hidden',
    borderRadius: 999,
    alignSelf: 'center',
  },
  nextButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
