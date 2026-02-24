/**
 * Écran de chargement neutre affiché tant que la décision de route n'est pas prête.
 * Utilisé par RootGate pour éviter tout flash : auth + profile + onboardingStep
 * doivent être résolus avant de monter le stack cible.
 */
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../../styles/theme';

export default function LoadingGate() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors?.primary ?? '#FF7B2B'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
