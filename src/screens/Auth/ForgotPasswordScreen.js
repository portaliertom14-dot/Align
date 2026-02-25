/**
 * Écran "Mot de passe oublié" — envoi du lien de réinitialisation par email (Supabase Auth uniquement).
 * Demande l’email, appelle supabase.auth.resetPasswordForEmail avec redirectTo /reset-password, affiche "Regarde tes emails."
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { resetPasswordForEmail } from '../../services/auth';
import { theme } from '../../styles/theme';
import StandardHeader from '../../components/StandardHeader';

const { width } = Dimensions.get('window');
const CONTENT_WIDTH = Math.min(width * 0.76, 400);

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    try {
      const { error: err } = await resetPasswordForEmail(trimmed, {
        redirectTo: 'https://www.align-app.fr/reset-password',
      });
      if (err) {
        setError('Impossible d\'envoyer le lien. Vérifie ton adresse ou réessaie plus tard.');
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch (e) {
      setError('Impossible d\'envoyer le lien. Réessaie.');
    }
    setLoading(false);
  };

  const backAction = (
    <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8} style={{ padding: 8 }}>
      <Text style={styles.backButtonText}>←</Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={['#1A1B23', '#1A1B23']} style={styles.container}>
      <StandardHeader title="ALIGN" leftAction={backAction} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>MOT DE PASSE OUBLIÉ ?</Text>
          {!success ? (
            <>
              <Text style={styles.subtitle}>
                Entre ton email, nous t'enverrons un lien pour le réinitialiser.
              </Text>
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
                disabled={loading}
                activeOpacity={0.8}
                variant="button"
              >
                <View style={styles.buttonSolid}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>ENVOYER LE LIEN</Text>
                  )}
                </View>
              </HoverableTouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>Regarde tes emails.</Text>
              <Text style={styles.successHint}>Vérifie aussi les spams.</Text>
              <HoverableTouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.8}
                variant="button"
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Retour connexion</Text>
                </LinearGradient>
              </HoverableTouchableOpacity>
            </>
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
  },
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: CONTENT_WIDTH,
  },
  successHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: CONTENT_WIDTH,
    backgroundColor: '#2E3240',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  errorContainer: {
    width: CONTENT_WIDTH,
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#EC3912',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: CONTENT_WIDTH,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonSolid: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  backButtonText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
});
