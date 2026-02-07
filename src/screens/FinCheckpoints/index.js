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
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { getOnboardingImageTextSizes, isNarrow } from '../Onboarding/onboardingConstants';
import { useNavigation } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

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
  const { width } = useWindowDimensions();
  const textSizes = getOnboardingImageTextSizes(width);
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;

  const handleGo = () => {
    navigation.replace('ChargementRoutine');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, width >= 1100 && { marginTop: -24 }, isNarrow(width) && { marginTop: -16 }]}>
        {/* Titre principal — 2 lignes, Bowlby One SC, blanc, taille = grands titres onboarding */}
        <View style={[styles.titleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
          <Text style={[styles.mainTitle, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>
            {MAIN_LINE_1}
            {'\n'}
            {MAIN_LINE_2}
          </Text>
        </View>

        {/* Texte secondaire — Nunito Black, dégradé #FF7B2B → #FFD93F, centré, taille inférieure */}
        <View style={[styles.subtitleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.subtitle,
                { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight },
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
                <Text style={[styles.subtitle, styles.gradientText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{SUBTITLE}</Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientContainer}
              >
                <Text style={[styles.subtitle, styles.transparentText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{SUBTITLE}</Text>
              </LinearGradient>
            </MaskedView>
          )}
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={[styles.illustration, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
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
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1B23',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitleContainer: {
    marginTop: 6,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    textAlign: 'center',
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
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
