import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../HoverableTouchableOpacity';

/**
 * Composant Button Align
 * Utilise Nunito Black pour la police et dégradé orange par défaut
 * Variantes : primary (dégradé orange), secondary (dégradé orange), custom
 * Animation hover avec scale intégrée
 */
export default function Button({ 
  title, 
  onPress, 
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
}) {
  // Utiliser le dégradé orange Align pour tous les boutons
  const gradientColors = theme.colors.gradient.buttonOrange;

  return (
    <HoverableTouchableOpacity 
      style={[styles.container, style, disabled && styles.disabled]} 
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
      variant="button"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.button}
      >
        <Text style={[styles.text, textStyle]}>{title}</Text>
      </LinearGradient>
    </HoverableTouchableOpacity>
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
  text: {
    ...theme.typography.button,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.5,
  },
});
