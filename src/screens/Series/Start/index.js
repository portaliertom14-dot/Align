import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Animated, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress, getCurrentLevel } from '../../../lib/userProgress';
import { getSerieById, getSerieByDirection } from '../../../data/serieData';
import { getSerieLevels, getSerieLevel } from '../../../data/serieLevels';
import { canAccessSeries, redirectToAppropriateScreen } from '../../../lib/navigationGuards';
import Button from '../../../components/Button';
import Title from '../../../components/Title';
import Card from '../../../components/Card';
import Header from '../../../components/Header';
import AlignLoading from '../../../components/AlignLoading';
import { theme } from '../../../styles/theme';

/**
 * Page d'accueil de la série Align - Écran d'entrée ultra gamifié
 * Affiche la série active et permet de commencer le niveau 1
 */
export default function SeriesStartScreen() {
  const navigation = useNavigation();
  const [serie, setSerie] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentXP, setCurrentXP] = useState(0);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    loadData();
    animateEntrance();
  }, []);

  const loadData = async () => {
    try {
      // Vérifier que l'utilisateur peut accéder à cette page
      const canAccess = await canAccessSeries();
      if (!canAccess) {
        await redirectToAppropriateScreen(navigation);
        return;
      }

      const progress = await getUserProgress();
      
      // Récupérer la série active
      let activeSerie = null;
      if (progress.activeSerie) {
        activeSerie = getSerieById(progress.activeSerie);
      } else if (progress.activeDirection) {
        // Fallback : récupérer par direction si série non définie
        activeSerie = getSerieByDirection(progress.activeDirection);
      }

      if (!activeSerie) {
        console.warn('Aucune série active trouvée');
        await redirectToAppropriateScreen(navigation);
        return;
      }

      setSerie(activeSerie);
      
      // Récupérer les niveaux de la série
      const serieLevels = getSerieLevels(activeSerie.id);
      setLevels(serieLevels);
      
      // Récupérer le niveau actuel et l'XP
      const level = await getCurrentLevel();
      setCurrentLevel(level);
      setCurrentXP(progress.currentXP || 0);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleStartLevel = (levelNumber) => {
    // Naviguer vers le niveau correspondant
    if (levelNumber === 1) {
      navigation.navigate('SeriesModule1');
    } else if (levelNumber === 2) {
      navigation.navigate('SeriesModule2');
    } else if (levelNumber === 3) {
      navigation.navigate('SeriesModule3');
    }
  };

  if (loading) {
    return <AlignLoading />;
  }

  if (!serie) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Aucune série active. Commence par faire le quiz !</Text>
        </View>
      </LinearGradient>
    );
  }

  const currentLevelData = getSerieLevel(serie.id, currentLevel);
  const nextLevelData = currentLevel < serie.totalLevels ? getSerieLevel(serie.id, currentLevel + 1) : null;

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header ALIGN */}
        <Header />

        {/* Card principale gamifiée */}
        <Animated.View
          style={[
            styles.mainCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Card style={styles.gamifiedCard}>
            {/* Icône de la série */}
            <View style={styles.badgeContainer}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconEmoji}>{serie.icon}</Text>
              </View>
            </View>

            {/* Titre de la série */}
            <Title variant="h2" style={styles.serieTitle}>
              {serie.title}
            </Title>

            {/* Description */}
            <Text style={styles.serieDescription}>
              {serie.description}
            </Text>

            {/* Progression */}
            <View style={styles.progressionContainer}>
              <Text style={styles.progressionLabel}>
                Progression
              </Text>
              <Text style={styles.progressionValue}>
                Niveau {currentLevel} / {serie.totalLevels}
              </Text>
              
              {/* XP actuel */}
              <View style={styles.xpContainer}>
                <Text style={styles.xpLabel}>XP actuel</Text>
                <Text style={styles.xpValue}>{currentXP} XP</Text>
              </View>
            </View>

            {/* Informations du niveau actuel */}
            {currentLevelData && (
              <View style={styles.levelInfoContainer}>
                <Text style={styles.levelInfoTitle}>
                  {currentLevelData.title}
                </Text>
                <Text style={styles.levelInfoDescription}>
                  {currentLevelData.description}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Bouton principal - Commencer le niveau */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Button
            title={`Commencer le niveau ${currentLevel}`}
            onPress={() => handleStartLevel(currentLevel)}
            style={styles.startButton}
          />
        </Animated.View>

        {/* Espace pour éviter que le bouton ne soit coupé */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: theme.fonts.body,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mainCard: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  gamifiedCard: {
    borderRadius: 32,
    padding: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    alignItems: 'center',
  },
  badgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#00AAFF',
  },
  iconEmoji: {
    fontSize: 40,
  },
  serieTitle: {
    color: '#000000',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 28,
  },
  serieDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: theme.fonts.body,
  },
  progressionContainer: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  progressionLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontFamily: theme.fonts.body,
    fontWeight: '600',
  },
  progressionValue: {
    fontSize: 24,
    fontFamily: theme.fonts.button,
    color: '#0055FF',
    marginBottom: 16,
  },
  xpContainer: {
    width: '100%',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 85, 255, 0.2)',
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
    fontFamily: theme.fonts.body,
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
  },
  levelInfoContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF7B2B',
  },
  levelInfoTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: '#000000',
    marginBottom: 8,
  },
  levelInfoDescription: {
    fontSize: 14,
    color: '#666666',
    fontFamily: theme.fonts.body,
    lineHeight: 20,
  },
  buttonContainer: {
    paddingHorizontal: 24,
  },
  startButton: {
    width: '100%',
  },
  bottomSpacer: {
    height: 20,
  },
});
