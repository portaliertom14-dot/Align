/**
 * Écran "Nouveau mot de passe" — après clic sur le lien de réinitialisation (Supabase recovery).
 * Web : lit window.location.hash, extrait access_token + refresh_token, appelle setSession, puis affiche le formulaire.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getSession, updateUserPassword } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';
import { getResetPasswordHash } from '../../lib/resetPasswordHashStore';
import { setRecoveryModeActive, clearRecoveryMode, hasRecoveryErrorInUrl } from '../../lib/recoveryMode';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
const MIN_PASSWORD_LENGTH = 8;
const SESSION_WAIT_MS = 2000;

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const { signOut } = useAuth();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isWeb = typeof window !== 'undefined' && window.location;
      if (!isWeb) {
        const { session } = await getSession();
        if (!cancelled) {
          setHasValidSession(!!session);
          setCheckingSession(false);
        }
        return;
      }

      if (hasRecoveryErrorInUrl()) {
        if (!cancelled) {
          setHasValidSession(false);
          setCheckingSession(false);
          if (typeof window !== 'undefined') window.history.replaceState({}, document.title, '/reset-password');
          clearRecoveryMode();
        }
        return;
      }
      // Lire les tokens depuis le hash, la query, ou le hash capturé par App (fallback).
      const rawHash = window.location.hash || getResetPasswordHash() || '';
      const hash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
      const search = window.location.search || '';
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(search);
      const access_token = hashParams.get('access_token') || queryParams.get('access_token');
      const refresh_token = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      const code = queryParams.get('code') || hashParams.get('code');

      // 1) Flux PKCE : ?code=... (échange contre une session)
      if (code && (!access_token || !refresh_token)) {
        const { data: codeData, error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && !codeError && codeData?.session) {
          setHasValidSession(true);
          if (typeof window !== 'undefined') window.history.replaceState({}, document.title, '/reset-password');
        } else if (!cancelled) {
          setHasValidSession(false);
          if (typeof window !== 'undefined') window.history.replaceState({}, document.title, window.location.pathname);
        }
        setCheckingSession(false);
        return;
      }

      if (!access_token || !refresh_token) {
        // 2) Attendre jusqu’à SESSION_WAIT_MS que la session soit disponible (getSession ou detectSessionInUrl).
        const deadline = Date.now() + SESSION_WAIT_MS;
        let session = null;
        while (Date.now() < deadline && !cancelled) {
          const { data: sessData } = await supabase.auth.getSession();
          session = sessData?.session ?? null;
          if (session) break;
          await new Promise((r) => setTimeout(r, 300));
        }
        if (!cancelled) {
          setHasValidSession(!!session);
          if (!session) {
            clearRecoveryMode();
            if (typeof window !== 'undefined') window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        setCheckingSession(false);
        return;
      }

      setRecoveryModeActive(true);
      const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });

      if (cancelled) return;

      if (setSessionError) {
        setHasValidSession(false);
        clearRecoveryMode();
        if (typeof window !== 'undefined') window.history.replaceState({}, document.title, window.location.pathname);
        setCheckingSession(false);
        return;
      }

      const { data: sessData } = await supabase.auth.getSession();
      const session = sessData?.session ?? null;

      if (cancelled) return;

      if (session) {
        setHasValidSession(true);
        if (typeof window !== 'undefined') window.history.replaceState({}, document.title, '/reset-password');
      } else {
        setHasValidSession(false);
        clearRecoveryMode();
        if (typeof window !== 'undefined') window.history.replaceState({}, document.title, window.location.pathname);
      }
      setCheckingSession(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleUpdate = async () => {
    setError('');
    const p = password.trim();
    const c = confirm.trim();
    if (p.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }
    if (p !== c) {
      setError('Les deux champs doivent être identiques.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await updateUserPassword(p);
      if (err) {
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('same') || msg.includes('identique')) {
          setError('Le nouveau mot de passe doit être différent de l\'ancien.');
        } else {
          setError('Impossible de mettre à jour le mot de passe. Réessaie.');
        }
        setLoading(false);
        return;
      }
      clearRecoveryMode();
      if (typeof window !== 'undefined') window.history.replaceState({}, document.title, '/reset-password');
      await signOut();
      setSuccess(true);
    } catch (e) {
      setError('Impossible de mettre à jour le mot de passe. Réessaie.');
    }
    setLoading(false);
  };

  const backAction = (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ padding: 8 }}>
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );

  if (checkingSession) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={backAction} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF7B2B" />
          <Text style={styles.loadingText}>Chargement…</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!hasValidSession) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={backAction} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
            <Text style={styles.invalidText}>Lien invalide ou expiré</Text>
            <Text style={styles.invalidSubtext}>Redemande un lien de réinitialisation.</Text>
            <HoverableTouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('ForgotPassword')}
              activeOpacity={0.8}
              variant="button"
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>RÉINITIALISER MON MOT DE PASSE</Text>
              </LinearGradient>
            </HoverableTouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  if (success) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={backAction} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.successTitle}>Mot de passe mis à jour</Text>
            <Text style={styles.successText}>Tu peux te reconnecter.</Text>
            <HoverableTouchableOpacity
              style={styles.button}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.8}
              variant="button"
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>SE CONNECTER</Text>
              </LinearGradient>
            </HoverableTouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
      <StandardHeader title="ALIGN" leftAction={backAction} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content} dataSet={{ clarityMask: 'true' }}>
          <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
          <Text style={styles.subtitle}>Entre ton nouveau mot de passe.</Text>
          <TextInput
            style={styles.input}
            placeholder="Nouveau mot de passe"
            placeholderTextColor="rgba(255, 255, 255, 0.40)"
            value={password}
            onChangeText={(t) => { setPassword(t); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirmer"
            placeholderTextColor="rgba(255, 255, 255, 0.40)"
            value={confirm}
            onChangeText={(t) => { setConfirm(t); setError(''); }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <HoverableTouchableOpacity
            style={styles.button}
            onPress={handleUpdate}
            disabled={loading}
            activeOpacity={0.8}
            variant="button"
          >
            <LinearGradient
              colors={['#FF7B2B', '#FFD93F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              {loading ? (
                <Text style={styles.buttonText}>Chargement…</Text>
              ) : (
                <Text style={styles.buttonText}>METTRE À JOUR</Text>
              )}
            </LinearGradient>
          </HoverableTouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  title: {
    fontSize: Math.min(Math.max(width * 0.042, 20), 28),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    maxWidth: CONTENT_WIDTH,
  },
  invalidText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: CONTENT_WIDTH,
  },
  invalidSubtext: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 24,
    maxWidth: CONTENT_WIDTH,
  },
  input: {
    width: CONTENT_WIDTH,
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 0,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    maxWidth: CONTENT_WIDTH,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  errorText: {
    color: '#EC3912',
    fontSize: 14,
    fontFamily: theme.fonts.button,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    width: CONTENT_WIDTH,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  successTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.title,
    color: '#34C659',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  successText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  backButtonText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
});
