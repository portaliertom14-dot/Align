/**
 * Écran 2 — Écran de chargement (donut)
 * Progression circulaire animée 0% → 100%, transition automatique vers Main.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');

const DONUT_SIZE = Math.min(width * 0.5, 220);
const STROKE_WIDTH = 14;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2;
const CX = DONUT_SIZE / 2;
const CY = DONUT_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

export default function ChargementRoutineScreen() {
  const navigation = useNavigation();
  const progress = useRef(new RNAnimated.Value(0)).current;
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    const listenerId = progress.addListener(({ value }) => {
      setDisplayPercent(Math.round(value * 100));
    });

    RNAnimated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.ease),
    }).start(({ finished }) => {
      progress.removeListener(listenerId);
      if (finished) {
        setTimeout(() => {
          navigation.replace('Main', { screen: 'Feed', params: { fromOnboardingComplete: true } });
        }, 400);
      }
    });

    return () => progress.removeListener(listenerId);
  }, [progress, navigation]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {TITLE_LINE_1}
        {'\n'}
        {TITLE_LINE_2}
      </Text>

      <View style={styles.donutWrapper}>
        <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={styles.svg}>
          <Defs>
            <LinearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor="#FF7B2B" />
              <Stop offset="1" stopColor="#FFD93F" />
            </LinearGradient>
          </Defs>
          {/* Fond du cercle — gris clair */}
          <G transform={`rotate(-90 ${CX} ${CY})`}>
            <Circle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke="#3D4150"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            {/* Progression — dégradé, animée */}
            <AnimatedCircle
              cx={CX}
              cy={CY}
              r={RADIUS}
              stroke="url(#progressGrad)"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.percentOverlay} pointerEvents="none">
          <Text style={styles.percentText}>{displayPercent}%</Text>
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
  title: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
    marginTop: -65,
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
  },
  donutWrapper: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
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
