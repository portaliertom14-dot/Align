import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import { getQuestsByType, QUEST_CYCLE_TYPES, initializeQuestSystem } from '../../lib/quests/questEngineUnified';
import { startActivitySession } from '../../lib/quests/activityTracker';
import { QUEST_STATUS, QUEST_TYPES } from '../../lib/quests/v2/questModel';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import AlignLoading from '../../components/AlignLoading';
import { emitScrollNav } from '../../lib/scrollNavEvents';
import XPBar from '../../components/XPBar';
import { theme } from '../../styles/theme';

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');
/** Icône à côté du titre "Quêtes" (en haut). Remplacer quetes-section.png sans toucher à quests.png (barre de nav). */
const QUEST_SECTION_ICON_SRC = require('../../../assets/icons/quetes-section.png');
const BAR_HEIGHT = 8;
const BAR_HEIGHT_FEATURED = 8;

/**
 * Écran Quêtes Align
 * Structure : Header > Quête du jour (featured) > Quêtes quotidiennes > Quêtes hebdomadaires
 * Style sobre, premium, une seule barre de progression par quête
 */
export default function QuetesScreen() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(null);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [weeklyQuests, setWeeklyQuests] = useState([]);
  const [performanceQuests, setPerformanceQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(false);
  const [ctaHovered, setCtaHovered] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    try {
      await initializeQuestSystem();

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

  const handleStartSession = async () => {
    if (startingSession) return;
    setStartingSession(true);
    try {
      await startActivitySession();
      navigation.goBack();
    } catch (error) {
      console.error('Erreur démarrage session:', error);
    } finally {
      setStartingSession(false);
    }
  };

  if (loading || !progress) {
    return <AlignLoading />;
  }

  // Quête du jour = première quête TIME_SPENT des quotidiennes
  const questOfTheDay = dailyQuests?.find((q) => q.type === QUEST_TYPES.TIME_SPENT) || dailyQuests?.[0];
  const otherDailyQuests = dailyQuests?.filter((q) => q.id !== questOfTheDay?.id) ?? [];

  const renderQuestCard = (quest) => {
    const isCompleted = quest.status === QUEST_STATUS.COMPLETED;
    const progressPercentage = quest.target > 0 ? Math.min((quest.progress / quest.target) * 100, 100) : 0;

    return (
      <View key={quest.id} style={styles.questCard}>
        <View style={styles.questTitleRow}>
          <Text
            style={[
              styles.questTitle,
              isCompleted && styles.questTitleCompleted,
            ]}
          >
            {quest.title}
          </Text>
          {isCompleted && <Text style={styles.questCheckIcon}>✔</Text>}
        </View>

        {quest.target > 0 && !isCompleted && (
          <View style={styles.progressRow}>
            <View style={styles.questProgressBar}>
              <LinearGradient
                colors={['#FF7B2B', '#FFD93F']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.questProgressFill, { width: `${progressPercentage}%` }]}
              />
            </View>
            <Text style={styles.progressCountText}>
              {quest.progress} / {quest.target}
            </Text>
          </View>
        )}

        {!isCompleted && (
        <View style={styles.rewardsContainer}>
          <View style={styles.rewardItem}>
            <Image source={starIcon} style={styles.rewardIconImage} resizeMode="contain" />
            <Text style={styles.rewardText}>{quest.rewards?.stars ?? 0}</Text>
          </View>
          <View style={styles.rewardItem}>
            <Image source={xpIcon} style={styles.rewardIconImageXp} resizeMode="contain" />
            <Text style={styles.rewardText}>{quest.rewards?.xp ?? 0} XP</Text>
          </View>
        </View>
        )}
      </View>
    );
  };

  const renderQuestOfTheDay = () => {
    if (!questOfTheDay) return null;

    const isCompleted = questOfTheDay.status === QUEST_STATUS.COMPLETED;
    const progressPercentage =
      questOfTheDay.target > 0 ? Math.min((questOfTheDay.progress / questOfTheDay.target) * 100, 100) : 0;

    return (
      <View style={styles.featuredSection}>
        <View style={styles.featuredCard}>
          {/* Bandeau pleine largeur — dégradé #AE4707 → #E06E00 → #FFAB36 */}
          <LinearGradient
            colors={['#AE4707', '#E06E00', '#FFAB36']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.featuredBandeau}
          >
            <Text style={styles.featuredBandeauText}>TA QUÊTE DU JOUR</Text>
          </LinearGradient>

          <View style={styles.featuredInner}>
            <View style={styles.featuredTitleRow}>
              <Text
                style={[
                  styles.featuredTitle,
                  isCompleted && styles.featuredTitleCompleted,
                ]}
              >
                {questOfTheDay.title}
              </Text>
              {isCompleted && <Text style={styles.featuredCheckIcon}>✔</Text>}
            </View>

            {!isCompleted && (
              <View style={styles.featuredHelpRow}>
                <Text style={styles.featuredHelpIcon}>▶</Text>
                <Text style={styles.featuredHelpText}>Démarre une session pour commencer</Text>
              </View>
            )}

            {questOfTheDay.target > 0 && !isCompleted && (
              <View style={styles.featuredProgressRow}>
                <View style={styles.featuredProgressBar}>
                  <LinearGradient
                    colors={['#FF7B2B', '#FFD93F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.featuredProgressFill, { width: `${progressPercentage}%` }]}
                  />
                </View>
                <Text style={styles.progressCountText}>
                  {questOfTheDay.progress} / {questOfTheDay.target}
                </Text>
              </View>
            )}

            {!isCompleted && (
            <View style={styles.featuredRewards}>
              <View style={styles.rewardItem}>
                <Image source={starIcon} style={styles.rewardIconImage} resizeMode="contain" />
                <Text style={styles.rewardText}>{questOfTheDay.rewards?.stars ?? 0}</Text>
              </View>
              <View style={styles.rewardItem}>
                <Image source={xpIcon} style={styles.rewardIconImageXp} resizeMode="contain" />
                <Text style={styles.rewardText}>{questOfTheDay.rewards?.xp ?? 0} XP</Text>
              </View>
            </View>
            )}

            {!isCompleted && (
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  Platform.OS === 'web' && { transitionProperty: 'background-color', transitionDuration: '200ms', transitionTimingFunction: 'ease' },
                  Platform.OS === 'web' && ctaHovered && !startingSession && { backgroundColor: '#FF7B2B' },
                ]}
                onPress={handleStartSession}
                disabled={startingSession}
                activeOpacity={0.8}
                onMouseEnter={Platform.OS === 'web' ? () => setCtaHovered(true) : undefined}
                onMouseLeave={Platform.OS === 'web' ? () => setCtaHovered(false) : undefined}
              >
                <Text style={styles.ctaButtonText}>
                  {startingSession ? 'Démarrage...' : 'Démarrer une session'}
                </Text>
              </TouchableOpacity>
            )}
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
      <Header />
      <XPBar />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => emitScrollNav(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Titre de page : icône + "Quêtes" compact, scroll avec le contenu (non sticky) */}
        <View style={styles.sectionMarker}>
          <Image source={QUEST_SECTION_ICON_SRC} style={styles.sectionMarkerIcon} resizeMode="contain" />
          <Text style={styles.sectionMarkerText}>Quêtes</Text>
        </View>

        {/* Bloc Quête du jour (mise en avant) */}
        {questOfTheDay && renderQuestOfTheDay()}

        {/* Section Quêtes quotidiennes (autres que la quête du jour) */}
        {otherDailyQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quêtes quotidiennes</Text>
            <Text style={styles.sectionSubtitle}>Reviens chaque jour pour progresser</Text>
            <View style={styles.questsList}>
              {otherDailyQuests.map((quest) => renderQuestCard(quest))}
            </View>
          </View>
        )}

        {/* Section Quêtes hebdomadaires */}
        {weeklyQuests && weeklyQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quêtes hebdomadaires</Text>
            <Text style={styles.sectionSubtitle}>Des objectifs pour la semaine</Text>
            <View style={styles.questsList}>
              {weeklyQuests.map((quest) => renderQuestCard(quest))}
            </View>
          </View>
        )}

        {/* Section Objectifs performance (optionnel) */}
        {performanceQuests && performanceQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Objectifs performance</Text>
            <View style={styles.questsList}>
              {performanceQuests.map((quest) => renderQuestCard(quest))}
            </View>
          </View>
        )}
      </ScrollView>

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
    paddingTop: 16,
    paddingBottom: 180,
    paddingHorizontal: 24,
  },
  sectionMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    marginBottom: 20,
    marginVertical: 0,
  },
  sectionMarkerIcon: {
    width: 100,
    height: 100,
    margin: 0,
    padding: 0,
    alignSelf: 'center',
    flexShrink: 0,
    ...Platform.select({
      web: { display: 'block', margin: 0, padding: 0 },
      default: {},
    }),
  },
  sectionMarkerText: {
    fontSize: 18,
    fontFamily: theme.fonts.title,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
    margin: 0,
    padding: 0,
    lineHeight: 22,
    flexShrink: 0,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 16,
  },
  questsList: {
    gap: 12,
  },
  questCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      web: { boxShadow: '0 2px 12px rgba(0,0,0,0.2)' },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
    }),
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  questTitle: {
    flex: 1,
    fontSize: 17,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#E06E00',
    opacity: 0.85,
    ...(Platform.OS === 'web' && { textDecorationColor: '#E06E00', textDecorationThickness: 2 }),
  },
  questCheckIcon: {
    fontSize: 24,
    color: '#39D98A',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  questProgressBar: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  questProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
    minWidth: 2,
  },
  progressCountText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: 'rgba(255,255,255,0.7)',
    minWidth: 44,
    textAlign: 'right',
  },
  rewardsContainer: {
    flexDirection: 'row',
    gap: 16,
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
  rewardIconImageXp: {
    width: 20,
    height: 20,
  },
  rewardText: {
    fontSize: 15,
    fontFamily: theme.fonts.button,
    color: 'rgba(255,255,255,0.9)',
  },
  // Featured "Quête du jour" — bandeau pleine largeur, fond gris foncé
  featuredSection: {
    marginBottom: 32,
  },
  featuredCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 4px 20px rgba(0,0,0,0.25)' },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
    }),
  },
  featuredBandeau: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 19,
    borderTopRightRadius: 19,
  },
  featuredBandeauText: {
    fontSize: 14,
    fontFamily: Platform.select({
      web: 'Bowlby One SC, Impact, Arial Black, sans-serif',
      default: 'BowlbyOneSC_400Regular',
    }),
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  featuredInner: {
    padding: 24,
  },
  featuredTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  featuredTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: Platform.select({
      web: 'Lilita One, Nunito, Arial, sans-serif',
      default: theme.fonts.button,
    }),
    color: '#FFFFFF',
  },
  featuredTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#E06E00',
    opacity: 0.85,
    ...(Platform.OS === 'web' && { textDecorationColor: '#E06E00', textDecorationThickness: 2 }),
  },
  featuredHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  featuredHelpIcon: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },
  featuredHelpText: {
    fontSize: 13,
    fontFamily: theme.fonts.body,
    color: 'rgba(255,255,255,0.6)',
  },
  featuredProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  featuredProgressBar: {
    flex: 1,
    height: BAR_HEIGHT_FEATURED,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: BAR_HEIGHT_FEATURED / 2,
    overflow: 'hidden',
    position: 'relative',
  },
  featuredProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: BAR_HEIGHT_FEATURED / 2,
    minWidth: 2,
  },
  featuredCheckIcon: {
    fontSize: 24,
    color: '#39D98A',
    fontWeight: '600',
  },
  featuredRewards: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
});
