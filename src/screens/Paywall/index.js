/**
 * Paywall — Page de conversion (UI seule, pas d’intégration Stripe).
 * Structure : cartes tarifaires, headline, sous-titre, paragraphe, titres de section,
 * cartes bénéfices en zigzag, CTA fixe en bas.
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  useWindowDimensions,
  Platform,
  TouchableOpacity,
  Modal,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';
import { theme } from '../../styles/theme';
import { createCheckoutSession } from '../../services/stripeService';

const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';
const PAYWALL_GRADIENT = ['#FF7B2B', '#FFD93F'];

const BENEFITS = [
  {
    emoji: '🎯',
    title: "UN MÉTIER QUI TE CORRESPOND PARFAITEMENT",
    description: "Enfin savoir vers quoi avancer. Pas dans le doute. Pas au hasard.",
  },
  {
    emoji: '🎬',
    title: "L'IMMERSION COMPLÈTE",
    description: "Vis concrètement le quotidien du métier\ngrâce à des mini-simulations immersives.",
  },
  {
    emoji: '🧠',
    title: "UNE VALIDATION PROFONDE",
    description: "Comprends pourquoi ce métier peut vraiment\ncorrespondre à ta personnalité et à tes forces.",
  },
  {
    emoji: '🚀',
    title: "UN PLAN CONCRET POUR AVANCER",
    description: "Sais quoi viser, quoi apprendre\net quoi commencer dès maintenant.",
  },
  {
    emoji: '🔥',
    title: "UN PARCOURS STRUCTURÉ",
    description: "Passe du doute à la clarté\npendant que les autres hésitent encore.",
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
  const ctaButtonFontSize = isMobile ? 16 : 21;
  // Titre sur une seule ligne sur grands écrans : largeur max + taille responsive
  const headlineMaxWidth = width >= 768 ? Math.min(920, width - 48) : contentMaxWidth;
  const headlineFontSize = width >= 1024 ? 32 : width >= 768 ? 28 : isMobile ? 20 : 26;
  const navigation = useNavigation();
  const route = useRoute();
  const resultJobPayload = route.params?.resultJobPayload;

  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [selectedPlan, setSelectedPlan] = useState('annuel');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalSelectedPlan, setModalSelectedPlan] = useState('annuel');

  // Retour depuis Stripe (annulation) : rouvrir le modal "Choisis ton plan"
  // Support des deux formats : checkout=cancel (nouveau) et cancel=true (legacy)
  const openModalFromReturn = useMemo(() => {
    if (route.params?.openModal === true || route.params?.cancel === true) return true;
    // Vérifier aussi l'URL directement pour le retour depuis Stripe
    if (typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('checkout') === 'cancel' || params.get('cancel') === 'true') return true;
    }
    return false;
  }, [route.params?.openModal, route.params?.cancel]);

  useEffect(() => {
    if (!openModalFromReturn) return;
    setModalVisible(true);
    if (route.params?.plan === 'mensuel') {
      setSelectedPlan('mensuel');
      setModalSelectedPlan('mensuel');
    } else {
      setSelectedPlan('annuel');
      setModalSelectedPlan('annuel');
    }
  }, [openModalFromReturn, route.params?.plan]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const minutes = Math.max(0, Math.floor(remainingSeconds / 60));
  const seconds = Math.max(0, remainingSeconds % 60);
  const timerLabel = remainingSeconds <= 0 ? 'Offre terminée' : `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const openPlanModal = () => {
    setModalSelectedPlan(selectedPlan);
    setModalVisible(true);
  };

  const confirmPlanSelection = async () => {
    setSelectedPlan(modalSelectedPlan);
    setModalVisible(false);

    const plan = modalSelectedPlan === 'annuel' ? 'yearly' : 'monthly';
    if (resultJobPayload && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        window.sessionStorage.setItem(PAYWALL_RETURN_PAYLOAD_KEY, JSON.stringify(resultJobPayload));
      } catch (_) {}
    }

    const result = await createCheckoutSession(plan);
    if (result.error) {
      Alert.alert('Erreur', result.error === 'Non connecté' ? 'Connecte-toi pour continuer.' : result.error);
      return;
    }
    if (result.url) {
      if (Platform.OS === 'web') {
        window.location.href = result.url;
      } else {
        await Linking.openURL(result.url);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <StandardHeader title="ALIGN" />

        {/* Pricing cards — cliquables, sélection visuelle */}
        <View style={[styles.pricingRow, isNarrow && styles.pricingRowNarrow, isMobile && styles.pricingRowMobile]}>
          <TouchableOpacity
            style={[styles.pricingCardAnnuelWrap, isMobile && styles.pricingCardMobileWrap]}
            activeOpacity={0.9}
            onPress={() => setSelectedPlan('annuel')}
          >
            <View style={styles.timerBadgeWrap}>
              <View style={styles.timerBadge}>
                <Text style={styles.timerBadgeText}>{timerLabel}</Text>
              </View>
            </View>
            <View style={[styles.pricingCardAnnuel, selectedPlan === 'annuel' && styles.pricingCardSelected]}>
              <Text style={[styles.pricingTitle, styles.pricingTextCenter, { fontFamily: fontButton }]}>ANNUEL</Text>
              <Text style={[styles.pricingPrice, styles.pricingTextCenter, { fontFamily: fontButton }]}>2,16€/mo</Text>
              <Text style={[styles.pricingSmall, styles.pricingTextCenter, { fontFamily: fontButton }]}>26€ facturés par an</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pricingCardMensuelWrap, isMobile && styles.pricingCardMobileWrap]}
            activeOpacity={0.9}
            onPress={() => setSelectedPlan('mensuel')}
          >
            <View style={[styles.pricingCardMensuel, selectedPlan === 'mensuel' && styles.pricingCardSelected]}>
              <Text style={[styles.pricingTitle, styles.pricingTextCenter, { fontFamily: fontButton }]}>MENSUEL</Text>
              <Text style={[styles.pricingPrice, styles.pricingTextCenter, { fontFamily: fontButton }]}>4.99€</Text>
              <Text style={[styles.pricingSmall, styles.pricingTextCenter, { fontFamily: fontButton }]}>Payable en une fois</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Titre principal — 1 ligne sur desktop, Bowlby One SC, gradient */}
        <GradientText colors={PAYWALL_GRADIENT} style={[styles.headline, { fontFamily: fontTitle, maxWidth: headlineMaxWidth, fontSize: headlineFontSize }]}>
          TON AVENIR MÉRITE MIEUX QUE LE HASARD.
        </GradientText>

        {/* Sous-titre — Nunito Black */}
        <Text style={[styles.subtitle, { fontFamily: fontButton, maxWidth: contentMaxWidth }]}>
          Align n'est pas une liste de métiers. C'est un système conçu pour te donner une vraie direction.
        </Text>

        {/* Paragraphe — "+400 jeunes" en gradient, reste en blanc */}
        <View style={[styles.paragraphWrap, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.paragraph, { fontFamily: fontButton }]}>
            Tu explores. Tu testes. Tu te projettes. Tu comprends. Et surtout : tu prends de l'avance pendant que les autres hésitent encore.{' '}
          </Text>
          <View style={styles.paragraphRow}>
            <Text style={[styles.paragraphPlain, { fontFamily: fontButton }]}>Rejoins </Text>
            <GradientText colors={PAYWALL_GRADIENT} style={styles.paragraphHighlight}>
              +400 jeunes
            </GradientText>
            <Text style={[styles.paragraphPlain, { fontFamily: fontButton }]}> déjà inscrits.</Text>
          </View>
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

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Sticky CTA — full width, arrondis en haut uniquement */}
      <View style={styles.stickyCtaOuter}>
        <View style={styles.stickyCtaInner}>
          <TouchableOpacity
            style={[styles.ctaButton, isMobile && styles.ctaButtonMobile]}
            activeOpacity={0.9}
            onPress={openPlanModal}
          >
            <LinearGradient
              colors={PAYWALL_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.ctaButtonGradient, isMobile && styles.ctaButtonGradientMobile]}
            >
              <Text style={[styles.ctaButtonText, { fontFamily: fontTitle, fontSize: ctaButtonFontSize }]}>DÉBLOQUER MA DIRECTION</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaReassurance}>
            <Text style={styles.ctaCheck}>✔</Text> Annulable à tout moment. Accès immédiat.
          </Text>
        </View>
      </View>

      {/* Modal "Choisis ton plan" — design image 2 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { fontFamily: fontTitle }]}>CHOISIS TON PLAN</Text>

            {/* Ligne ANNUEL — empilée, pleine largeur */}
            <TouchableOpacity
              style={[styles.modalPlanRow, styles.modalPlanRowAnnuel, modalSelectedPlan === 'annuel' && styles.modalPlanRowSelected]}
              activeOpacity={0.95}
              onPress={() => setModalSelectedPlan('annuel')}
            >
              <View style={styles.modalPlanBadgeRecommandé}>
                <LinearGradient colors={PAYWALL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalPlanBadgeGradient}>
                  <Text style={[styles.modalPlanBadgeText, { fontFamily: fontButton }]}>RECOMMANDÉ</Text>
                </LinearGradient>
              </View>
              {modalSelectedPlan === 'annuel' ? (
                <View style={styles.modalPlanRadioSelected}>
                  <Text style={styles.modalPlanRadioCheck}>✓</Text>
                </View>
              ) : (
                <View style={styles.modalPlanRadioUnselected} />
              )}
              <Text style={[styles.modalPlanLabel, { fontFamily: fontButton }]}>ANNUEL</Text>
              <View style={styles.modalPlanPriceBlock}>
                <View style={styles.modalPlanPriceRow}>
                  <Text style={[styles.modalPlanPriceStrike, { fontFamily: fontButton }]}>4,99€</Text>
                  <Text style={[styles.modalPlanPriceCurrent, { fontFamily: fontTitle }]}>2,16€</Text>
                </View>
                <Text style={[styles.modalPlanPriceSub, { fontFamily: fontButton }]}>Par mois · 26€/an</Text>
              </View>
            </TouchableOpacity>

            {/* Ligne MENSUEL */}
            <TouchableOpacity
              style={[styles.modalPlanRow, styles.modalPlanRowMensuel, modalSelectedPlan === 'mensuel' && styles.modalPlanRowSelected]}
              activeOpacity={0.95}
              onPress={() => setModalSelectedPlan('mensuel')}
            >
              {modalSelectedPlan === 'mensuel' ? (
                <View style={styles.modalPlanRadioSelected}>
                  <Text style={styles.modalPlanRadioCheck}>✓</Text>
                </View>
              ) : (
                <View style={styles.modalPlanRadioUnselected} />
              )}
              <Text style={[styles.modalPlanLabel, { fontFamily: fontButton }]}>MENSUEL</Text>
              <View style={styles.modalPlanPriceBlock}>
                <Text style={[styles.modalPlanPriceCurrent, { fontFamily: fontTitle }]}>4,99€</Text>
                <Text style={[styles.modalPlanPriceSub, { fontFamily: fontButton }]}>Par mois</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCtaButton, isMobile && styles.modalCtaButtonMobile]}
              activeOpacity={0.9}
              onPress={confirmPlanSelection}
            >
              <LinearGradient
                colors={PAYWALL_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.modalCtaButtonGradient, isMobile && styles.modalCtaButtonGradientMobile]}
              >
                <Text style={[styles.modalCtaButtonText, { fontFamily: fontTitle }, isMobile && { fontSize: 14 }]}>DÉBLOQUER MA DIRECTION MAINTENANT</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.modalReassuranceWrap}>
              <View style={styles.modalReassuranceIcon}>
                <Text style={styles.modalReassuranceCheck}>✓</Text>
              </View>
              <Text style={[styles.modalReassuranceText, { fontFamily: fontButton }]}>Annulable à tout moment. Accès immédiat.</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingHorizontal: 8,
  },
  pricingCardMobileWrap: {
    minWidth: 0,
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
  pricingCardSelected: {
    borderColor: '#FFD93F',
    ...(Platform.OS === 'web' && { boxShadow: '0 0 0 2px rgba(255, 215, 63, 0.9)' }),
  },
  timerBadgeWrap: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    ...(Platform.OS !== 'web' && { elevation: 10 }),
  },
  timerBadge: {
    backgroundColor: 'rgba(115, 53, 19, 0.98)',
    borderWidth: 2,
    borderColor: '#FF7B2B',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  timerBadgeText: {
    fontSize: 15,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pricingCardAnnuel: {
    flex: 1,
    width: '100%',
    backgroundColor: '#733513',
    borderWidth: 4,
    borderColor: '#FF7B2B',
    borderRadius: 20,
    padding: 24,
    paddingTop: 48,
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
  stickyCtaInner: {
    paddingTop: 24,
    paddingBottom: Platform.OS === 'web' ? 28 : 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  ctaButton: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 24px rgba(255, 123, 43, 0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FF7B2B',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 24,
      shadowOpacity: 0.35,
      elevation: 8,
    }),
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
    paddingVertical: 14,
    paddingHorizontal: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1B23',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
    ...(Platform.OS === 'web' && { transition: 'border-color 180ms ease' }),
  },
  modalTitle: {
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  modalPlanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 10,
    position: 'relative',
    ...(Platform.OS === 'web' && { transition: 'border-color 180ms ease' }),
  },
  modalPlanRowAnnuel: {
    backgroundColor: '#733514',
    borderColor: '#515151',
  },
  modalPlanRowMensuel: {
    backgroundColor: '#2D3241',
    borderColor: '#515151',
  },
  modalPlanRowSelected: {
    borderColor: '#FFD93F',
  },
  modalPlanBadgeRecommandé: {
    position: 'absolute',
    top: -16,
    right: 12,
    zIndex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  modalPlanBadgeGradient: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  modalPlanBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '900',
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  modalPlanRadioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF7B2B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modalPlanRadioCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalPlanRadioUnselected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#515151',
    marginRight: 14,
  },
  modalPlanLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
    flex: 1,
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  modalPlanPriceBlock: {
    alignItems: 'flex-end',
  },
  modalPlanPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  modalPlanPriceStrike: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '900',
    textDecorationLine: 'line-through',
    textDecorationColor: '#7F7F7F',
  },
  modalPlanPriceCurrent: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalPlanPriceSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '900',
    marginTop: 2,
  },
  modalCtaButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 24px rgba(255, 123, 43, 0.35)',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FF7B2B',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 24,
      shadowOpacity: 0.35,
      elevation: 8,
    }),
  },
  modalCtaButtonMobile: {
    minHeight: 48,
  },
  modalCtaButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  modalCtaButtonGradientMobile: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalCtaButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    ...(Platform.OS === 'web' && { textTransform: 'uppercase' }),
  },
  modalReassuranceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalReassuranceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF7B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalReassuranceCheck: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalReassuranceText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default PaywallScreen;
