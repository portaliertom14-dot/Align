import React from 'react';
import { Text, StyleSheet, Platform, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

/**
 * Composant pour texte avec dégradé
 * Sur web : utilise CSS background-clip pour vrai dégradé de texte
 * Sur mobile : utilise une couleur intermédiaire proche du dégradé
 */
export default function GradientText({ 
  children, 
  style, 
  colors = ['#FFD93F', '#FF7B2B'],
  ...props 
}) {
  // Sur web, on utilise CSS pour un vrai dégradé de texte
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            background: `linear-gradient(to right, ${colors.join(', ')})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
          },
        ]}
        {...props}
      >
        {children}
      </Text>
    );
  }

  // Sur mobile, utiliser une couleur proche du dégradé (orange moyen)
  // Pour un vrai dégradé sur mobile, il faudrait utiliser react-native-svg ou masked-view
  const middleColor = '#FF9520'; // Couleur moyenne entre #FFD93F et #FF7B2B
  
  return (
    <Text
      style={[style, { color: middleColor }]}
      {...props}
    >
      {children}
    </Text>
  );
}







