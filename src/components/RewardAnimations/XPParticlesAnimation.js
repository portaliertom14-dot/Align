import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Image, AccessibilityInfo, Platform } from 'react-native';

const xpIcon = require('../../../assets/icons/xp.png');

/**
 * Animation de particules XP qui voyagent vers la barre XP globale
 * Style Duolingo : particules qui suivent une courbe vers la destination
 */
export default function XPParticlesAnimation({
  visible = false,
  xpAmount = 0,
  startPosition = { x: 0, y: 0 },
  endPosition = { x: 0, y: 0 },
  onComplete,
  onParticlesArrived,
}) {
  const [particles, setParticles] = useState([]);
  const reduceMotionEnabled = useRef(false);
  const animationRefs = useRef([]);

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
    if (!visible || xpAmount <= 0) {
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    if (reduceMotionEnabled.current) {
      // Si Reduce Motion, appeler onParticlesArrived immédiatement
      if (onParticlesArrived) {
        onParticlesArrived();
      }
      if (onComplete) {
        onComplete();
      }
      return;
    }
    
    // Vérifier que les positions sont valides
    if (startPosition.x === 0 && startPosition.y === 0) {
      console.warn('[XPParticlesAnimation] Position de départ invalide, utilisation de positions par défaut');
      // Utiliser des positions par défaut (centre de l'écran)
      startPosition.x = 200;
      startPosition.y = 400;
    }
    
    if (endPosition.x === 0 && endPosition.y === 0) {
      console.warn('[XPParticlesAnimation] Position d\'arrivée invalide, utilisation de positions par défaut');
      // Utiliser des positions par défaut (haut de l'écran)
      endPosition.x = 200;
      endPosition.y = 100;
    }

    // Créer 5-10 particules selon la quantité d'XP
    const particleCount = Math.min(Math.max(Math.floor(xpAmount / 10), 5), 10);
    const newParticles = [];
    
    // useNativeDriver: false sur web pour éviter le warning (transform supporté mais module natif manquant)
    const useNative = Platform.OS !== 'web';

    for (let i = 0; i < particleCount; i++) {
      const translateX = new Animated.Value(0);
      const translateY = new Animated.Value(0);
      const opacity = new Animated.Value(1);
      const scale = new Animated.Value(1);

      // Calculer une trajectoire courbe (bezier simplifiée)
      // Variation aléatoire légère pour chaque particule
      const randomOffset = (Math.random() - 0.5) * 40; // Variation de ±20px
      const deltaX = endPosition.x - startPosition.x;
      const deltaY = endPosition.y - startPosition.y;
      
      // Pour créer un arc, on ajoute un déplacement vertical supplémentaire au milieu
      const arcHeight = -60; // Hauteur de l'arc vers le haut
      const midYOffset = arcHeight + randomOffset * 0.5;

      // Animation de déplacement avec courbe
      const duration = 600 + Math.random() * 200; // 600-800ms
      const delay = i * 50 + Math.random() * 30; // Stagger 50-80ms

      // Animation en deux phases pour créer l'arc
      const pathAnimation = Animated.sequence([
        // Phase 1 : monter (vers le milieu)
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: deltaX * 0.5,
            duration: duration * 0.5,
            delay: delay,
            useNativeDriver: useNative,
          }),
          Animated.timing(translateY, {
            toValue: deltaY * 0.5 + midYOffset,
            duration: duration * 0.5,
            delay: delay,
            useNativeDriver: useNative,
          }),
        ]),
        // Phase 2 : descendre (vers la destination)
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: deltaX,
            duration: duration * 0.5,
            useNativeDriver: useNative,
          }),
          Animated.timing(translateY, {
            toValue: deltaY,
            duration: duration * 0.5,
            useNativeDriver: useNative,
          }),
        ]),
      ]);

      // Animation de fade et scale en fin de trajet
      const fadeAndScaleAnimation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 200,
          delay: duration - 200,
          useNativeDriver: useNative,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 200,
          delay: duration - 200,
          useNativeDriver: useNative,
        }),
      ]);

      const animation = Animated.parallel([pathAnimation, fadeAndScaleAnimation]);

      animation.start(() => {
        // Toutes les particules sont arrivées
        if (i === particleCount - 1 && onParticlesArrived) {
          onParticlesArrived();
        }
        if (i === particleCount - 1 && onComplete) {
          setTimeout(() => {
            onComplete();
          }, 100);
        }
      });

      animationRefs.current.push(animation);

      newParticles.push({
        id: i,
        translateX,
        translateY,
        opacity,
        scale,
      });
    }

    setParticles(newParticles);

    return () => {
      // Nettoyer les animations
      animationRefs.current.forEach(anim => anim.stop());
      animationRefs.current = [];
    };
  }, [visible, xpAmount, startPosition, endPosition]);

  if (!visible || reduceMotionEnabled.current || particles.length === 0) {
    return null;
  }

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {particles.map((particle) => (
        <Animated.View
          key={particle.id}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          <Image source={xpIcon} style={styles.particleIcon} resizeMode="contain" />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particleIcon: {
    width: 24,
    height: 24,
  },
});
