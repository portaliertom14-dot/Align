/**
 * Écran intermédiaire après résultat secteur, avant quiz métier.
 * Flow : ResultatSecteur → InterludeSecteur → QuizMetier.
 * Contenu : phrase avec secteur en dégradé, image, bouton C'EST PARTI !
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
import { isNarrow, getOnboardingImageTextSizes } from '../Onboarding/onboardingConstants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';

const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

/**
 * Illustration Résultat secteur (différente de l’étoile + loupe réservée au Résultat métier).
 * Ancienne image secteur : assets/images/star-sector-intro.png
 */
const IMAGE_SOURCE = require('../../../assets/images/star-sector-intro.png');

const W_LG = 1100;

export default function InterludeSecteurScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const sectorName = (route.params?.sectorName || 'Tech').toString().trim();
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
  const textSizes = getOnboardingImageTextSizes(width);
  const titleStyle = {
    fontSize: textSizes.titleFontSize,
    lineHeight: textSizes.titleLineHeight,
  };
  // 1100px cap (vs 900 sur autres écrans) pour que L1 avec secteur long (ex. "DE LA FINANCE") tienne sur une ligne
  const titleMaxWidth = Math.min(width * 0.92, 1100);

  const handleGo = () => {
    navigation.replace('QuizMetier');
  };

  const sectorStyle = Platform.OS === 'web'
    ? [styles.sectorInline, titleStyle, {
        display: 'inline',
        backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        color: 'transparent',
      }]
    : [styles.sectorInline, titleStyle, { color: '#FF7B2B' }];

  return (
    <View style={styles.container}>
      <View style={[styles.content, width >= W_LG && { marginTop: -24 }, isNarrow(width) && { marginTop: -16 }]}>
        <View style={[styles.titleWrapper, { maxWidth: titleMaxWidth }]}>
          <Text style={[styles.interludeTitle, titleStyle]}>
            GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR{' '}
            <Text style={sectorStyle}>{sectorName}</Text>
            {' '}
            ON VA PRÉCISER UN MÉTIER QUI POURRAIT TE CORRESPONDRE.
          </Text>
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={[styles.illustration, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
          resizeMode="contain"
        />

        <HoverableTouchableOpacity
          style={styles.button}
          onPress={handleGo}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>C'EST PARTI !</Text>
        </HoverableTouchableOpacity>
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
  titleWrapper: {
    marginBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interludeTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    ...(Platform.OS === 'web' ? { overflowWrap: 'anywhere', textWrap: 'balance' } : {}),
  },
  sectorInline: {
    fontFamily: theme.fonts.title,
    textTransform: 'uppercase',
  },
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
    ...theme.buttonTextNoWrap,
  },
});
