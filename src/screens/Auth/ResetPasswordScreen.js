/**
 * Écran /reset-password — réinitialisation du mot de passe après clic sur le lien Supabase.
 * Lit le hash (access_token, refresh_token), setSession, formulaire nouveau mot de passe, updateUser, signOut, retour Login.
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { updateUserPassword, signOut } from '../../services/auth';
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';
import { parseAuthHashOrQuery, getParams, isRecoveryError, ALIGN_RECOVERY_HASH_KEY, ALIGN_RECOVERY_SEARCH_KEY } from '../../lib/recoveryUrl';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const { session: authSession, recoveryMode, clearRecoveryMode } = useAuth();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [tokensAbsent, setTokensAbsent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const setSessionRunOnceRef = useRef(false);
  const recoveryErrorSeenRef = useRef(false);
  const webNoTokensTimeoutRef = useRef(null);

  const isWeb = typeof window !== 'undefined' && window.location;
  const isMobileRecovery = !isWeb && recoveryMode;

  // Web : si on est sur /reset-password et qu'une session existe déjà (ex. hash consommé par Supabase detectSessionInUrl), afficher le formulaire.
  useEffect(() => {
    if (!isWeb || recoveryErrorSeenRef.current) return;
    const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
    const onResetPath = path === 'reset-password' || path.endsWith('/reset-password');
    if (onResetPath && authSession?.user?.id) {
      setHasValidSession(true);
      setTokensAbsent(false);
      setCheckingSession(false);
    }
  }, [isWeb, authSession?.user?.id]);

  // Mobile deep-link recovery : session vient du contexte (établie par handleRecoveryDeepLink).
  useEffect(() => {
    if (!isMobileRecovery) return;
    if (authSession?.user?.id) {
      setHasValidSession(true);
      setTokensAbsent(false);
      setCheckingSession(false);
    } else {
      setCheckingSession(true);
    }
  }, [isMobileRecovery, authSession?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const isWebCheck = typeof window !== 'undefined' && window.location;
      if (!isWebCheck) {
        if (typeof console !== 'undefined' && console.log) console.log('[RESET] mount (not web)');
        if (!isMobileRecovery) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
        return;
      }

      const locationHash = window.location.hash || '';
      const locationSearch = window.location.search || '';
      const storedHash = (function() { try { return sessionStorage.getItem(ALIGN_RECOVERY_HASH_KEY) || ''; } catch (e) { return ''; } })();
      const storedSearch = (function() { try { return sessionStorage.getItem(ALIGN_RECOVERY_SEARCH_KEY) || ''; } catch (e) { return ''; } })();
      const rawHash = locationHash || storedHash;
      const rawSearch = locationSearch || storedSearch;
      const hashPresent = rawHash.length > 0;
      const hashHead = rawHash.slice(0, 12);
      if (typeof console !== 'undefined' && console.log) {
        console.log('[RESET] mount hashPresent=', hashPresent, 'hasStoredHash=', !!storedHash, 'hasStoredSearch=', !!storedSearch);
      }

      const searchParams = new URLSearchParams((rawSearch || '').replace(/^\?/, ''));
      const hasRecoveryErrorQuery = searchParams.get('recovery_error') === '1';

      const combined = (rawHash ? rawHash.replace(/^#/, '') : '') + (rawSearch ? (rawHash ? '&' : '') + rawSearch.replace(/^\?/, '') : '');
      const params = combined ? new URLSearchParams(combined) : parseAuthHashOrQuery();
      const paramsObj = getParams(params);
      const code = params.get('code') || null;

      if (hasRecoveryErrorQuery || isRecoveryError(params)) {
        recoveryErrorSeenRef.current = true;
        if (window.history?.replaceState) {
          window.history.replaceState(null, '', window.location.origin + '/reset-password');
        }
        if (typeof console !== 'undefined' && console.log) console.log('[RECOVERY_FLOW] detected error (invalid/expired)');
        if (!cancelled) {
          setHasValidSession(false);
          setTokensAbsent(false);
          setCheckingSession(false);
        }
        return;
      }

      const { access_token, refresh_token } = paramsObj;

      // Web PKCE : URL avec code= au lieu de tokens (exchange puis formulaire).
      if (code && !access_token) {
        if (setSessionRunOnceRef.current) {
          if (!cancelled) setCheckingSession(false);
          return;
        }
        setSessionRunOnceRef.current = true;
        try {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setSessionRunOnceRef.current = false;
            if (!cancelled) {
              setHasValidSession(false);
              setTokensAbsent(true);
              setCheckingSession(false);
            }
            return;
          }
          if (window.history?.replaceState) {
            window.history.replaceState(null, '', window.location.origin + '/reset-password');
          }
          try { sessionStorage.removeItem(ALIGN_RECOVERY_HASH_KEY); sessionStorage.removeItem(ALIGN_RECOVERY_SEARCH_KEY); } catch (_) {}
          if (!cancelled) {
            setHasValidSession(true);
            setTokensAbsent(false);
            setCheckingSession(false);
          }
        } catch (e) {
          setSessionRunOnceRef.current = false;
          if (!cancelled) {
            setHasValidSession(false);
            setTokensAbsent(true);
            setCheckingSession(false);
          }
        }
        return;
      }

      if (!access_token || !refresh_token) {
        if (typeof console !== 'undefined' && console.log) console.log('[RESET] mode=none (no tokens)');
        // Web : Supabase (detectSessionInUrl) peut consommer le hash avant notre lecture. On sonde getSession() brièvement avant d'afficher "Demande un lien".
        if (isWebCheck) {
          const deadline = Date.now() + 2000;
          const poll = async () => {
            if (cancelled) return;
            if (Date.now() > deadline) {
              setHasValidSession(false);
              setTokensAbsent(true);
              setCheckingSession(false);
              return;
            }
            try {
              const { data } = await supabase.auth.getSession();
              if (data?.session?.user?.id) {
                setHasValidSession(true);
                setTokensAbsent(false);
                setCheckingSession(false);
                return;
              }
            } catch (_) {}
            if (!cancelled) webNoTokensTimeoutRef.current = setTimeout(poll, 250);
          };
          webNoTokensTimeoutRef.current = setTimeout(poll, 300);
          return;
        }
        if (!cancelled) {
          setHasValidSession(false);
          setTokensAbsent(true);
          setCheckingSession(false);
        }
        return;
      }

      if (setSessionRunOnceRef.current) {
        if (!cancelled) setCheckingSession(false);
        return;
      }
      setSessionRunOnceRef.current = true;
      if (typeof console !== 'undefined' && console.log) console.log('[RECOVERY_FLOW] detected');

      const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;

      if (setSessionError) {
        setSessionRunOnceRef.current = false;
        if (!cancelled) {
          setHasValidSession(false);
          setTokensAbsent(false);
          setCheckingSession(false);
        }
        return;
      }

      if (window.history?.replaceState) {
        window.history.replaceState(null, '', '/reset-password');
      }
      try { sessionStorage.removeItem(ALIGN_RECOVERY_HASH_KEY); sessionStorage.removeItem(ALIGN_RECOVERY_SEARCH_KEY); } catch (e) {}

      if (typeof console !== 'undefined' && console.log) console.log('[RECOVERY_FLOW] setSession ok');

      const { data: sessData } = await supabase.auth.getSession();
      const session = sessData?.session ?? null;
      const userId = session?.user?.id ?? null;

      if (userId && typeof console !== 'undefined' && console.log) {
        const { data: profileRow, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (profileError) {
          const status = profileError?.status ?? profileError?.code ?? 'unknown';
          if (String(status) === '401' || String(profileError?.message || '').includes('401')) {
            console.log('[RECOVERY_FLOW] RLS_DIAGNOSTIC', JSON.stringify({
              message: 'RLS/policy manquante sur user_profiles après setSession (recovery). La requête SELECT id FROM user_profiles WHERE id = :userId a retourné 401.',
              endpoint: 'user_profiles',
              query: 'select("id").eq("id", userId).maybeSingle()',
              statusCode: status,
            }));
          }
        }
      }

      if (!cancelled) {
        setHasValidSession(!!session);
        setTokensAbsent(false);
        setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
      if (webNoTokensTimeoutRef.current) {
        clearTimeout(webNoTokensTimeoutRef.current);
        webNoTokensTimeoutRef.current = null;
      }
    };
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
      if (recoveryMode) {
        clearRecoveryMode();
        // RootGate va afficher l'app principale (signedIn, pas de signOut).
      } else {
        await signOut();
        setSuccess(true);
      }
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
    const showExpiredMessage = recoveryErrorSeenRef.current;
    return (
      <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
        <StandardHeader title="ALIGN" leftAction={backAction} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.title}>NOUVEAU MOT DE PASSE</Text>
            <Text style={styles.invalidText}>
              {showExpiredMessage
                ? 'Ce lien est expiré ou a déjà été utilisé.'
                : tokensAbsent
                  ? 'Demande un lien de réinitialisation.'
                  : 'Lien invalide ou expiré'}
            </Text>
            <Text style={styles.invalidSubtext}>
              {showExpiredMessage ? 'Clique ci-dessous pour recevoir un nouveau lien par email.' : tokensAbsent ? '' : 'Redemande un lien de réinitialisation.'}
            </Text>
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
                <Text style={styles.buttonText}>Renvoyer un lien</Text>
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
        <View style={styles.content}>
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>ENREGISTRER</Text>
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
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  title: {
    fontSize: Math.min(Math.max(width * 0.042, 20), 28),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 24,
  },
  invalidText: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  invalidSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: CONTENT_WIDTH,
    maxWidth: '100%',
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  errorContainer: {
    width: CONTENT_WIDTH,
    maxWidth: '100%',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#EC3912',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: CONTENT_WIDTH,
    maxWidth: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButtonText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
});
