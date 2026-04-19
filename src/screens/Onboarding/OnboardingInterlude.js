import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Image, BackHandler, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { loadDraft } from '../../lib/onboardingDraftStore';
import { buildParcoursupSlide2Body, getParcoursupSlide2Title } from '../../lib/parcoursupCountdown';

/**
 * Onboarding interlude pixel-perfect (4 slides)
 * Réutilise une structure visuelle strictement identique entre les slides.
 */
export default function OnboardingInterlude() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [draftSchoolLevel, setDraftSchoolLevel] = useState(null);
  const isVerySmall = width <= 360;
  const isSmall = width <= 390;

  const paramLevelRaw = route.params?.schoolLevel;
  const paramSchoolLevel =
    typeof paramLevelRaw === 'string' && paramLevelRaw.trim() !== '' ? paramLevelRaw.trim() : null;
  const schoolLevel = paramSchoolLevel ?? draftSchoolLevel;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadDraft();
        if (cancelled) return;
        const fromDraft =
          typeof draft?.schoolLevel === 'string' && draft.schoolLevel.trim() !== ''
            ? draft.schoolLevel.trim()
            : null;
        setDraftSchoolLevel(fromDraft);
      } catch {
        if (!cancelled) setDraftSchoolLevel(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parcoursupSlide2Body = useMemo(
    () => buildParcoursupSlide2Body({ schoolLevel }),
    [schoolLevel]
  );

  const parcoursupSlide2Title = useMemo(() => getParcoursupSlide2Title({ schoolLevel }), [schoolLevel]);

  const slideContent = useMemo(
    () => [
      {
        title: 'TU VAS TE FERMER DES PORTES',
        description:
          "L'orientation, c'est une fenêtre qui se ferme. Chaque année sans direction claire, c'est des portes qui se referment, filières, concours, opportunités. La plupart des jeunes ne s'en rendent compte que trop tard.",
        backgroundColor: '#FF7B2B',
        imageSource: require('../../../assets/images/onboarding/onboarding-interlude-1.png'),
      },
      {
        title: parcoursupSlide2Title,
        description: parcoursupSlide2Body,
        backgroundColor: '#FF7B2B',
        imageSource: require('../../../assets/images/onboarding/onboarding-interlude-2.png'),
      },
      {
        title: 'TU BOUSILLES TON CERVEAU',
        description:
          "Ne pas savoir ce qu'on veut faire crée une anxiété chronique. Les jeunes sans direction rapportent plus de stress, moins de motivation, et une tendance à procrastiner sur les choix importants.",
        backgroundColor: '#FF7B2B',
        imageSource: require('../../../assets/images/onboarding/onboarding-interlude-3.png'),
      },
      {
        title: 'TU PEUX T’EN SORTIR',
        description:
          "En 15 minutes, tu peux identifier le secteur qui te correspond, comprendre pourquoi, et voir concrètement ce que ça donne au quotidien. C'est ce pourquoi Align a été construit.",
        backgroundColor: '#1A1B23',
        imageSource: require('../../../assets/images/onboarding/onboarding-interlude-4.png'),
      },
    ],
    [parcoursupSlide2Body, parcoursupSlide2Title]
  );
  const currentSlide = slideContent[step];

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 0) {
        setStep((s) => Math.max(0, s - 1));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step]);

  const horizontalPadding = isVerySmall ? 18 : isSmall ? 22 : 26;
  /** Textes légèrement plus compacts (même hiérarchie visuelle). */
  const titleFontSize = isVerySmall ? 22 : isSmall ? 24 : 27;
  const titleLineHeight = isVerySmall ? 26 : isSmall ? 28 : 31;
  const descriptionFontSize = isVerySmall ? 15.5 : isSmall ? 17 : 18.5;
  const descriptionLineHeight = isVerySmall ? 22 : isSmall ? 24 : 26;
  /** Image lisible (~29 % hauteur écran max), CTA ancré en bas (voir maquette interlude). */
  const maxImageWidth = width - horizontalPadding * 2 - 4;
  const imageByHeight = Math.round(height * 0.29);
  const imageSizeTarget = isVerySmall ? 196 : isSmall ? 214 : 236;
  const imageSize = Math.min(Math.max(imageSizeTarget, imageByHeight), maxImageWidth, 268);
  const dotsBottomSpacing = isVerySmall ? 10 : 12;
  const ctaWidth = Math.min(width - horizontalPadding * 2 - 16, isVerySmall ? 268 : 300);
  const ctaHeight = isVerySmall ? 54 : 56;
  const ctaFontSize = isVerySmall ? 17 : isSmall ? 18 : 19;
  const ctaLineHeight = isVerySmall ? 21 : isSmall ? 22 : 23;
  const imageTopSpacing = isVerySmall ? 10 : 14;
  const blockAfterImage = isVerySmall ? 12 : 16;
  const titleTopSpacing = 0;
  const descriptionTopSpacing = isVerySmall ? 8 : 10;
  const footerBottomPad = Math.max(insets.bottom, 12) + 8;

  return (
    <View style={[styles.screen, { backgroundColor: currentSlide.backgroundColor }]}>
      <StandardHeader
        title="ALIGN"
        leftAction={
          <TouchableOpacity
            onPress={() => {
              if (step > 0) {
                setStep((s) => Math.max(0, s - 1));
                return;
              }
              if (navigation.canGoBack()) {
                navigation.goBack();
              }
            }}
            activeOpacity={0.8}
            style={styles.backAction}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        }
      />

      <View style={[styles.content, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.contentUpper}>
          <Image
            source={currentSlide.imageSource}
            style={{ width: imageSize, height: imageSize, marginTop: imageTopSpacing }}
            resizeMode="contain"
          />

          <View style={{ marginTop: blockAfterImage, width: '100%', alignItems: 'center', flexShrink: 1 }}>
            <Text style={[styles.title, { fontSize: titleFontSize, lineHeight: titleLineHeight, marginTop: titleTopSpacing }]}>
              {currentSlide.title}
            </Text>

            <Text
              style={[
                styles.description,
                {
                  fontSize: descriptionFontSize,
                  lineHeight: descriptionLineHeight,
                  marginTop: descriptionTopSpacing,
                },
              ]}
              numberOfLines={step === 1 ? undefined : 4}
            >
              {currentSlide.description}
            </Text>
          </View>
        </View>

        <View style={[styles.contentFooter, { paddingBottom: footerBottomPad }]}>
          <View style={[styles.dotsRow, { marginBottom: dotsBottomSpacing }]}>
            {slideContent.map((_, index) => (
              <View key={`dot-${index}`} style={[styles.dot, index === step ? styles.dotActive : styles.dotInactive]} />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { width: ctaWidth, height: ctaHeight }]}
            activeOpacity={0.88}
            onPress={() => {
              if (step < slideContent.length - 1) {
                setStep((prev) => prev + 1);
                return;
              }
              navigation.navigate('Onboarding', { step: 1 });
            }}
          >
            <Text style={[styles.buttonText, { fontSize: ctaFontSize, lineHeight: ctaLineHeight }]}>CONTINUER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FF7B2B',
  },
  backAction: { padding: 8 },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    minHeight: 0,
  },
  contentUpper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0,
    paddingBottom: 8,
  },
  contentFooter: {
    width: '100%',
    alignItems: 'center',
    flexShrink: 0,
    paddingTop: 4,
  },
  title: {
    width: '100%',
    maxWidth: 720,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  description: {
    width: '100%',
    maxWidth: 760,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 999,
  },
  dotActive: {
    backgroundColor: '#E10600',
  },
  dotInactive: {
    backgroundColor: '#FFFFFF',
  },
  button: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonText: {
    fontFamily: theme.fonts.button,
    color: '#111422',
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...theme.buttonTextNoWrap,
  },
});


