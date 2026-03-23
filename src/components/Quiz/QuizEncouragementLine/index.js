import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const FADE_IN_MS = 400;
const FADE_OUT_MS = 400;

/** Hauteur réservée en permanence sous la barre — aucun décalage du contenu en dessous. */
const SLOT_HEIGHT = 34;

const fontNunitoBold = Platform.select({
  web: 'Nunito, sans-serif',
  default: 'Nunito_700Bold',
});

/**
 * Ligne discrète sous la barre de progression : texte en dégradé #FF7B2B → #FFD93F,
 * Nunito Bold, fade in + fade out. Zone à hauteur fixe pour ne pas faire bouger les réponses.
 */
export default function QuizEncouragementLine({ message, animationKey }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  useEffect(() => {
    if (!message) {
      opacity.setValue(0);
      return undefined;
    }

    if (animRef.current) {
      animRef.current.stop();
    }

    opacity.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }),
    ]);
    animRef.current = seq;
    seq.start(({ finished }) => {
      if (finished) animRef.current = null;
    });

    return () => {
      if (animRef.current) {
        animRef.current.stop();
        animRef.current = null;
      }
    };
  }, [message, animationKey, opacity]);

  return (
    <View style={styles.slot} pointerEvents="none">
      {message ? (
        <Animated.View style={[styles.wrap, { opacity }]} pointerEvents="none">
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.textBase,
                {
                  fontFamily: fontNunitoBold,
                  fontWeight: '700',
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                },
              ]}
            >
              {message}
            </Text>
          ) : (
            <MaskedView
              style={styles.masked}
              maskElement={
                <Text style={[styles.textBase, { fontFamily: fontNunitoBold }]}>{message}</Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientFill}
              >
                <Text style={[styles.textBase, styles.textTransparent, { fontFamily: fontNunitoBold }]}>
                  {message}
                </Text>
              </LinearGradient>
            </MaskedView>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: SLOT_HEIGHT,
    marginTop: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  masked: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: '100%',
  },
  gradientFill: {
    flexShrink: 1,
    minHeight: 22,
    justifyContent: 'center',
  },
  textBase: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: '100%',
  },
  textTransparent: {
    opacity: 0,
  },
});
