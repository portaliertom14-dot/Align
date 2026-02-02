import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const BTN_WIDTH = Math.min(width * 0.76, 400);

/**
 * ÉCRAN 1 — ÉCRAN D'ACCUEIL (ENTRY / INDEX)
 * 
 * Premier écran de l'application Align.
 * Design : Dégradé orange vertical avec logo étoile, texte principal et bouton CTA.
 * Navigation : COMMENCER → vers ChoiceScreen (écran 2)
 * 
 * STRICTEMENT CONFORME À LA MAQUETTE FOURNIE
 */
export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    navigation.navigate('Choice');
  };

  return (
    <LinearGradient
      colors={['#FF7B2B', '#FF9B35', '#FFBC3F', '#FFD93F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        {/* Logo Align avec étoile en arrière-plan */}
        <View style={styles.logoContainer}>
          {/* Étoile en arrière-plan avec opacité 50% */}
          <Image
            source={require('../../../assets/icons/star.png')}
            style={styles.starImage}
            resizeMode="contain"
          />
          {/* Texte ALIGN au premier plan */}
          <Text style={styles.logoText}>ALIGN</Text>
        </View>

        {/* Texte principal */}
        <Text style={styles.mainText}>
          TROUVE LA VOIE QUI TE CORRESPOND VRAIMENT
        </Text>

        {/* Bouton principal */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>COMMENCER</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 32,
  },
  logoContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height * 0.08, // Espacement confortable
    width: width * 0.65,
    height: width * 0.65,
    maxWidth: 400,
    maxHeight: 400,
  },
  starImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.5, // Opacité 50% comme spécifié
  },
  logoText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: Math.min(width * 0.18, 80), // Responsive
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    letterSpacing: 2,
  },
  mainText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: Math.min(width * 0.055, 24), // Responsive
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: height * 0.06,
    paddingHorizontal: 16,
    lineHeight: Math.min(width * 0.075, 34),
    opacity: 1, // Opacité 100% comme spécifié
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
