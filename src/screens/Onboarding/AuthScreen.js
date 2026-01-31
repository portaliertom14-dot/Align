import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
 * Couleurs : Blanc + Dégradé #FF7B2B → #FFD93F
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
      {/* Logo ALIGN - Position absolue comme sur les autres écrans */}
      <Text style={styles.logo}>ALIGN</Text>

      <View style={styles.content}>
        {/* Titre CONNEXION */}
        <Text style={styles.title}>CONNEXION</Text>

        {/* Sous-titre sous Connexion - Texte dynamique avec dégradé */}
        <View style={styles.subtitleContainer}>
          <GradientText
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subtitle}
          >
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
            <GradientText
              colors={['#34C659', '#00AAFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.successText}
            >
              {successMessage}
            </GradientText>
          </View>
        ) : null}

        {/* Champs de formulaire */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Adresse e-mail.."
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe.."
            placeholderTextColor="#9CA3AF"
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
              placeholderTextColor="#9CA3AF"
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
            <GradientText
              colors={['#FF7B2B', '#FFD93F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.switchBottomLink}
            >
              {isSignUp ? 'Se connecter' : 'Créer un compte'}
            </GradientText>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Logo ALIGN - Position absolue comme sur les autres écrans (Bowlby One SC)
  logo: {
    fontSize: 32,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    position: 'absolute', // Position absolue pour le fixer en haut
    top: 60, // Même position que sur PropositionMetier et autres écrans
    left: 0,
    right: 0,
    zIndex: 20,
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  
  // Titre CONNEXION (Bowlby One SC)
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  
  // Sous-titre sous Connexion - "Créer un compte" ou "Se connecter" (Nunito Black + Dégradé)
  subtitleContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button, // Nunito Black
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
    maxWidth: 850,
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
    maxWidth: 850,
    borderWidth: 1,
    borderColor: 'rgba(52, 198, 89, 0.3)',
  },
  successText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Formulaire - Élargi de +450px (400 + 450 = 850)
  form: {
    width: '100%',
    maxWidth: 850,
    marginBottom: 32,
  },
  
  // Champs input (background gris foncé, coins très arrondis) - Élargis
  input: {
    backgroundColor: '#3C3F4A',
    borderRadius: 999, // Pill-shaped
    paddingVertical: 18,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button, // Nunito Black
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 0,
  },
  
  // Bouton principal (Bowlby One SC + Couleur unie #FF7B2B) - Élargi
  button: {
    width: '100%',
    maxWidth: 850,
    borderRadius: 999, // Pill-shaped
    overflow: 'hidden',
    marginBottom: 32,
  },
  buttonSolid: {
    backgroundColor: '#FF7B2B', // Couleur unie orange
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title, // Bowlby One SC
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
