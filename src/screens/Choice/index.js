import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setSourceAuthAction } from '../../services/authFlowSource';
import { theme } from '../../styles/theme';

/**
 * ÉCRAN 2 — CHOIX CONNEXION / NOUVEL UTILISATEUR
 * 
 * Deuxième écran de l'application Align.
 * Design : Fond sombre avec deux sections (connexion et nouvel utilisateur).
 * Navigation : 
 * - SE CONNECTER → vers écran de connexion
 * - COMMENCER → vers onboarding (questions préliminaires)
 * 
 * STRICTEMENT CONFORME À LA MAQUETTE FOURNIE
 */
export default function ChoiceScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const buttonWidth = Math.min(width * 0.76, 400);
  const promptFontSize = Math.min(width * 0.048, 22);
  const promptLineHeight = Math.min(width * 0.065, 30);
  const separatorWidth = Math.min(width * 0.6, 320);

  const handleLogin = () => {
    setSourceAuthAction('login');
    navigation.navigate('Login', { source: 'login' });
  };

  const handleSignup = () => {
    setSourceAuthAction('signup');
    navigation.navigate('IntroQuestion');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 8 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        {/* SECTION 1 — Connexion */}
        <View style={styles.section}>
          <Text
            style={[
              styles.promptText,
              { fontSize: promptFontSize, lineHeight: promptLineHeight },
            ]}
          >
            TU AS DÉJÀ UN COMPTE ?
          </Text>
          <HoverableTouchableOpacity
            style={[styles.button, styles.loginButton, { width: buttonWidth }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            variant="button"
          >
            <Text style={styles.buttonText}>SE CONNECTER</Text>
          </HoverableTouchableOpacity>
        </View>

        {/* Séparateur */}
        <View
          style={[
            styles.separator,
            { width: separatorWidth, marginVertical: height * 0.06 },
          ]}
        />

        {/* SECTION 2 — Nouvel utilisateur */}
        <View style={styles.section}>
          <Text
            style={[
              styles.promptText,
              { fontSize: promptFontSize, lineHeight: promptLineHeight },
            ]}
          >
            TU VIENS D'ARRIVER SUR ALIGN ?
          </Text>
          <HoverableTouchableOpacity
            style={[styles.button, styles.signupButton, { width: buttonWidth }]}
            onPress={handleSignup}
            activeOpacity={0.85}
            variant="button"
          >
            <Text style={styles.buttonText}>COMMENCER</Text>
          </HoverableTouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23', // Fond sombre exact
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  section: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
  },
  promptText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    // Effet hover géré via activeOpacity
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4, // Android
  },
  loginButton: {
    backgroundColor: '#00AAFF', // Bleu exact
  },
  signupButton: {
    backgroundColor: '#FF7B2B',
  },
  buttonText: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...theme.buttonTextNoWrap,
  },
  separator: {
    height: 1,
    backgroundColor: '#FFFFFF',
    opacity: 0.5, // Opacité 50% comme spécifié
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
