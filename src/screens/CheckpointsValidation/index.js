import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from '../Onboarding/onboardingConstants';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const { buttonWidth: BTN_WIDTH } = getContinueButtonDimensions();

// Cercles : 150px fixes ; barres plus longues, espacement accru entre checkpoints
const CIRCLE_SIZE = 150;
const CONNECTOR_HEIGHT = 12;
const CONNECTOR_WIDTH = 56;
const GAP_CIRCLE_CONNECTOR = 14;

/**
 * Écran "Checkpoints de validation"
 * Affiché après "Ton métier défini".
 * Texte principal, 3 cercles (checkpoints) avec cadenas, connexions en dégradé, bouton "DÉMARRER LE CHECKPOINT 1".
 */
export default function CheckpointsValidationScreen() {
  const navigation = useNavigation();

  const handleStart = () => {
    navigation.replace('Checkpoint1Intro');
  };

  // Texte sur exactement deux lignes : coupure après "TANT QUE LES" pour que la 1re ligne ne wrap pas (évite 3 lignes)
  const line1 = 'CHAQUE CERCLE EST UN CHECKPOINT, TANT QUE LES';
  const line2Start = 'CHECKPOINTS NE SONT PAS VALIDÉS LA VOIE RESTE ';
  const line2Word = 'INCERTAINE';

  // #region agent log
  useEffect(() => {
    const w = Dimensions.get('window').width;
    const maxW = w * 0.88;
    const fontSize = Math.min(Math.max(w * 0.026, 22), 36);
    fetch('http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CheckpointsValidation.js:mount', message: 'CheckpointsValidation mount', data: { width: w, maxWidth: maxW, fontSize, platform: Platform.OS, line1Length: line1.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {});
  }, []);
  const handleTextContainerLayout = (e) => {
    const { width: layoutW, height: layoutH } = e.nativeEvent.layout;
    fetch('http://127.0.0.1:7243/ingest/2aedbd9d-0217-4626-92f0-451b3e2df469', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'CheckpointsValidation.js:onLayout', message: 'textContainer layout', data: { layoutWidth: layoutW, layoutHeight: layoutH }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
  };
  // #endregion

  return (
    <View style={styles.container}>
      <Text style={styles.header}>ALIGN</Text>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { minHeight: SCREEN_HEIGHT - 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Bloc central ~75% : texte (2 lignes) + cercles, centré */}
          <View style={styles.topBlock}>
            <View style={styles.textContainer} onLayout={handleTextContainerLayout}>
              <Text style={styles.mainText}>
                {line1}
                {'\n'}
                {line2Start}
                <Text style={styles.incertaine}>{line2Word}</Text>
              </Text>
            </View>

            <View style={styles.checkpointsRow}>
              <View style={[styles.circle, styles.circle1]}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FFD93F', '#FF7B2B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { marginHorizontal: GAP_CIRCLE_CONNECTOR }]}
              />
              <View style={[styles.circle, styles.circle2]}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <LinearGradient
                colors={['#FF7B2B', '#EC3912']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.connector, { marginHorizontal: GAP_CIRCLE_CONNECTOR }]}
              />
              <View style={[styles.circle, styles.circle3]}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
            </View>
          </View>

          {/* Bouton en bas, même place que sur les autres écrans */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>DÉMARRER LE CHECKPOINT 1</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBlock: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 0,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: width * 0.88,
  },
  mainText: {
    fontSize: Math.min(Math.max(width * 0.018, 16), 26),
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: Math.min(Math.max(width * 0.022, 22), 32) * 1.08,
    width: '100%',
  },
  incertaine: {
    color: '#EC3912',
  },
  checkpointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 100,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.75,
  },
  circle1: {
    backgroundColor: '#FFD93F',
  },
  circle2: {
    backgroundColor: '#FF7B2B',
  },
  circle3: {
    backgroundColor: '#EC3912',
  },
  lockIcon: {
    fontSize: Math.floor(CIRCLE_SIZE * 0.38),
    lineHeight: Math.floor(CIRCLE_SIZE * 0.38),
    textAlign: 'center',
  },
  connector: {
    width: CONNECTOR_WIDTH,
    height: CONNECTOR_HEIGHT,
    borderRadius: CONNECTOR_HEIGHT / 2,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: BTN_WIDTH,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 8,
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
