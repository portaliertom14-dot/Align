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
import { getContinueButtonDimensions, getOnboardingImageTextSizes } from '../Onboarding/onboardingConstants';
import StandardHeader from '../../components/StandardHeader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

/** Taille fluide type CSS clamp(min, vw%, max) */
function fluid(width, minPx, vwPercent, maxPx) {
  return Math.round(clamp((width * vwPercent) / 100, minPx, maxPx));
}

/**
 * Écran "Checkpoints de validation"
 * Affiché après "Ton métier défini".
 * Texte = même scale que onboarding mascottes ; cercles/barres = clamp progressif ; groupe checkpoints descendu ~40px.
 */
const DESKTOP_MIN_WIDTH = 1024;
const DESKTOP_SHORT_MAX_HEIGHT = 850;

export default function CheckpointsValidationScreen() {
  const navigation = useNavigation();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const textSizes = getOnboardingImageTextSizes(screenWidth);
  const titleStyle = {
    fontSize: textSizes.titleFontSize,
    lineHeight: textSizes.titleLineHeight,
  };

  // Cercles + cadenas : inchangés. Barres + gap : traits plus longs, plus proches des ronds
  const cpSize = fluid(screenWidth, 120, 14, 220);
  const lockSize = fluid(screenWidth, 36, 4, 58);
  const barW = fluid(screenWidth, 60, 7, 110);
  const barH = fluid(screenWidth, 10, 1.2, 16);
  const cpGap = fluid(screenWidth, 14, 2, 26);

  // Marge au-dessus du groupe checkpoints
  const checkpointsMarginTop = 100 + fluid(screenWidth, 20, 3, 40);

  // Desktop fenêtre non plein écran : remonter + réduire l’ensemble (ronds + traits + cadenas), pas le texte
  const isDesktopShort = screenWidth >= DESKTOP_MIN_WIDTH && screenHeight <= DESKTOP_SHORT_MAX_HEIGHT;
  const checkpointsTranslateY = isDesktopShort ? -40 : 0;
  const checkpointsScale = isDesktopShort ? 0.88 : 1;

  const textMaxWidth = screenWidth * textSizes.textMaxWidth;

  const handleStart = () => {
    navigation.replace('Checkpoint1Intro');
  };

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
          <View style={styles.topBlock}>
            <View style={[styles.textContainer, { maxWidth: textMaxWidth }]}>
              <Text style={[styles.mainText, titleStyle]}>
                {line1}
                {'\n'}
                {line2Start}
                <Text style={styles.incertaine}>{line2Word}</Text>
              </Text>
            </View>

            <View
              style={[
                styles.checkpointsRow,
                {
                  marginTop: checkpointsMarginTop,
                  gap: cpGap,
                  transform: [
                    { translateY: checkpointsTranslateY },
                    { scale: checkpointsScale },
                  ],
                },
              ]}
            >
              <View style={[styles.circle, styles.circle1, { width: cpSize, height: cpSize, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSize, lineHeight: lockSize }]}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FFD93F', '#FF7B2B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { width: barW, height: barH, borderRadius: barH / 2 }]}
              />
              <View style={[styles.circle, styles.circle2, { width: cpSize, height: cpSize, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSize, lineHeight: lockSize }]}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FF7B2B', '#EC3912']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { width: barW, height: barH, borderRadius: barH / 2 }]}
              />
              <View style={[styles.circle, styles.circle3, { width: cpSize, height: cpSize, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSize, lineHeight: lockSize }]}>🔒</Text>
              </View>
            </View>
          </View>

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
  connector: {},
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
