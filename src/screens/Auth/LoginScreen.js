import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signIn, getSession } from '../../services/auth';
import { initializeQuestSystem } from '../../lib/quests/v2';
import { isOnboardingCompleted } from '../../services/userService';
import { theme } from '../../styles/theme';
import GradientText from '../../components/GradientText';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);

/**
 * Écran "Se connecter" — CONNEXION UNIQUEMENT
 * Connexion à un compte existant (email + mot de passe).
 * Aucune création de compte, aucun lien "Créer un compte".
 */
export default function LoginScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  useEffect(() => {
    if (email || password) setError('');
  }, [email, password]);

  const handleSubmit = async (e) => {
    // Empêcher tout comportement par défaut (même si React Native ne devrait pas en avoir)
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    setError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Veuillez saisir une adresse email valide');
      return;
    }
    if (!trimmedPassword) {
      setError('Veuillez saisir un mot de passe d\'au moins 6 caractères');
      return;
    }
    if (trimmedPassword.length < 6) {
      setError('Mot de passe trop court (minimum 6 caractères)');
      return;
    }

    setLoading(true);

    try {
      // CONNEXION UNIQUEMENT — jamais de création de compte sur cet écran
      const result = await signIn(trimmedEmail, trimmedPassword);

      if (result.error) {
        setLoading(false);
        const errorMessage = result.error.message || '';
        const errorCode = result.error.code || result.error.status || '';

        if (errorCode === 'EMAIL_NOT_CONFIRMED' ||
            errorMessage.includes('Email not confirmed') ||
            errorMessage.includes('email not confirmed')) {
          setError('Confirmez votre email (vérifiez votre boîte mail) avant de vous connecter.');
          return;
        }
        if (errorCode === 'INVALID_CREDENTIALS' ||
            errorMessage.includes('Invalid login credentials') ||
            errorMessage.includes('Invalid password') ||
            errorCode === 'invalid_credentials') {
          setError('Email ou mot de passe incorrect.');
          return;
        }
        if (errorMessage.includes('session expired') || errorMessage.includes('Session expired')) {
          setError('Session expirée. Reconnecte-toi.');
          return;
        }
        if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network') || errorMessage.includes('Network')) {
          setError('Connexion impossible. Vérifie ta connexion internet.');
          return;
        }
        setError(errorMessage || 'Une erreur est survenue. Veuillez réessayer.');
        return;
      }

      if (result.user) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const sessionCheck = await getSession(true);

        if (!sessionCheck?.session) {
          const { supabase } = require('../../services/supabase');
          const { data: directSessionData } = await supabase.auth.getSession();
          if (!directSessionData?.session) {
            setLoading(false);
            setError('La session n\'a pas pu être sauvegardée. Veuillez réessayer.');
            return;
          }
        }

        const ADMIN_TEST_EMAIL = 'align.app.contact@gmail.com';
        const isAdminTestEmail = trimmedEmail.toLowerCase() === ADMIN_TEST_EMAIL.toLowerCase();

        if (isAdminTestEmail) {
          navigation.replace('Onboarding', { userId: result.user.id, email: result.user.email || trimmedEmail, fromSignUp: false });
          return;
        }

        const onboardingCompleted = await isOnboardingCompleted(result.user.id);

        if (!onboardingCompleted) {
          navigation.replace('Onboarding', { userId: result.user.id, email: result.user.email || trimmedEmail, fromSignUp: false });
          return;
        }

        try {
          await initializeQuestSystem();
        } catch (err) {
          console.error('[LOGIN] Init quêtes (non-bloquant):', err);
        }
        navigation.replace('Main');
        return;
      }

      setLoading(false);
      setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
    } catch (err) {
      setLoading(false);
      console.error('Erreur authentification:', err);
      setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.logo}>ALIGN</Text>

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

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
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
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={(e) => {
              if (e && e.preventDefault) e.preventDefault();
              handleSubmit(e);
            }}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.buttonSolid}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>SE CONNECTER</Text>
              )}
            </View>
          </TouchableOpacity>
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
    color: '#FF3B30',
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
    borderRadius: 999,
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

