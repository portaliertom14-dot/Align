import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';
import { getContinueButtonDimensions } from './onboardingConstants';

const { width, height } = Dimensions.get('window');

// Helper clamp
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// Dimensions bouton CONTINUER = même que Interlude (partagées)
const { buttonWidth: CONTINUE_BTN_WIDTH, buttonHeight: CONTINUE_BTN_HEIGHT, buttonTextSize: CONTINUE_BTN_TEXT_SIZE } = getContinueButtonDimensions();

// Tailles responsive (alignées sur OnboardingQuestionScreen)
const HEADER_FONT_SIZE = Math.min(Math.max(width * 0.04, 14), 20);
const PROGRESS_HEIGHT = 14;
const QUESTION_FONT_SIZE = Math.min(Math.max(width * 0.048, 16), 22);
const SUBTITLE_FONT_SIZE = Math.min(Math.max(width * 0.028, 11), 14);
const DATE_BLOCK_WIDTH = width * 0.86;
const DATE_BLOCK_HEIGHT = clamp(height * 0.14, 120, 160);
const DATE_BLOCK_RADIUS = 24;
const BUTTON_CIRCLE_SIZE = Math.min(Math.max(width * 0.08, 38), 48);
const DATE_VALUE_SIZE = Math.min(Math.max(width * 0.032, 13), 15);

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * ÉCRAN DATE DE NAISSANCE (étape 7/7 de l'onboarding)
 * Barre de progression : 7 étapes au total (6 questions + 1 birthdate ; l'interlude n'est pas compté)
 */
export default function OnboardingDob() {
  const navigation = useNavigation();
  const route = useRoute();
  const currentStep = route.params?.currentStep ?? 7;
  const totalSteps = route.params?.totalSteps ?? 7;
  const currentYear = new Date().getFullYear();

  const [day, setDay] = useState(1);
  const [monthIndex, setMonthIndex] = useState(0);
  const [year, setYear] = useState(2000);

  const maxDay = DAYS_IN_MONTH[monthIndex];

  const incrementDay = () => {
    setDay((prev) => (prev >= maxDay ? 1 : prev + 1));
  };

  const decrementDay = () => {
    setDay((prev) => (prev <= 1 ? maxDay : prev - 1));
  };

  const incrementMonth = () => {
    const newIndex = (monthIndex + 1) % 12;
    setMonthIndex(newIndex);
    // Ajuster le jour si nécessaire
    if (day > DAYS_IN_MONTH[newIndex]) {
      setDay(DAYS_IN_MONTH[newIndex]);
    }
  };

  const decrementMonth = () => {
    const newIndex = (monthIndex - 1 + 12) % 12;
    setMonthIndex(newIndex);
    if (day > DAYS_IN_MONTH[newIndex]) {
      setDay(DAYS_IN_MONTH[newIndex]);
    }
  };

  const incrementYear = () => {
    setYear((prev) => (prev >= currentYear ? 1900 : prev + 1));
  };

  const decrementYear = () => {
    setYear((prev) => (prev <= 1900 ? currentYear : prev - 1));
  };

  const handleContinue = () => {
    // TODO: sauvegarder la date (AsyncStorage / context / Supabase)
    const dateString = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('[OnboardingDob] Date sélectionnée:', dateString);
    
    // Navigation vers la suite (SchoolLevel ou autre)
    navigation.navigate('Onboarding');
  };

  const progressRatio = currentStep / totalSteps;

  return (
    <View style={styles.screen}>
      {/* Header ALIGN */}
      <Text style={styles.header}>ALIGN</Text>

      {/* Barre de progression */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={['#FF7B2B', '#FFD93F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressRatio * 100}%` }]}
          />
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>QUAND ES-TU NÉ ?</Text>

      {/* Sous-texte */}
      <Text style={styles.subtitle}>
        Répond simplement il n'y a pas de bonnes ou de mauvaises réponses.
      </Text>

      {/* Bloc date picker */}
      <View style={styles.dateBlock}>
        <View style={styles.dateRow}>
          {/* Colonne JOUR */}
          <View style={styles.dateColumn}>
            <TouchableOpacity style={styles.circleButton} onPress={incrementDay}>
              <Text style={styles.circleButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.dateValue}>{day}</Text>
            <TouchableOpacity style={styles.circleButton} onPress={decrementDay}>
              <Text style={styles.circleButtonText}>-</Text>
            </TouchableOpacity>
          </View>

          {/* Colonne MOIS */}
          <View style={styles.dateColumn}>
            <TouchableOpacity style={styles.circleButton} onPress={incrementMonth}>
              <Text style={styles.circleButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.dateValue}>{MONTHS_FR[monthIndex]}</Text>
            <TouchableOpacity style={styles.circleButton} onPress={decrementMonth}>
              <Text style={styles.circleButtonText}>-</Text>
            </TouchableOpacity>
          </View>

          {/* Colonne ANNÉE */}
          <View style={styles.dateColumn}>
            <TouchableOpacity style={styles.circleButton} onPress={incrementYear}>
              <Text style={styles.circleButtonText}>+</Text>
            </TouchableOpacity>
            <Text style={styles.dateValue}>{year}</Text>
            <TouchableOpacity style={styles.circleButton} onPress={decrementYear}>
              <Text style={styles.circleButtonText}>-</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bouton CONTINUER */}
      <TouchableOpacity
        style={styles.button}
        onPress={handleContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>CONTINUER</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1A1B23',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 44,
  },
  header: {
    fontFamily: theme.fonts.title,
    fontSize: HEADER_FONT_SIZE,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  progressWrapper: {
    width: width * 0.9,
    marginBottom: 38,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    backgroundColor: '#2D3241',
    borderRadius: 22,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 22,
  },
  question: {
    fontFamily: theme.fonts.title,
    fontSize: QUESTION_FONT_SIZE,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
    lineHeight: QUESTION_FONT_SIZE * 1.15,
  },
  subtitle: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: SUBTITLE_FONT_SIZE,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
    lineHeight: SUBTITLE_FONT_SIZE * 1.2,
  },
  dateBlock: {
    backgroundColor: '#2D3241',
    width: DATE_BLOCK_WIDTH,
    minHeight: DATE_BLOCK_HEIGHT,
    borderRadius: DATE_BLOCK_RADIUS,
    padding: 18,
    marginBottom: 32,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  dateColumn: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  circleButton: {
    width: BUTTON_CIRCLE_SIZE,
    height: BUTTON_CIRCLE_SIZE,
    borderRadius: BUTTON_CIRCLE_SIZE / 2,
    backgroundColor: '#FF7B2B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleButtonText: {
    fontFamily: theme.fonts.title,
    fontSize: Math.min(BUTTON_CIRCLE_SIZE * 0.5, 22),
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dateValue: {
    fontFamily: theme.fonts.button,
    fontWeight: '900',
    fontSize: DATE_VALUE_SIZE,
    color: '#FFFFFF',
    textAlign: 'center',
    marginVertical: 10,
  },
  button: {
    backgroundColor: '#FF7B2B',
    width: CONTINUE_BTN_WIDTH,
    height: CONTINUE_BTN_HEIGHT,
    borderRadius: CONTINUE_BTN_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontFamily: theme.fonts.title,
    fontSize: CONTINUE_BTN_TEXT_SIZE,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
