/**
 * Interlude affiché uniquement après paiement réussi (PaywallSuccess).
 * Flow : PaywallSuccess → InterludeSecteur → QuizMetier → LoadingReveal → ResultJob.
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isNarrow, getUnifiedCtaButtonStyle } from '../Onboarding/onboardingConstants';
import { getOnboardingImageTextSizes } from '../Onboarding/onboardingConstants';
import { theme } from '../../styles/theme';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { computeNeedsDroitRefinement } from '../../lib/sectorQuizGate';

const IMAGE_SOURCE = require('../../../assets/images/star-sector-intro.png');

const EXPLANATION_TEXT =
  "Tu viens de débloquer ton métier exact. Réponds à ces dernières questions pour affiner ton profil — dans 5 minutes, tu découvres ton métier.";

const W_LG = 1100;

export default function InterludeSecteurScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const sectorId = route.params?.sectorId ?? '';
  const sectorRanked = Array.isArray(route.params?.sectorRanked) ? route.params.sectorRanked : [];
  const variantOverride = route.params?.variantOverride;
  const fromCheckoutSuccess = route.params?.fromCheckoutSuccess === true;

  const needsDroitRefinement =
    route.params?.needsDroitRefinement === true || computeNeedsDroitRefinement(sectorId, sectorRanked);

  const ctaStyle = getUnifiedCtaButtonStyle(width);
  const textSizes = getOnboardingImageTextSizes(width);
  const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
  const titleMaxWidth = width * textSizes.textMaxWidth;

  const handleGo = () => {
    navigation.replace('QuizMetier', {
      sectorId,
      sectorRanked,
      needsDroitRefinement,
      fromCheckoutSuccess,
      ...(variantOverride != null ? { variantOverride } : {}),
    });
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          width >= W_LG && { marginTop: -24 },
          isNarrow(width) && { marginTop: -16 },
          { paddingTop: Math.max(80, insets.top + 48) },
        ]}
      >
        <View style={[styles.topBlock, { maxWidth: titleMaxWidth }]}>
          <Text style={[styles.mainTitle, { fontSize: textSizes.titleFontSize, lineHeight: textSizes.titleLineHeight }]}>
            C&apos;EST DÉBLOQUÉ !
          </Text>

          <Text
            style={[
              styles.explanation,
              {
                fontSize: Math.min(17, textSizes.subtitleFontSize),
                lineHeight: Math.round(Math.min(17, textSizes.subtitleFontSize) * 1.45),
              },
            ]}
          >
            {EXPLANATION_TEXT}
          </Text>
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
          <LinearGradient
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={[styles.buttonText, { fontSize: ctaStyle.fontSize }]}>CONTINUER</Text>
          </LinearGradient>
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
    marginBottom: 12,
    ...(Platform.OS === 'web' ? { textTransform: 'uppercase' } : {}),
  },
  explanation: {
    fontFamily: theme.fonts.button,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  mascotWrap: {
    marginVertical: 16,
    alignItems: 'center',
  },
  illustration: {},
  button: {
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonGradient: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { textTransform: 'uppercase' } : {}),
  },
});
