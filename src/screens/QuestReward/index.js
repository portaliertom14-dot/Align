/**
 * Écran de récompense des quêtes
 * S'affiche UNIQUEMENT si au moins une quête est complétée
 * Contenu dynamique selon le type de quête
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getCompletedQuestsInSession, clearCompletedQuestsInSession, QUEST_SYSTEM_TYPES } from '../../lib/quests/questSystem';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

/**
 * Écran de récompense
 * Affiche les récompenses pour les quêtes complétées
 */
export default function QuestRewardScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [completedQuests, setCompletedQuests] = useState([]);
  const [totalRewards, setTotalRewards] = useState({ stars: 0, xp: 0 });

  useEffect(() => {
    loadCompletedQuests();
  }, []);

  const loadCompletedQuests = async () => {
    const quests = await getCompletedQuestsInSession();
    
    if (quests.length === 0) {
      // Aucune quête complétée, rediriger
      navigation.goBack();
      return;
    }
    
    setCompletedQuests(quests);
    
    // Calculer les récompenses totales
    const rewards = quests.reduce((acc, quest) => {
      return {
        stars: acc.stars + (quest.rewards?.stars || 0),
        xp: acc.xp + (quest.rewards?.xp || 0),
      };
    }, { stars: 0, xp: 0 });
    
    setTotalRewards(rewards);
  };

  const handleContinue = async () => {
    // Réinitialiser la liste des quêtes complétées
    await clearCompletedQuestsInSession();
    
    // Retourner à l'écran précédent
    navigation.goBack();
  };

  if (completedQuests.length === 0) {
    return null;
  }

  // Déterminer le type de quête principal pour le contenu dynamique
  const primaryQuest = completedQuests[0];
  const questType = primaryQuest.type;

  // Texte dynamique selon le type
  const getRewardTitle = () => {
    switch (questType) {
      case QUEST_SYSTEM_TYPES.DAILY:
        return 'Quête quotidienne complétée !';
      case QUEST_SYSTEM_TYPES.WEEKLY:
        return 'Quête hebdomadaire complétée !';
      case QUEST_SYSTEM_TYPES.PERFORMANCE:
        return 'Objectif performance atteint !';
      default:
        return 'Quête complétée !';
    }
  };

  const getRewardMessage = () => {
    switch (questType) {
      case QUEST_SYSTEM_TYPES.DAILY:
        return 'Excellent travail aujourd\'hui ! Continue comme ça.';
      case QUEST_SYSTEM_TYPES.WEEKLY:
        return 'Bravo pour ta régularité cette semaine !';
      case QUEST_SYSTEM_TYPES.PERFORMANCE:
        return 'Tu progresses à vitesse grand V !';
      default:
        return 'Félicitations pour cette réussite !';
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
        {/* Image de récompense */}
        {route.params?.rewardImage && (
          <Image
            source={route.params.rewardImage}
            style={styles.rewardImage}
            resizeMode="contain"
          />
        )}

        {/* Titre */}
        <Text style={styles.title}>{getRewardTitle()}</Text>

        {/* Message */}
        <Text style={styles.message}>{getRewardMessage()}</Text>

        {/* Liste des quêtes complétées */}
        <View style={styles.questsList}>
          {completedQuests.map((quest) => (
            <View key={quest.id} style={styles.questItem}>
              <Text style={styles.questTitle}>{quest.title}</Text>
              <View style={styles.questRewards}>
                {quest.rewards.stars > 0 && (
                  <View style={styles.rewardBadge}>
                    <Image source={starIcon} style={styles.rewardIconImage} resizeMode="contain" />
                    <Text style={styles.rewardText}>{quest.rewards.stars}</Text>
                  </View>
                )}
                {quest.rewards.xp > 0 && (
                  <View style={styles.rewardBadge}>
                    <Image source={xpIcon} style={styles.rewardIconImage} resizeMode="contain" />
                    <Text style={styles.rewardText}>{quest.rewards.xp} XP</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Récompenses totales */}
        <View style={styles.totalRewards}>
          <Text style={styles.totalRewardsLabel}>RÉCOMPENSES TOTALES</Text>
          <View style={styles.totalRewardsValues}>
            {totalRewards.stars > 0 && (
              <View style={styles.totalRewardItem}>
                <Image source={starIcon} style={styles.totalRewardIconImage} resizeMode="contain" />
                <Text style={styles.totalRewardText}>{totalRewards.stars}</Text>
              </View>
            )}
            {totalRewards.xp > 0 && (
              <View style={styles.totalRewardItem}>
                <Image source={xpIcon} style={styles.totalRewardIconImage} resizeMode="contain" />
                <Text style={styles.totalRewardText}>{totalRewards.xp} XP</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bouton continuer */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF7B2B', '#FFA36B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.continueButtonGradient}
          >
            <Text style={styles.continueButtonText}>CONTINUER</Text>
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
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardImage: {
    width: 200,
    height: 200,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  message: {
    fontSize: 18,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
  },
  questsList: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  questItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questTitle: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  questRewards: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardIconImage: {
    width: 18,
    height: 18,
  },
  rewardText: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
  },
  totalRewards: {
    width: '100%',
    backgroundColor: 'rgba(255, 123, 43, 0.2)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  totalRewardsLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 1,
  },
  totalRewardsValues: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'center',
  },
  totalRewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalRewardIconImage: {
    width: 24,
    height: 24,
  },
  totalRewardText: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  continueButton: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 1,
  },
});
