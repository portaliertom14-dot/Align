/**
 * Composant Confetti pour effet feu d'artifice
 * Particules colorées projetées depuis un point
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = ['#FF7B2B', '#FFD93F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];

export default function Confetti({ 
  visible = false, 
  position = { x: SCREEN_WIDTH / 2, y: 100 },
  particleCount = 15,
  duration = 800,
  onComplete 
}) {
  const particlesRef = useRef([]);

  useEffect(() => {
    if (!visible) return;

    // Créer les particules
    const particles = Array.from({ length: particleCount }, () => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }));

    particlesRef.current = particles;

    // Animer chaque particule
    const animations = particles.map((particle, index) => {
      const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.5;
      const velocity = 80 + Math.random() * 60;
      const distanceX = Math.cos(angle) * velocity;
      const distanceY = Math.sin(angle) * velocity - 30; // Légèrement vers le haut
      const rotation = Math.random() * 720;

      return Animated.parallel([
        Animated.timing(particle.translateX, {
          toValue: distanceX,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: distanceY,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotate, {
          toValue: rotation,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(duration * 0.7),
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: duration * 0.3,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    Animated.parallel(animations).start(() => {
      if (onComplete) {
        onComplete();
      }
    });
  }, [visible, position, particleCount, duration, onComplete]);

  if (!visible) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', zIndex: 9999 }]}>
      {particlesRef.current.map((particle, index) => {
        const color = COLORS[index % COLORS.length];
        const rotation = particle.rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: position.x,
                top: position.y,
                backgroundColor: color,
                opacity: particle.opacity,
                transform: [
                  { translateX: particle.translateX },
                  { translateY: particle.translateY },
                  { rotate: rotation },
                  { scale: particle.scale },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
