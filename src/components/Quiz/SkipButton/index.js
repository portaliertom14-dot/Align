import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Composant SkipButton
 * Bouton "Passer →" en bas à droite
 */
export default function SkipButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.7}
    >
      <Text style={styles.text}>Passer →</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD93F',
  },
});













