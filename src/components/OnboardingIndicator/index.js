import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

/**
 * Composant OnboardingIndicator
 * Indicateur de progression avec points animés
 */
export default function OnboardingIndicator({ 
  total, 
  current,
  style 
}) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: total }).map((_, index) => {
        const isActive = index === current;
        return (
          <View
            key={index}
            style={[
              styles.dot,
              isActive && styles.dotActive,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 1,
  },
});

