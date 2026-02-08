import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { getOnboardingImageTextSizes, isNarrow } from './onboardingConstants';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from './onboardingConstants';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';


// Bouton CONTINUER : même dimensions que Birthdate (partagées)
const { buttonWidth: BUTTON_WIDTH } = getContinueButtonDimensions();

/**
 * ÉCRAN INTERLUDE — "ÇA TOMBE BIEN..."
 * Transition entre les questions et la suite du flow
 * Le mot "ALIGN" est en dégradé #FF7B2B → #FFD93F
 */
export default function OnboardingInterlude() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const textSizes = getOnboardingImageTextSizes(width);
  const TITLE_MAX_WIDTH = Math.min(width * 0.95, width * textSizes.textMaxWidth);
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;

  const handleContinue = () => {
    navigation.navigate('OnboardingDob', { currentStep: 7, totalSteps: 7 });
  };

  const titleTextStyle = { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight };
  // Sur web : un seul bloc Text sur 2 lignes (\n) avec "ALIGN" en nested Text dégradé → 2 lignes fixes, alignement cohérent
  const titleWeb = (
    <Text style={[styles.titleLine1, styles.titleBlockWeb, titleTextStyle]}>
      ÇA TOMBE BIEN, C'EST EXACTEMENT{'\n'}
      POUR ÇA QU'<Text style={[styles.titleGradientWeb, titleTextStyle]}>ALIGN</Text> EXISTE.
    </Text>
  );

  // Sur native : 2 lignes (View + View row) pour garder GradientText (MaskedView)
  const titleNative = (
    <View style={[styles.titleWrapper, { maxWidth: TITLE_MAX_WIDTH }]}>
      <Text style={[styles.titleLine1, titleTextStyle]}>ÇA TOMBE BIEN, C'EST EXACTEMENT</Text>
      <View style={styles.titleLine2}>
        <Text style={[styles.titleText, titleTextStyle]}>POUR ÇA QU'</Text>
        <GradientText style={[styles.titleText, titleTextStyle]}>ALIGN</GradientText>
        <Text style={[styles.titleText, titleTextStyle]}> EXISTE.</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={[styles.content, width >= 1100 && { marginTop: -24 }, isNarrow(width) && { marginTop: -16 }]}>
        {/* Titre : 2 lignes max, centré — "ALIGN" en dégradé */}
        {Platform.OS === 'web' ? (
          <View style={[styles.titleWrapper, { maxWidth: TITLE_MAX_WIDTH }]}>
            {titleWeb}
          </View>
        ) : (
          titleNative
        )}

        {/* Image étoile thumbs up */}
        <Image
          source={require('../../../assets/images/star-thumbs.png')}
          style={[styles.starImage, { width: IMAGE_SIZE, height: IMAGE_SIZE }]}
          resizeMode="contain"
        />

        {/* Bouton CTA */}
        <HoverableTouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.buttonText}>CONTINUER</Text>
        </HoverableTouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1A1B23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  titleWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  titleLine1: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleLine2: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  titleText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleBlockWeb: { textAlign: 'center' },
  titleGradientWeb: {
    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  starImage: {
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BUTTON_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
