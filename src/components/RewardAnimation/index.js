/**
 * Composant d'animation de récompenses
 * Affiche une animation fluide avec message de félicitations, étoiles et XP
 * UX finalisée — prête pour branchement IA ultérieur
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

export default function RewardAnimation({ 
  visible = false, 
  stars = 0, 
  xp = 0,
  onAnimationComplete 
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const starsAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'entrée
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(starsAnim, {
          toValue: stars,
          duration: 1000,
          delay: 300,
          useNativeDriver: false,
        }),
        Animated.timing(xpAnim, {
          toValue: xp,
          duration: 1000,
          delay: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Après l'animation, attendre 2 secondes puis appeler le callback
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 2000);
      });
    } else {
      // Reset des animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
      starsAnim.setValue(0);
      xpAnim.setValue(0);
    }
  }, [visible, stars, xp]);

  if (!visible) return null;

  const animatedStars = starsAnim.interpolate({
    inputRange: [0, stars],
    outputRange: [0, stars],
  });

  const animatedXP = xpAnim.interpolate({
    inputRange: [0, xp],
    outputRange: [0, xp],
  });

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={['#FF7B2B', '#FF9F32', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <Text style={styles.congratulations}>🎉 FÉLICITATIONS ! 🎉</Text>
            <Text style={styles.rewardsTitle}>RÉCOMPENSES</Text>
            
            <View style={styles.rewardsContainer}>
              {stars > 0 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardIcon}>⭐</Text>
                  <Animated.Text style={styles.rewardText}>
                    +{Math.round(animatedStars)} étoiles
                  </Animated.Text>
                </View>
              )}
              
              {xp > 0 && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardIcon}>⚡</Text>
                  <Animated.Text style={styles.rewardText}>
                    +{Math.round(animatedXP)} XP
                  </Animated.Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    width: '80%',
    maxWidth: 400,
  },
  content: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    padding: 32,
    alignItems: 'center',
  },
  congratulations: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rewardsTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 24,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  rewardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  rewardText: {
    fontSize: 24,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});





