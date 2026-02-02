import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import { getQuestsByType, QUEST_CYCLE_TYPES, initializeQuestSystem } from '../../lib/quests/questEngineUnified';
import { QUEST_STATUS } from '../../lib/quests/v2/questModel';
import Button from '../../components/Button';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

/**
 * Écran Quêtes Align
 * Affiche les quêtes quotidiennes, hebdomadaires et performance
 * Système unifié V3 - complet et scalable
 */
export default function QuetesScreen() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(null);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [weeklyQuests, setWeeklyQuests] = useState([]);
  const [performanceQuests, setPerformanceQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Recharger quand l'écran est focus
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      // Initialiser le système de quêtes
      await initializeQuestSystem();

      // Charger la progression
      const userProgress = await getUserProgress();
      const currentXP = userProgress.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      const xpForNextLevel = getXPNeededForNextLevel(currentXP);
      const stars = userProgress.totalStars || 0;

      setProgress({
        ...userProgress,
        currentLevel,
        xpForNextLevel,
        stars,
        currentXP,
      });

      // Charger les quêtes par type
      const daily = await getQuestsByType(QUEST_CYCLE_TYPES.DAILY);
      const weekly = await getQuestsByType(QUEST_CYCLE_TYPES.WEEKLY);
      const performance = await getQuestsByType(QUEST_CYCLE_TYPES.PERFORMANCE);

      setDailyQuests(daily);
      setWeeklyQuests(weekly);
      setPerformanceQuests(performance);
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigation.goBack();
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

  const renderQuestCard = (quest) => {
    const isCompleted = quest.status === QUEST_STATUS.COMPLETED;
    const progressPercentage = quest.target > 0 
      ? Math.min((quest.progress / quest.target) * 100, 100) 
      : 0;

    return (
      <View
        key={quest.id}
        style={[
          styles.questCard,
          isCompleted && styles.questCardCompleted,
        ]}
      >
        {/* Texte de la quête (ordre strict : titre section puis texte quête) */}
        <Text style={[
          styles.questTitle,
          isCompleted && styles.questTitleCompleted,
        ]}>
          {quest.title}
        </Text>

        {/* Barre de progression - Texte centré DANS la barre (pour toutes les quêtes non complétées) */}
        {!isCompleted && quest.target > 0 ? (
          <View style={styles.progressContainer}>
            <View style={styles.questProgressBar}>
              <View style={[styles.questProgressFill, { width: `${progressPercentage}%` }]} />
              <Text style={styles.questProgressText}>
                {quest.progress} / {quest.target}
              </Text>
            </View>
          </View>
        ) : isCompleted ? (
          <View style={styles.completedIndicator}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
        ) : null}

        {/* Récompenses */}
        <View style={styles.rewardsContainer}>
          <View style={styles.rewardItem}>
            <Image source={starIcon} style={styles.rewardIconImage} resizeMode="contain" />
            <Text style={styles.rewardText}>{quest.rewards?.stars || 0}</Text>
          </View>
          <View style={styles.rewardItem}>
            <Image source={xpIcon} style={styles.rewardIconImage} resizeMode="contain" />
            <Text style={styles.rewardText}>{quest.rewards?.xp || 0} XP</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Header ALIGN */}
      <Header />
      
      {/* XP Bar */}
      <XPBar />

      {/* Contenu */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quêtes quotidiennes */}
        {dailyQuests && dailyQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUÊTES QUOTIDIENNES</Text>
            <View style={styles.questsList}>
              {dailyQuests.map(quest => renderQuestCard(quest))}
            </View>
          </View>
        )}

        {/* Quêtes hebdomadaires */}
        {weeklyQuests && weeklyQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUÊTES HEBDOMADAIRES</Text>
            <View style={styles.questsList}>
              {weeklyQuests.map(quest => renderQuestCard(quest))}
            </View>
          </View>
        )}

        {/* Quêtes performance */}
        {performanceQuests && performanceQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>OBJECTIFS PERFORMANCE</Text>
            <View style={styles.questsList}>
              {performanceQuests.map(quest => renderQuestCard(quest))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Barre de navigation basse */}
      <BottomNavBar />
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
    fontFamily: theme.fonts.body,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 32,
    paddingBottom: 180, // Augmenté pour éviter que le contenu soit masqué par la nav bar
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF', // UX finalisée — texte blanc
    marginBottom: 16,
    letterSpacing: 1,
  },
  questsList: {
    gap: 16,
  },
  questCard: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0,
  },
  questCardCompleted: {
    opacity: 0.6,
    borderColor: '#34C759',
  },
  questTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  completedIndicator: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  checkIcon: {
    fontSize: 24,
    color: '#34C759',
    fontWeight: 'bold',
  },
  questDescription: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF', // UX finalisée — texte blanc
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 12,
    alignItems: 'flex-start', // Alignée à gauche
  },
  questProgressBar: {
    width: '55%', // Un peu plus de la moitié de l'écran
    height: 20, // Hauteur STRICTE
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  questProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#FF7B2B',
    borderRadius: 15,
    minWidth: 8, // Minimum pour être visible même à 0%
  },
  questProgressText: {
    position: 'absolute',
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#000000',
    fontWeight: '600',
    zIndex: 1,
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardIconImage: {
    width: 18,
    height: 18,
  },
  rewardText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF', // UX finalisée — texte blanc (étoiles et XP restent dynamiques)
  },
});





