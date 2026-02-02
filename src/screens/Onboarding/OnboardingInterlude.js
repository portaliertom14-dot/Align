import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from './onboardingConstants';

const { width } = Dimensions.get('window');

// #region agent log
const LOG = (message, data, hypothesisId) => {
  fetch('http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'OnboardingInterlude.js', message, data: data || {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId }) }).catch(() => {});
};
// #endregion

// Largeur utile du contenu
const CONTENT_WIDTH = Math.min(width * 0.86, 520);
// Titre : plus large pour forcer 2 lignes (ligne 1 + ligne 2 sans césure)
const TITLE_MAX_WIDTH = Math.min(width * 0.95, 900);

// Tailles responsive — texte max 35px, image légèrement réduite pour aération
const TITLE_FONT_SIZE = Math.min(Math.max(width * 0.026, 22), 35);
const IMAGE_SIZE = Math.min(Math.max(width * 0.22, 290), 410) + 70;

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

  useEffect(() => {
    LOG('Interlude mount', { width, CONTENT_WIDTH, TITLE_FONT_SIZE, platform: Platform.OS }, 'H4,H5');
  }, []);

  const handleContinue = () => {
    navigation.navigate('OnboardingDob', { currentStep: 7, totalSteps: 7 });
  };

  const onLayoutTitleWrapper = (e) => {
    const { x, y, width: w, height: h } = e.nativeEvent.layout;
    LOG('titleWrapper layout', { x, y, width: w, height: h }, 'H1,H3,H4');
  };

  const onLayoutTitleLine2 = (e) => {
    const { x, y, width: w, height: h } = e.nativeEvent.layout;
    LOG('titleLine2 layout', { x, y, width: w, height: h }, 'H1,H2');
  };

  const onLayoutContent = (e) => {
    const { width: cw } = e.nativeEvent.layout;
    LOG('content layout', { contentWidth: cw, screenWidth: width }, 'H1,H3');
  };

  // Sur web : un seul bloc Text sur 2 lignes (\n) avec "ALIGN" en nested Text dégradé → 2 lignes fixes, alignement cohérent
  const titleWeb = (
    <Text style={[styles.titleLine1, styles.titleBlockWeb]}>
      ÇA TOMBE BIEN, C'EST EXACTEMENT{'\n'}
      POUR ÇA QU'<Text style={styles.titleGradientWeb}>ALIGN</Text> EXISTE.
    </Text>
  );

  // Sur native : 2 lignes (View + View row) pour garder GradientText (MaskedView)
  const titleNative = (
    <View style={styles.titleWrapper} onLayout={onLayoutTitleWrapper}>
      <Text style={styles.titleLine1}>ÇA TOMBE BIEN, C'EST EXACTEMENT</Text>
      <View style={styles.titleLine2} onLayout={onLayoutTitleLine2}>
        <Text style={styles.titleText}>POUR ÇA QU'</Text>
        <GradientText style={styles.titleText}>ALIGN</GradientText>
        <Text style={styles.titleText}> EXISTE.</Text>
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
      <View style={styles.content} onLayout={onLayoutContent}>
        {/* Titre : 2 lignes max, centré — "ALIGN" en dégradé */}
        {Platform.OS === 'web' ? (
          <View style={styles.titleWrapper}>
            {titleWeb}
          </View>
        ) : (
          titleNative
        )}

        {/* Image étoile thumbs up */}
        <Image
          source={require('../../../assets/images/star-thumbs.png')}
          style={styles.starImage}
          resizeMode="contain"
        />

        {/* Bouton CTA */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>CONTINUER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A1B23',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  titleWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: TITLE_MAX_WIDTH,
    marginTop: 0,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  titleLine1: {
    fontFamily: theme.fonts.title,
    fontSize: TITLE_FONT_SIZE,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: TITLE_FONT_SIZE * 1.08,
    letterSpacing: 0.5,
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
    fontSize: TITLE_FONT_SIZE,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: TITLE_FONT_SIZE * 1.08,
    letterSpacing: 0.5,
  },
  titleBlockWeb: {
    textAlign: 'center',
  },
  titleGradientWeb: {
    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    color: 'transparent',
  },
  starImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BUTTON_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
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
