/**
 * Écran intermédiaire après résultat secteur, avant quiz métier.
 * Flow : ResultatSecteur → InterludeSecteur → QuizMetier.
 * Contenu : phrase avec secteur en dégradé, image, bouton C'EST PARTI !
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
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = Math.min(Math.max(width * 0.24, 300), 430) + 40;
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

// Image : à placer manuellement dans assets/onboarding/interlude_secteur.png
const IMAGE_SOURCE = require('../../../assets/onboarding/interlude_secteur.png');

export default function InterludeSecteurScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const sectorName = (route.params?.sectorName || 'Tech').toString().trim();

  const handleGo = () => {
    navigation.replace('QuizMetier');
  };

  const line1 = "GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR ";
  const line2 = " ON VA PRÉCISER UN MÉTIER QUI POURRAIT TE CORRESPONDRE.";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>{line1}</Text>
          {Platform.OS === 'web' ? (
            <Text
              style={[
                styles.sectorText,
                {
                  backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                },
              ]}
            >
              {sectorName}
            </Text>
          ) : (
            <MaskedView
              maskElement={<Text style={[styles.sectorText, styles.gradientText]}>{sectorName}</Text>}
            >
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientContainer}
              >
                <Text style={[styles.sectorText, styles.transparentText]}>{sectorName}</Text>
              </LinearGradient>
            </MaskedView>
          )}
          <Text style={styles.mainTitle}>{line2}</Text>
        </View>

        <Image
          source={IMAGE_SOURCE}
          style={styles.illustration}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleGo}
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    maxWidth: width * 0.92,
  },
  mainTitle: {
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
  },
  sectorText: {
    fontSize: Math.min(Math.max(width * 0.022, 16), 26),
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05,
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
});
