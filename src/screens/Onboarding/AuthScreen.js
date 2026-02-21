import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView, Platform } from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width - 48, 520);
const PREFLIGHT_TIMEOUT_MS = 15000;
const GET_SESSION_TIMEOUT_MS = 3000;
/** Timeout sur l'appel signUp() pour ne pas attendre 60s+ si le réseau pend (réseaux lents) */
const SIGNUP_REQUEST_TIMEOUT_MS = 45000;
/** Watchdog anti-loading infini : doit être > SIGNUP_REQUEST_TIMEOUT_MS */
const WATCHDOG_LOADING_MS = 50000;

function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';
import { signUp } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { preflightSupabase } from '../../services/networkPreflight';
import GradientText from '../../components/GradientText';
import { validateEmail, validatePassword } from '../../services/userStateService';
import { mapAuthError } from '../../utils/authErrorMapper';
import { getStoredReferralCode, clearStoredReferralCode } from '../../utils/referralStorage';

/**
 * Écran Authentification onboarding — CRÉATION DE COMPTE UNIQUEMENT
 * Sign up uniquement. Aucune connexion, aucun lien "Se connecter".
 * Si l'email existe déjà → erreur claire, pas de connexion, pas de bypass onboarding.
 */
export default function AuthScreen({ onNext, onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHint, setLoadingHint] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showRetryButton, setShowRetryButton] = useState(false);

  useEffect(() => {
    if (email || password || confirmPassword) setError('');
  }, [email, password, confirmPassword]);

  const activeReqRef = useRef(null);

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');
    setShowRetryButton(false);
    setLoadingHint('');

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail) {
      setError('Entre ton email.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError("Ton email n'est pas valide.");
      return;
    }
    if (!trimmedPassword) {
      setError('Entre ton mot de passe.');
      return;
    }
    if (trimmedPassword.length < 8) {
      setError('Mot de passe trop court (8 caractères minimum).');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const requestId = generateRequestId();
    activeReqRef.current = requestId;
    const start = Date.now();
    console.log(JSON.stringify({ phase: 'BOOT_GET_SESSION', requestId, message: 'AUTH START' }));

    const preflight = await preflightSupabase({ requestId, timeoutMs: PREFLIGHT_TIMEOUT_MS });
    if (!preflight.ok) {
      console.warn('[AUTH] PREFLIGHT WARN — continuation anyway', requestId);
    }

    const watchdogTimer = setTimeout(() => {
      if (activeReqRef.current === requestId) {
        console.warn(JSON.stringify({ phase: 'AUTH_WATCHDOG_LOADING_TIMEOUT', requestId, durationMs: WATCHDOG_LOADING_MS }));
        setError("L'opération a pris trop de temps. Réessaie.");
        setLoading(false);
        activeReqRef.current = null;
      }
    }, WATCHDOG_LOADING_MS);

    const hintTimer = setTimeout(() => {
      if (activeReqRef.current === requestId) setLoadingHint("Inscription en cours… Ne quitte pas l'app.");
    }, 5000);

    try {
      const referralCode = await getStoredReferralCode();
      const signUpPromise = signUp(trimmedEmail, trimmedPassword, referralCode || undefined);
      signUpPromise.catch(() => {}); // Absorber rejet tardif après timeout pour éviter unhandled rejection et effets de bord
      const signUpTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SIGNUP_REQUEST_TIMEOUT')), SIGNUP_REQUEST_TIMEOUT_MS));
      const result = await Promise.race([signUpPromise, signUpTimeout]);
      const durationMs = Date.now() - start;
      console.log(JSON.stringify({ phase: 'AUTH_AFTER_SUPABASE', requestId, durationMs }));

      if (activeReqRef.current !== requestId) {
        return;
      }
      if (result.error) {
        const mapped = mapAuthError(result.error, 'signup');
        setError(mapped.code === 'network' || mapped.code === 'timeout'
          ? 'Réseau instable : impossible de joindre le serveur. Réessaie.'
          : mapped.message);
        if (mapped.code === 'network' || mapped.code === 'timeout') setShowRetryButton(true);
        return;
      }
      if (!result.user) {
        setError('Erreur lors de la création du compte.');
        return;
      }

      const sessionPromise = supabase.auth.getSession();
      const sessionTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('GET_SESSION_TIMEOUT')), GET_SESSION_TIMEOUT_MS));
      let sessionData;
      try {
        sessionData = (await Promise.race([sessionPromise, sessionTimeout])).data;
      } catch (sessionErr) {
        if (sessionErr?.message === 'GET_SESSION_TIMEOUT') {
          console.warn(JSON.stringify({ phase: 'AUTH_GET_SESSION_TIMEOUT', requestId, durationMs: GET_SESSION_TIMEOUT_MS }));
          setError('La session met du temps à s’activer. Réessaie dans quelques secondes.');
          return;
        }
        throw sessionErr;
      }
      const hasSession = sessionData?.session != null;
      if (!hasSession) {
        setError('Vérifie ta boîte mail et clique sur le lien de confirmation pour continuer.');
        return;
      }

      if (referralCode) clearStoredReferralCode().catch(() => {});
      console.log(JSON.stringify({ phase: 'SIGNUP_OK', requestId, authStatus: 'signedIn', durationMs: Date.now() - start }));
      // Aucune navigation ici : RootGate gère le routing post-auth via le listener unique (AuthContext).
      return;
    } catch (err) {
      const durationMs = Date.now() - start;
      console.log(JSON.stringify({ phase: 'AUTH_ERROR', requestId, errorMessage: err?.message ?? String(err), durationMs }));

      if (err?.message === 'SIGNUP_REQUEST_TIMEOUT') {
        if (activeReqRef.current === requestId) {
          setLoading(false);
          setLoadingHint('');
        }
        const sessionCheck = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SESSION_CHECK_TIMEOUT')), 2000)),
        ]).then((r) => r?.data?.session).catch(() => null);
        if (sessionCheck?.user && activeReqRef.current === requestId) {
          console.log(JSON.stringify({ phase: 'SIGNUP_OK', requestId, message: 'signup succeeded via session after timeout', userId: sessionCheck.user.id?.slice(0, 8) }));
          return;
        }
      }

      const mapped = mapAuthError(err, 'signup');
      if (err?.message === 'AUTH_TIMEOUT' || err?.message === 'SIGNUP_REQUEST_TIMEOUT' || mapped.code === 'network' || mapped.code === 'timeout') {
        setError(mapped.code === 'network' ? 'Réseau instable : impossible de joindre le serveur. Réessaie.' : 'Connexion impossible (réseau instable). Passe en 4G / change de Wi-Fi puis réessaie.');
        setShowRetryButton(true);
      } else {
        setError(mapped.message);
      }
    } finally {
      clearTimeout(watchdogTimer);
      clearTimeout(hintTimer);
      setLoadingHint('');
      if (activeReqRef.current === requestId) {
        setLoading(false);
        activeReqRef.current = null;
      }
      console.log(JSON.stringify({ phase: 'AUTH_FINALLY', requestId, loading: false, durationMs: Date.now() - start }));
    }
  };

  const backAction = onBack ? (
    <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={{ padding: 8 }}>
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StandardHeader title="ALIGN" leftAction={backAction || undefined} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Titre - Création de compte uniquement */}
          <Text style={styles.title}>
            CRÉE TON COMPTE ET ENREGISTRE TES PROGRÈS !
          </Text>

          {/* Sous-titre - Dégradé #FF7B2B → #FFB93F */}
          <View style={styles.subtitleContainer}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.subtitle}>
              Créer un compte
            </GradientText>
          </View>

        {successMessage ? (
          <View style={styles.successContainer}>
            <GradientText colors={['#34C659', '#00AAFF']} style={styles.successText}>
              {successMessage}
            </GradientText>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Adresse e-mail.."
            placeholderTextColor="rgba(255, 255, 255, 0.40)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe.."
            placeholderTextColor="rgba(255, 255, 255, 0.40)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe.."
            placeholderTextColor="rgba(255, 255, 255, 0.40)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <HoverableTouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
          variant="button"
        >
          <View style={styles.buttonSolid}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>CRÉER MON COMPTE</Text>
            )}
          </View>
        </HoverableTouchableOpacity>

        {loading && loadingHint ? (
          <Text style={styles.loadingHint}>{loadingHint}</Text>
        ) : null}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            {showRetryButton ? (
              <>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>RÉESSAYER</Text>
                </TouchableOpacity>
                <Text style={styles.retryHint}>Si ça persiste : VPN off, DNS auto, redémarre routeur</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  logo: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 48,
    marginBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
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
  subtitleContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    textAlign: 'center',
  },
  
  // Message d'erreur
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  retryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 123, 43, 0.3)',
    borderRadius: 999,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#FF7B2B',
    fontSize: 14,
    fontFamily: theme.fonts.button,
    fontWeight: '700',
  },
  retryHint: {
    marginTop: 8,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    fontFamily: theme.fonts.button,
  },
  loadingHint: {
    marginTop: 10,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontFamily: theme.fonts.button,
  },

  // Message de succès
  successContainer: {
    backgroundColor: 'rgba(52, 198, 89, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: CONTENT_WIDTH,
    borderWidth: 1,
    borderColor: 'rgba(52, 198, 89, 0.3)',
  },
  successText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  form: {
    width: CONTENT_WIDTH,
    marginBottom: 28,
  },
  
  input: {
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 0,
  },
  button: {
    width: CONTENT_WIDTH,
    borderRadius: 999, // Pill-shaped
    overflow: 'hidden',
    marginBottom: 32,
  },
  buttonSolid: {
    backgroundColor: '#FF7B2B',
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
    ...theme.buttonTextNoWrap,
  },
  
  // Lien en bas "Déjà un compte ? Se connecter" (Nunito Black)
  switchBottomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBottomText: {
    fontSize: 14,
    fontFamily: theme.fonts.button, // Nunito Black
    fontWeight: '400',
    color: '#FFFFFF',
  },
  switchBottomLink: {
    fontSize: 14,
    fontFamily: theme.fonts.button, // Nunito Black
    fontWeight: '900',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
