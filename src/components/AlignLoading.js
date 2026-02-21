import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { theme } from '../styles/theme';
import GradientText from './GradientText';

const BACKGROUND_COLOR = '#1A1B23';
const GRADIENT_START = '#FF7B2B';
const GRADIENT_END = '#FFD93F';
const SUBTITLE_COLOR = '#DADADA';

/**
 * Écran de chargement Align : logo "ALIGN" en dégradé + sous-titre.
 * Full screen, centré, sans animation.
 * Responsive (web + mobile).
 * @param {string} [subtitle] - Texte sous le logo (défaut: "Chargement...")
 */
export default function AlignLoading({ subtitle = 'Chargement...' }) {
  const { width } = useWindowDimensions();

  // Tailles adaptatives : mobile < 400, tablette, web
  const isNarrow = width < 400;
  const isWeb = Platform.OS === 'web';
  const titleFontSize = isNarrow ? 36 : isWeb ? 72 : 56;
  const subtitleFontSize = isNarrow ? 16 : 18;
  const marginTopSubtitle = 16;

  const alignTitleStyle = [
    styles.alignTitle,
    {
      fontSize: titleFontSize,
      lineHeight: titleFontSize * 1.1,
      fontFamily: theme.fonts.title,
    },
  ];

  return (
    <View style={styles.container}>
      <GradientText
        colors={[GRADIENT_START, GRADIENT_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={alignTitleStyle}
      >
        ALIGN
      </GradientText>
      <Text
        style={[
          styles.subtitle,
          {
            fontSize: subtitleFontSize,
            marginTop: marginTopSubtitle,
            fontFamily: theme.fonts.button,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alignTitle: {
    color: '#FFFFFF', // fallback pour MaskedView / gradient
    fontWeight: '400',
  },
  subtitle: {
    color: SUBTITLE_COLOR,
    fontWeight: '900',
  },
});
