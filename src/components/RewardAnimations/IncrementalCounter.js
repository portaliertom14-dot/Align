import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo, Platform } from 'react-native';

// useNativeDriver supporté sur mobile, false sur web pour éviter les warnings
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Compteur incrémental avec animation de scale à chaque incrément
 * Style Duolingo : chiffres qui montent progressivement
 */
export default function IncrementalCounter({
  value = 0,
  duration = 2000,
  onComplete,
  style,
  textStyle,
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reduceMotionEnabled = useRef(false);
  const intervalRef = useRef(null);
  const animationRef = useRef(null);

  // Vérifier Reduce Motion
  useEffect(() => {
    let cleanup = () => {};
    
    if (Platform.OS === 'web') {
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
      AccessibilityInfo.isReduceMotionEnabled()
        .then((enabled) => {
          reduceMotionEnabled.current = enabled;
        })
        .catch(() => {
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
    const startValue = displayValue;
    const endValue = value;
    const delta = endValue - startValue;

    console.log('[IncrementalCounter] Animation - startValue:', startValue, 'endValue:', endValue, 'delta:', delta);

    if (delta === 0) {
      return;
    }

    // Si Reduce Motion activé, mettre à jour instantanément
    if (reduceMotionEnabled.current) {
      console.log('[IncrementalCounter] Reduce Motion activé, mise à jour instantanée');
      setDisplayValue(endValue);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    // Nettoyer l'intervalle précédent
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Calculer le nombre d'incréments
    const incrementCount = Math.abs(delta);
    if (incrementCount === 0) {
      return;
    }

    // Style "machine à sous" : rapide mais visible
    // Durée fixe par incrément : 60-80ms pour être rapide mais visible
    const stepDuration = Math.max(60, Math.min(80, duration / incrementCount)); // Entre 60ms et 80ms par chiffre

    let currentStep = 0;
    const step = delta > 0 ? 1 : -1;

    const animateStep = () => {
      if (currentStep >= incrementCount) {
        // Animation finale : pulse plus marqué
        const finalPulse = Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.12,
            duration: 100,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 100,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]);

        animationRef.current = finalPulse;
        finalPulse.start(() => {
          animationRef.current = null;
          if (onComplete) {
            onComplete();
          }
        });

        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      // Incrémenter la valeur
      setDisplayValue((prev) => {
        const newValue = prev + step;
        currentStep++;

        // Animation de scale à chaque incrément
        const stepPulse = Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.08,
            duration: 50,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1.0,
            duration: 50,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]);

        if (animationRef.current) {
          animationRef.current.stop();
        }
        animationRef.current = stepPulse;
        stepPulse.start();

        return newValue;
      });
    };

    // Démarrer l'animation avec durée fixe (style machine à sous)
    intervalRef.current = setInterval(animateStep, stepDuration);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
    };
  }, [value, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={textStyle}>{displayValue}</Text>
    </Animated.View>
  );
}
