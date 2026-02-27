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
import { parseAuthHashOrQuery, getParams, isRecoveryError, ALIGN_RECOVERY_HASH_KEY, ALIGN_RECOVERY_SEARCH_KEY, ALIGN_RECOVERY_KEY_ACTIVE } from '../../lib/recoveryUrl';

const RECOVERY_SET_SESSION_PROCESSED_KEY = 'recovery_setSession_processed';
const RECOVERY_APPLIED_KEY = 'align_recovery_session_applied';
import { useAuth } from '../../context/AuthContext';

/** Compteur de mount pour vérifier l’absence de boucle (doit rester 1, ou 2 au plus). */
let _resetScreenMountCount = 0;

  // ─── Snapshot module-level des tokens recovery ───────────────────────────
  // Calculé UNE SEULE FOIS par session de navigation (survit aux remounts).
  // Empêche le useEffect[] de relire sessionStorage à chaque remount.
  var _rts = null;
  function _getRecoveryTokens() {
    if (_rts) return _rts;
    var h = '', s = '';
    try {
      h = (window.sessionStorage.getItem('align_recovery_hash') || '') ||
          (window.location.hash || '');
      s = (window.sessionStorage.getItem('align_recovery_search') || '') ||
          (window.location.search || '');
      window.sessionStorage.removeItem('align_recovery_hash');
      window.sessionStorage.removeItem('align_recovery_search');
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {}
    _rts = { hash: h, search: s };
    return _rts;
  }
  // ─────────────────────────────────────────────────────────────────────────

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

  var _snap = _rts;
  var hasStoredHash = !!(_snap && _snap.hash);
  var hasStoredSearch = !!(_snap && _snap.search);
  if (typeof console !== 'undefined' && console.log) {
    console.log('[RESET]', JSON.stringify({ when: 'reset_render', hasStoredHash, hasStoredSearch }));
  }

  useEffect(() => {
    _resetScreenMountCount += 1;
    // DEBUG REMOUNT — à retirer après résolution
    if (_resetScreenMountCount > 1 && typeof console !== 'undefined') {
      console.trace('[RESET] REMOUNT TRACE #' + _resetScreenMountCount);
    }
    if (typeof console !== 'undefined' && console.log) {
      console.log('[RESET] mount #' + _resetScreenMountCount + ' (si ce nombre augmente en boucle, le bug est encore là)');
    }
    if (typeof fetch !== 'undefined') {
      const p = { sessionId: '89e9d0', location: 'ResetPasswordScreen.js:mount', message: 'reset_mount', data: { mountCount: _resetScreenMountCount }, timestamp: Date.now(), hypothesisId: 'C' };
      fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(p) }).catch(function() {});
    }
    return () => {
      if (typeof console !== 'undefined' && console.log) console.log('[RESET] unmount');
      if (typeof fetch !== 'undefined') {
        const p = { sessionId: '89e9d0', location: 'ResetPasswordScreen.js:unmount', message: 'reset_unmount', data: {}, timestamp: Date.now(), hypothesisId: 'C' };
        fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(p) }).catch(function() {});
      }
    };
  }, []);

  // Web : si on est sur /reset-password et qu'une session existe déjà (ex. hash consommé par Supabase), afficher le formulaire une seule fois (flag sessionStorage survivant au remount).
  useEffect(() => {
    if (!isWeb || recoveryErrorSeenRef.current) return;
    try {
      if (typeof window.sessionStorage !== 'undefined' && window.sessionStorage.getItem(RECOVERY_APPLIED_KEY)) return;
    } catch (_) {}
    const path = (window.location.pathname || '').replace(/\/$/, '').replace(/^\//, '');
    const onResetPath = path === 'reset-password' || path.endsWith('/reset-password');
    const sessionUserId = authSession?.user?.id;
    if (onResetPath && sessionUserId) {
      try {
        if (typeof window.sessionStorage !== 'undefined') window.sessionStorage.setItem(RECOVERY_APPLIED_KEY, '1');
      } catch (_) {}
      setHasValidSession(true);
      setTokensAbsent(false);
      setCheckingSession(false);
    }
  }, [isWeb, authSession?.user?.id]);

  // Mobile deep-link recovery : session vient du contexte (établie par handleRecoveryDeepLink). Flag sessionStorage survivant au remount.
  useEffect(() => {
    if (!isMobileRecovery) return;
    try {
      if (typeof window.sessionStorage !== 'undefined' && window.sessionStorage.getItem(RECOVERY_APPLIED_KEY)) return;
    } catch (_) {}
    const sessionUserId = authSession?.user?.id;
    if (sessionUserId) {
      try {
        if (typeof window.sessionStorage !== 'undefined') window.sessionStorage.setItem(RECOVERY_APPLIED_KEY, '1');
      } catch (_) {}
      setHasValidSession(true);
      setTokensAbsent(false);
      setCheckingSession(false);
    } else {
      setCheckingSession(true);
    }
  }, [isMobileRecovery, authSession?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    // #region agent log
    if (typeof fetch !== 'undefined') {
      const payload = { sessionId: '89e9d0', location: 'ResetPasswordScreen.js:useEffect', message: 'effect_start', data: { ts: Date.now() }, timestamp: Date.now(), hypothesisId: 'C' };
      fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(payload) }).catch(function() {});
    }
    // #endregion
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

      var _tok = _getRecoveryTokens();
      var rawHash = _tok.hash;
      var rawSearch = _tok.search;

      const hashPresent = rawHash.length > 0;
      const hashHead = rawHash.slice(0, 12);
      let storageFlagVal = null;
      try { storageFlagVal = window.sessionStorage.getItem(RECOVERY_SET_SESSION_PROCESSED_KEY); } catch (_) {}
      const tokensPresentComputed = (rawHash + rawSearch).indexOf('access_token') !== -1 && (rawHash + rawSearch).indexOf('refresh_token') !== -1;
      if (typeof console !== 'undefined' && console.log) {
        console.log('[RESET] mount hashPresent=', hashPresent, 'hasStoredHash=', rawHash.length > 0, 'hasStoredSearch=', rawSearch.length > 0);
        console.log('[RESET]', JSON.stringify({ when: 'reset_mount', hashPresentComputed: hashPresent, tokensPresent: tokensPresentComputed, storageFlag: storageFlagVal }));
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
      let skipSetSession = false;
      try {
        if (typeof window.sessionStorage !== 'undefined' && window.sessionStorage.getItem(RECOVERY_SET_SESSION_PROCESSED_KEY) === '1') {
          skipSetSession = true;
          if (typeof console !== 'undefined' && console.log) console.log('[RESET] skip setSession already processed');
          if (!cancelled) {
            setCheckingSession(false);
            setHasValidSession(true);
            setTokensAbsent(false);
          }
          // #region agent log
          if (typeof fetch !== 'undefined') {
            const p = { sessionId: '89e9d0', location: 'ResetPasswordScreen.js:skip_setSession', message: 'skip_setSession', data: { storageFlag: '1' }, timestamp: Date.now(), hypothesisId: 'D' };
            fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(p) }).catch(function() {});
          }
          // #endregion
          return;
        }
      } catch (_) {}
      setSessionRunOnceRef.current = true;
      if (typeof console !== 'undefined' && console.log) console.log('[RECOVERY_FLOW] detected');
      // #region agent log
      if (typeof fetch !== 'undefined') {
        const p = { sessionId: '89e9d0', location: 'ResetPasswordScreen.js:before_setSession', message: 'calling_setSession', data: {}, timestamp: Date.now(), hypothesisId: 'D' };
        fetch('http://127.0.0.1:7242/ingest/6c6b31a2-1bcc-4107-bd97-d9eb4c4433be', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '89e9d0' }, body: JSON.stringify(p) }).catch(function() {});
      }
      // #endregion
      try { if (typeof window.sessionStorage !== 'undefined') window.sessionStorage.setItem(RECOVERY_SET_SESSION_PROCESSED_KEY, '1'); } catch (_) {}

      // Vérifier si Supabase a déjà une session active (évite double setSession / double SIGNED_IN)
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session?.user?.id) {
        if (!cancelled) {
          setHasValidSession(true);
          setTokensAbsent(false);
          setCheckingSession(false);
        }
        return;
      }

      const { error: setSessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (cancelled) return;

      if (setSessionError) {
        setSessionRunOnceRef.current = false;
        try { if (typeof window.sessionStorage !== 'undefined') window.sessionStorage.removeItem(RECOVERY_SET_SESSION_PROCESSED_KEY); } catch (_) {}
        if (!cancelled) {
          setHasValidSession(false);
          setTokensAbsent(false);
          setCheckingSession(false);
        }
        return;
      }

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
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.removeItem(RECOVERY_APPLIED_KEY);
      } catch (_) {}
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
    <TouchableOpacity
      onPress={() => {
        try { if (typeof window !== 'undefined' && window.sessionStorage) window.sessionStorage.removeItem(ALIGN_RECOVERY_KEY_ACTIVE); } catch (_) {}
        navigation.goBack();
      }}
      activeOpacity={0.8}
      style={{ padding: 8 }}
    >
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
              onPress={() => {
                try {
                  if (typeof window !== 'undefined' && window.sessionStorage) {
                    window.sessionStorage.removeItem(ALIGN_RECOVERY_KEY_ACTIVE);
                    window.sessionStorage.removeItem(RECOVERY_APPLIED_KEY);
                  }
                } catch (_) {}
                navigation.navigate('Login');
              }}
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
