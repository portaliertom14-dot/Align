import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { getUserProgress } from '../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../lib/progression';

/**
 * Header global Align
 * Affiche "ALIGN" + progression (étoiles, XP, niveau)
 * @param {boolean} hideProgress - Si true, masque l'affichage de XP/niveau/étoiles (pendant onboarding/quiz)
 */
export default function Header({ showSettings = false, onSettingsPress, hideProgress = false }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const userProgress = await getUserProgress();
      const currentXP = userProgress.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      const xpForNextLevel = getXPNeededForNextLevel(currentXP);
      const stars = userProgress.totalStars || 0;

      setProgress({
        currentLevel,
        xpForNextLevel,
        stars,
        currentXP,
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error);
      // Valeurs par défaut en cas d'erreur
      setProgress({
        currentLevel: 1,
        xpForNextLevel: 100,
        stars: 0,
        currentXP: 0,
      });
    }
  };

  return (
    <View style={styles.header}>
      {/* Bouton paramètres (optionnel) */}
      {showSettings && onSettingsPress && (
        <TouchableOpacity
          onPress={onSettingsPress}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      )}

      {/* Titre ALIGN */}
      <Text style={styles.headerTitle}>ALIGN</Text>

      {/* Progression - masquée pendant l'onboarding et les quiz */}
      {progress && !hideProgress && (
        <View style={styles.progressionContainer}>
          {/* Étoiles */}
          <View style={styles.starsContainer}>
            <Text style={styles.starsText}>
              ⭐ {progress.stars}
            </Text>
          </View>

          {/* Barre XP */}
          <View style={styles.xpBarContainer}>
            <Text style={styles.xpText}>
              {progress.currentXP}/{progress.xpForNextLevel} XP
            </Text>
          </View>

          {/* Niveau */}
          <View style={styles.levelContainer}>
            <Text style={styles.levelText}>
              Niveau {progress.currentLevel}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 24,
  },
  progressionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  starsContainer: {
    flex: 1,
  },
  starsText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  xpBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  xpText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  levelContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  levelText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
});






