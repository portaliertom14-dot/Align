/**
 * Écran de Félicitation pour le Passage au Chapitre Suivant
 * S'affiche uniquement après complétion d'un module qui termine un chapitre
 * Design basé sur l'image de référence
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, BackHandler, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Animated } from 'react-native';
import { theme } from '../../styles/theme';
import Header from '../../components/Header';
import GradientText from '../../components/GradientText';
import Button from '../../components/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Import de l'étoile
const starCharacter = require('../../../assets/images/star-character.png');

export default function ChapterCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { nextChapter } = route.params || {};
  
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [starAnim] = useState(new Animated.Value(0));
  
  // Positions initiales des confettis (calculées une seule fois)
  const [confettiConfigs] = useState(() => 
    Array.from({ length: 20 }, () => ({
      startX: Math.random() * SCREEN_WIDTH,
      endX: (Math.random() - 0.5) * 200,
      rotation: Math.random() * 720,
      duration: 2000 + Math.random() * 1000,
    }))
  );
  
  // Animations pour les confettis (20 particules)
  const confettiAnims = useState(
    Array.from({ length: 20 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  )[0];

  useEffect(() => {
    // Empêcher le retour en arrière
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });

    // Animation d'entrée de l'étoile (sans rotation)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(starAnim, {
          toValue: 1,
          tension: 30,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Animation des confettis projetés (commence après l'étoile)
    const confettiAnimations = confettiAnims.map((anim, index) => {
      const delay = 400 + (index * 50); // Délai progressif pour chaque confetti
      const config = confettiConfigs[index];
      const endY = SCREEN_HEIGHT + 100; // Tombe en bas de l'écran

      return Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(anim.opacity, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateY, {
            toValue: endY,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: config.endX,
            duration: config.duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: config.rotation,
            duration: config.duration,
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Lancer toutes les animations de confettis
    Animated.parallel(confettiAnimations).start();

    return () => {
      backHandler.remove();
    };
  }, []);

  const handleContinue = () => {
    navigation.navigate('Main', { screen: 'Feed' });
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />
      
      {/* Confettis projetés (particules qui tombent) */}
      {confettiAnims.map((anim, index) => {
        const colors = ['#FF7B2B', '#FFD93F', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
        const color = colors[index % colors.length];
        const config = confettiConfigs[index];
        
        const rotation = anim.rotate.interpolate({
          inputRange: [0, 720],
          outputRange: ['0deg', '720deg'],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.confettiParticle,
              {
                left: config.startX,
                backgroundColor: color,
                opacity: anim.opacity,
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  { rotate: rotation },
                ],
              },
            ]}
          />
        );
      })}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Étoile (sans rotation) */}
        <Animated.View
          style={[
            styles.starContainer,
            {
              opacity: starAnim,
              transform: [
                {
                  scale: starAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={starCharacter}
            style={styles.starImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Message de félicitation */}
        <View style={styles.textContainer}>
          <Text style={styles.mainText}>
            TU ES PASSÉ AU{' '}
            <GradientText
              colors={['#FF7B2B', '#FFD93F']}
              style={styles.chapterText}
              gradientDirection="horizontal"
            >
              CHAPITRE {nextChapter || '2'}!
            </GradientText>
          </Text>
          <Text style={styles.subText}>
            CONTINUE COMME ÇA TU ES SUR LE CHEMIN DE LA REUSSITE.
          </Text>
        </View>

        {/* Bouton continuer */}
        <View style={styles.buttonContainer}>
          <Button
            title="CONTINUER"
            onPress={handleContinue}
            variant="primary"
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 60,
  },
  starContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starImage: {
    width: 280,
    height: 280,
  },
  confettiParticle: {
    position: 'absolute',
    top: -50,
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    marginTop: 75,
    paddingHorizontal: 20,
  },
  mainText: {
    fontSize: 36,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 44,
  },
  chapterText: {
    fontSize: 36,
    fontFamily: theme.fonts.title, // Bowlby One SC
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 20,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    opacity: 0.9,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
    marginTop: 'auto',
    marginBottom: 40,
  },
});
