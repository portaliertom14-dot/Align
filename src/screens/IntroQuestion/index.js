import React from 'react';
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

const { width, height } = Dimensions.get('window');

/**
 * ÉCRAN 3 — INTRODUCTION (QUESTIONNEMENT)
 * 
 * Écran d'introduction posant la question sur l'avenir de l'utilisateur.
 * Design : Fond sombre avec titre, sous-texte en dégradé, personnage étoile et bouton CTA.
 * Navigation : COMMENCER → vers PreQuestionsScreen (écran 4)
 * 
 * STRICTEMENT CONFORME À LA MAQUETTE FOURNIE
 */
export default function IntroQuestionScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleStart = () => {
    navigation.navigate('PreQuestions');
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
        <View style={styles.titleBlock}>
          <Text style={styles.mainTitle}>
            TU TE POSES DES QUESTIONS SUR TON AVENIR ?
          </Text>

          {/* Sous-texte avec dégradé — sur web : gradient sur le même élément que le texte (Text) */}
        {Platform.OS === 'web' ? (
          <View style={styles.subtitleWebWrapper}>
            <Text
              style={[
                styles.subtitle,
                {
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                },
              ]}
            >
              Align t'aide à y voir plus clair, étape par étape.
            </Text>
          </View>
        ) : (
          <MaskedView
            maskElement={
              <Text style={[styles.subtitle, styles.gradientText]}>
                Align t'aide à y voir plus clair, étape par étape.
              </Text>
            }
          >
            <LinearGradient
              colors={['#FF7B2B', '#FFD93F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientContainer}
            >
              <Text style={[styles.subtitle, styles.transparentText]}>
                Align t'aide à y voir plus clair, étape par étape.
              </Text>
            </LinearGradient>
          </MaskedView>
        )}
        </View>

        {/* Illustration centrale - étoile avec point d'interrogation */}
        <Image
          source={require('../../../assets/images/star-question.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        {/* Bouton principal */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>COMMENCER</Text>
        </TouchableOpacity>
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
    paddingTop: 80,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  titleBlock: {
    minHeight: 80,
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    paddingHorizontal: 2,
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
  },
  subtitle: {
    fontFamily: Platform.select({
      web: 'Nunito, sans-serif',
      default: 'Nunito_900Black',
    }),
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.015, 15), 20),
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: Math.min(Math.max(width * 0.02, 20), 30),
    marginTop: 6,
  },
  subtitleWebWrapper: { marginTop: 6, alignItems: 'center' },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    width: Math.min(Math.max(width * 0.24, 300), 430) + 40,
    height: Math.min(Math.max(width * 0.24, 300), 430) + 40,
    marginVertical: 16,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: Math.min(width * 0.76, 400),
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
