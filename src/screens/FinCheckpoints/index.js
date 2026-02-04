/**
 * Écran 1 — Fin des checkpoints (écran de transition)
 * Félicitations + transition vers les modules.
 * Contenu : titre 2 lignes, texte secondaire dégradé, image, bouton "C'EST PARTI !".
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

/**
 * Image : à placer manuellement dans assets/onboarding/checkpoints_complete.png
 */
const IMAGE_SOURCE = require('../../../assets/onboarding/checkpoints_complete.png');

const MAIN_LINE_1 = 'BRAVO TU AS TERMINÉ TOUS LES CHECKPOINTS !';
const MAIN_LINE_2 = 'TON PROJET EST DONC VERROUILLÉ';
const SUBTITLE =
  "On va maintenant commencer les modules\npour te faire avancer vers ce projet !";

export default function FinCheckpointsScreen() {
  const navigation = useNavigation();

  const handleGo = () => {
    navigation.replace('ChargementRoutine');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Titre principal — 2 lignes, Bowlby One SC, blanc, taille = grands titres onboarding */}
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>
            {MAIN_LINE_1}
            {'\n'}
            {MAIN_LINE_2}
          </Text>
        </View>

        {/* Texte secondaire — Nunito Black, dégradé #FF7B2B → #FFD93F, centré, taille inférieure */}
        <View style={styles.subtitleContainer}>
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.subtitle,
                {
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                },
              ]}
            >
              {SUBTITLE}
            </Text>
          ) : (
            <MaskedView
              maskElement={
                <Text style={[styles.subtitle, styles.gradientText]}>{SUBTITLE}</Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientContainer}
              >
                <Text style={[styles.subtitle, styles.transparentText]}>{SUBTITLE}</Text>
              </LinearGradient>
            </MaskedView>
          )}
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={styles.illustration}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleGo}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>C'EST PARTI !</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    maxWidth: width * 0.92,
  },
  mainTitle: {
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
  },
  subtitleContainer: {
    marginTop: 6,
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: width * 0.9,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.015, 15), 20),
    textAlign: 'center',
    lineHeight: Math.min(Math.max(width * 0.02, 20), 30),
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginVertical: 16,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
