/**
 * Animation d'entrée standard pour les écrans
 * À l'apparition : opacity 0→1, translateY +12px→0, 280ms, easeOut
 * Jouée UNE seule fois par montage. Pas de transition de navigation.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const DURATION_MS = 280;
const EASING = Easing.bezier(0.22, 1, 0.36, 1); // easeOut
const ENTRANCE_OFFSET_Y = 12;

/**
 * Hook : retourne les styles animés pour le conteneur principal.
 * À appeler une fois par écran, puis passer le style au conteneur de contenu.
 */
export function useScreenEntrance() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(ENTRANCE_OFFSET_Y)).current;
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_MS,
        easing: EASING,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_MS,
        easing: EASING,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const containerStyle = {
    opacity,
    transform: [{ translateY }],
  };

  return { containerStyle };
}

/**
 * Wrapper : enveloppe le contenu dans un Animated.View avec l'animation d'entrée.
 * Usage : <ScreenEntranceAnimation style={...}>{children}</ScreenEntranceAnimation>
 */
export default function ScreenEntranceAnimation({ children, style }) {
  const { containerStyle } = useScreenEntrance();

  return (
    <Animated.View style={[styles.container, style, containerStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

/**
 * HOC : applique l'animation d'entrée à n'importe quel écran.
 * À utiliser au niveau du navigateur pour que chaque changement d'écran déclenche l'animation.
 */
export function withScreenEntrance(Component) {
  function WrappedScreen(props) {
    return (
      <ScreenEntranceAnimation style={styles.container}>
        <Component {...props} />
      </ScreenEntranceAnimation>
    );
  }
  WrappedScreen.displayName = `WithScreenEntrance(${Component.displayName || Component.name || 'Screen'})`;
  return WrappedScreen;
}
