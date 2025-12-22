import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

/**
 * Composant Title Align
 * Utilise Bowlby One SC pour tous les titres
 * Variantes : h1, h2, h3
 */
export default function Title({ 
  children, 
  variant = 'h1',
  style 
}) {
  const textStyle = variant === 'h1' 
    ? styles.h1 
    : variant === 'h2'
    ? styles.h2
    : styles.h3;

  return (
    <Text style={[textStyle, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    ...theme.typography.h1,
  },
  h2: {
    ...theme.typography.h2,
  },
  h3: {
    ...theme.typography.h3,
  },
});













