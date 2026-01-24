import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// useNativeDriver supporté sur mobile, false sur web pour éviter les warnings
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Fonction easing cubic-bezier(0.25, 1.0, 0.5, 1.0)
 * Ease-out prononcé pour animation fluide et organique
 */
const cubicBezierEasing = (t) => {
  // cubic-bezier(0.25, 1.0, 0.5, 1.0)
  // Points de contrôle : (0.25, 1.0) et (0.5, 1.0)
  const c1x = 0.25;
  const c1y = 1.0;
  const c2x = 0.5;
  const c2y = 1.0;
  
  // Formule de Bézier cubique
  return (
    Math.pow(1 - t, 3) * 0 +
    3 * Math.pow(1 - t, 2) * t * c1y +
    3 * (1 - t) * Math.pow(t, 2) * c2y +
    Math.pow(t, 3) * 1
  );
};

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
    
    // Animation principale : largeur (400ms, ease-out avec cubic-bezier)
    const mainAnimation = Animated.timing(widthAnim, {
      toValue: targetWidth,
      duration: 400,
      useNativeDriver: false, // width n'est pas supporté par native driver
      easing: cubicBezierEasing,
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
 * Composant AnimatedProgressBar (export principal)
 * Wrapper qui gère la largeur du conteneur
 */
export default function AnimatedProgressBar({ 
  progress, 
  colors = ['#FF7B2B', '#FF852D', '#FFD93F'],
  style 
}) {
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
    // Pas de CSS transition - évite le conflit avec Animated.timing sur web
  },
  progressBarGradient: {
    height: '100%',
    width: '100%',
    borderRadius: 3,
  },
});
