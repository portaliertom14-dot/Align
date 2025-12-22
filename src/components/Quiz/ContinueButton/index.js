import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../styles/theme';

/**
 * Composant ContinueButton
 * Bouton CONTINUER avec dégradé orange Align et police Lilita One
 */
export default function ContinueButton({ onPress, disabled = false }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={styles.container}
    >
      <LinearGradient
        colors={theme.colors.gradient.buttonOrange}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.button, disabled && styles.buttonDisabled]}
      >
        <Text style={styles.text}>CONTINUER</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  button: {
    ...theme.ui.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    ...theme.typography.button,
    textTransform: 'uppercase',
  },
});











