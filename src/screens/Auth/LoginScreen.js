import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { signIn, getSession } from '../../services/auth';
import { supabase } from '../../services/supabase';
import { preflightSupabase } from '../../services/networkPreflight';
import { initializeQuestSystem } from '../../lib/quests/v2';
import { redirectAfterLogin } from '../../services/navigationService';
import { mapAuthError } from '../../utils/authErrorMapper';
import { theme } from '../../styles/theme';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';
import PasswordField from '../../components/PasswordField';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
const LOADING_TIMEOUT_MS = 25000; // temporaire: 25s pour diagnostic (était 12s)
const PREFLIGHT_TIMEOUT_MS = 15000;

function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getRootNavigation(nav) {
  if (!nav || typeof nav.getParent !== 'function') return nav;
  let n = nav;
  try {
    while (n) {
      const parent = n.getParent();
      if (!parent || parent === n) break;
      n = parent;
    }
  } catch (_) {}
  return n;
}

/**
 * Écran "Se connecter" — CONNEXION UNIQUEMENT
 * Connexion à un compte existant (email + mot de passe).
 * Aucune création de compte, aucun lien "Créer un compte".
 */
export default function LoginScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState('');
  const [showRetryButton, setShowRetryButton] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  useEffect(() => {
    if (email || password) setError('');
  }, [email, password]);

  const activeReqRef = useRef(null);

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    setError('');
    setShowRetryButton(false);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

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
    if (trimmedPassword.length < 6) {
      setError('Mot de passe trop court (minimum 6 caractères).');
      return;
    }

    setLoading(true);
    const requestId = generateRequestId();
    activeReqRef.current = requestId;
    console.log('[AUTH] START', requestId);
    console.log('[NET] PREFLIGHT START', requestId);

    const preflight = await preflightSupabase({ requestId, timeoutMs: PREFLIGHT_TIMEOUT_MS });
    if (!preflight.ok) {
      console.warn('[NET] PREFLIGHT WARN — continuation anyway', requestId);
    }
    console.log('[AUTH] BEFORE_SUPABASE', requestId, { preflightOk: preflight.ok });

    const start = Date.now();
    try {
      // Test temporaire: pas de Promise.race, on laisse Supabase gérer son timeout
      const result = await signIn(trimmedEmail, trimmedPassword);
      const duration = Date.now() - start;
      console.log('[AUTH] SUPABASE_DURATION', requestId, duration, 'ms');

      console.log('[AUTH] AFTER_SUPABASE', requestId);

      if (activeReqRef.current !== requestId) {
        console.log('[AUTH] STALE_RESPONSE', requestId);
        return;
      }

      if (result.error) {
        setError(mapAuthError(result.error, 'login').message);
        return;
      }

      if (result.user) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        const sessionCheck = await getSession(true);

        if (!sessionCheck?.session) {
          const { data: directSessionData } = await supabase.auth.getSession();
          if (!directSessionData?.session) {
            setError('La session n\'a pas pu être sauvegardée. Veuillez réessayer.');
            return;
          }
        }

        try {
          await initializeQuestSystem();
        } catch (err) {
          if (__DEV__) console.error('[LOGIN] Init quêtes:', err);
        }
        console.log('[AUTH] SUCCESS', requestId);
        const rootNav = getRootNavigation(navigation);
        await redirectAfterLogin(rootNav || navigation);
        return;
      }

      setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
    } catch (err) {
      const duration = Date.now() - start;
      console.log('[AUTH] SUPABASE_ERROR_AFTER_MS', requestId, duration);
      console.error('[AUTH] ERROR', requestId, err?.message ?? err);
      const mapped = mapAuthError(err, 'login');
      if (err?.message === 'AUTH_TIMEOUT' || mapped.code === 'network') {
        setError(mapped.code === 'network' ? 'Réseau instable : impossible de joindre le serveur. Réessaie.' : 'Connexion impossible (réseau instable). Passe en 4G / change de Wi-Fi puis réessaie.');
        setShowRetryButton(true);
      } else {
        setError(mapped.message);
      }
    } finally {
      console.log('[AUTH] FINALLY', requestId, 'loading=false');
      if (activeReqRef.current === requestId) {
        setLoading(false);
        activeReqRef.current = null;
      }
    }
  };

  const backAction = (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ padding: 8 }}>
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StandardHeader title="ALIGN" leftAction={backAction} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>
            CONNECTE-TOI À TON COMPTE
          </Text>
          <View style={styles.subtitleContainer}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.subtitle}>
              Se connecter
            </GradientText>
          </View>

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
            <PasswordField
              style={styles.input}
              placeholder="Mot de passe.."
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />
          </View>

          <HoverableTouchableOpacity
            style={styles.button}
            onPress={(e) => {
              if (e && e.preventDefault) e.preventDefault();
              handleSubmit(e);
            }}
            disabled={loading}
            activeOpacity={0.8}
            variant="button"
          >
            <View style={styles.buttonSolid}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>SE CONNECTER</Text>
              )}
            </View>
          </HoverableTouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.8}
            style={styles.forgotLink}
          >
            <GradientText colors={['#FF7B2B', '#FFD93F']} style={styles.forgotLinkText}>
              Mot de passe oublié ?
            </GradientText>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {showRetryButton ? (
                <>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={(ev) => { if (ev?.preventDefault) ev.preventDefault(); handleSubmit(ev); }}
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
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  forgotLink: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  forgotLinkText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFB83A', // fallback si dégradé non appliqué
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

