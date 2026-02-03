import React, { useEffect, useRef } from 'react';
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
const IMAGE_SIZE = Math.min(Math.max(width * 0.22, 290), 410) + 70;

const LOG_ENDPOINT = 'http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469';

/**
 * ÉCRAN 4 — PRÉ-QUESTIONS
 * 
 * Écran annonçant les 6 questions préliminaires.
 * Design : Fond sombre avec titre (chiffre 6 en dégradé), personnage étoile avec laptop et bouton CTA.
 * Navigation : C'EST PARTI ! → vers la première question
 * 
 * STRICTEMENT CONFORME À LA MAQUETTE FOURNIE
 */
export default function PreQuestionsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const titleContainerRef = useRef(null);
  const titleNumberWrapperRef = useRef(null);

  useEffect(() => {
    // #region agent log
    if (Platform.OS !== 'web' || !titleContainerRef.current || !titleNumberWrapperRef.current) return;
    const container = titleContainerRef.current;
    const wrapper = titleNumberWrapperRef.current;
    const containerStyle = window.getComputedStyle(container);
    const wrapperStyle = window.getComputedStyle(wrapper);
    const childDisplays = [];
    try {
      for (let i = 0; i < container.children.length; i++) {
        const c = container.children[i];
        childDisplays.push({ tag: c.tagName, display: window.getComputedStyle(c).display });
      }
    } catch (e) {
      childDisplays.push({ error: String(e) });
    }
    fetch(LOG_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PreQuestions/index.js:useEffect', message: 'Title container DOM styles', data: { platform: Platform.OS, containerDisplay: containerStyle.display, containerFlexDirection: containerStyle.flexDirection, wrapperDisplay: wrapperStyle.display, childCount: container.children?.length || 0, childDisplays }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {});
    // #endregion
  }, []);

  const handleStart = () => {
    // Navigation vers la première question (à adapter selon le flow existant)
    navigation.navigate('OnboardingQuestions');
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
        {/* Bloc titre — même hauteur min que IntroQuestion pour alignement vertical */}
        <View style={styles.titleSection}>
        {Platform.OS === 'web' ? (
          /* Web : un seul Text avec "6" en nested Text (dégradé via style) = une seule ligne garantie */
          <Text ref={titleContainerRef} style={[styles.mainTitle, styles.mainTitleWeb]}>
            RÉPONDS À <Text style={[styles.mainTitle, styles.gradientNumberWeb]}>6</Text> PETITES QUESTIONS AVANT DE COMMENCER !
          </Text>
        ) : (
          <View ref={titleContainerRef} style={styles.titleContainer}>
            <Text style={styles.mainTitle}>RÉPONDS À </Text>
            <View ref={titleNumberWrapperRef} style={styles.titleNumberWrapper}>
              <MaskedView
                maskElement={
                  <Text style={[styles.mainTitle, styles.gradientNumber]}>6</Text>
                }
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.mainTitle, styles.transparentText]}>6</Text>
                </LinearGradient>
              </MaskedView>
            </View>
            <Text style={styles.mainTitle}> PETITES QUESTIONS AVANT DE COMMENCER !</Text>
          </View>
        )}

        {/* Sous-texte — même hauteur, taille et dégradé #FF7B2B → #FFD93F que IntroQuestion, Nunito Black */}
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
              Ces questions vont nous permettre de mieux comprendre ce qui te correspond vraiment.
            </Text>
          </View>
        ) : (
          <MaskedView
            maskElement={
              <Text style={[styles.subtitle, styles.gradientText]}>
                Ces questions vont nous permettre de mieux comprendre ce qui te correspond vraiment.
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
                Ces questions vont nous permettre de mieux comprendre ce qui te correspond vraiment.
              </Text>
            </LinearGradient>
          </MaskedView>
        )}
        </View>

        {/* Illustration centrale - étoile avec ordinateur */}
        <Image
          source={require('../../../assets/images/star-laptop.png')}
          style={styles.illustration}
          resizeMode="contain"
        />

        {/* Bouton principal */}
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
    paddingBottom: 40,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  titleSection: {
    marginBottom: 40,
    height: 126,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  /* Titre — même espacement que IntroQuestion pour alignement vertical */
  titleContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? { flexWrap: 'nowrap', display: 'flex' } : {}),
  },
  /* Sur web : inline-block pour que MaskedView ne force pas un retour à la ligne (sinon rendu en div block) */
  titleNumberWrapper: {
    flexShrink: 0,
    ...(Platform.OS === 'web' ? { display: 'inline-block' } : {}),
  },
  mainTitle: {
    fontFamily: Platform.select({
      web: 'Bowlby One SC, cursive',
      default: 'BowlbyOneSC_400Regular',
    }),
    fontSize: Math.min(Math.max(width * 0.024, 18), 30),
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: Math.min(Math.max(width * 0.028, 22), 34) * 1.08,
  },
  /* Web uniquement : titre en bloc + marge sous le titre pour le sous-texte */
  mainTitleWeb: {
    ...(Platform.OS === 'web' ? { display: 'block', marginBottom: 20 } : {}),
  },
  subtitle: {
    fontFamily: Platform.select({
      web: 'Nunito, sans-serif',
      default: 'Nunito_900Black',
    }),
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.015, 15), 20),
    textAlign: 'center',
    marginBottom: 0,
    paddingHorizontal: 24,
    lineHeight: Math.min(Math.max(width * 0.02, 20), 30),
  },
  subtitleWebWrapper: {
    marginBottom: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  gradientText: {},
  transparentText: { opacity: 0 },
  /* Web uniquement : "6" en dégradé (même technique que sous-titre écran 1) */
  gradientNumberWeb: {
    ...(Platform.OS === 'web'
      ? {
          backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: 'transparent',
        }
      : {}),
  },
  gradientNumber: {
    // Style pour le chiffre 6 en dégradé (native)
  },
  gradientContainer: {
    // Container pour le dégradé (titre "6" et sous-texte)
  },
  /* Image — même taille et marges que IntroQuestion pour alignement vertical */
  illustration: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginVertical: 24,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: Math.min(width * 0.76, 400),
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
