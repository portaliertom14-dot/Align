/**
 * Écran de retour après paiement Stripe réussi.
 * Stripe redirige vers success_url avec ?checkout=success&session_id=xxx.
 * On restaure le payload stocké (paywall_return_payload) et on redirige vers ResultJob.
 * Marque aussi le checkout comme réussi pour court-circuiter la vérification premium si le webhook tarde.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

const PAYWALL_RETURN_PAYLOAD_KEY = 'paywall_return_payload';
const CHECKOUT_SUCCESS_KEY = 'align_checkout_success';

function PaywallSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
          // Naviguer vers ResultJob avec le payload et un flag indiquant le checkout success
          navigation.replace('ResultJob', { ...payload, fromCheckoutSuccess: true });
        } else {
          // Pas de payload — naviguer vers le home ou Paywall
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
