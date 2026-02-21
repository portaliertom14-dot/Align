/**
 * Carte de réponse unique pour tous les quiz (onboarding, secteur, métier).
 * Design system aligné : #2D3241, border-radius 80, hover, bordure orange si sélectionné.
 * Option index : rond numéroté (quiz secteur/métier), aligné au padding interne.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

const PILL_RADIUS = 80;
const PILL_HEIGHT = 52;
const PADDING_H = 22;
const NUMBER_CIRCLE_SIZE = 36;
const GAP_NUMBER_TEXT = 16;

export default function AnswerCard({ label, index, onClick, isSelected, containerStyle }) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const isWeb = Platform.OS === 'web';
  const showNumber = index != null && Number.isFinite(index);

  const content = (
    <>
      {showNumber && (
        <LinearGradient
          colors={['#FF7B2B', '#FF852D', '#FFD93F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.numberCircle}
        >
          <Text style={styles.numberText}>{index}</Text>
        </LinearGradient>
      )}
      <Text style={styles.labelText} numberOfLines={3}>
        {typeof label === 'object' && label?.label != null ? label.label : String(label ?? '')}
      </Text>
    </>
  );

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        (isWeb && hovered) && styles.cardHover,
        (isWeb && pressed) && styles.cardPress,
        containerStyle,
      ]}
      onPress={onClick}
      activeOpacity={0.85}
      {...(isWeb
        ? {
            onMouseEnter: () =>
              typeof window !== 'undefined' &&
              window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches &&
              setHovered(true),
            onMouseLeave: () => {
              setHovered(false);
              setPressed(false);
            },
            onPressIn: () => setPressed(true),
            onPressOut: () => setPressed(false),
          }
        : {})}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D3241',
    borderRadius: PILL_RADIUS,
    minHeight: PILL_HEIGHT,
    paddingLeft: PADDING_H,
    paddingRight: PADDING_H,
    paddingVertical: 14,
    marginBottom: 12,
    justifyContent: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
    ...(Platform.OS === 'web'
      ? { cursor: 'pointer', transition: 'background-color 200ms ease, box-shadow 200ms ease, border-color 200ms ease' }
      : {}),
  },
  cardSelected: {
    borderColor: '#FF7B2B',
  },
  cardHover: {
    ...(Platform.OS === 'web'
      ? { backgroundColor: '#363b4a', shadowColor: 'rgba(255, 123, 43, 0.25)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8 }
      : {}),
  },
  cardPress: {
    ...(Platform.OS === 'web' ? { backgroundColor: '#2a2e3a' } : {}),
  },
  numberCircle: {
    width: NUMBER_CIRCLE_SIZE,
    height: NUMBER_CIRCLE_SIZE,
    borderRadius: NUMBER_CIRCLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: GAP_NUMBER_TEXT,
  },
  numberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  labelText: {
    flex: 1,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'left',
    lineHeight: 22,
  },
});
