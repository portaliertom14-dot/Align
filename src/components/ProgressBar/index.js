import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

/**
 * Composant ProgressBar Align
 * Barre de progression avec gradient bleu
 */
export default function ProgressBar({ progress = 0, total = 100, style }) {
  const percentage = Math.min(Math.max((progress / total) * 100, 0), 100);
  
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={theme.colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progress, { width: `${percentage}%` }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: theme.borderRadius.round,
  },
});
