import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getCurrentUser } from '../../services/auth';
import { sendWelcomeEmailIfNeeded } from '../../services/emailService';

/**
 * Écran : Remplis ton nom, prénom et saisis un nom d'utilisateur
 * CRITICAL: Envoie l'email de bienvenue EXACTEMENT au submit de cet écran
 */
export default function UserInfoScreen({ onNext, userId, email }) {
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

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Remplis ton nom, prénom et saisis un nom d'utilisateur
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={styles.input}
            placeholder="Nom d'utilisateur"
            placeholderTextColor="rgba(255, 255, 255, 0.7)"
            value={username}
            onChangeText={setUsername}
          />
        </View>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={[styles.button, !canContinue() && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canContinue()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canContinue() ? ['#FF7B2B', '#FFA36B'] : ['#666666', '#666666']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>CONTINUER</Text>
          </LinearGradient>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  formContainer: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 25,
    padding: 16,
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  button: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
