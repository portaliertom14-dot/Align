import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');
const TITLE_CONTAINER_MAX_WIDTH = width * 0.96;
const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
const BTN_WIDTH = Math.min(width * 0.76, 400);

/**
 * Écran d'introduction au quiz secteur
 * Affiché juste après UserInfoScreen (prénom, pseudo)
 * Bouton "C'EST PARTI !" → navigation vers Quiz
 */
export default function SectorQuizIntroScreen({ onBack }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    navigation.replace('Quiz');
  };

  const subtitleText = "Répond simplement, il n'y a pas de bonnes ou de mauvaises réponses";

  // Titre sur 2 lignes : deux <Text> pour garantir le rendu sur toutes les plateformes (web ignorait \n)
  const titleLine1 = "ON VA MAINTENANT T'AIDER À TROUVER UN";
  const titleLine2 = "SECTEUR QUI TE CORRESPOND VRAIMENT.";

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'SectorQuizIntroScreen.js:mount',
        message: 'SectorQuizIntroScreen mounted',
        data: {
          hypothesisId: 'H1',
          titleLines: 2,
          platform: Platform.OS,
          titleContainerMaxWidth: TITLE_CONTAINER_MAX_WIDTH,
          screenWidth: width,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'post-fix',
      }),
    }).catch(() => {});
  }, []);
  // #endregion

  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 8 }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{titleLine1}</Text>
          <Text style={styles.title}>{titleLine2}</Text>
        </View>

        <View style={styles.subtitleContainer}>
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.subtitle,
                {
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFDF93 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                },
              ]}
            >
              {subtitleText}
            </Text>
          ) : (
            <MaskedView
              maskElement={
                <Text style={[styles.subtitle, styles.gradientText]}>{subtitleText}</Text>
              }
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFDF93']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientContainer}
              >
                <Text style={[styles.subtitle, styles.transparentText]}>{subtitleText}</Text>
              </LinearGradient>
            </MaskedView>
          )}
        </View>

        <Image
          source={require('../../../assets/images/star-sector-intro.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>C'EST PARTI !</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    maxWidth: TITLE_CONTAINER_MAX_WIDTH,
  },
  title: {
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
  },
  subtitleContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.015, 15), 20),
    textAlign: 'center',
    lineHeight: Math.min(Math.max(width * 0.02, 20), 30),
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginVertical: 16,
    flexShrink: 1,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
