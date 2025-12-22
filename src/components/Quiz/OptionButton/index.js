import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../../../styles/theme';

/**
 * Composant OptionButton
 * Bouton d'option pour le quiz Align
 * Variantes : bleu (standard) ou orange (sélectionné)
 */
export default function OptionButton({ 
  option, 
  isSelected, 
  onPress,
  index 
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSelected ? styles.buttonSelected : styles.buttonDefault,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.text,
          isSelected ? styles.textSelected : styles.textDefault,
        ]}
      >
        {option}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.md,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  buttonDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: theme.colors.primary,
  },
  buttonSelected: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  textDefault: {
    color: theme.colors.primary,
  },
  textSelected: {
    color: '#FFFFFF',
  },
});













