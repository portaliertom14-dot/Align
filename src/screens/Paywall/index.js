import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
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

const BENEFITS = [
  {
    title: 'UN MÉTIER QUI TE CORRESPOND PARFAITEMENT',
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

function PaywallScreen() {
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute();
  const resultJobPayload = route.params?.resultJobPayload;
  const sectorPaywallResume = route.params?.sectorPaywallResume;
  const posthog = usePostHog();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const isCompact = width <= 390;
  const isTablet = width >= 768;
  const horizontalPadding = isCompact ? 16 : width >= 1200 ? 32 : 22;
  const contentWidth = Math.min(width - horizontalPadding * 2, isTablet ? 600 : 520);
  const headlineWidth = Math.min(width - horizontalPadding * 2, isTablet ? 920 : 640);
  const pricingWidth = Math.max(280, contentWidth - (isCompact ? 8 : 38));
  const bottomBarHeight = isCompact ? 154 : 170;
  const scrollBottomPadding = bottomBarHeight + (isCompact ? 34 : 44);

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

  const headlineFontSize = isCompact ? 20 : isTablet ? 30 : 26;
  const headlineLineHeight = isCompact ? 23 : isTablet ? 32 : 28;
  const logoFontSize = 25;
  const subtitleFontSize = isCompact ? 17 : 19;
  const cardTitleFontSize = isCompact ? 17 : 19;
  const cardDescriptionFontSize = isCompact ? 12 : 13;
  const pricingLabelFontSize = isCompact ? 22 : 25;
  const pricingValueFontSize = isCompact ? 26 : 30;
  const ctaFontSize = isCompact ? 23 : 26;

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
              minHeight: Math.max(height, 640),
            },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.contentColumn, { width: '100%' }]}>
            <Text style={[styles.logo, { fontFamily: theme.fonts.title, fontSize: logoFontSize }]}>ALIGN</Text>

            <GradientText
              colors={PAYWALL_GRADIENT}
              style={[
                styles.headline,
                {
                  fontFamily: displayFont,
                  fontSize: headlineFontSize,
                  lineHeight: headlineLineHeight,
                  width: headlineWidth,
                },
              ]}
            >
              TON AVENIR MÉRITE MIEUX QUE LE HASARD.
            </GradientText>

            <Text style={[styles.subtitle, { fontFamily: nunitoBlackFont, fontSize: subtitleFontSize, width: contentWidth }]}>
              Voici ce que tu débloques dès maintenant :
            </Text>

            <View style={[styles.cardsStack, { width: contentWidth }]}>
              {BENEFITS.map((item) => (
                <View key={item.title} style={styles.featureCardShell}>
                  <View style={styles.featureCard}>
                    <Text
                      style={[styles.featureCardTitle, { fontFamily: displayFont, fontSize: cardTitleFontSize }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
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
              <LinearGradient colors={PAYWALL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaInner}>
                {checkoutLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[styles.ctaText, { fontFamily: displayFont, fontSize: ctaFontSize }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
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
  contentColumn: {
    alignItems: 'center',
  },
  logo: {
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 0,
    marginBottom: 18,
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
  },
  cardsStack: {
    gap: 10,
    marginBottom: 30,
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
    borderColor: 'rgba(255, 123, 43, 0.18)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 21,
    marginBottom: 5,
  },
  featureCardDescription: {
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 17,
    opacity: 0.95,
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
    minHeight: 82,
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
