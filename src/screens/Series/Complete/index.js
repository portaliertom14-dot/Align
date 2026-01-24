import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getSeriesProgress } from '../../../lib/seriesProgress';
import Button from '../../../components/Button';
import Card from '../../../components/Card';
import { theme } from '../../../styles/theme';

/**
 * Page de fin de série Align - Version Gamifiée avec célébration
 */
export default function SeriesCompleteScreen() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [confettiAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadProgress();
    animateCelebration();
  }, []);

  const loadProgress = async () => {
    try {
      const seriesProgress = await getSeriesProgress();
      setProgress(seriesProgress);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const animateCelebration = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleBackToHome = () => {
    navigation.navigate('Main', { screen: 'Feed' });
  };

  if (loading || !progress) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </LinearGradient>
    );
  }

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
        {/* Confettis animés */}
        <Animated.View
          style={[
            styles.confettiContainer,
            {
              opacity: confettiAnim,
              transform: [
                {
                  scale: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.confetti}>🎉</Text>
        </Animated.View>

        {/* Message de félicitations */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>Bravo ! Series complétée !</Text>
        </Animated.View>

        {/* Card de célébration */}
        <Animated.View
          style={[
            styles.cardContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Card style={styles.celebrationCard}>
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}
            >
              <Text style={styles.badgeIcon}>🏆</Text>
            </LinearGradient>

            <Text style={styles.celebrationTitle}>Série Terminée !</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progress.totalXP || 0}</Text>
                <Text style={styles.statLabel}>XP Total</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>Niveau {progress.level || 1}</Text>
                <Text style={styles.statLabel}>Niveau Atteint</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Résumé des accomplissements */}
        <Animated.View
          style={[
            styles.summaryContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Ce que tu as accompli</Text>
            
            <View style={styles.achievementItem}>
              <Text style={styles.achievementBullet}>✓</Text>
              <Text style={styles.achievementText}>
                Tu as exploré 3 mini-simulations métier et découvert comment tu réagis dans différentes situations professionnelles
              </Text>
            </View>

            <View style={styles.achievementItem}>
              <Text style={styles.achievementBullet}>✓</Text>
              <Text style={styles.achievementText}>
                Tu as développé ton mindset et appris des compétences essentielles pour ta croissance
              </Text>
            </View>

            <View style={styles.achievementItem}>
              <Text style={styles.achievementBullet}>✓</Text>
              <Text style={styles.achievementText}>
                Tu as exploré 6 secteurs professionnels et identifié ceux qui te correspondent
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Message de motivation */}
        <Animated.View
          style={[
            styles.motivationContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Card style={styles.motivationCard}>
            <Text style={styles.motivationText}>
              Continue à explorer, apprendre et grandir. Ta série Align est un point de départ, pas une destination. 🚀
            </Text>
          </Card>
        </Animated.View>

        {/* Bouton Retour */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Button
            title="Retour à l'accueil"
            variant="secondary"
            onPress={handleBackToHome}
            style={styles.backButton}
          />
        </Animated.View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  confettiContainer: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  confetti: {
    fontSize: 80,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 32,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  celebrationCard: {
    padding: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    borderRadius: 28,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  badgeIcon: {
    fontSize: 40,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#E0E0E0',
  },
  summaryContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  summaryCard: {
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  achievementBullet: {
    fontSize: 20,
    color: '#FF7B2B',
    marginRight: 12,
    fontWeight: 'bold',
  },
  achievementText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  motivationContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  motivationCard: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
  },
  motivationText: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    width: '100%',
  },
});
