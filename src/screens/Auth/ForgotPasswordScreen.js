/**
 * Écran "Mot de passe oublié" — envoi du lien de réinitialisation par email.
 * Uniquement via l'Edge Function send-password-recovery-email (Resend).
 * Supabase Auth ne envoie plus d'email ; le lien est généré côté serveur et l'email est envoyé par Resend.
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
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getWebBaseUrl } from '../../services/url';
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);

const INPUT_HEIGHT = 52;
const INPUT_MARGIN_BOTTOM = 20;
const BUTTON_HEIGHT = 52;
const BUTTON_MARGIN_BOTTOM = 24;
const CENTER_BLOCK_MIN_HEIGHT = INPUT_HEIGHT + INPUT_MARGIN_BOTTOM + BUTTON_HEIGHT + BUTTON_MARGIN_BOTTOM;

const SUCCESS_GREEN = '#2D7A4A';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

function isRateLimitError(err) {
  if (!err) return false;
  const status = err.status ?? err.statusCode;
  if (status === 429) return true;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

// ——— Succès : titre + sous-texte + status box animée (fond vert fade + coche) + bouton (0 jump)
function SuccessUI({ title, subtitle, onBack, greenOverlay, checkOpacity, checkScale, boxScale }) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={[styles.centerBlock, { minHeight: CENTER_BLOCK_MIN_HEIGHT }]}>
        <Animated.View
          style={[
            styles.statusBox,
            {
              transform: [{ scale: boxScale }],
            },
          ]}
        >
          <View style={[StyleSheet.absoluteFill, styles.statusBoxDark]} />
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.statusBoxGreen, { opacity: greenOverlay }]}
          />
          <View style={styles.statusBoxContent}>
            <Text style={styles.statusBoxLabel}>Email envoyé</Text>
            <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkScale }] }}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            </Animated.View>
          </View>
        </Animated.View>
        <HoverableTouchableOpacity style={styles.button} onPress={onBack} activeOpacity={0.8} variant="button">
          <LinearGradient
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.backButtonGradient}
          >
            <Text style={styles.backButtonTextLabel}>Retour connexion</Text>
          </LinearGradient>
        </HoverableTouchableOpacity>
      </View>
    </>
  );
}

const RATE_LIMIT_COOLDOWN_MS = 120000; // 2 min après un 429

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitUntil, setRateLimitUntil] = useState(0);

  const greenOverlay = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0.9)).current;
  const boxScale = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    if (!success) return;
    Animated.parallel([
      Animated.timing(greenOverlay, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(boxScale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(checkOpacity, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 6,
            tension: 120,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [success, greenOverlay, checkOpacity, checkScale, boxScale]);

  const handleSend = async () => {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Entre ton adresse e-mail.');
      return;
    }
    if (!validateEmail(trimmed)) {
      setError("L'adresse e-mail n'est pas valide.");
      return;
    }

    const baseUrl = getWebBaseUrl();
    const redirectTo = baseUrl ? `${baseUrl.replace(/\/$/, '')}/reset-password` : undefined;
    console.log('[RESET] Final redirectTo:', redirectTo);
    setLoading(true);
    try {
      const { data, error: err } = await supabase.functions.invoke('send-password-recovery-email', {
        body: { email: trimmed, redirectTo },
      });

      if (err) {
        if (isRateLimitError(err)) {
          setError('Trop de tentatives. Réessaie dans 2 minutes.');
          setRateLimitUntil(Date.now() + RATE_LIMIT_COOLDOWN_MS);
          setTimeout(() => setRateLimitUntil(0), RATE_LIMIT_COOLDOWN_MS);
          setLoading(false);
          return;
        }
        setError('Impossible d\'envoyer le lien. Réessaie.');
        setLoading(false);
        return;
      }

      if (data && data.success === false) {
        setError('Impossible d\'envoyer le lien. Réessaie.');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (e) {
      if (isRateLimitError(e)) {
        setError('Trop de tentatives. Réessaie dans 2 minutes.');
        setRateLimitUntil(Date.now() + RATE_LIMIT_COOLDOWN_MS);
        setTimeout(() => setRateLimitUntil(0), RATE_LIMIT_COOLDOWN_MS);
      } else {
        setError('Impossible d\'envoyer le lien. Réessaie.');
      }
    }
    setLoading(false);
  };

  const backAction = !success ? (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ padding: 8 }}>
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
      <StandardHeader title="ALIGN" leftAction={backAction} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {!success ? (
            <>
              <Text style={styles.title}>MOT DE PASSE OUBLIÉ ?</Text>
              <Text style={styles.subtitle}>
                Entre ton email, nous t'enverrons un lien pour le réinitialiser.
              </Text>
              <View style={[styles.centerBlock, { minHeight: CENTER_BLOCK_MIN_HEIGHT }]}>
                <TextInput
                  style={styles.input}
                  placeholder="Adresse e-mail..."
                  placeholderTextColor="rgba(255, 255, 255, 0.40)"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
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
                  onPress={handleSend}
                  disabled={loading || Date.now() < rateLimitUntil}
                  activeOpacity={0.8}
                  variant="button"
                >
                  <View style={styles.buttonSolid}>
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {rateLimitUntil > Date.now() ? 'Réessaie dans 2 min' : 'ENVOYER LE LIEN'}
                      </Text>
                    )}
                  </View>
                </HoverableTouchableOpacity>
              </View>
            </>
          ) : (
            <SuccessUI
              title="L'EMAIL A BIEN ÉTÉ ENVOYÉ"
              subtitle="Tu pourras réinitialiser ton mot de passe via le lien reçu. (Vérifie tes mails et tes spams.)"
              onBack={() => navigation.navigate('Login')}
              greenOverlay={greenOverlay}
              checkOpacity={checkOpacity}
              checkScale={checkScale}
              boxScale={boxScale}
            />
          )}
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
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: CONTENT_WIDTH,
  },
  centerBlock: {
    width: CONTENT_WIDTH,
    alignItems: 'stretch',
  },
  input: {
    width: '100%',
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: INPUT_MARGIN_BOTTOM,
    borderWidth: 0,
    minHeight: INPUT_HEIGHT,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
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
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: BUTTON_MARGIN_BOTTOM,
  },
  buttonSolid: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: BUTTON_HEIGHT,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusBox: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: INPUT_MARGIN_BOTTOM,
    minHeight: INPUT_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  statusBoxDark: {
    backgroundColor: '#2E3240',
    borderRadius: 999,
  },
  statusBoxGreen: {
    backgroundColor: SUCCESS_GREEN,
    borderRadius: 999,
  },
  statusBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBoxLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  backButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: BUTTON_HEIGHT,
  },
  backButtonTextLabel: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  backButtonText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
});
