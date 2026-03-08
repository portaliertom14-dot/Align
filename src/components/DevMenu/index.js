/**
 * Menu dev : uniquement en __DEV__. Permet de sauter vers n'importe quel écran
 * sans refaire tout le parcours. Pour que les modules fonctionnent, il faut être
 * connecté : utiliser "Se connecter (compte test)" avec un compte configuré en .env.
 * Aucun impact en production (tout est sous __DEV__).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { navigationRef, isReadyRef, safeReset } from '../../navigation/navigationRef';
import { signIn } from '../../services/auth';

// Compte test (dev uniquement) : EXPO_PUBLIC_DEV_TEST_EMAIL / EXPO_PUBLIC_DEV_TEST_PASSWORD
function getDevTestCredentials() {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  const email = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_TEST_EMAIL;
  const password = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_TEST_PASSWORD;
  if (email && password) return { email: email.trim(), password };
  return null;
}

// Liste des écrans accessibles en dev. On utilise reset pour remplacer toute la pile.
const DEV_SCREENS = [
  { label: 'Welcome', route: 'Welcome' },
  { label: 'Login', route: 'Login' },
  {
    label: 'Feed',
    route: 'Main',
    params: { screen: 'Feed', params: { fromOnboardingComplete: true } },
  },
  { label: 'ChargementRoutine', route: 'ChargementRoutine' },
  {
    label: 'ResultJob (secteur dev)',
    route: 'ResultJob',
    params: {
      sectorId: 'ingenierie_tech',
      firstTitle: 'Ingénieur logiciel',
      hasTopJobs: true,
      topJobsLength: 1,
    },
  },
  {
    label: 'TonMetierDefini',
    route: 'TonMetierDefini',
    params: { sectorId: 'ingenierie_tech', jobTitle: 'Ingénieur logiciel' },
  },
  { label: 'FinCheckpoints', route: 'FinCheckpoints' },
  { label: 'Paywall', route: 'Paywall' },
  { label: 'Settings', route: 'Settings' },
  { label: 'Quiz', route: 'Quiz' },
  { label: 'ResultatSecteur', route: 'ResultatSecteur' },
];

function DevMenu() {
  const [visible, setVisible] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const handleDevLogin = async () => {
    setVisible(false);
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    const creds = getDevTestCredentials();
    if (!creds) {
      Alert.alert(
        'Compte test non configuré',
        'Ajoute EXPO_PUBLIC_DEV_TEST_EMAIL et EXPO_PUBLIC_DEV_TEST_PASSWORD dans ton .env (compte Supabase avec onboarding déjà fait une fois).'
      );
      return;
    }
    setSigningIn(true);
    try {
      const { user, error } = await signIn(creds.email, creds.password);
      if (error) {
        Alert.alert('Connexion test échouée', error.message || 'Vérifie email/mdp dans .env');
        return;
      }
      if (user) {
        // La session est définie ; RootGate va afficher AppStack si onboarding_completed.
        if (isReadyRef.current && navigationRef.isReady()) {
          setTimeout(() => {
            safeReset('Main', { screen: 'Feed', params: { fromOnboardingComplete: true } });
          }, 300);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message || String(e));
    } finally {
      setSigningIn(false);
    }
  };

  const goTo = (item) => {
    setVisible(false);
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    const run = () => {
      if (!isReadyRef.current || !navigationRef.isReady()) {
        if (console.warn) console.warn('[DevMenu] Navigation pas prête');
        return;
      }
      try {
        const params = item.params ?? undefined;
        const ok = safeReset(item.route, params);
        if (!ok && console.warn) console.warn('[DevMenu] safeReset returned false');
      } catch (e) {
        if (console.warn) console.warn('[DevMenu] safeReset error', e?.message ?? e);
      }
    };
    setTimeout(run, 100);
  };

  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;

  const hasDevCreds = !!getDevTestCredentials();

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel="Menu dev"
      >
        <Text style={styles.fabText}>Dev</Text>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.title}>Dev — Aller à l’écran</Text>
            <Text style={styles.hint}>
              Pour lancer les modules, connecte-toi d’abord avec le compte test.
            </Text>
            <TouchableOpacity
              style={[styles.item, styles.devLoginButton]}
              onPress={handleDevLogin}
              disabled={signingIn}
              activeOpacity={0.7}
            >
              {signingIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.itemText, styles.devLoginText]}>
                  {hasDevCreds ? 'Se connecter (compte test)' : 'Compte test (configurer .env)'}
                </Text>
              )}
            </TouchableOpacity>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {DEV_SCREENS.map((item, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.item}
                  onPress={() => goTo(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.itemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setVisible(false)}
            >
              <Text style={styles.closeBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 24 : 100,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(80, 60, 200, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  fabText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1B23',
    borderRadius: 12,
    padding: 16,
    maxWidth: 320,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
  },
  devLoginButton: {
    backgroundColor: 'rgba(80, 60, 200, 0.8)',
    borderRadius: 8,
    marginBottom: 8,
  },
  devLoginText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    maxHeight: 400,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  itemText: {
    color: '#e0e0e0',
    fontSize: 15,
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#888',
    fontSize: 14,
  },
});

export default DevMenu;
