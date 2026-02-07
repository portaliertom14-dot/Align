import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import GradientText from '../../components/GradientText';
import StandardHeader from '../../components/StandardHeader';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width - 48, 520);
import { getCurrentUser } from '../../services/auth';
import { sendWelcomeEmailIfNeeded } from '../../services/emailService';

/**
 * Écran : Remplis ton nom, prénom et saisis un nom d'utilisateur
 * CRITICAL: Envoie l'email de bienvenue EXACTEMENT au submit de cet écran
 */
export default function UserInfoScreen({ onNext, onBack, userId, email }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const canContinue = () => {
    return firstName.trim() !== '' && lastName.trim() !== '' && username.trim() !== '';
  };

  const handleNext = async () => {
    if (!canContinue()) return;
    
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedUsername = username.trim();
    
    // CRITICAL: Envoyer l'email de bienvenue EXACTEMENT au submit de Prénom/Nom
    // Avant d'appeler onNext pour continuer vers le quiz
    if (trimmedFirstName && (userId || email)) {
      setSendingEmail(true);
      console.log('[UserInfoScreen] 📧 Envoi email bienvenue au submit Prénom/Nom...');
      
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
    
    // Continuer vers le quiz (même si l'email échoue)
    onNext({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      username: trimmedUsername,
    });
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
          <Text style={styles.title}>
            DIT-NOUS COMMENT TU T'APPELLES ET CHOISIS UN PSEUDO !
          </Text>

          <View style={styles.subtitleContainer}>
            <GradientText colors={['#FF7B2B', '#FFB93F']} style={styles.subtitle}>
              Crée ton identité Align
            </GradientText>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Prénom.."
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder="Nom.."
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={lastName}
              onChangeText={setLastName}
            />
            <TextInput
              style={styles.input}
              placeholder="Pseudo.."
              placeholderTextColor="rgba(255, 255, 255, 0.40)"
              value={username}
              onChangeText={setUsername}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, !canContinue() && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={!canContinue()}
            activeOpacity={0.8}
          >
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>CONTINUER</Text>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
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
  formContainer: {
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
    color: '#FFFFFF',
    marginBottom: 14,
    borderWidth: 0,
  },
  button: {
    width: CONTENT_WIDTH,
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
