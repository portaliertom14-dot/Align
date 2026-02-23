import React from 'react';
import { Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

const DEFAULT_GRADIENT = ['#FF7B2B', '#FFD93F'];

/**
 * Composant GradientText
 * Affiche du texte avec un dégradé (par défaut #FF7B2B → #FFD93F)
 * Prop colors optionnel : ['#FF7B2B', '#FFB93F'] pour écrans Auth/UserInfo
 */
export default function GradientText({ children, style, colors, numberOfLines, ellipsizeMode }) {
  const [c1, c2] = colors || DEFAULT_GRADIENT;
  const gradCss = `linear-gradient(90deg, ${c1} 0%, ${c2} 100%)`;
  const textProps = { style, numberOfLines, ellipsizeMode };

  if (Platform.OS === 'web') {
    return (
      <Text
        {...textProps}
        style={[
          style,
          {
            backgroundImage: gradCss,
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
      maskElement={<Text {...textProps}>{children}</Text>}
    >
      <LinearGradient
        colors={[c1, c2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={[style, { opacity: 0 }]} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
