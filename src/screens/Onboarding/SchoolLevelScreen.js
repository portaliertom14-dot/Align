import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

/**
 * Écran Situation scolaire - Choix unique parmi les options
 * Stocke la valeur en base pour utilisation future par l'IA
 */
const SCHOOL_LEVELS = [
  'Seconde générale',
  'Seconde professionnelle',
  'Première générale',
  'Première technologique',
  'Première professionnelle',
  'Terminale générale',
  'Terminale technologique',
  'Terminale professionnelle',
];

export default function SchoolLevelScreen({ onNext, userId, email, birthdate }) {
  const [selectedLevel, setSelectedLevel] = useState(null);

  const handleNext = () => {
    if (!selectedLevel) {
      return;
    }
    onNext(userId, email, birthdate, selectedLevel);
  };

  return (
    <LinearGradient
      colors={['#00AAFF', '#00012F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>QUEL EST TON NIVEAU SCOLAIRE ?</Text>

        {/* Liste des options */}
        <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
          {SCHOOL_LEVELS.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.option,
                selectedLevel === level && styles.optionSelected,
              ]}
              onPress={() => setSelectedLevel(level)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedLevel === level && styles.optionTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={[styles.button, !selectedLevel && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selectedLevel}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedLevel ? ['#FF7B2B', '#FFA36B'] : ['#666666', '#666666']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>CONTINUER</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1,
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    borderColor: '#FF7B2B',
  },
  optionText: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#FF7B2B',
  },
  button: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
});



