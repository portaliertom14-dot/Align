import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { theme } from '../../styles/theme';

const { width } = Dimensions.get('window');
const TITLE_CONTAINER_MAX_WIDTH = width * 0.96;
const IMAGE_SIZE = Math.min(Math.max(width * 0.22, 290), 410) + 100;
const BTN_WIDTH = Math.min(width * 0.76, 400);

/**
 * Image : fournie manuellement.
 * Par défaut : star-sector-intro.png (même taille que les autres écrans onboarding).
 * Pour utiliser votre image : ajoutez ton-metier-defini.png dans assets/images/
 * puis remplacez la ligne require ci-dessous par :
 * require('../../../assets/images/ton-metier-defini.png')
 */
const IMAGE_SOURCE = require('../../../assets/images/star-sector-intro.png');

/**
 * Écran "Ton métier défini"
 * Affiché après le résultat du quiz métier (PropositionMetier).
 * Header avec nom du métier en dégradé, texte secondaire, image, bouton "COMMENCER LA VÉRIFICATION".
 */
export default function TonMetierDefiniScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const metierName = (route.params?.metierName || 'TRADER').toString().toUpperCase().trim();

  const headerPrefix = "TON MÉTIER DÉFINI EST DONC ";
  const subtitleText =
    "Mais avant de commencer ton chemin vers l'atteinte de cet objectif, on va d'abord vérifier si ce métier te correspond vraiment";

  const handleStart = () => {
    navigation.replace('CheckpointsValidation');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ALIGN</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header : préfixe blanc ; nom du métier dégradé #FF7B2B → #FFD93F */}
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{headerPrefix}</Text>
              {Platform.OS === 'web' ? (
              <Text
                style={[
                  styles.titleMetier,
                  {
                    backgroundImage: 'linear-gradient(90deg, #FF7B2B 0%, #FFD93F 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    color: 'transparent',
                  },
                ]}
              >
                {metierName}
              </Text>
            ) : (
              <MaskedView
                maskElement={<Text style={[styles.titleMetier, styles.gradientText]}>{metierName}</Text>}
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientContainer}
                >
                  <Text style={[styles.titleMetier, styles.transparentText]}>{metierName}</Text>
                </LinearGradient>
              </MaskedView>
            )}
            </View>
          </View>

          {/* Texte secondaire — dégradé #FF7B2B → #FFD93F, centré, largeur maîtrisée */}
          <View style={styles.subtitleContainer}>
            {Platform.OS === 'web' ? (
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
                {subtitleText}
              </Text>
            ) : (
              <MaskedView
                maskElement={
                  <Text style={[styles.subtitle, styles.gradientText]}>{subtitleText}</Text>
                }
              >
                <LinearGradient
                  colors={['#FF7B2B', '#FFD93F']}
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
            source={IMAGE_SOURCE}
            style={styles.illustration}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>COMMENCER LA VÉRIFICATION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1B23',
  },
  header: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 48,
    marginBottom: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    maxWidth: TITLE_CONTAINER_MAX_WIDTH,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(Math.max(width * 0.026, 22), 36),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.03, 26), 42) * 1.08,
  },
  titleMetier: {
    fontSize: Math.min(Math.max(width * 0.026, 22), 36),
    fontFamily: theme.fonts.title,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.03, 26), 42) * 1.08,
  },
  subtitleContainer: {
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: width * 0.9,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: Math.min(Math.max(width * 0.016, 16), 24),
    textAlign: 'center',
    lineHeight: Math.min(Math.max(width * 0.022, 22), 32),
  },
  gradientText: {},
  gradientContainer: {},
  transparentText: { opacity: 0 },
  illustration: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    marginVertical: 20,
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
