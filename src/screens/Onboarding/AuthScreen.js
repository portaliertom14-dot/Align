import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../styles/theme';
import { signUp, signIn } from '../../services/auth';
import GradientText from '../../components/GradientText';
import { validateEmail, validatePassword, markOnboardingStarted } from '../../services/userStateService';
import { updateOnboardingStep } from '../../services/authState';
import { signUp as authSignUp } from '../../services/auth';

// 🆕 SYSTÈME AUTH/REDIRECTION V1
import { signInAndRedirect, signUpAndRedirect } from '../../services/authFlow';

/**
 * Écran Authentification - Design pixel-perfect
 * Typographies : Bowlby One SC (titres, bouton) + Nunito Black (liens, placeholders)
 * Couleurs : Blanc + Dégradé #FF7B2B → #FFB93F
 */
export default function AuthScreen({ onNext }) {
  const navigation = useNavigation();
  const [isSignUp, setIsSignUp] = useState(true);
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
    if (!email || !password || (isSignUp && !confirmPassword)) {
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

    if (isSignUp && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // CRITICAL FIX: Utiliser signUp directement et appeler onNext pour avancer dans OnboardingFlow
        // Au lieu de signUpAndRedirect qui fait un navigation.reset et réinitialise le state
        const { supabase } = require('../../services/supabase');
        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError || !signUpData?.user) {
          console.error('[AuthScreen] Erreur signup:', authError);
          setError(authError?.message || 'Erreur lors de la création du compte');
          setLoading(false);
          return;
        }
        
        console.log('[AuthScreen] ✅ Compte créé:', signUpData.user.id);
        
        // CRITICAL: Détecter si email confirmation est activée
        // Si signUp retourne une session -> confirmation OFF -> continuer onboarding
        // Si signUp ne retourne PAS de session -> confirmation ON -> afficher écran confirmation
        const hasSession = signUpData.session !== null && signUpData.session !== undefined;
        
        if (!hasSession) {
          // MODE: Email confirmation ON
          console.warn('[AuthScreen] ⚠️ Email confirmation activée - pas de session après signUp');
          console.log('[AuthScreen] Affichage écran "Confirme ton email"');
          setError('Vérifie ta boîte mail et clique sur le lien de confirmation pour continuer.');
          setLoading(false);
          // STOP: Ne pas continuer l'onboarding sans session
          return;
        }
        
        // MODE: Email confirmation OFF - session disponible
        console.log('[AuthScreen] ✅ Session obtenue directement après signUp (confirmation OFF)');
        
        // Note: Le profil est créé automatiquement par auth.js::signUp avec retry
        // pour gérer la race condition FK. Pas besoin de le créer ici.
        
        // Initialiser l'étape d'onboarding (ignorer les erreurs)
        try {
          await updateOnboardingStep(0);
        } catch (stepError) {
          console.warn('[AuthScreen] Erreur mise à jour step (non bloquant):', stepError);
        }
        
        // CRITICAL: Avancer dans OnboardingFlow via le callback onNext
        // Utiliser signUpData.user.id (session valide)
        if (onNext) {
          onNext(signUpData.user.id, email);
        } else {
          console.error('[AuthScreen] onNext callback missing!');
          setLoading(false);
        }
      } else {
        // Pour la connexion, utiliser le système de redirection car on peut aller vers Main/Feed
        const result = await signInAndRedirect(email, password, navigation);
        
        if (!result.success) {
          setError(result.error || 'Erreur lors de la connexion');
          setLoading(false);
        }
        // Si succès, redirection automatique (Main/Feed ou Onboarding selon état)
      }
    } catch (error) {
      console.error('[AuthScreen] Erreur catch:', error);
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
      {/* Logo ALIGN - En haut, centré */}
      <Text style={styles.logo}>ALIGN</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Titre - Création compte ou Connexion */}
          <Text style={styles.title}>
            {isSignUp ? "CRÉE TON COMPTE ET ENREGISTRE TES PROGRÈS !" : "CONNEXION"}
          </Text>

          {/* Sous-titre - Dégradé #FF7B2B → #FFB93F */}
          <View style={styles.subtitleContainer}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.subtitle}>
              {isSignUp ? 'Créer un compte' : 'Se connecter'}
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

          {isSignUp && (
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
          )}
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
              {loading ? 'CHARGEMENT...' : isSignUp ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Lien en bas "Déjà un compte ? Se connecter" */}
        <View style={styles.switchBottomContainer}>
          <Text style={styles.switchBottomText}>
            {isSignUp ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
          </Text>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.switchBottomLink}>
              {isSignUp ? 'Se connecter' : 'Créer un compte'}
            </GradientText>
          </TouchableOpacity>
        </View>
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
});
