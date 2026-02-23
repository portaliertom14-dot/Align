/**
 * Écran 2 — Écran de chargement (donut)
 * Progression circulaire animée 0% → 100%, transition automatique vers Main.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated as RNAnimated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingCompleted } from '../../services/userService';

const ONBOARDING_COMPLETE_CACHE_KEY = (userId) => `@align_onboarding_complete_${userId}`;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Tailles responsives du donut : mobile ~200–230, desktop ~280–340. */
function getDonutDimensions(width) {
  const size = clamp(Math.round(width * 0.45), 180, 340);
  const strokeWidth = clamp(Math.round(size * 0.08), 10, 22);
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  return { size, strokeWidth, radius, cx, cy, circumference };
}

const TITLE_LINE_1 = "ON CRÉE TA ROUTINE PERSONNALISÉE";
const TITLE_LINE_2 = "VERS L'ATTEINTE DE TON OBJECTIF";

const DURATION_MS = 2500;

// Wrapper qui retire les props non-SVG (ex. collapsable) et forward la ref pour Animated (évite warning "Function components cannot be given refs").
const CircleSvgOnly = React.forwardRef((props, ref) => {
  const { collapsable, ...rest } = props;
  return <Circle ref={ref} {...rest} />;
});
CircleSvgOnly.displayName = 'CircleSvgOnly';
// Cercle animé : on utilise Animated.Value pour strokeDashoffset et pour le pourcentage affiché
const AnimatedCircle = RNAnimated.createAnimatedComponent(CircleSvgOnly);

const LARGE_SCREEN_BREAKPOINT = 1100;

export default function ChargementRoutineScreen() {
  const navigation = useNavigation();
  const { user, setOnboardingStatus, refreshOnboardingStatus } = useAuth();
  const { width: winWidth } = useWindowDimensions();
  const donut = getDonutDimensions(winWidth);
  const progress = useRef(new RNAnimated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = useState(0);
  const isLargeScreen = winWidth >= LARGE_SCREEN_BREAKPOINT;

  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setDisplayPercent(Math.round(value * 100));
    });

    RNAnimated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.ease),
    }).start(async ({ finished }) => {
      progress.removeListener(listenerId);
      if (finished) {
        const userId = user?.id;
        if (userId) {
          try {
            const { error } = await markOnboardingCompleted(userId);
            if (!error) {
              AsyncStorage.setItem(ONBOARDING_COMPLETE_CACHE_KEY(userId), 'true').catch(() => {});
            }
          } catch (e) {
            console.warn('[ChargementRoutine] markOnboardingCompleted failed (non-blocking):', e?.message);
          }
        }
        setOnboardingStatus('complete');
        refreshOnboardingStatus(); // Rafraîchit aussi userFirstName depuis la DB
        setTimeout(() => {
          navigation.replace('Main', { screen: 'Feed', params: { fromOnboardingComplete: true } });
        }, 400);
      }
    });

    return () => progress.removeListener(listenerId);
  }, [progress, navigation, setOnboardingStatus, refreshOnboardingStatus, user?.id]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [donut.circumference, 0],
  });

  const titleFontSize = isLargeScreen ? 26 : Math.min(24, Math.max(18, winWidth * 0.055));
  const titleLineHeight = titleFontSize * 1.2;

  return (
    <View style={styles.container}>
      <View style={styles.entranceContent}>
      <Text
        style={[
          styles.title,
          { fontSize: titleFontSize, lineHeight: titleLineHeight, marginTop: -50 },
          isLargeScreen && {
            marginTop: -130,
            marginBottom: 72,
          },
        ]}
      >
        {TITLE_LINE_1}
        {'\n'}
        {TITLE_LINE_2}
      </Text>

      <View style={[styles.donutWrapper, { width: donut.size, height: donut.size }]}>
        <Svg width={donut.size} height={donut.size} style={styles.svg}>
          <Defs>
            <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#FF7B2B" />
              <Stop offset="1" stopColor="#FFD93F" />
            </LinearGradient>
          </Defs>
          {/* Fond du cercle — gris clair */}
          <G transform={`rotate(-90 ${donut.cx} ${donut.cy})`}>
            <Circle
              cx={donut.cx}
              cy={donut.cy}
              r={donut.radius}
              stroke="#3D4150"
              strokeWidth={donut.strokeWidth}
              fill="transparent"
            />
            {/* Progression — dégradé, animée */}
            <AnimatedCircle
              cx={donut.cx}
              cy={donut.cy}
              r={donut.radius}
              stroke="url(#progressGrad)"
              strokeWidth={donut.strokeWidth}
              fill="transparent"
              strokeDasharray={donut.circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={[styles.percentOverlay, { pointerEvents: 'none' }]}>
          <Text style={[styles.percentText, { fontSize: clamp(Math.round(donut.size * 0.12), 22, 36) }]}>{displayPercent}%</Text>
        </View>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  entranceContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
  },
  donutWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  percentOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontFamily: theme.fonts.button,
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
