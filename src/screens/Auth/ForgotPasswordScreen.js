/**
 * Écran "Mot de passe oublié" — envoi du lien de réinitialisation par email via Align (Resend).
 * Appelle l'Edge Function send-reset-password-email (Supabase ne envoie plus l'email).
 */

import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, ActivityIndicator, Dimensions, ScrollView } from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
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
  const [sent, setSent] = useState(false);
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
      const { error: err } = await supabase.functions.invoke('send-reset-password-email', {
        body: { email: trimmed },
      });

      if (err) {
        setError('Impossible d\'envoyer le lien. Réessaie.');
        setLoading(false);
        return;
      }

      setSent(true);
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
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StandardHeader title="ALIGN" leftAction={backAction} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>MOT DE PASSE OUBLIÉ ?</Text>
          <Text style={styles.subtitle}>
            Entre ton email. On t'envoie un lien pour réinitialiser.
          </Text>

          {!sent ? (
            <>
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
            <View style={styles.successContainer}>
              <Text style={styles.successTitle}>Email envoyé</Text>
              <Text style={styles.successText}>
                Vérifie ta boîte mail (et tes spams).
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.8} style={styles.backLink}>
                <Text style={styles.backLinkText}>Retour connexion</Text>
              </TouchableOpacity>
            </View>
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
  subtitle: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    maxWidth: CONTENT_WIDTH,
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
    borderWidth: 0,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  button: {
    width: CONTENT_WIDTH,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 24,
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
  successContainer: {
    alignItems: 'center',
    maxWidth: CONTENT_WIDTH,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: theme.fonts.title,
    color: '#34C659',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  successText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backLink: { padding: 12 },
  backLinkText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
    fontWeight: '600',
  },
  backButtonText: { fontSize: 28, color: '#FFFFFF', fontWeight: 'bold' },
});
