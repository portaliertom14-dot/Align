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
import { getOnboardingImageTextSizes, getUnifiedCtaButtonStyle } from '../Onboarding/onboardingConstants';
import StandardHeader from '../../components/StandardHeader';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  const isNarrowText = screenWidth < 430;
  const mainTextFontSize = isNarrowText ? 16 : Math.min(textSizes.titleFontSize, 26);
  const mainTextLineHeight = Math.round(mainTextFontSize * 1.28);
  const titleStyle = {
    fontSize: mainTextFontSize,
    lineHeight: mainTextLineHeight,
  };
  const titleBlockMaxWidth = Math.min(screenWidth * 0.94, 960);
  const textContainerPaddingH = screenWidth < 400 ? 20 : 28;

  // Cercles + cadenas : largeur totale plafonnée pour ne pas coller aux bords, centrés
  const isNarrow = screenWidth < 430;
  const maxRowWidth = Math.min(screenWidth - 48, Math.round(screenWidth * 0.82));
  const minCircleSizeMobile = screenWidth <= 320 ? 64 : (screenWidth < 360 ? 72 : 96);
  let cpSize = fluid(screenWidth, isNarrow ? 110 : 120, isNarrow ? 18 : 14, 220);
  let lockSize = fluid(screenWidth, 40, 4.5, 58);
  let barW = fluid(screenWidth, 50, 6, 110);
  const barH = fluid(screenWidth, 10, 1.2, 16);
  let cpGap = fluid(screenWidth, 10, 1.5, 26);

  let totalRowWidth = 3 * cpSize + 2 * barW + 2 * cpGap;
  if (isNarrow && totalRowWidth > maxRowWidth && totalRowWidth > 0) {
    const mobileScale = maxRowWidth / totalRowWidth;
    cpSize = Math.max(minCircleSizeMobile, Math.round(cpSize * mobileScale));
    barW = Math.round(barW * mobileScale);
    cpGap = Math.max(6, Math.round(cpGap * mobileScale));
    totalRowWidth = 3 * cpSize + 2 * barW + 2 * cpGap;
    if (totalRowWidth > maxRowWidth) {
      cpSize = Math.max(minCircleSizeMobile, Math.floor((maxRowWidth - 2 * barW - 2 * cpGap) / 3));
    }
    lockSize = Math.max(24, Math.round(cpSize * 0.38));
  } else if (isNarrow) {
    lockSize = Math.max(28, Math.round(cpSize * 0.38));
  }

  // Marge au-dessus du groupe checkpoints
  const checkpointsMarginTop = 60 + fluid(screenWidth, 12, 2, 28);
  const circlesScale = 0.82;
  const cpSizeScaled = Math.round(cpSize * circlesScale);
  const lockSizeScaled = Math.max(24, Math.round(lockSize * circlesScale));
  const barWScaled = Math.round(barW * circlesScale);

  // Desktop fenêtre non plein écran : remonter + réduire l’ensemble (ronds + traits + cadenas), pas le texte
  const isDesktopShort = screenWidth >= DESKTOP_MIN_WIDTH && screenHeight <= DESKTOP_SHORT_MAX_HEIGHT;
  const checkpointsTranslateY = isDesktopShort ? -40 : 0;
  const checkpointsScale = isDesktopShort ? 0.88 : 1;

  const ctaStyle = getUnifiedCtaButtonStyle(screenWidth);

  const handleStart = () => {
    navigation.replace('Checkpoint1Intro');
  };

  // Titre en 2 lignes maîtrisées, sans coupure moche (ex. "LES" seul)
  const line1 = 'CHAQUE CERCLE EST UN CHECKPOINT.';
  const line2Prefix = 'TANT QUE LES CHECKPOINTS NE SONT PAS VALIDÉS, LA VOIE RESTE ';
  const line2Suffix = 'BLOQUÉE.';

  return (
    <View style={styles.container}>
      <StandardHeader title="ALIGN" />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { minHeight: SCREEN_HEIGHT - 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topBlock}>
            <View style={[styles.textContainer, { maxWidth: titleBlockMaxWidth, paddingHorizontal: textContainerPaddingH }]}>
              <Text style={[styles.mainText, titleStyle]}>
                {line1}
                {'\n'}
                {line2Prefix}
                <Text style={styles.accentWord}>{line2Suffix}</Text>
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
              <View style={[styles.circle, styles.circle1, { width: cpSizeScaled, height: cpSizeScaled, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSizeScaled, lineHeight: lockSizeScaled }]}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FFD93F', '#FF7B2B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { width: barWScaled, height: barH, borderRadius: barH / 2 }]}
              />
              <View style={[styles.circle, styles.circle2, { width: cpSizeScaled, height: cpSizeScaled, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSizeScaled, lineHeight: lockSizeScaled }]}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FF7B2B', '#EC3912']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { width: barWScaled, height: barH, borderRadius: barH / 2 }]}
              />
              <View style={[styles.circle, styles.circle3, { width: cpSizeScaled, height: cpSizeScaled, borderRadius: 9999 }]}>
                <Text style={[styles.lockIcon, { fontSize: lockSizeScaled, lineHeight: lockSizeScaled }]}>🔒</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { width: ctaStyle.buttonWidth, paddingVertical: ctaStyle.paddingVertical, paddingHorizontal: screenWidth < 400 ? 16 : ctaStyle.paddingHorizontal }]}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, { fontSize: screenWidth < 400 ? 14 : (screenWidth < 375 ? 15 : ctaStyle.fontSize) }]} numberOfLines={1} adjustsFontSizeToFit={true}>
              DÉMARRER
            </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 32,
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
  accentWord: {
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
    textAlign: 'center',
    ...theme.buttonTextNoWrap,
  },
});
