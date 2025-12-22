import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { theme } from '../styles/theme';
import { getUserProgress } from '../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../lib/progression';

/**
 * LayoutAlign - Layout réutilisable pour toutes les pages Align
 * 
 * Structure stricte :
 * - Fond #27273B
 * - Header centré avec titre "ALIGN"
 * - Barre de progression (XP + niveau + étoiles) en haut
 * - Zone centrale pour le contenu
 * 
 * @param {React.ReactNode} children - Contenu à afficher dans la zone centrale
 */
export default function LayoutAlign({ children }) {
  const [progress, setProgress] = React.useState({
    currentLevel: 1,
    xpForNextLevel: 100,
    stars: 0,
    currentXP: 0,
  });

  React.useEffect(() => {
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
    <View style={styles.container}>
      {/* Header avec titre ALIGN centré */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ALIGN</Text>
      </View>

      {/* Barre de progression : XP + niveau + étoiles */}
      <View style={styles.progressionBar}>
        {/* XP */}
        <View style={styles.progressionItem}>
          <Text style={styles.progressionLabel}>XP</Text>
          <Text style={styles.progressionValue}>
            {progress.currentXP}/{progress.xpForNextLevel}
          </Text>
        </View>

        {/* Niveau */}
        <View style={styles.progressionItem}>
          <Text style={styles.progressionLabel}>Niveau</Text>
          <Text style={styles.progressionValue}>{progress.currentLevel}</Text>
        </View>

        {/* Étoiles */}
        <View style={styles.progressionItem}>
          <Text style={styles.progressionLabel}>⭐</Text>
          <Text style={styles.progressionValue}>{progress.stars}</Text>
        </View>
      </View>

      {/* Zone centrale pour le contenu */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // #27273B
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  progressionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressionItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressionLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  progressionValue: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
});



