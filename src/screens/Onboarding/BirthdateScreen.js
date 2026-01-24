import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../styles/theme';

// Âge minimum requis pour utiliser l'application (COPPA compliance)
const MINIMUM_AGE = 13;

// Import conditionnel du DateTimePicker
let DateTimePicker = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (e) {
  // Si non installé, on utilisera un sélecteur simple
}

/**
 * Écran Date de naissance - Sélecteur de date
 * Format ISO pour stockage en base
 */
export default function BirthdateScreen({ onNext, userId, email }) {
  const [date, setDate] = useState(new Date(2000, 0, 1)); // Date par défaut : 1er janvier 2000
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleNext = () => {
    // Calculer l'âge de l'utilisateur
    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Validation de l'âge minimum
    if (age < MINIMUM_AGE) {
      Alert.alert(
        'Erreur',
        `Tu dois avoir au moins ${MINIMUM_AGE} ans pour utiliser Align`
      );
      return;
    }

    // Validation de la date (pas dans le futur)
    if (birthDate > today) {
      Alert.alert('Erreur', 'Veuillez entrer une date valide');
      return;
    }

    // Convertir en format ISO (YYYY-MM-DD)
    const isoDate = date.toISOString().split('T')[0];
    onNext(userId, email, isoDate);
  };

  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.toLocaleString('fr-FR', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Titre */}
        <Text style={styles.title}>QUAND ES-TU NÉ ?</Text>

        {/* Card avec sélecteur de date */}
        <View style={styles.dateCard}>
          {DateTimePicker ? (
            Platform.OS === 'ios' ? (
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                locale="fr-FR"
                style={styles.picker}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={styles.dateText}>{formatDate(date)}</Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </>
            )
          ) : (
            // Fallback : sélecteur simple avec boutons
            <View style={styles.simplePicker}>
              <View style={styles.pickerRow}>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Jour</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setDate(Math.max(1, Math.min(31, newDate.getDate() + 1)));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerValue}>{date.getDate()}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setDate(Math.max(1, newDate.getDate() - 1));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Mois</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setMonth(Math.max(0, Math.min(11, newDate.getMonth() + 1)));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerValue}>
                    {date.toLocaleString('fr-FR', { month: 'long' })}
                  </Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setMonth(Math.max(0, newDate.getMonth() - 1));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Année</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      const currentYear = new Date().getFullYear();
                      newDate.setFullYear(Math.min(currentYear, newDate.getFullYear() + 1));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>+</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerValue}>{date.getFullYear()}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      const newDate = new Date(date);
                      newDate.setFullYear(Math.max(1900, newDate.getFullYear() - 1));
                      setDate(newDate);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>-</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Bouton CTA */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF7B2B', '#FFA36B']}
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
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 48,
    letterSpacing: 1,
  },
  dateCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
    minHeight: 200,
  },
  picker: {
    width: '100%',
    height: 200,
  },
  dateButton: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 20,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  simplePicker: {
    paddingVertical: 20,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerColumn: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  pickerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  pickerButtonText: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  pickerValue: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
    marginVertical: 4,
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

