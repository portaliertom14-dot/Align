/**
 * Écran affiché une seule fois par jour quand la flamme s'allume ou se ré-allume (streak passe à 1).
 * UI exacte : titre gradient, sous-texte, image flame.png, bouton ACCUEIL.
 */

import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import StandardHeader from '../../components/StandardHeader';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

const flameImage = require('../../../assets/images/flame.png');

export default function FlameScreen() {
  const navigation = useNavigation();

  const handleAccueil = () => {
    navigation.navigate('Main', { screen: 'Feed' });
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StandardHeader title="ALIGN" />

      <View style={styles.content}>
        <GradientText
          colors={['#FF7B2B', '#FFD93F']}
          style={styles.title}
        >
          TU VIENS D'ALLUMER UNE FLAMME
        </GradientText>

        <Text style={styles.subtitle}>
          Avance chaque jour pour la faire durer… et grandir
        </Text>

        <View style={styles.imageContainer}>
          <Image source={flameImage} style={styles.flameImage} resizeMode="contain" />
        </View>

        <TouchableOpacity
          style={styles.accueilButton}
          onPress={handleAccueil}
          activeOpacity={0.8}
        >
          <Text style={styles.accueilButtonText}>ACCUEIL</Text>
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
    paddingHorizontal: 28,
    paddingTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: theme.fonts.title }),
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: Platform.select({ web: 'Nunito, sans-serif', default: theme.fonts.body }),
    fontWeight: '900',
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  imageContainer: {
    marginVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flameImage: {
    width: 230,
    height: 230,
  },
  accueilButton: {
    width: 340,
    height: 56,
    backgroundColor: '#FF7B2B',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  accueilButtonText: {
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: theme.fonts.title }),
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
