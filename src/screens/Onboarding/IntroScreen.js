import React from 'react';
import { View, StyleSheet, Text, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import de l'image star.png
const starIcon = require('../../../assets/icons/star.png');

/**
 * Écran de Bienvenue - Après onboarding
 * Structure impactante avec hiérarchie visuelle forte :
 * 1. Logo étoile agrandi avec "ALIGN" intégré au centre
 * 2. Texte principal lisible et affirmé
 * 3. Bouton large et premium
 */
export default function IntroScreen({ onNext }) {
  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
      locations={[0, 1]} // Accentuer le contraste
    >
      <View style={styles.content}>
        {/* Logo étoile avec ALIGN intégré au centre */}
        <View style={styles.starContainer}>
        <Image 
          source={starIcon} 
          style={styles.starImage} 
          resizeMode="contain" 
        />
          <Text style={styles.starAlignText}>
            ALIGN
          </Text>
        </View>

        {/* Slogan principal */}
        <View style={styles.sloganContainer}>
          <Text style={styles.sloganText}>
            TROUVEZ LA VOIE QUI VOUS CORRESPOND{' '}
            <GradientText colors={['#FF9900', '#C83D01']} style={styles.sloganHighlight}>
              VRAIMENT
            </GradientText>
          </Text>
        </View>

        {/* Bouton CTA large et premium */}
        <HoverableTouchableOpacity
          style={styles.button}
          onPress={onNext}
          activeOpacity={0.8}
          variant="button"
        >
          <LinearGradient
            colors={theme.colors.gradient.buttonOrange}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>COMMENCER</Text>
          </LinearGradient>
        </HoverableTouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  starContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 20,
    width: SCREEN_WIDTH > 0 ? Math.min(SCREEN_WIDTH * 0.5, 420) : 420,
    height: SCREEN_WIDTH > 0 ? Math.min(SCREEN_WIDTH * 0.5, 420) : 420,
    maxWidth: 420,
    maxHeight: 420,
  },
  starImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  starAlignText: {
    position: 'absolute',
    fontSize: 52, // Réduit proportionnellement (64 * 0.81)
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    zIndex: 1,
  },
  sloganContainer: {
    alignItems: 'center',
    marginBottom: 36,
    paddingHorizontal: 16,
    width: '100%',
  },
  sloganText: {
    fontSize: 30,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1.5,
    lineHeight: 36,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sloganHighlight: {
    fontFamily: theme.fonts.title, // Bowlby One SC
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  button: {
    width: '85%', // Même taille que les boutons sur les écrans de récompenses
    maxWidth: 400,
    height: 56,
    borderRadius: 28, // Full pill (border-radius = height / 2)
    overflow: 'hidden',
    marginTop: 115, // Baisser le bouton de 40px supplémentaires (75 + 40)
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  buttonText: {
    fontSize: 18, // Réduit proportionnellement (20 * 0.9)
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
