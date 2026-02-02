import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
import { theme } from '../../styles/theme';
import { signUp } from '../../services/auth';
import GradientText from '../../components/GradientText';
import { validateEmail, validatePassword } from '../../services/userStateService';
import { updateOnboardingStep } from '../../services/authState';

/**
 * Écran Authentification onboarding — CRÉATION DE COMPTE UNIQUEMENT
 * Sign up uniquement. Aucune connexion, aucun lien "Se connecter".
 * Si l'email existe déjà → erreur claire, pas de connexion, pas de bypass onboarding.
 */
export default function AuthScreen({ onNext, onBack }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async () => {
    // Réinitialiser l'erreur et le message de succès
    setError('');
    setSuccessMessage('');
    
    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (!validateEmail(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.message);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // CRÉATION DE COMPTE UNIQUEMENT — auth.signUp vérifie si l'email existe déjà
      const result = await signUp(email, password);

      if (result.error) {
        setLoading(false);
        const code = result.error.code;
        const msg = result.error.message || '';

        if (code === 'user_already_exists' || msg.includes('already registered') || msg.includes('already exists')) {
          setError('Cet email est déjà utilisé. Connecte-toi depuis l\'écran "Se connecter" pour accéder à ton compte.');
          return;
        }

        setError(msg || 'Erreur lors de la création du compte.');
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

      if (onNext) {
        onNext(result.user.id, email);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('[AuthScreen] Erreur:', err);
      setError('Une erreur est survenue. Réessaie dans quelques secondes.');
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {onBack ? (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      ) : null}
      {/* Logo ALIGN - En haut, centré */}
      <Text style={styles.logo}>ALIGN</Text>

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

        {/* Message d'erreur */}
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Message de succès */}
        {successMessage ? (
          <View style={styles.successContainer}>
            <GradientText colors={['#34C659', '#00AAFF']} style={styles.successText}>
              {successMessage}
            </GradientText>
          </View>
        ) : null}

        {/* Champs de formulaire */}
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
          />
        </View>

        {/* Bouton CRÉER MON COMPTE */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <View style={styles.buttonSolid}>
            <Text style={styles.buttonText}>
              {loading ? 'CHARGEMENT...' : 'CRÉER MON COMPTE'}
            </Text>
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
    color: '#FF3B30',
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
