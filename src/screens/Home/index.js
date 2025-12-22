import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LayoutAlign from '../../components/LayoutAlign';
import { theme } from '../../styles/theme';

/**
 * HomeScreen - Écran d'accueil Align
 * 
 * Structure stricte :
 * - 3 cercles alignés horizontalement
 * - Cercle central orange avec icône éclair ⚡ (action principale)
 * - Cercles latéraux secondaires
 * - Un seul CTA : "Simulation Métier"
 */
export default function HomeScreen({ navigation }) {
  const handleSimulationMetier = () => {
    // TODO: Navigation vers l'écran de simulation métier
    console.log('Lancer Simulation Métier');
  };

  return (
    <LayoutAlign>
      <View style={styles.container}>
        {/* Zone centrale avec 3 cercles */}
        <View style={styles.circlesContainer}>
          {/* Cercle gauche - Secondaire */}
          <View style={styles.circleSecondary}>
            <Text style={styles.circleIcon}>📚</Text>
          </View>

          {/* Cercle central - Action principale (orange) */}
          <TouchableOpacity
            style={styles.circlePrimary}
            onPress={handleSimulationMetier}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.circleGradient}
            >
              <Text style={styles.circleIconPrimary}>⚡</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Cercle droit - Secondaire */}
          <View style={styles.circleSecondary}>
            <Text style={styles.circleIcon}>🎯</Text>
          </View>
        </View>

        {/* CTA principal : Bouton orange Align */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSimulationMetier}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Simulation Métier</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </LayoutAlign>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circlesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 48,
  },
  circleSecondary: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  circlePrimary: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  circleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIcon: {
    fontSize: 32,
  },
  circleIconPrimary: {
    fontSize: 48,
  },
  ctaContainer: {
    width: '100%',
    alignItems: 'center',
  },
  ctaButton: {
    width: '80%',
    maxWidth: 300,
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
  ctaGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
});



