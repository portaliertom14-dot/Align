import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme, shadowStyle } from '../../styles/theme';

/**
 * Composant Card Align
 * Container avec ombre et coins arrondis
 */
export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    ...shadowStyle({ height: 2, opacity: 0.2, radius: 8 }),
    elevation: 3,
  },
});
