import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { createCheckoutSession } from '../../services/stripeService';
import { supabase } from '../../services/supabase';
import { getSafeRoutesFromNavigation } from '../../navigation/navigationStateUtils';
import { usePostHog } from 'posthog-react-native';

const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';
const PAYWALL_GRADIENT = ['#FF7B2B', '#FFD93F'];
const PAGE_BACKGROUND = '#1A1B23';
const CARD_BACKGROUND = '#1A1B23';
const GLOW_LIGHT = 'rgba(255, 123, 43, 0.22)';
const GLOW_STRONG = 'rgba(255, 123, 43, 0.38)';
const GLOW_GOLD = 'rgba(255, 204, 0, 0.32)';

/** Image fournie (testimonial-avatar.png dans le repo) — pas de placeholder généré. */
const TESTIMONIAL_AVATAR = require('../../../assets/images/paywall/testimonial-avatar.png');

const TESTIMONIALS = [
  {
    firstName: 'VINCENT',
    quote:
      "J'avais vraiment aucune idée de ce que je voulais faire et franchement ça me stressait. Après le test j'ai découvert un métier que j'avais jamais envisagé et ça m'a vraiment aidé.",
  },
  {
    firstName: 'GABRIEL',
    quote:
      "Honnêtement j'étais sceptique au début, 9€ pour un test d'orientation ça m'a pas convaincu direct. Mais le résultat était vraiment précis, rien à voir avec les trucs qu'on fait au lycée, franchement je regrette pas.",
  },
  {
    firstName: 'LOUNA',
    quote:
      "Je pensais connaître mes centres d'intérêt mais le métier proposé m'avait jamais traversé l'esprit. Maintenant je sais exactement vers quoi orienter mes vœux Parcoursup.",
  },
];

const BENEFITS = [
  {
    title: 'UN MÉTIER QUI TE CORRESPOND',
    description:
      'Pas une liste. Un métier précis, choisi pour toi après 80 questions sur ta personnalité, tes forces et ta façon de penser.',
  },
  {
    title: "L'IMMERSION DANS LE MÉTIER",
    description:
      "Tu vis concrètement le quotidien du métier via des simulations. Tu sais si c'est fait pour toi avant de choisir.",
  },
  {
    title: 'UN PLAN POUR COMMENCER',
    description:
      "Quoi viser, quoi apprendre, quoi faire dès maintenant. Tu sors avec une direction concrète, pas juste un nom de métier.",
  },
];

function TestimonialCard({ firstName, quote, displayFont, nunitoBoldFont, quoteFontSize }) {
  return (
    <View style={styles.testimonialOuterRow}>
      <Image source={TESTIMONIAL_AVATAR} style={styles.testimonialAvatar} resizeMode="cover" />
      <View style={styles.testimonialShell}>
        <View style={styles.testimonialCard}>
          <View style={styles.testimonialHeaderRow}>
            <Text style={[styles.testimonialName, { fontFamily: displayFont }]} numberOfLines={1}>
              {firstName}
            </Text>
            <Text style={styles.testimonialStars}>★★★★★</Text>
          </View>
          <Text style={[styles.testimonialQuote, { fontFamily: nunitoBoldFont, fontSize: quoteFontSize }]}>{quote}</Text>
        </View>
      </View>
    </View>
  );
}

function PaywallScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const resultJobPayload = route.params?.resultJobPayload;
  const sectorPaywallResume = route.params?.sectorPaywallResume;
  const posthog = usePostHog();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isCompact = width <= 390;
  const isVerySmall = width <= 360;
  const isShortViewport = height < 700;
  const isTablet = width >= 768;
  const horizontalPadding = isCompact ? 16 : width >= 1200 ? 32 : 22;
  const contentWidth = Math.min(width - horizontalPadding * 2, isTablet ? 600 : 520);
  const headlineWidth = Math.min(width - horizontalPadding * 2, isTablet ? 920 : 640);
  const pricingWidth = Math.max(280, contentWidth - (isCompact ? 8 : 38));
  const bottomBarHeight = isCompact ? 154 : 170;
  const testimonialsScrollReserve = isShortViewport ? 100 : 140;
  const scrollBottomPadding = bottomBarHeight + (isCompact ? 34 : 44) + testimonialsScrollReserve;

  const displayFont = useMemo(
    () =>
      Platform.select({
        web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
        default: theme.fonts.title,
      }),
    []
  );
  const nunitoBoldFont = useMemo(
    () =>
      Platform.select({
        web: 'Nunito, Arial, sans-serif',
        default: 'Nunito_700Bold',
      }),
    []
  );
  const nunitoBlackFont = theme.fonts.button;
  const testimonialQuinconceShift = isCompact ? 14 : 18;

  useEffect(() => {
    posthog.capture('paywall_viewed', {
      plan: 'lifetime',
      source: sectorPaywallResume ? 'sector_quiz' : resultJobPayload ? 'result_job' : 'unknown',
    });
  }, [posthog, resultJobPayload, sectorPaywallResume]);

  useEffect(() => {
    const logPaywallViewedEvent = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.id) return;

        const { data: existingEvents, error: existingError } = await supabase
          .from('paywall_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('email_sent', false)
          .limit(1);

        if (existingError) {
          if (__DEV__) console.warn('[Paywall] Impossible de vérifier paywall_events:', existingError.message);
          return;
        }

        if (existingEvents && existingEvents.length > 0) return;

        const { error: insertError } = await supabase.from('paywall_events').insert({ user_id: user.id });

        if (insertError && insertError.code !== '23505' && __DEV__) {
          console.warn('[Paywall] Impossible de créer paywall_event:', insertError.message);
        }
      } catch (error) {
        if (__DEV__) console.warn('[Paywall] Erreur log paywall_viewed:', error?.message || error);
      }
    };

    logPaywallViewedEvent();
  }, []);

  const confirmPlanSelection = async () => {
    const plan = 'lifetime';

    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        let toStore = null;
        if (sectorPaywallResume && typeof sectorPaywallResume === 'object') {
          toStore = {
            ...sectorPaywallResume,
            kind: 'sector_quiz',
            needsDroitRefinement: sectorPaywallResume.needsDroitRefinement === true,
          };
        } else if (resultJobPayload && typeof resultJobPayload === 'object') {
          toStore = { kind: 'result_job', payload: resultJobPayload };
        }
        if (toStore) {
          window.sessionStorage.setItem(PAYWALL_RETURN_PAYLOAD_KEY, JSON.stringify(toStore));
        }
      } catch (_) {}
    }

    posthog.capture('checkout_initiated', { plan });
    setCheckoutLoading(true);

    let result;
    try {
      result = await createCheckoutSession(plan);
    } finally {
      setCheckoutLoading(false);
    }

    if (result.error) {
      const isUnauth =
        result.error === 'Non connecté' ||
        result.error.includes('connecté') ||
        result.error.includes('Session expirée');
      Alert.alert(
        isUnauth ? 'Connexion requise' : 'Erreur',
        result.error,
        isUnauth
          ? [
              { text: 'Fermer', style: 'cancel' },
              {
                text: 'Se connecter',
                onPress: () => {
                  try {
                    getSafeRoutesFromNavigation(navigation);
                    navigation.navigate('Login');
                  } catch (_) {}
                },
              },
            ]
          : [{ text: 'OK' }]
      );
      return;
    }

    if (result.url) {
      try {
        if (Platform.OS === 'web') {
          window.location.href = result.url;
        } else {
          await Linking.openURL(result.url);
        }
      } catch (_) {
        Alert.alert('Erreur', 'Impossible d’ouvrir la page de paiement. Réessaie.');
      }
      return;
    }

    Alert.alert('Erreur', 'Aucun lien de paiement reçu. Réessaie.');
  };

  const headlineFontSize = isShortViewport ? (isCompact ? 17 : 19) : isCompact ? 20 : isTablet ? 30 : 26;
  const headlineLineHeight = isShortViewport ? (isCompact ? 20 : 22) : isCompact ? 23 : isTablet ? 32 : 28;
  const subtitleFontSize = isShortViewport ? (isVerySmall ? 13.5 : 14.5) : isCompact ? 17 : 19;
  const cardTitleFontSize = isVerySmall ? 12.5 : isCompact ? 14.5 : isShortViewport ? 15 : 17;
  const cardDescriptionFontSize = isShortViewport ? 12.5 : isCompact ? 13 : 14;
  const testimonialQuoteFontSize = isVerySmall ? 11.5 : isCompact ? 12 : 13;
  const pricingLabelFontSize = isShortViewport ? 19 : isCompact ? 22 : 25;
  const pricingValueFontSize = isShortViewport ? 23 : isCompact ? 26 : 30;
  const ctaFontSize = isVerySmall ? 14 : isCompact ? (isShortViewport ? 15 : 17) : isShortViewport ? 18 : 26;
  const ctaLineHeight = isVerySmall ? 18 : isCompact ? (isShortViewport ? 19 : 21) : isShortViewport ? 22 : 28;
  const ctaHorizontalPadding = isVerySmall ? 10 : isCompact ? 14 : 28;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: scrollBottomPadding,
              flexGrow: 1,
              paddingTop: isShortViewport ? 4 : 8,
            },
            isShortViewport && styles.scrollContentShort,
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.contentColumn, { width: '100%' }]}>
            <StandardHeader title="ALIGN" />

            <GradientText
              colors={PAYWALL_GRADIENT}
              style={[
                styles.headline,
                {
                  fontFamily: displayFont,
                  fontSize: headlineFontSize,
                  lineHeight: headlineLineHeight,
                  width: headlineWidth,
                  marginBottom: isShortViewport ? 12 : 24,
                },
              ]}
            >
              TON AVENIR MÉRITE MIEUX QUE LE HASARD.
            </GradientText>

            <Text
              style={[
                styles.subtitle,
                {
                  fontFamily: nunitoBlackFont,
                  fontSize: subtitleFontSize,
                  width: contentWidth,
                  maxWidth: contentWidth,
                },
                isShortViewport && styles.subtitleShort,
              ]}
              adjustsFontSizeToFit={isVerySmall || isShortViewport}
              minimumFontScale={isVerySmall ? 0.82 : 0.88}
              numberOfLines={2}
            >
              {/* Espace insécable avant « : » pour éviter le retour à la ligne orphelin (petits écrans). */}
              {'Voici ce que tu débloques dès maintenant\u00A0:'}
            </Text>

            <View style={[styles.cardsStack, { width: contentWidth }, isShortViewport && styles.cardsStackShort]}>
              {BENEFITS.map((item) => (
                <View key={item.title} style={styles.featureCardShell}>
                  <View style={[styles.featureCard, isShortViewport && styles.featureCardShort]}>
                    <Text
                      style={[styles.featureCardTitle, { fontFamily: displayFont, fontSize: cardTitleFontSize, width: '100%' }]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                    >
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.featureCardDescription,
                        {
                          fontFamily: nunitoBoldFont,
                          fontSize: cardDescriptionFontSize,
                        },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.testimonialsColumn, { width: contentWidth }]}>
              {TESTIMONIALS.map((item, index) => {
                const isSecond = index === 1;
                return (
                  <View
                    key={item.firstName}
                    style={[
                      styles.testimonialZigWrap,
                      isSecond ? styles.testimonialZigCenterRow : { marginLeft: -testimonialQuinconceShift },
                    ]}
                  >
                    <View style={[styles.testimonialZigInner, isSecond && styles.testimonialZigInnerCentered]}>
                      <TestimonialCard
                        firstName={item.firstName}
                        quote={item.quote}
                        displayFont={displayFont}
                        nunitoBoldFont={nunitoBoldFont}
                        quoteFontSize={testimonialQuoteFontSize}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={confirmPlanSelection}
              disabled={checkoutLoading}
              style={[styles.pricingTouchable, { width: pricingWidth }]}
            >
              <LinearGradient colors={PAYWALL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pricingBar}>
                <Text
                  style={[styles.pricingLabel, { fontFamily: displayFont, fontSize: pricingLabelFontSize }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  ACCÈS À VIE
                </Text>
                <Text style={[styles.pricingValue, { fontFamily: displayFont, fontSize: pricingValueFontSize }]} numberOfLines={1}>
                  9€
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.bottomDock}>
          <View style={[styles.bottomDockInner, { paddingHorizontal: horizontalPadding }]}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={confirmPlanSelection}
              disabled={checkoutLoading}
              style={[styles.ctaOuter, { width: pricingWidth }]}
            >
              <LinearGradient
                colors={PAYWALL_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.ctaInner,
                  { paddingHorizontal: ctaHorizontalPadding },
                  isShortViewport && styles.ctaInnerShort,
                ]}
              >
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.ctaText,
                      {
                        fontFamily: displayFont,
                        fontSize: ctaFontSize,
                        lineHeight: ctaLineHeight,
                        width: '100%',
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.48}
                  >
                    DÉBLOQUER MA DIRECTION
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.reassuranceRow}>
              <View style={styles.checkCircle}>
                <Text style={[styles.checkMark, { fontFamily: nunitoBlackFont }]}>✓</Text>
              </View>
              <Text style={[styles.reassuranceText, { fontFamily: nunitoBoldFont }]}>
                Annulable à tout moment. Accès immédiat.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  container: {
    flex: 1,
    backgroundColor: PAGE_BACKGROUND,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 8,
  },
  scrollContentShort: {
    paddingTop: 2,
  },
  contentColumn: {
    alignItems: 'center',
  },
  headline: {
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 22,
    flexWrap: 'nowrap',
  },
  subtitleShort: {
    marginBottom: 12,
    lineHeight: 20,
  },
  cardsStack: {
    gap: 10,
    marginBottom: 30,
  },
  cardsStackShort: {
    gap: 6,
    marginBottom: 16,
  },
  featureCardShell: {
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 50px 10px ${GLOW_LIGHT}` }
      : {
          shadowColor: '#FF7B2B',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 28,
          shadowOpacity: 0.2,
          elevation: 12,
        }),
  },
  featureCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 123, 43, 0.32)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    width: '100%',
  },
  featureCardShort: {
    minHeight: 58,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  featureCardTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 21,
    marginBottom: 5,
    alignSelf: 'stretch',
  },
  featureCardDescription: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 19,
    opacity: 0.95,
  },
  testimonialsColumn: {
    marginBottom: 8,
    alignSelf: 'center',
  },
  testimonialZigWrap: {
    width: '100%',
    marginBottom: 12,
  },
  /** 2ᵉ témoignage : aligné comme les cartes bénéfices (centré), sans décalage horizontal. */
  testimonialZigCenterRow: {
    alignItems: 'center',
    marginLeft: 0,
  },
  testimonialZigInner: {
    width: '94%',
    maxWidth: '100%',
  },
  testimonialZigInnerCentered: {
    alignSelf: 'center',
  },
  /** Avatar hors du bloc glow / bordure ; à côté de la carte. */
  testimonialOuterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  testimonialShell: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 50px 10px ${GLOW_GOLD}` }
      : {
          shadowColor: '#FFCC00',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 24,
          shadowOpacity: 0.35,
          elevation: 14,
        }),
  },
  testimonialCard: {
    backgroundColor: PAGE_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.45)',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  testimonialAvatar: {
    width: 56,
    height: 56,
    borderRadius: 999,
    marginRight: 10,
    flexShrink: 0,
  },
  /** Prénom à gauche, étoiles à droite, même ligne en haut. */
  testimonialHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testimonialStars: {
    color: '#FFD93F',
    fontSize: 14,
    letterSpacing: 1,
    flexShrink: 0,
  },
  testimonialQuote: {
    color: '#FFFFFF',
    lineHeight: 20,
  },
  testimonialName: {
    color: '#FFFFFF',
    fontSize: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 8,
  },
  pricingTouchable: {
    borderRadius: 18,
    marginBottom: 18,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 62px 14px rgba(255, 123, 43, 0.42)' }
      : {
          shadowColor: '#FF7B2B',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 30,
          shadowOpacity: 0.4,
          elevation: 18,
        }),
  },
  pricingBar: {
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FF7B2B',
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingLabel: {
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 26,
  },
  pricingValue: {
    color: '#FFFFFF',
    textTransform: 'uppercase',
    lineHeight: 32,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: PAGE_BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: '#FF7B2B',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -12px 46px rgba(255, 123, 43, 0.35)' }
      : {
          shadowColor: '#FF7B2B',
          shadowOffset: { width: 0, height: -8 },
          shadowRadius: 28,
          shadowOpacity: 0.34,
          elevation: 20,
        }),
  },
  bottomDockInner: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 18 : 14,
    alignItems: 'center',
  },
  ctaOuter: {
    borderRadius: 999,
    marginBottom: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: `0 0 50px 10px ${GLOW_LIGHT}` }
      : {
          shadowColor: '#FF7B2B',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 22,
          shadowOpacity: 0.16,
          elevation: 12,
        }),
  },
  ctaInner: {
    borderRadius: 999,
    minHeight: 72,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ctaInnerShort: {
    minHeight: 54,
    paddingVertical: 10,
  },
  ctaText: {
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 28,
  },
  reassuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: '#FF7B2B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  checkMark: {
    color: PAGE_BACKGROUND,
    fontSize: 11,
    lineHeight: 12,
    marginTop: -1,
  },
  reassuranceText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default PaywallScreen;
