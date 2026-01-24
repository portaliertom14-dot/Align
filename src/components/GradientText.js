import React from 'react';
import { Text, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

/**
 * Composant GradientText - Texte avec dégradé linéaire
 * Fonctionne sur toutes les plateformes (web, iOS, Android)
 */
export default function GradientText({ 
  children, 
  colors = ['#FF7B2B', '#FFD93F'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style 
}) {
  if (Platform.OS === 'web') {
    // Sur web, utiliser un gradient CSS natif directement sur le texte
    const gradientStyle = {
      background: `linear-gradient(to right, ${colors.join(', ')})`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      display: 'inline-block',
    };

    return (
      <Text style={[style, gradientStyle]}>
        {children}
      </Text>
    );
  }

  // Sur mobile (iOS, Android), utiliser MaskedView
  return (
    <MaskedView
      style={StyleSheet.flatten([style, { flexDirection: 'row' }])}
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={{ flex: 1 }}
      />
    </MaskedView>
  );
}
