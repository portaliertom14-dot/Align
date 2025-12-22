import React, { useState } from 'react';
import { View, StyleSheet, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { signUp, signIn } from '../../services/auth';

/**
 * Écran Authentification - Création de compte ou connexion
 * Deux modes : créer un compte ou se connecter
 */
export default function AuthScreen({ onNext }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async () => {
    // Validation
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Erreur', 'Email invalide');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        // Créer un compte
        result = await signUp(email, password);
        if (result.error) {
          if (result.error.message.includes('already registered')) {
            Alert.alert('Erreur', 'Cet email est déjà utilisé. Essayez de vous connecter.');
            setIsSignUp(false);
            return;
          }
          throw result.error;
        }
      } else {
        // Se connecter
        result = await signIn(email, password);
        if (result.error) {
          if (result.error.message.includes('Invalid login credentials')) {
            Alert.alert('Erreur', 'Email ou mot de passe incorrect');
            return;
          }
          throw result.error;
        }
      }

      if (result.user) {
        // Stocker l'ID utilisateur et l'email, puis passer à l'écran suivant
        const userEmail = result.user.email || email;
        onNext(result.user.id, userEmail);
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#00AAFF', '#00012F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>
          {isSignUp ? 'CRÉER UN COMPTE' : 'SE CONNECTER'}
        </Text>

        {/* Champs de formulaire */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF7B2B', '#FFA36B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {loading ? 'CHARGEMENT...' : isSignUp ? 'CRÉER MON COMPTE' : 'SE CONNECTER'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Lien pour basculer entre création et connexion */}
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Déjà un compte ? Se connecter'
              : 'Pas encore de compte ? Créer un compte'}
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 1,
  },
  form: {
    marginBottom: 32,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    marginBottom: 24,
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
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.8,
    textDecorationLine: 'underline',
  },
});

