/**
 * Écran interlude — après résultat secteur, avant quiz métier
 * Transition : "GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR {SECTEUR}..."
 * Le secteur est dynamique (issu du quiz secteur).
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(Math.max(width * 0.22, 290), 410) + 70;
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

/**
 * Image à placer manuellement dans ce dossier : assets/onboarding/
 * Fichier attendu : interlude_secteur.png
 * Même taille et marges que les autres écrans onboarding avec image.
 */
const IMAGE_SOURCE = require('../../../assets/onboarding/interlude_secteur.png');

/**
 * Retourne le libellé secteur en majuscules (fallback TECH).
 */
function formatSecteurName(secteurName) {
  const fallback = 'TECH';
  const formatted = (secteurName || '').toString().trim();
  return formatted ? formatted.toUpperCase() : fallback;
}

export default function InterludeSecteurScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const secteurName = (route.params?.secteurName || '').toString().trim();
  const secteurLabel = formatSecteurName(secteurName);
  const secteurDisplay = ` ${secteurLabel}`;

  const textBefore = 'GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR';
  const textAfter = ' ON VA PRÉCISER UN MÉTIER QUI POURRAIT TE CORRESPONDRE';

  const handleContinue = () => {
    navigation.replace('QuizMetier');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Titre principal — secteur en dégradé #FF7B2B → #FFD93F, même structure que TonMetierDefini */}
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{textBefore}</Text>
            {Platform.OS === 'web' ? (
              <Text
                style={[
                  styles.sectorGradient,
                  {
                    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {secteurDisplay}
              </Text>
            ) : (
              <MaskedView
                maskElement={
                  <Text style={[styles.sectorGradient, styles.gradientText]}>{secteurDisplay}</Text>
                }
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.sectorGradient, styles.transparentText]}>{secteurDisplay}</Text>
                </LinearGradient>
              </MaskedView>
            )}
            <Text style={styles.titleText}>{textAfter}</Text>
          </View>
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={styles.illustration}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    maxWidth: width * 0.92,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: Math.min(Math.max(width * 0.026, 22), 35),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.03, 26), 40) * 1.08,
  },
  sectorGradient: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(Math.max(width * 0.026, 22), 35),
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.03, 26), 40) * 1.08,
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginVertical: 20,
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
    marginTop: 20,
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
});
