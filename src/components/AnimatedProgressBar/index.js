import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo, Platform, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// useNativeDriver supporté sur mobile, false sur web pour éviter les warnings
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Composant de barre de progression animée (style Duolingo)
 * Animation fluide avec pulse à l'arrivée
 * Réutilisable pour quiz et modules
 */
function AnimatedProgressBarInternal({ progress, containerWidth, colors }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const scaleYAnim = useRef(new Animated.Value(1)).current;
  const reduceMotionEnabled = useRef(false);
  const animationRef = useRef(null);
  const isInitialized = useRef(false);
  
  // Vérifier si Reduce Motion est activé
  useEffect(() => {
    let cleanup = () => {};
    
    if (Platform.OS === 'web') {
      // Sur web, vérifier la media query
      if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduceMotionEnabled.current = mediaQuery.matches;
        
        const handleChange = (e) => {
          reduceMotionEnabled.current = e.matches;
        };
        
        mediaQuery.addEventListener('change', handleChange);
        cleanup = () => mediaQuery.removeEventListener('change', handleChange);
      }
    } else {
      // Sur mobile, utiliser AccessibilityInfo
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          reduceMotionEnabled.current = enabled;
        })
        .catch(() => {
          // En cas d'erreur, supposer que Reduce Motion n'est pas activé
          reduceMotionEnabled.current = false;
        });
      
      const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
        reduceMotionEnabled.current = enabled;
      });
      
      cleanup = () => subscription?.remove();
    }
    
    return cleanup;
  }, []);

  useEffect(() => {
    // Calculer la largeur cible en pixels
    const targetProgress = Math.max(0, Math.min(progress, 100));
    const targetWidth = (targetProgress / 100) * containerWidth;
    
    if (containerWidth === 0) {
      // Pas encore de largeur, ne rien faire
      return;
    }
    
    // Initialisation : si c'est le premier rendu, définir la valeur instantanément sans animation
    if (!isInitialized.current) {
      widthAnim.setValue(targetWidth);
      isInitialized.current = true;
      return;
    }
    
    if (reduceMotionEnabled.current) {
      // Si Reduce Motion activé : valeur instantanée
      widthAnim.setValue(targetWidth);
      scaleYAnim.setValue(1);
      return;
    }

    // Arrêter l'animation en cours si elle existe
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    
    // Animation principale : largeur (400ms, ease-in-out)
    const mainAnimation = Animated.timing(widthAnim, {
      toValue: targetWidth,
      duration: 400,
      useNativeDriver: false, // width n'est pas supporté par native driver
      // Aligné sur la courbe ease-in-out (équivalent web transition 0.4s)
      easing: Easing.inOut(Easing.ease),
    });

    animationRef.current = mainAnimation;
    
    mainAnimation.start((finished) => {
      if (finished && animationRef.current === mainAnimation) {
        // Animation terminée : pulse (scale Y 1.00 → 1.05 → 1.00)
        Animated.sequence([
          Animated.timing(scaleYAnim, {
            toValue: 1.05,
            duration: 75, // 150ms / 2
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(scaleYAnim, {
            toValue: 1.0,
            duration: 75, // 150ms / 2
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      }
      animationRef.current = null;
    });
    
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [progress, containerWidth]);

  return (
    <Animated.View
      style={[
        styles.progressBarWrapper,
        {
          transform: [{ scaleY: scaleYAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            width: widthAnim,
          },
        ]}
      >
        <LinearGradient
          colors={colors || ['#FF7B2B', '#FF852D', '#FFD93F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.progressBarGradient}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Web : largeur en % + transition CSS (0.4s ease-in-out) pour un rendu fluide dans le navigateur.
 * Natif : AnimatedProgressBarInternal (timing 400ms) inchangé.
 */
function AnimatedProgressBarWeb({
  progress,
  colors = ['#FF7B2B', '#FF852D', '#FFD93F'],
  style,
}) {
  const p = Math.max(0, Math.min(Number(progress) || 0, 100));
  return (
    <View style={[styles.progressContainer, style]}>
      <View
        // transition CSS — demande UX quiz (complémentaire au timing natif)
        style={[
          styles.webProgressFill,
          {
            width: `${p}%`,
            transition: 'width 0.4s ease-in-out',
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.progressBarGradient}
        />
      </View>
    </View>
  );
}

/**
 * Composant AnimatedProgressBar (export principal)
 * Wrapper qui gère la largeur du conteneur
 */
export default function AnimatedProgressBar({
  progress,
  colors = ['#FF7B2B', '#FF852D', '#FFD93F'],
  style,
}) {
  if (Platform.OS === 'web') {
    return <AnimatedProgressBarWeb progress={progress} colors={colors} style={style} />;
  }

  const [containerWidth, setContainerWidth] = useState(0);

  return (
    <View
      style={[styles.progressContainer, style]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      {containerWidth > 0 && (
        <AnimatedProgressBarInternal
          progress={progress}
          containerWidth={containerWidth}
          colors={colors}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
    // Pas de CSS transition - l'animation est gérée par Animated.timing pour cohérence cross-platform
  },
  progressBarWrapper: {
    height: '100%',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    overflow: 'hidden',
  },
  webProgressFill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 3,
  },
  progressBarGradient: {
    height: '100%',
    width: '100%',
    borderRadius: 3,
  },
});
