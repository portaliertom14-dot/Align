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

  const handleStart = () => {
    navigation.navigate('PreQuestions');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Titre principal */}
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
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  /* Titre — taille réduite (-100px équivalent) */
  mainTitle: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: Math.min(Math.max(width * 0.026, 22), 36),
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: Math.min(Math.max(width * 0.03, 26), 42) * 1.08,
  },
  subtitle: {
    fontFamily: Platform.select({
      web: 'Nunito, sans-serif',
      default: 'Nunito_900Black',
    }),
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.016, 16), 24),
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 24,
    lineHeight: Math.min(Math.max(width * 0.022, 22), 32),
  },
  subtitleWebWrapper: {
    marginBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  gradientText: {
    // Masque pour le dégradé (mobile)
  },
  gradientContainer: {
    // Container pour le dégradé (mobile)
  },
  transparentText: {
    opacity: 0, // Texte transparent pour le dimensionnement
  },
  /* Image — +150px, +100px ; marges réduites pour garder titre/bouton à leur place */
  illustration: {
    width: Math.min(Math.max(width * 0.22, 290), 410) + 100,
    height: Math.min(Math.max(width * 0.22, 290), 410) + 100,
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: Math.min(width * 0.76, 400),
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
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
});
