import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { signIn, signUp, getSession } from '../../services/auth';
import { initializeQuestSystem } from '../../lib/quests/v2';
import { getUserProfile } from '../../services/profileService';
import { isOnboardingCompleted } from '../../services/userService';
import { theme } from '../../styles/theme';
import GradientText from '../../components/GradientText';

/**
 * Écran de connexion/inscription Align
 * Design simple et moderne avec gradient
 * Gestion complète des erreurs visuelles
 */
export default function LoginScreen() {
  const navigation = useNavigation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Messages d'erreur visuels
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // État pour afficher le message de confirmation d'email
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  // Réinitialiser les erreurs quand les champs changent
  useEffect(() => {
    if (email && emailError) {
      if (validateEmail(email)) {
        setEmailError('');
      }
    }
  }, [email]);

  useEffect(() => {
    if (password && passwordError) {
      if (password.length >= 6) {
        setPasswordError('');
      }
    }
  }, [password]);

  const handleSubmit = async (e) => {
    // Empêcher tout comportement par défaut (même si React Native ne devrait pas en avoir)
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Réinitialiser les erreurs
    setEmailError('');
    setPasswordError('');

    // Normaliser l'email (trim)
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    // Validation email
    if (!trimmedEmail) {
      setEmailError('Veuillez saisir une adresse email valide');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError('Veuillez saisir une adresse email valide');
      return;
    }

    // Validation mot de passe
    if (!trimmedPassword) {
      setPasswordError('Veuillez saisir un mot de passe d\'au moins 6 caractères');
      return;
    }

    const MIN_PASSWORD_LENGTH = 6;
    if (trimmedPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Mot de passe trop court (minimum ${MIN_PASSWORD_LENGTH} caractères)`);
      return;
    }

    // Désactiver le bouton et afficher le loader
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        // CRÉATION DE COMPTE
        console.log('[LOGIN] Début de la création de compte...');
        result = await signUp(trimmedEmail, trimmedPassword);
        
        console.log('[LOGIN] Résultat signUp:', {
          hasError: !!result.error,
          hasUser: !!result.user,
          errorCode: result.error?.code,
          errorMessage: result.error?.message
        });
        
        if (result.error) {
          console.error('[LOGIN] Erreur lors de la création de compte:', result.error);
          setLoading(false);
          
          // Gestion spécifique des erreurs d'inscription
          const errorCode = result.error.code;
          const errorMessage = result.error.message || '';
          
          // Email déjà existant
          if (errorCode === 'EMAIL_ALREADY_EXISTS' || errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
            console.log('[LOGIN] Email déjà utilisé, affichage erreur');
            setEmailError('Cette adresse email est déjà utilisée.\nConnecte-toi ou utilise une autre adresse.');
            return;
          }
          
          // Email invalide
          if (errorMessage.includes('Invalid email') || errorMessage.includes('email format')) {
            setEmailError('L\'adresse email n\'est pas valide.\nVérifie le format (ex : prenom@mail.com).');
            return;
          }
          
          // Mot de passe trop faible
          if (errorMessage.includes('Password should be') || errorMessage.includes('password too weak')) {
            setPasswordError('Mot de passe trop faible.\nMinimum 8 caractères avec au moins une lettre et un chiffre.');
            return;
          }
          
          // Champs manquants
          if (errorCode === 'MISSING_CREDENTIALS') {
            setEmailError('Tous les champs doivent être remplis.');
            return;
          }
          
          // Erreur serveur (Supabase)
          if (errorCode === 'RLS_ERROR' || errorCode === 'TABLE_NOT_FOUND' || errorCode === 'NETWORK_ERROR' || errorCode === 'TIMEOUT_ERROR') {
            setEmailError('Impossible de créer le compte pour le moment.\nRéessaie dans quelques secondes.');
            return;
          }
          
          // Erreur générique (déjà gérée ci-dessus pour RLS_ERROR, NETWORK_ERROR, etc.)
          console.log('[LOGIN] Autre erreur, affichage message:', errorMessage);
          setEmailError('Impossible de créer le compte pour le moment.\nRéessaie dans quelques secondes.');
          return;
        }

        // Inscription réussie
        if (result.user) {
          console.log('[LOGIN] Création de compte réussie, user.id:', result.user.id?.substring(0, 8) + '...');
          
          // CRITICAL FIX: Vérifier si l'email doit être confirmé
          if (result.requiresEmailConfirmation) {
            console.log('[LOGIN] Email non confirmé, affichage du message de confirmation');
            setLoading(false);
            // Afficher le message visuel sur l'écran
            setShowEmailConfirmation(true);
            setPendingEmail(trimmedEmail);
            // Passer en mode connexion pour que l'utilisateur puisse se connecter après confirmation
            setIsSignUp(false);
            setEmail(trimmedEmail);
            return;
          }
          
          // Vérifier si une session a été créée
          const sessionCheck = await getSession();
          console.log('[LOGIN] Vérification session après signUp:', {
            hasSession: !!sessionCheck?.session,
            hasUser: !!sessionCheck?.user,
            userId: sessionCheck?.user?.id?.substring(0, 8) + '...'
          });
          
          if (sessionCheck?.session) {
            // Session créée → rediriger vers Onboarding
            console.log('[LOGIN] ✅ Session établie après signUp, redirection vers Onboarding');
            navigation.replace('Onboarding', {
              userId: result.user.id,
              email: result.user.email || trimmedEmail,
              fromSignUp: true,
            });
            return;
          } else {
            // Pas de session → demander confirmation d'email
            console.log('[LOGIN] Pas de session après signUp, email doit être confirmé');
            setLoading(false);
            // Afficher le message visuel sur l'écran
            setShowEmailConfirmation(true);
            setPendingEmail(trimmedEmail);
            // Passer en mode connexion
            setIsSignUp(false);
            setEmail(trimmedEmail);
            return;
          }
        } else {
          // Pas d'utilisateur retourné mais pas d'erreur non plus (cas étrange)
          console.error('[LOGIN] PROBLÈME: Pas d\'utilisateur retourné mais pas d\'erreur non plus');
          setLoading(false);
          setEmailError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
          return;
        }
      } else {
        // CONNEXION
        result = await signIn(trimmedEmail, trimmedPassword);
        
        if (result.error) {
          setLoading(false);
          
          // Gestion spécifique des erreurs de connexion
          const errorMessage = result.error.message || '';
          const errorCode = result.error.code || result.error.status || '';
          
          // Email non confirmé
          if (errorCode === 'EMAIL_NOT_CONFIRMED' || 
              errorMessage.includes('Email not confirmed') ||
              errorMessage.includes('email not confirmed')) {
            Alert.alert(
              '📧 Email non confirmé',
              'Vous devez d\'abord confirmer votre email avant de pouvoir vous connecter.\n\n' +
              'Vérifiez votre boîte mail (' + trimmedEmail + ') et cliquez sur le lien de confirmation dans l\'email que nous vous avons envoyé.\n\n' +
              'Si vous n\'avez pas reçu l\'email, vérifiez vos spams ou créez un nouveau compte.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    setEmailError('Confirmez votre email (vérifiez votre boîte mail)');
                  }
                }
              ],
              { cancelable: false }
            );
            return;
          }
          
          // Identifiants invalides (Supabase ne différencie pas email inexistant vs mot de passe incorrect)
          if (errorCode === 'INVALID_CREDENTIALS' || 
              errorMessage.includes('Invalid login credentials') ||
              errorMessage.includes('Invalid password') ||
              errorCode === 'invalid_credentials') {
            setPasswordError('Email ou mot de passe incorrect.');
            return;
          }
          
          // Compte non confirmé
          if (errorCode === 'EMAIL_NOT_CONFIRMED' || 
              errorMessage.includes('Email not confirmed') ||
              errorMessage.includes('email not confirmed')) {
            setPasswordError('Ton compte n\'est pas encore confirmé.\nVérifie tes emails.');
            return;
          }
          
          // Session expirée
          if (errorMessage.includes('session expired') || errorMessage.includes('Session expired')) {
            setPasswordError('Ta session a expiré.\nReconnecte-toi.');
            return;
          }
          
          // Erreur réseau
          if (errorCode === 'NETWORK_ERROR' || errorMessage.includes('network') || errorMessage.includes('Network')) {
            setPasswordError('Connexion impossible.\nVérifie ta connexion internet.');
            return;
          }
          
          // Erreur générique
          setPasswordError(errorMessage || 'Une erreur est survenue lors de la connexion. Veuillez réessayer.');
          return;
        }

        // Connexion réussie
        if (result.user) {
          console.log('[LOGIN] Connexion réussie, user.id:', result.user.id?.substring(0, 8) + '...');
          
          // CRITICAL FIX: Simplifier la vérification de session
          // Attendre un court délai pour que la session soit persistée
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const sessionCheck = await getSession(true); // Force refresh pour éviter le cache
          
          if (!sessionCheck?.session) {
            // Essayer d'obtenir la session directement depuis Supabase
            const { supabase } = require('../../services/supabase');
            const { data: directSessionData } = await supabase.auth.getSession();
            
            if (directSessionData?.session) {
              // Session trouvée directement, continuer avec cette session
              console.log('[LOGIN] Session trouvée via appel direct à Supabase');
            } else {
              console.error('[LOGIN] PROBLÈME: Pas de session après connexion réussie');
              setLoading(false);
              setPasswordError('La session n\'a pas pu être sauvegardée. Veuillez réessayer.');
            return;
            }
          }
          
          // CRITICAL FIX: Vérifier si l'onboarding est complété
          // Utiliser UNE SEULE redirection pour éviter les conflits
          
          // EXCEPTION : Email admin pour toujours passer par l'onboarding (pour tests)
          const ADMIN_TEST_EMAIL = 'align.app.contact@gmail.com';
          const isAdminTestEmail = trimmedEmail.toLowerCase() === ADMIN_TEST_EMAIL.toLowerCase();
          
          if (isAdminTestEmail) {
            // Forcer la redirection vers l'onboarding pour l'email admin
            console.log('[LOGIN] Email admin détecté, redirection forcée vers Onboarding');
            navigation.replace('Onboarding', {
              userId: result.user.id,
              email: result.user.email || trimmedEmail,
              fromSignUp: false,
            });
            return;
          }
          
          const onboardingCompleted = await isOnboardingCompleted(result.user.id);
          
          console.log('[LOGIN] Vérification onboarding après connexion:', {
            userId: result.user.id?.substring(0, 8) + '...',
            onboardingCompleted,
            email: result.user.email
          });
          
          if (!onboardingCompleted) {
            // L'onboarding n'est pas complété → rediriger vers Onboarding
            console.log('[LOGIN] Onboarding non complété, redirection vers Onboarding');
            navigation.replace('Onboarding', {
              userId: result.user.id,
              email: result.user.email || trimmedEmail,
              fromSignUp: false,
            });
            return;
          }
          
          // Onboarding complété → initialiser les quêtes puis rediriger vers Main (accueil)
          console.log('[LOGIN] Onboarding complété, initialisation des quêtes...');
          try {
            await initializeQuestSystem();
            console.log('[LOGIN] Quêtes initialisées avec succès');
          } catch (error) {
            console.error('[LOGIN] Erreur lors de l\'initialisation des quêtes (non-bloquant):', error);
          }
          navigation.replace('Main');
          return;
        } else {
          // Pas d'utilisateur retourné mais pas d'erreur non plus
          setLoading(false);
          setPasswordError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
          return;
        }
      }
    } catch (error) {
      // Gestion des erreurs inattendues
      setLoading(false);
      console.error('Erreur authentification:', error);
      
      if (isSignUp) {
        setEmailError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
      } else {
        setPasswordError('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
      }
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo/Titre avec dégradé vertical */}
        <Text style={styles.title}>
          ALIGN
        </Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Créer un compte' : 'Se connecter'}
        </Text>

        {/* Formulaire */}
        <View style={styles.form}>
          <View>
            <TextInput
              style={[styles.input, emailError && styles.inputError]}
              placeholder="Email"
              placeholderTextColor="#FFFFFF80"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            {emailError ? (
              <Text style={styles.errorText}>{emailError}</Text>
            ) : null}
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, passwordError && styles.inputError]}
              placeholder="Mot de passe"
              placeholderTextColor="#FFFFFF80"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              secureTextEntry
              editable={!loading}
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={(e) => {
              // Empêcher tout comportement par défaut
              if (e && e.preventDefault) {
                e.preventDefault();
              }
              handleSubmit(e);
            }}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'CRÉER LE COMPTE' : 'SE CONNECTER'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              // Réinitialiser les erreurs quand on change de mode
              setEmailError('');
              setPasswordError('');
              setShowEmailConfirmation(false);
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Déjà un compte ? Se connecter'
                : 'Pas de compte ? S\'inscrire'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message de confirmation d'email */}
        {showEmailConfirmation && (
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationIcon}>📧</Text>
              <Text style={[styles.confirmationTitle, { marginLeft: 12 }]}>Confirmez votre email</Text>
            </View>
            <Text style={styles.confirmationMessage}>
              Votre compte a été créé avec succès !
            </Text>
            <View style={styles.emailContainer}>
              <Text style={styles.confirmationLabel}>Email envoyé à :</Text>
              <Text style={styles.confirmationEmail}>{pendingEmail}</Text>
            </View>
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>⚠️ Pour continuer :</Text>
              <Text style={styles.instructionItem}>1. Ouvrez votre boîte mail</Text>
              <Text style={styles.instructionItem}>2. Cliquez sur le lien de confirmation</Text>
              <Text style={styles.instructionItem}>3. Revenez ici pour vous connecter</Text>
            </View>
            <Text style={styles.confirmationWarning}>
              Vous ne pourrez pas vous connecter tant que votre email n'est pas confirmé.
            </Text>
            <TouchableOpacity
              style={styles.confirmationButton}
              onPress={() => {
                setShowEmailConfirmation(false);
                setEmailError('Confirmez d\'abord votre email (vérifiez votre boîte mail)');
              }}
            >
              <Text style={styles.confirmationButtonText}>J'ai compris</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 48,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 48,
    opacity: 0.9,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  inputError: {
    borderColor: '#FF4444',
    borderWidth: 1.5,
  },
  passwordContainer: {
    marginBottom: 12,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    fontFamily: theme.fonts.body,
    marginTop: 4,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#FF7B2B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  switchButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
  // Message de confirmation d'email
  confirmationCard: {
    marginTop: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FF7B2B',
    width: '100%',
    maxWidth: 400,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationIcon: {
    fontSize: 32,
  },
  confirmationTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    letterSpacing: 1,
    flex: 1,
  },
  confirmationMessage: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  emailContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  confirmationLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  confirmationEmail: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
    fontWeight: 'bold',
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  instructionItem: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 8,
    paddingLeft: 8,
  },
  confirmationWarning: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: '#FFD93F',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  confirmationButton: {
    backgroundColor: '#FF7B2B',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  confirmationButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

