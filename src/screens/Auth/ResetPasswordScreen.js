/**
 * Écran "Nouveau mot de passe" — après clic sur le lien de réinitialisation (Supabase recovery).
 * Web : lit window.location.hash, extrait access_token + refresh_token, appelle setSession, puis affiche le formulaire.
 * Bloc DEBUG RESET visible temporairement pour diagnostic.
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
  Platform,
} from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getSession, updateUserPassword, signOut } from '../../services/auth';
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
const MIN_PASSWORD_LENGTH = 8;

const initialDebugReset = () => {
  if (typeof window === 'undefined' || !window.location) {
    return { href: '', hash: '', hashLen: 0, accessTokenLen: 0, refreshTokenLen: 0, type: '', step: 'NOT_WEB', error: '' };
  }
  const href = window.location.href || '';
  const hash = window.location.hash || '';
  return {
    href: href.length > 80 ? href.slice(0, 80) + '…' : href,
    hash: hash.length > 60 ? hash.slice(0, 60) + '…' : hash,
    hashLen: hash.length,
    accessTokenLen: 0,
    refreshTokenLen: 0,
    type: '',
    step: 'INIT',
    error: '',
  };
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [debugReset, setDebugReset] = useState(initialDebugReset);

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

      const hash = window.location.hash || '';
      const href = window.location.href || '';
      setDebugReset((prev) => ({
        ...prev,
        href: href.length > 80 ? href.slice(0, 80) + '…' : href,
        hash: hash.length > 60 ? hash.slice(0, 60) + '…' : hash,
        hashLen: hash.length,
        step: 'HASH_READ',
      }));

      const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const type = params.get('type') || '';

      setDebugReset((prev) => ({
        ...prev,
        accessTokenLen: (access_token || '').length,
        refreshTokenLen: (refresh_token || '').length,
        type,
        step: access_token && refresh_token ? 'PARSE_OK' : 'NO_TOKENS',
      }));

      if (!access_token || !refresh_token) {
        if (!cancelled) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
        return;
      }

      setDebugReset((prev) => ({ ...prev, step: 'SET_SESSION_START' }));

      const { data, error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });

      if (cancelled) return;

      if (setSessionError) {
        setDebugReset((prev) => ({
          ...prev,
          step: 'SET_SESSION_ERROR',
          error: setSessionError.message || String(setSessionError),
        }));
        setHasValidSession(false);
        setCheckingSession(false);
        return;
      }

      setDebugReset((prev) => ({ ...prev, step: 'SET_SESSION_OK' }));

      const { data: sessData } = await supabase.auth.getSession();
      const session = sessData?.session ?? null;

      if (cancelled) return;

      if (session) {
        setDebugReset((prev) => ({ ...prev, step: 'SESSION_OK', error: '' }));
        setHasValidSession(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setDebugReset((prev) => ({
          ...prev,
          step: 'SESSION_MISSING',
          error: 'getSession() vide après setSession',
        }));
        setHasValidSession(false);
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

  const debugBlock = (
    <View style={styles.debugBox}>
      <Text style={styles.debugLabel}>DEBUG RESET</Text>
      <Text style={styles.debugText}>
        href = {debugReset.href || '—'}{'\n'}
        hash = {debugReset.hash || '(empty)'}{'\n'}
        hashLen = {debugReset.hashLen}{'\n'}
        accessTokenLen = {debugReset.accessTokenLen}{'\n'}
        refreshTokenLen = {debugReset.refreshTokenLen}{'\n'}
        type = {debugReset.type || '—'}{'\n'}
        step = {debugReset.step}{'\n'}
        {debugReset.error ? `error = ${debugReset.error}` : null}
      </Text>
    </View>
  );

  if (checkingSession) {
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={backAction} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#FF7B2B" />
            <Text style={styles.loadingText}>Chargement…</Text>
          </View>
          <View style={styles.content}>{debugBlock}</View>
        </ScrollView>
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
            {debugBlock}
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
            {debugBlock}
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
        <View style={styles.content}>
          <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
          <Text style={styles.subtitle}>Entre ton nouveau mot de passe.</Text>
          {debugBlock}
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
  debugBox: {
    backgroundColor: 'rgba(80,80,80,0.5)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    maxWidth: CONTENT_WIDTH,
    width: '100%',
  },
  debugLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.button,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 8,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: 'rgba(255,255,255,0.9)',
  },
  copyButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    fontSize: 13,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
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
