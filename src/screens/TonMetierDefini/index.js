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
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';


/**
 * Image : à placer manuellement dans assets/onboarding/metier_defini.png
 */
const IMAGE_SOURCE = require('../../../assets/onboarding/metier_defini.png');

/**
 * Écran "Ton métier défini"
 * Affiché après le résultat du quiz métier (PropositionMetier).
 * Header avec nom du métier en dégradé, texte secondaire, image, bouton "COMMENCER LA VÉRIFICATION".
 */
export default function TonMetierDefiniScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const textSizes = getOnboardingImageTextSizes(width);
  const metierName = (route.params?.metierName || 'TRADER').toString().toUpperCase().trim();
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
  const BTN_WIDTH = Math.min(width * 0.76, 400);

  const headerPrefix = "TON MÉTIER DÉFINI EST DONC ";
  const subtitleText =
    "Mais avant de commencer ton chemin vers l'atteinte de cet objectif, on va d'abord vérifier si ce métier te correspond vraiment.";

  const handleStart = () => {
    navigation.replace('CheckpointsValidation');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.content, width >= 1100 && { marginTop: -24 }, isNarrow(width) && { marginTop: -16 }]}>
        {/* Titre : préfixe blanc ; nom du métier dégradé #FF7B2B → #FFD93F */}
        <View style={[styles.titleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{headerPrefix}</Text>
              {Platform.OS === 'web' ? (
              <Text
                style={[
                  styles.titleMetier,
                  {
                    fontSize: textSizes.titleFontSize,
                    lineHeight: textSizes.titleLineHeight,
                    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {metierName}
              </Text>
            ) : (
                <MaskedView
                maskElement={<Text style={[styles.titleMetier, styles.gradientText, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{metierName}</Text>}
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.titleMetier, styles.transparentText, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>{metierName}</Text>
                </LinearGradient>
              </MaskedView>
            )}
            </View>
          </View>

          {/* Texte secondaire — dégradé #FF7B2B → #FFD93F, centré, largeur maîtrisée */}
          <View style={[styles.subtitleContainer, { maxWidth: width * textSizes.textMaxWidth }]}>
            {Platform.OS === 'web' ? (
              <Text
              style={[
                styles.subtitle,
                {
                  fontSize: textSizes.subtitleFontSize,
                  lineHeight: textSizes.subtitleLineHeight,
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {subtitleText}
              </Text>
            ) : (
              <MaskedView
                maskElement={
                  <Text style={[styles.subtitle, styles.gradientText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{subtitleText}</Text>
                }
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.subtitle, styles.transparentText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>{subtitleText}</Text>
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
          style={[styles.button, { width: BTN_WIDTH }]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>COMMENCER LA VÉRIFICATION</Text>
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
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  titleMetier: {
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  subtitleContainer: {
    marginTop: 6,
    marginBottom: 0,
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
    ...theme.buttonTextNoWrap,
  },
});
