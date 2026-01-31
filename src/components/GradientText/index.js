import React from 'react';
import { Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

/**
 * Composant GradientText
 * Affiche du texte avec un dégradé #FF7B2B → #FFD93F
 * Sur web : utilise background-clip: text
 * Sur native : utilise MaskedView + LinearGradient
 */
export default function GradientText({ children, style }) {
  if (Platform.OS === 'web') {
    return (
      <Text
        style={[
          style,
          {
            backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          },
        ]}
      >
        {children}
      </Text>
    );
  }

  return (
    <MaskedView
      maskElement={<Text style={style}>{children}</Text>}
    >
      <LinearGradient
        colors={['#FF7B2B', '#FFD93F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
