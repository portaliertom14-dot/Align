import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

/**
 * Écran : As-tu déjà essayé d'autres applications similaires ?
 */
export default function SimilarAppsScreen({ onNext }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  const options = ['Oui', 'Non'];

  const handleNext = () => {
    if (selectedAnswer) {
      onNext(selectedAnswer);
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          As-tu déjà essayé d'autres applications similaires ?
        </Text>

        <View style={styles.optionsContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                selectedAnswer === option && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedAnswer(option)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.optionText,
                selectedAnswer === option && styles.optionTextSelected,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={[styles.button, !selectedAnswer && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!selectedAnswer}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={selectedAnswer ? ['#FF7B2B', '#FFA36B'] : ['#666666', '#666666']}
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
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.button, // Nunito Black
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    letterSpacing: 1,
  },
  optionsContainer: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    borderColor: '#FF7B2B',
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'sans-serif',
    fontWeight: '400',
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
