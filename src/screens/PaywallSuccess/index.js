/**
 * Écran de retour après paiement Stripe réussi.
 * Stripe redirige vers success_url avec ?checkout=success&session_id=xxx.
 * On restaure le payload stocké (paywall_return_payload) et on redirige vers PostPaymentMetierBridge (paywall après secteur) puis QuizMetier, ou ResultJob (paywall après analyse métier).
 * Marque aussi le checkout comme réussi pour court-circuiter la vérification premium si le webhook tarde.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePostHog } from 'posthog-react-native';
import { POST_PAYMENT_RESUME_STATE, isPostPaywallResumePayload } from '../../navigation/postPaywallResumeGate';
import { fetchPostPaywallResumeState } from '../../services/stripeService';

const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';
const CHECKOUT_SUCCESS_KEY = 'align_checkout_success';

function PaywallSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const posthog = usePostHog();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        let payload = null;
        let checkoutSuccess = false;

        // Vérifier si c'est un retour de checkout success (via URL ou route params)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location?.search || '');
          checkoutSuccess = urlParams.get('checkout') === 'success' || route.params?.checkout === 'success';
        }

        if (checkoutSuccess) {
          posthog.capture('checkout_completed', { plan: 'lifetime' });
        }

        // Marquer le checkout comme réussi pour le ResultJob (au cas où le webhook tarde)
        if (checkoutSuccess && typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem(CHECKOUT_SUCCESS_KEY, 'true');
          } catch (_) {}
        }

        // Récupérer le payload stocké
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            const raw = window.sessionStorage.getItem(PAYWALL_RETURN_PAYLOAD_KEY);
            if (raw) {
              payload = JSON.parse(raw);
              // On ne supprime pas encore le payload — ResultJob le fera après affichage
            }
          } catch (_) {}
        }

        if (cancelled) return;

        if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
          if (payload.kind === 'sector_quiz') {
            navigation.replace('PostPaymentMetierBridge', {
              sectorId: payload.sectorId,
              sectorRanked: Array.isArray(payload.sectorRanked) ? payload.sectorRanked : [],
              needsDroitRefinement: payload.needsDroitRefinement === true,
              fromCheckoutSuccess: true,
              ...(payload.variantOverride != null ? { variantOverride: payload.variantOverride } : {}),
            });
          } else if (payload.kind === 'result_job' && payload.payload && typeof payload.payload === 'object') {
            navigation.replace('ResultJob', { ...payload.payload, fromCheckoutSuccess: true });
          } else if (payload.kind == null && (payload.topJobs != null || payload.descriptionText != null)) {
            // Ancien format sessionStorage : payload métier brut sans enveloppe
            navigation.replace('ResultJob', { ...payload, fromCheckoutSuccess: true });
          } else {
            navigation.replace('Paywall');
          }
        } else {
          // Fallback DB (multi-device / session expirée) pour reprise post-paywall secteur.
          const resume = await fetchPostPaywallResumeState();
          const canResumeFromDb =
            resume?.resumeState === POST_PAYMENT_RESUME_STATE &&
            isPostPaywallResumePayload(resume?.resumePayload);
          if (canResumeFromDb) {
            console.log('[POST_PAYWALL_RESUME_REDIRECT]', JSON.stringify({
              phase: 'paywall_success_fallback',
              reason: 'db_resume_state',
              route: 'PostPaymentMetierBridge',
            }));
            navigation.replace('PostPaymentMetierBridge', {
              sectorId: resume.resumePayload.sectorId,
              sectorRanked: resume.resumePayload.sectorRanked,
              needsDroitRefinement: resume.resumePayload.needsDroitRefinement === true,
              fromCheckoutSuccess: true,
              ...(resume.resumePayload.variantOverride != null
                ? { variantOverride: resume.resumePayload.variantOverride }
                : {}),
            });
            return;
          }
          // Pas de payload exploitable — fallback historique.
          navigation.replace('Paywall');
        }
      } catch (e) {
        if (!cancelled && navigation.replace) navigation.replace('Paywall');
      } finally {
        if (!cancelled) setDone(true);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [navigation, route.params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF7B2B" />
      <Text style={styles.text}>Redirection vers ton résultat…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14161D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default PaywallSuccessScreen;
