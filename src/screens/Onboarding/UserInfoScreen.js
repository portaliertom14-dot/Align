import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { getCurrentUser } from '../../services/auth';
import { sendWelcomeEmailIfNeeded } from '../../services/emailService';
import { getUserProfile } from '../../lib/userProfile';
import { getOnboardingQuestionTextSizes, getUnifiedCtaButtonStyle } from './onboardingConstants';

/**
 * Écran : Prénom + Pseudo uniquement (pas de champ Nom)
 * CRITICAL: Envoie l'email de bienvenue EXACTEMENT au submit de cet écran
 * Pré-remplit depuis profiles si l'utilisateur revient (onboarding incomplet).
 */
export default function UserInfoScreen({ onNext, onBack, userId, email, submitting = false, usernameError = null, onClearUsernameError }) {
  const { width } = useWindowDimensions();
  const CONTENT_WIDTH = Math.min(width - 48, 520);
  const questionSizes = getOnboardingQuestionTextSizes(width);
  const ctaStyle = getUnifiedCtaButtonStyle(width);
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const hydratedOnceRef = useRef(false);
  const nextCalledRef = useRef(false);

  // Initialisation unique : pré-remplir uniquement si retour (valeurs déjà saisies, pas défauts serveur)
  useEffect(() => {
    if (hydratedOnceRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const profile = await getUserProfile();
        if (cancelled) return;
        if (hydratedOnceRef.current) return;
        hydratedOnceRef.current = true;
        const rawFirst = String(profile?.firstName ?? profile?.prenom ?? '').trim();
        const rawUser = profile?.username != null ? String(profile.username).trim() : '';
        const isDefaultFirst = rawFirst === '' || rawFirst === 'Utilisateur';
        const isDefaultUsername = rawUser === '' || /^user_[a-f0-9-]+$/i.test(rawUser);
        if (!isDefaultFirst) setFirstName(rawFirst);
        if (!isDefaultUsername) setUsername(rawUser);
      } catch (e) {
        if (__DEV__) console.warn('[UserInfoScreen] Pré-remplissage profil (non bloquant):', e?.message);
        if (!cancelled) hydratedOnceRef.current = true;
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Réautoriser un nouveau submit après échec (submitting repasse à false)
  useEffect(() => {
    if (!submitting) nextCalledRef.current = false;
  }, [submitting]);

  const canContinue = () => {
    return firstName.trim() !== '' && username.trim() !== '';
  };

  const handleNext = async () => {
    if (!canContinue() || submitting) return;
    if (nextCalledRef.current) return;

    const trimmedFirstName = firstName.trim();
    const trimmedUsername = username.trim();

    // CRITICAL: Envoyer l'email de bienvenue EXACTEMENT au submit (Prénom + Pseudo)
    if (trimmedFirstName && (userId || email)) {
      setSendingEmail(true);
      console.log('[UserInfoScreen] 📧 Envoi email bienvenue au submit...');
      
      try {
        // Récupérer userId si non fourni en prop
        let targetUserId = userId;
        if (!targetUserId) {
          const user = await getCurrentUser();
          targetUserId = user?.id;
        }
        
        if (targetUserId && email) {
          // Envoyer l'email (non bloquant pour le flux)
          sendWelcomeEmailIfNeeded(targetUserId, email, trimmedFirstName)
            .then((result) => {
              if (result.sent) {
                console.log('[UserInfoScreen] ✅ Email de bienvenue envoyé avec succès');
              } else if (result.success) {
                console.log('[UserInfoScreen] ℹ️ Email déjà envoyé précédemment');
              } else {
                console.warn('[UserInfoScreen] ⚠️ Échec envoi email (non bloquant):', result.error || result.warning);
              }
            })
            .catch((err) => {
              console.warn('[UserInfoScreen] ⚠️ Erreur envoi email (non bloquant):', err);
            });
        } else {
          console.warn('[UserInfoScreen] ⚠️ Pas de userId/email pour envoyer l\'email');
        }
      } catch (emailError) {
        console.warn('[UserInfoScreen] ⚠️ Erreur préparation email (non bloquant):', emailError);
      } finally {
        setSendingEmail(false);
      }
    }

    nextCalledRef.current = true;
    onNext({
      firstName: trimmedFirstName,
      username: trimmedUsername,
    });
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StandardHeader title="ALIGN" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { fontSize: questionSizes.titleFontSize, lineHeight: questionSizes.titleLineHeight }]}>
            DIT-NOUS COMMENT TU T'APPELLES ET CHOISIS UN PSEUDO !
          </Text>

          <View style={styles.subtitleContainer}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.subtitle}>
              Crée ton identité Align
            </GradientText>
          </View>

          <View style={[styles.formContainer, { width: CONTENT_WIDTH }]}>
            <TextInput
              style={styles.input}
              placeholder="Prénom"
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom d'utilisateur"
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                if (onClearUsernameError) onClearUsernameError();
              }}
            />
            {usernameError ? (
              <Text style={styles.usernameError}>{usernameError}</Text>
            ) : null}
          </View>

          <HoverableTouchableOpacity
            style={[styles.button, { width: CONTENT_WIDTH }, (!canContinue() || submitting) && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canContinue() || submitting}
            activeOpacity={0.8}
            variant="button"
          >
            <View style={[styles.buttonInner, { paddingVertical: ctaStyle.paddingVertical, paddingHorizontal: ctaStyle.paddingHorizontal }]}>
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.buttonText, { fontSize: ctaStyle.fontSize }]}>CONTINUER</Text>
              )}
            </View>
          </HoverableTouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  title: {
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
  formContainer: {
    marginBottom: 28,
  },
  usernameError: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: theme.fonts.button,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 0,
  },
  button: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonInner: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
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
