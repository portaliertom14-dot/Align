/**
 * Écran intermédiaire après résultat secteur, avant quiz métier.
 * Flow : ResultatSecteur → InterludeSecteur → QuizMetier.
 * Layout optimisé pour tenir sans scroll sur mobile (~390px de large).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { isNarrow, getUnifiedCtaButtonStyle } from '../Onboarding/onboardingConstants';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { getOnboardingImageTextSizes } from '../Onboarding/onboardingConstants';

const IMAGE_SOURCE = require('../../../assets/images/star-sector-intro.png');

const W_LG = 1100;
export default function InterludeSecteurScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sectorId = route.params?.sectorId ?? '';
  const sectorRanked = Array.isArray(route.params?.sectorRanked) ? route.params.sectorRanked : [];
  const ctaStyle = getUnifiedCtaButtonStyle(width);
  const textSizes = getOnboardingImageTextSizes(width);
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
  const titleMaxWidth = width * textSizes.textMaxWidth;

  const handleGo = () => {
    const top2Id = sectorRanked[1] != null && typeof sectorRanked[1] === 'object' && sectorRanked[1].id != null
      ? String(sectorRanked[1].id).trim().toLowerCase()
      : '';
    const needsDroitRefinement =
      String(sectorId || '').trim().toLowerCase() === 'droit_justice_securite' &&
      top2Id === 'defense_securite_civile';

    navigation.replace('QuizMetier', { sectorId, sectorRanked, needsDroitRefinement: needsDroitRefinement === true });
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          width >= W_LG && { marginTop: -24 },
          isNarrow(width) && { marginTop: -16 },
          { paddingTop: insets.top + 8 },
        ]}
      >
        <View style={[styles.topBlock, { maxWidth: titleMaxWidth }]}>
          <Text style={[styles.mainTitle, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>
            Ton profil prend forme,plus qu'une étape.
          </Text>

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
              Plus que 30 questions, dans 5 minutes tu découvrira ton métier exact
            </Text>
          ) : (
            <MaskedView
              maskElement={
                <Text style={[styles.subtitle, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>
                  Plus que 30 questions, dans 5 minutes tu découvrira ton métier exact
                </Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientContainer}
              >
                <Text style={[styles.subtitle, styles.transparentText, { fontSize: textSizes.subtitleFontSize, lineHeight: textSizes.subtitleLineHeight }]}>
                  Plus que 30 questions, dans 5 minutes tu découvrira ton métier exact
                </Text>
              </LinearGradient>
            </MaskedView>
          )}
        </View>

        <View style={styles.mascotWrap}>
          <Image
            source={IMAGE_SOURCE}
            style={[styles.illustration, { width: IMAGE_SIZE, height: IMAGE_SIZE, maxWidth: '100%' }]}
            resizeMode="contain"
          />
        </View>

        <HoverableTouchableOpacity
          style={[
            styles.button,
            {
              width: ctaStyle.buttonWidth,
              paddingVertical: ctaStyle.paddingVertical,
              paddingHorizontal: ctaStyle.paddingHorizontal,
            },
          ]}
          onPress={handleGo}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={[styles.buttonText, { fontSize: ctaStyle.fontSize }]}>RÉVÉLER MON MÉTIER</Text>
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
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    width: '100%',
  },
  topBlock: {
    minHeight: 80,
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  subtitle: {
    fontFamily: Platform.select({ web: 'Nunito, sans-serif', default: 'Nunito_900Black' }),
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
  },
  gradientContainer: {},
  transparentText: { opacity: 0 },
  mascotWrap: {
    marginVertical: 16,
  },
  illustration: {
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#FF7B2B',
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
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    ...theme.buttonTextNoWrap,
  },
});
