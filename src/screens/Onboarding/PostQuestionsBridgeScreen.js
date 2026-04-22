import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { theme } from '../../styles/theme';
import useStableViewport from '../../hooks/useStableViewport';
import {
  BRIDGE_VISUAL_REVEAL_MS,
  computePostQuestionsBridgeLayout,
} from './postQuestionsBridgeLayout';

/**
 * Écran intermédiaire affiché juste après les 6 questions.
 * Il rassure l'utilisateur avant la création de compte.
 */
export default function PostQuestionsBridgeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useStableViewport();
  const [isVisualReady, setIsVisualReady] = useState(false);
  const mountedRef = useRef(true);

  const {
    isSmallScreen,
    imageSize,
    buttonWidth,
    topSpacing,
    bottomSpacing,
    buttonBottomSpacing,
    titleFontSize,
    titleLineHeight,
    middlePadding,
  } = computePostQuestionsBridgeLayout({
    width,
    height,
    insetTop: insets.top,
    insetBottom: insets.bottom,
  });

  const markVisualReady = useCallback(() => {
    if (mountedRef.current) setIsVisualReady(true);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isVisualReady) return undefined;
    const timer = setTimeout(markVisualReady, BRIDGE_VISUAL_REVEAL_MS);
    return () => clearTimeout(timer);
  }, [isVisualReady, markVisualReady]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => {
          if (navigation.canGoBack()) navigation.goBack();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>

      <View style={[styles.content, !isVisualReady && styles.hiddenContent]}>
        <View style={[styles.topBlock, { marginTop: topSpacing }]}>
          <Text style={[styles.title, styles.titleParagraph, { fontSize: titleFontSize, lineHeight: titleLineHeight }]}>
            ÇA TOMBE BIEN, C&apos;EST EXACTEMENT POUR ÇA QU&apos;
            <Text style={[styles.title, styles.alignWord, Platform.OS === 'web' ? styles.alignWordWeb : styles.alignWordNative]}>
              ALIGN
            </Text>{' '}
            EXISTE.
          </Text>
        </View>

        <View style={[styles.middleBlock, { paddingVertical: middlePadding }]}>
        <Image
          source={require('../../../assets/images/onboarding/star-thumbs.png')}
          style={[styles.illustration, { width: imageSize, height: imageSize }]}
          resizeMode="contain"
          onLoadEnd={markVisualReady}
          onError={markVisualReady}
        />
        </View>

        <View style={[styles.bottomBlock, { marginBottom: buttonBottomSpacing }]}>
        <HoverableTouchableOpacity
          style={[styles.button, { width: buttonWidth }]}
          onPress={() => navigation.replace('Onboarding', { step: 1 })}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>CONTINUER</Text>
        </HoverableTouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1B23',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    width: '100%',
  },
  hiddenContent: {
    opacity: 0,
  },
  topBlock: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: 'BowlbyOneSC_400Regular' }),
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  titleParagraph: {
    width: '100%',
    maxWidth: 860,
    paddingHorizontal: 8,
  },
  alignWord: {
    textAlign: 'center',
  },
  alignWordWeb: {
    backgroundImage: 'linear-gradient(90deg, #FFD93F 0%, #FF7B2B 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  alignWordNative: {
    color: '#FFB43A',
  },
  middleBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBlock: {
    width: '100%',
    alignItems: 'center',
  },
  illustration: {
    marginVertical: 0,
  },
  button: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...theme.buttonTextNoWrap,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
