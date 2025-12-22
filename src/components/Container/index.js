import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { theme } from '../../styles/theme';

/**
 * Composant Container Align
 * Container principal avec SafeAreaView
 */
export default function Container({ children, style, safe = true }) {
  const Wrapper = safe ? SafeAreaView : View;
  
  return (
    <Wrapper style={[styles.container, style]}>
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});















