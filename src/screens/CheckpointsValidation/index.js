import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions, getOnboardingImageTextSizes, isNarrow } from '../Onboarding/onboardingConstants';
import StandardHeader from '../../components/StandardHeader';

const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONNECTOR_HEIGHT = 12;

/**
 * Écran "Checkpoints de validation"
 * Affiché après "Ton métier défini".
 * Texte principal, 3 cercles (checkpoints) avec cadenas, connexions en dégradé, bouton "DÉMARRER LE CHECKPOINT 1".
 */
function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

export default function CheckpointsValidationScreen() {
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const narrow = isNarrow(screenWidth);

  // Dimensions responsive : cercles et traits scalent selon la largeur
  // Sur mobile étroit (ex. 390px), scale down pour éviter tout débordement
  const padding = 24;
  const rowMaxWidth = Math.min(screenWidth - padding * 2, 900);
  const circleSize = narrow ? clamp(screenWidth * 0.18, 70, 150) : clamp(screenWidth * 0.20, 75, 190);
  const lineWidth = narrow ? clamp(screenWidth * 0.06, 24, 70) : clamp(screenWidth * 0.07, 28, 90);
  const gapCircleConnector = narrow ? clamp(screenWidth * 0.025, 4, 16) : clamp(screenWidth * 0.03, 6, 20);
  const textSizes = getOnboardingImageTextSizes(screenWidth);
  const rowMarginTop = narrow ? 40 : 100;

  const handleStart = () => {
    navigation.replace('Checkpoint1Intro');
  };

  // Texte sur exactement deux lignes : coupure après "TANT QUE LES" pour que la 1re ligne ne wrap pas (évite 3 lignes)
  const line1 = 'CHAQUE CERCLE EST UN CHECKPOINT, TANT QUE LES';
  const line2Start = 'CHECKPOINTS NE SONT PAS VALIDÉS LA VOIE RESTE ';
  const line2Word = 'INCERTAINE';

  return (
    <View style={styles.container}>
      <StandardHeader title="ALIGN" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { minHeight: SCREEN_HEIGHT - 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Bloc central : texte (2 lignes) + cercles, centré, maxWidth pour éviter orphelins */}
          <View style={styles.topBlock}>
            <View style={[styles.textContainer, { maxWidth: screenWidth * textSizes.textMaxWidth, marginTop: 50 }]}>
              <Text style={[styles.mainText, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>
                {line1}
                {'\n'}
                {line2Start}
                <Text style={styles.incertaine}>{line2Word}</Text>
              </Text>
            </View>

            {/* Conteneur centré pour cercles + traits : largeur max, pas de débordement */}
            <View style={[styles.checkpointsWrapper, { width: rowMaxWidth }]}>
              <View
                style={[
                  styles.checkpointsRow,
                  { width: rowMaxWidth, marginTop: rowMarginTop },
                ]}
              >
                <View style={[styles.circle, styles.circle1, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
                  <Text style={[styles.lockIcon, { fontSize: Math.floor(circleSize * 0.38), lineHeight: Math.floor(circleSize * 0.38) }]}>🔒</Text>
                </View>
                <LinearGradient
                  colors={['#FFD93F', '#FF7B2B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.connector, { width: lineWidth, marginHorizontal: gapCircleConnector / 2 }]}
                />
                <View style={[styles.circle, styles.circle2, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
                  <Text style={[styles.lockIcon, { fontSize: Math.floor(circleSize * 0.38), lineHeight: Math.floor(circleSize * 0.38) }]}>🔒</Text>
                </View>
                <LinearGradient
                  colors={['#FF7B2B', '#EC3912']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.connector, { width: lineWidth, marginHorizontal: gapCircleConnector / 2 }]}
                />
                <View style={[styles.circle, styles.circle3, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
                  <Text style={[styles.lockIcon, { fontSize: Math.floor(circleSize * 0.38), lineHeight: Math.floor(circleSize * 0.38) }]}>🔒</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bouton en bas, même place que sur les autres écrans */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>DÉMARRER LE CHECKPOINT 1</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 0,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    width: '100%',
  },
  checkpointsWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  mainText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    width: '100%',
  },
  incertaine: {
    color: '#EC3912',
  },
  checkpointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  circle1: {
    backgroundColor: '#FFD93F',
  },
  circle2: {
    backgroundColor: '#FF7B2B',
  },
  circle3: {
    backgroundColor: '#EC3912',
  },
  lockIcon: {
    textAlign: 'center',
  },
  connector: {
    height: CONNECTOR_HEIGHT,
    borderRadius: CONNECTOR_HEIGHT / 2,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 8,
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
