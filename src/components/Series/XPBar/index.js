import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../styles/theme';

/**
 * Composant XPBar - Barre de progression XP gamifiée
 * Utilise Lilita One pour les chiffres (XP, niveau)
 */
export default function XPBar({ currentXP, totalXP, level }) {
  const progress = Math.min((currentXP / totalXP) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.xpHeader}>
        <Text style={styles.xpIcon}>⭐</Text>
        <Text style={styles.xpText}>XP : {currentXP}</Text>
        <Text style={styles.levelText}>Niveau {level}</Text>
      </View>
      
      <View style={styles.progressBarContainer}>
        <LinearGradient
          colors={['#FF7B2B', '#FF852D', '#FFD93F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressBarFill, { width: `${progress}%` }]}
        />
        <Text style={styles.progressText}>
          {currentXP}/{totalXP} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpIcon: {
    fontSize: 20,
  },
  xpText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  levelText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  progressBarContainer: {
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 10,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressText: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 11,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});











