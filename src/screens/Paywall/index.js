/**
 * Paywall — Page de conversion (UI seule, pas d’intégration Stripe).
 * Structure : cartes tarifaires, headline, sous-titre, paragraphe, titres de section,
 * cartes bénéfices en zigzag, CTA fixe en bas.
 */
import React, { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { createCheckoutSession } from '../../services/stripeService';
import { supabase } from '../../services/supabase';
import { getSafeRoutesFromNavigation } from '../../navigation/navigationStateUtils';

const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';
const PAYWALL_GRADIENT = ['#FF7B2B', '#FFD93F'];

const BENEFITS = [
  {
    emoji: '🎯',
    title: 'TON MÉTIER EXACT',
    description: 'Pas une liste. Un métier précis, choisi pour toi après 80 questions sur ta personnalité, tes forces et ta façon de penser.',
  },
  {
    emoji: '🎬',
    title: "L'IMMERSION DANS LE MÉTIER",
    description: "Tu vis concrètement le quotidien du métier via des simulations. Tu sais si c'est fait pour toi avant de choisir.",
  },
  {
    emoji: '🧠',
    title: "POURQUOI C'EST FAIT POUR TOI",
    description: "On t'explique exactement pourquoi ce métier correspond à ta personnalité et à tes forces. Pas du hasard — de la logique.",
  },
  {
    emoji: '🚀',
    title: 'UN PLAN POUR COMMENCER',
    description: 'Quoi viser, quoi apprendre, quoi faire dès maintenant. Tu sors avec une direction concrète, pas juste un nom de métier.',
  },
  {
    emoji: '🔥',
    title: 'ACCÈS À VIE',
    description: "Une seule fois. Pas d'abonnement. Pas de surprise. Ton résultat t'appartient pour toujours.",
  },
];

// Titres / CTA : Bowlby One SC. Textes : Nunito (Black / ExtraBold / Bold).
const fontTitle = theme.fonts.title;
const fontButton = theme.fonts.button;

const MOBILE_BREAKPOINT = 430;

function PaywallScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width <= 600;
  const isMobile = width < MOBILE_BREAKPOINT;
  const contentMaxWidth = Math.min(560, width - 40);
  const stickyCtaHeight = 140;
  const scrollPaddingBottom = isMobile ? stickyCtaHeight + 64 : stickyCtaHeight + 48;
  const ctaButtonFontSize = isMobile ? 15 : 21;
  const pricingTitleFontSize = isMobile ? 16 : 20;
  // Titre sur une seule ligne sur grands écrans : largeur max + taille responsive
  const headlineMaxWidth = width >= 768 ? Math.min(920, width - 48) : contentMaxWidth;
  const headlineFontSize = width >= 1024 ? 32 : width >= 768 ? 28 : isMobile ? 20 : 26;
  const navigation = useNavigation();
  const route = useRoute();
  const resultJobPayload = route.params?.resultJobPayload;
  const sectorPaywallResume = route.params?.sectorPaywallResume;

  const [selectedPlan, setSelectedPlan] = useState('lifetime');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const logPaywallViewedEvent = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
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

        const { error: insertError } = await supabase
          .from('paywall_events')
          .insert({ user_id: user.id });

        // 23505 = violation de contrainte unique (race condition possible)
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
    // Paiement unique "lifetime" (plan logique côté client ; le backend utilise un price/product Stripe dédié).
    const plan = 'lifetime';
    // Retour Stripe : sector_quiz (après résultat secteur) prioritaire sur result_job (après analyse métier).
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

    setCheckoutLoading(true);
    let result;
    try {
      result = await createCheckoutSession(plan);
    } finally {
      setCheckoutLoading(false);
    }

    if (result.error) {
      const isUnauth = result.error === 'Non connecté' || result.error.includes('connecté') || result.error.includes('Session expirée');
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
      setSelectedPlan('lifetime');
      try {
        if (Platform.OS === 'web') {
          window.location.href = result.url;
        } else {
          await Linking.openURL(result.url);
        }
      } catch (e) {
        Alert.alert('Erreur', 'Impossible d’ouvrir la page de paiement. Réessaie.');
      }
      return;
    }
    Alert.alert('Erreur', 'Aucun lien de paiement reçu. Réessaie.');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <StandardHeader title="ALIGN" />

        {/* Titre principal — 1 ligne sur desktop, Bowlby One SC, gradient */}
        <GradientText colors={PAYWALL_GRADIENT} style={[styles.headline, { fontFamily: fontTitle, maxWidth: headlineMaxWidth, fontSize: headlineFontSize }]}>
          TON AVENIR MÉRITE MIEUX QUE LE HASARD.
        </GradientText>

        {/* Sous-titre — Nunito Black */}
        <Text style={[styles.subtitle, { fontFamily: fontButton, maxWidth: contentMaxWidth }]}>
          T'as répondu à 80 questions sur toi-même. La plupart des gens passent des années à chercher leur voie, toi, t'es à 9€ de la trouver.
        </Text>

        <View style={[styles.paragraphWrap, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.paragraph, { fontFamily: fontButton }]}>
            Un conseiller d'orientation te facture 60€ pour une heure. Il t'écoute, il hoche la tête, et il te sort les mêmes formations que tout le monde. Align a fait l'inverse. 80 questions sur ta personnalité, tes forces, ta façon de penser. Pour te donner une réponse qui te correspond vraiment, pas une réponse qui correspond à tout le monde.
          </Text>
          <Text style={[styles.paragraph, { fontFamily: fontButton, marginTop: 12 }]}>
            Ton résultat t'attend.
          </Text>
        </View>

        {/* Section "Voici ce que tu débloques" — Nunito ExtraBold, gradient */}
        <GradientText colors={PAYWALL_GRADIENT} style={[styles.sectionTitle, { fontFamily: fontButton, maxWidth: contentMaxWidth }]}>
          VOICI CE QUE TU DÉBLOQUES DÈS MAINTENANT :
        </GradientText>

        {/* Cartes bénéfices — quinconce, glow halo */}
        <View style={styles.benefitsContainer}>
          {BENEFITS.map((item, index) => (
            <View
              key={index}
              style={[
                styles.benefitCardWrap,
                index % 2 === 0 ? styles.benefitCardLeft : styles.benefitCardRight,
                { maxWidth: contentMaxWidth },
              ]}
            >
              <View style={styles.benefitCard}>
                <Text style={styles.benefitEmoji}>{item.emoji}</Text>
                <Text style={[styles.benefitTitle, { fontFamily: fontTitle }]}>{item.title}</Text>
                <Text style={[styles.benefitDescription, { fontFamily: fontButton }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <GradientText colors={PAYWALL_GRADIENT} style={[styles.paragraphHighlight, { fontFamily: fontButton, textAlign: 'center', marginBottom: 16 }]}>
          Rejoins +40 jeunes qui ont trouvé leur direction.
        </GradientText>

        {/* Pricing card — paiement unique 9€, centrée */}
        <View style={[styles.pricingRow, isNarrow && styles.pricingRowNarrow, isMobile && styles.pricingRowMobile, { alignSelf: 'center' }]}>
          <TouchableOpacity
            style={[styles.pricingCardAnnuelWrap, isMobile && styles.pricingCardMobileWrap]}
            activeOpacity={0.9}
            disabled={checkoutLoading}
            onPress={() => {
              setSelectedPlan('lifetime');
              confirmPlanSelection();
            }}
          >
            <View style={[styles.pricingCardBorderWrap, selectedPlan === 'lifetime' && styles.pricingCardSelected]}>
              <LinearGradient
                colors={['#2A1A0A', '#FF7B2B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.pricingCardAnnuel, isMobile && styles.pricingCardMobile]}
              >
                <Text
                  style={[
                    styles.pricingTitle,
                    styles.pricingTextCenter,
                    { fontFamily: fontButton, fontSize: pricingTitleFontSize + 2 },
                  ]}
                  numberOfLines={1}
                >
                  ACCÈS À VIE
                </Text>
                <Text
                  style={[
                    styles.pricingPrice,
                    styles.pricingTextCenter,
                    { fontFamily: fontTitle, fontSize: 40 },
                  ]}
                >
                  9€
                </Text>
                <Text style={[styles.pricingSmall, styles.pricingTextCenter, { fontFamily: fontButton }]}>
                  Paiement unique · Jamais d'abonnement
                </Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Sticky CTA — full width, arrondis en haut uniquement */}
      <View style={[styles.stickyCtaOuter, isMobile && styles.stickyCtaOuterMobile]}>
        <View style={[styles.stickyCtaInner, isMobile && styles.stickyCtaInnerMobile]}>
          <TouchableOpacity
            style={[styles.ctaButton, isMobile && styles.ctaButtonMobile]}
            activeOpacity={0.9}
            onPress={confirmPlanSelection}
            disabled={checkoutLoading}
          >
            <LinearGradient
              colors={PAYWALL_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaButtonGradient, isMobile && styles.ctaButtonGradientMobile]}
            >
              {checkoutLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.ctaButtonText, { fontFamily: fontTitle, fontSize: ctaButtonFontSize }]} numberOfLines={1}>
                  DÉBLOQUER MA DIRECTION
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaReassurance}>
            <Text style={styles.ctaCheck}>✔</Text> Paiement sécurisé · Accès immédiat
          </Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14161D',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 24,
    marginTop: 20,
    marginBottom: 36,
    width: '100%',
    maxWidth: 720,
  },
  pricingRowNarrow: {
    gap: 16,
  },
  pricingRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
    paddingHorizontal: 16,
    maxWidth: '100%',
  },
  pricingCardMobileWrap: {
    minWidth: 0,
    width: '100%',
  },
  pricingCardMobile: {
    borderWidth: 2,
    padding: 20,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingCardAnnuelWrap: {
    flex: 1,
    minWidth: 200,
    position: 'relative',
    alignItems: 'center',
  },
  pricingCardMensuelWrap: {
    flex: 1,
    minWidth: 180,
  },
  pricingCardBorderWrap: {
    flex: 1,
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF7B2B',
    overflow: 'hidden',
  },
  pricingCardSelected: {
    borderColor: '#FF7B2B',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 0 2px rgba(255, 123, 43, 0.9)' }),
  },
  pricingCardAnnuel: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingCardMensuel: {
    flex: 1,
    width: '100%',
    minWidth: 180,
    backgroundColor: '#2D3241',
    borderWidth: 4,
    borderColor: '#515151',
    borderRadius: 20,
    padding: 24,
    paddingTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingTextCenter: {
    textAlign: 'center',
    width: '100%',
  },
  pricingTitle: {
    fontWeight: '800',
    fontSize: 20,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  pricingPrice: {
    fontWeight: '900',
    fontSize: 30,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  pricingSmall: {
    fontWeight: '700',
    fontSize: 13,
    color: '#FFFFFF',
  },
  headline: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 36,
    letterSpacing: 0.5,
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  subtitle: {
    fontWeight: '900',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  paragraphWrap: {
    marginBottom: 28,
    alignItems: 'center',
  },
  paragraph: {
    fontWeight: '800',
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 6,
  },
  paragraphRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paragraphPlain: {
    fontWeight: '800',
    fontSize: 15,
    color: '#FFFFFF',
  },
  paragraphHighlight: {
    fontWeight: '800',
    fontSize: 15,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 24,
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  benefitsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  benefitCardWrap: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  benefitCardLeft: {
    alignItems: 'flex-start',
    paddingRight: 24,
  },
  benefitCardRight: {
    alignItems: 'flex-end',
    paddingLeft: 24,
  },
  benefitCard: {
    backgroundColor: '#1A1B23',
    borderWidth: 1,
    borderColor: '#FF7B2B',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 520,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 50px 10px rgba(255, 123, 43, 0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FF7B2B',
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 50,
      shadowOpacity: 0.35,
      elevation: 12,
    }),
  },
  benefitEmoji: {
    fontSize: 30,
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 10,
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  benefitDescription: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
  },
  stickyCtaOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: '#14161D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 -40px 50px 12px rgba(255, 123, 43, 0.2)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FF7B2B',
      shadowOffset: { width: 0, height: -16 },
      shadowRadius: 40,
      shadowOpacity: 0.2,
      elevation: 24,
    }),
  },
  stickyCtaOuterMobile: {
    ...(Platform.OS !== 'web' && {
      shadowOffset: { width: 0, height: -6 },
      shadowRadius: 12,
      shadowOpacity: 0.15,
      elevation: 12,
    }),
  },
  stickyCtaInner: {
    paddingTop: 24,
    paddingBottom: Platform.OS === 'web' ? 28 : 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  stickyCtaInnerMobile: {
    paddingTop: 20,
    paddingBottom: Platform.OS === 'web' ? 24 : 28,
    paddingHorizontal: 20,
  },
  ctaButton: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    minHeight: 56,
  },
  ctaButtonMobile: {
    minHeight: 52,
  },
  ctaButtonGradientMobile: {
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  ctaButtonText: {
    fontSize: 21,
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '700',
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  ctaReassurance: {
    fontFamily: theme.fonts.button,
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
  },
  ctaCheck: {
    color: '#FF7B2B',
  },
});

export default PaywallScreen;
