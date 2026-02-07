import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width - 48, 520);
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';
import { signUp } from '../../services/auth';
import GradientText from '../../components/GradientText';
import { validateEmail, validatePassword } from '../../services/userStateService';
import { updateOnboardingStep } from '../../services/authState';
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
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (email || password || confirmPassword) setError('');
  }, [email, password, confirmPassword]);

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');

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

    try {
      const referralCode = await getStoredReferralCode();
      const result = await signUp(trimmedEmail, trimmedPassword, referralCode || undefined);

      if (result.error) {
        setLoading(false);
        setError(mapAuthError(result.error, 'signup').message);
        return;
      }

      if (!result.user) {
        setLoading(false);
        setError('Erreur lors de la création du compte.');
        return;
      }

      // Vérifier si une session existe (email confirmation ON = pas de session)
      const { supabase } = require('../../services/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = sessionData?.session != null;

      if (!hasSession) {
        setLoading(false);
        setError('Vérifie ta boîte mail et clique sur le lien de confirmation pour continuer.');
        return;
      }

      try {
        await updateOnboardingStep(0);
      } catch (stepError) {
        console.warn('[AuthScreen] updateOnboardingStep (non bloquant):', stepError);
      }

      if (referralCode) await clearStoredReferralCode();
      if (onNext) {
        onNext(result.user.id, email);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('[AuthScreen] Erreur:', err);
      setError(mapAuthError(err, 'signup').message);
      setLoading(false);
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonSolid}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>CRÉER MON COMPTE</Text>
            )}
          </View>
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
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
