/**
 * Écran de Completion d'une Quête
 * Affiche les récompenses obtenues après complétion de quêtes
 * Design exact correspondant à l'image de référence
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, BackHandler, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addXP, addStars, getUserProgress, invalidateProgressCache } from '../../lib/userProgressSupabase';
import { getUserProfile } from '../../lib/userProfile';
import { theme } from '../../styles/theme';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import GradientText from '../../components/GradientText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from '../../services/auth';
import { getCompletedQuestsInSession, clearCompletedQuestsInSession } from '../../lib/quests/questEngineUnified';
import { isNarrow, getContinueButtonDimensions } from '../Onboarding/onboardingConstants';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';

const QUEST_CLAIMS_KEY = (userId) => `@align_quest_claims_${userId}`;

// Alignement avec les autres écrans (ModuleCompletion, etc.)
const HEADER_HEIGHT = 73;
// Symétrie XP / Étoiles : même taille d’icône et même structure
const REWARD_ICON_SIZE = 120;

// Import des icônes
const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

export default function QuestCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const narrow = isNarrow(width);
  const { quest } = route.params || {}; // Compatibilité avec l'ancien format
  const [userName, setUserName] = useState('TOM');
  const [completedQuests, setCompletedQuests] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [totalStars, setTotalStars] = useState(0);
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  
  // États pour les animations de la barre XP
  const [currentXP, setCurrentXP] = useState(0);
  const [currentStars, setCurrentStars] = useState(0);
  const [newXPValue, setNewXPValue] = useState(null);
  const [newStarsValue, setNewStarsValue] = useState(null);
  const [animateXP, setAnimateXP] = useState(false);
  const [animateStars, setAnimateStars] = useState(false);
  const [showAllQuests, setShowAllQuests] = useState(false);

  const questCount = completedQuests.length;
  const primaryQuest = completedQuests[0] ?? null;
  const otherQuestsCount = Math.max(0, questCount - 1);
  const hasOtherQuests = otherQuestsCount > 0;

  useEffect(() => {
    // CRITICAL: Empêcher le retour en arrière - l'écran de récompense est obligatoire
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true;
    });

    // Récupérer le nom de l'utilisateur
    const loadUserName = async () => {
      try {
        const profile = await getUserProfile();
        if (profile?.firstName || profile?.prenom) {
          setUserName((profile.firstName || profile.prenom).toUpperCase());
        }
      } catch (error) {
        console.error('Erreur lors du chargement du nom:', error);
      }
    };
    loadUserName();

    // Récupérer les quêtes complétées dans cette session
    const quests = getCompletedQuestsInSession();
    if (quests && quests.length > 0) {
      setCompletedQuests(quests);
      // Calculer les récompenses totales
      const xp = quests.reduce((sum, q) => sum + (q.rewards?.xp || 0), 0);
      const stars = quests.reduce((sum, q) => sum + (q.rewards?.stars || 0), 0);
      setTotalXP(xp);
      setTotalStars(stars);
    } else if (quest) {
      // Fallback : utiliser la quête passée en paramètre (ancien format)
      setCompletedQuests([quest]);
      setTotalXP(quest.rewards?.xp || 0);
      setTotalStars(quest.rewards?.stars || 0);
    }

    return () => {
      backHandler.remove();
    };
  }, [quest]);

  useEffect(() => {
    // Charger les valeurs actuelles d'XP et d'étoiles
    const loadCurrentProgress = async () => {
      try {
        const progress = await getUserProgress();
        setCurrentXP(progress.currentXP || 0);
        setCurrentStars(progress.totalStars || 0);
        console.log('[QuestCompletion] Progression actuelle chargée:', { currentXP: progress.currentXP, currentStars: progress.totalStars });
      } catch (error) {
        console.error('[QuestCompletion] Erreur lors du chargement de la progression:', error);
      }
    };
    
    loadCurrentProgress();
  }, []);

  useEffect(() => {
    // Ajouter les récompenses et déclencher les animations
    const addRewards = async () => {
      if (completedQuests.length > 0 && !animationsTriggered && (totalXP > 0 || totalStars > 0) && currentXP !== 0) {
        setAnimationsTriggered(true);
        
        try {
          const oldXP = currentXP;
          const oldStars = currentStars;
          
          // DÉCLENCHER LES ANIMATIONS AVANT D'AJOUTER LES RÉCOMPENSES
          if (totalXP > 0) {
            const newXP = oldXP + totalXP;
            console.log('[QuestCompletion] 🎬 Animation XP - Ancienne:', oldXP, 'Nouvelle:', newXP);
            setNewXPValue(newXP);
            setAnimateXP(true);
          }
          
          if (totalStars > 0) {
            const newStars = oldStars + totalStars;
            console.log('[QuestCompletion] 🎬 Animation étoiles - Ancienne:', oldStars, 'Nouvelle:', newStars);
            setTimeout(() => {
              setNewStarsValue(newStars);
              setAnimateStars(true);
            }, 500);
          }
          
          // Ajouter les récompenses en base (idempotent: uniquement pour les quêtes pas encore claimées)
          setTimeout(async () => {
            try {
              const user = await getCurrentUser();
              const claimsKey = user?.id ? QUEST_CLAIMS_KEY(user.id) : null;
              let claimedIds = [];
              if (claimsKey) {
                const raw = await AsyncStorage.getItem(claimsKey);
                if (raw) try { claimedIds = JSON.parse(raw); } catch (_) { claimedIds = []; }
              }
              const unclaimed = completedQuests.filter((q) => q.id && !claimedIds.includes(q.id));
              const xpToAdd = unclaimed.reduce((s, q) => s + (q.rewards?.xp || 0), 0);
              const starsToAdd = unclaimed.reduce((s, q) => s + (q.rewards?.stars || 0), 0);
              if (xpToAdd > 0) {
                await addXP(xpToAdd);
                console.log('[QuestCompletion] ✅ XP ajouté:', xpToAdd);
              }
              if (starsToAdd > 0) {
                await addStars(starsToAdd);
                console.log('[QuestCompletion] ✅ Étoiles ajoutées:', starsToAdd);
              }
              if (claimsKey && unclaimed.length > 0) {
                const newClaimed = [...claimedIds, ...unclaimed.map((q) => q.id).filter(Boolean)];
                await AsyncStorage.setItem(claimsKey, JSON.stringify(newClaimed));
              }
            } catch (err) {
              console.error('[QuestCompletion] Erreur claim récompenses:', err);
            }
            invalidateProgressCache();
          }, 300);
        } catch (error) {
          console.error('[QuestCompletion] Erreur lors de l\'ajout des récompenses:', error);
        }
      }
    };

    addRewards();
  }, [completedQuests, totalXP, totalStars, animationsTriggered, currentXP, currentStars]);

  const handleContinue = () => {
    // Nettoyer les quêtes complétées de la session
    clearCompletedQuestsInSession();
    navigation.navigate('Main', { screen: 'Feed' });
  };

  // Si aucune quête, ne rien afficher
  if (completedQuests.length === 0) {
    return null;
  }

  const displayName = userName
    ? userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()
    : '';

  const questCard = (q) => (
    <View key={q.id} style={[styles.questItem, { width: width * 0.75 }]}>
      <Text style={styles.questTitle}>{q.title}</Text>
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <Text style={styles.progressText}>
            {q.target} / {q.target}
          </Text>
        </View>
      </View>
    </View>
  );

  const mainContent = (
    <>
      <GradientText
        colors={['#FFD93F', '#FF7B2B']}
        style={styles.congratulationsTitle}
      >
        Félicitations, {displayName} !
      </GradientText>

      <Text style={styles.subtitle}>
        Tu as terminé {questCount} quête{questCount > 1 ? 's' : ''}
      </Text>

      {primaryQuest && questCard(primaryQuest)}

      {hasOtherQuests && !showAllQuests && (
        <TouchableOpacity
          style={[styles.showMoreButton, { width: width * 0.75 }]}
          onPress={() => setShowAllQuests(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.showMoreButtonText}>
            Voir les autres quêtes ({otherQuestsCount})
          </Text>
        </TouchableOpacity>
      )}

      {hasOtherQuests && showAllQuests && (
        <>
          {completedQuests.slice(1).map((q, index) => questCard({ ...q, id: q.id || `other-${index}` }))}
          <TouchableOpacity
            style={[styles.showMoreButton, { width: width * 0.75 }]}
            onPress={() => setShowAllQuests(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.showMoreButtonText}>Réduire</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.rewardsContainer}>
        <View style={styles.rewardItem}>
          <Image
            source={xpIcon}
            style={[styles.rewardIcon, { width: REWARD_ICON_SIZE, height: REWARD_ICON_SIZE }]}
            resizeMode="contain"
          />
          <Text style={styles.rewardLabel}>XP</Text>
          <GradientText
            colors={['#FE942C', '#FE6824']}
            style={styles.rewardValue}
          >
            +{totalXP}
          </GradientText>
        </View>
        <View style={styles.rewardItem}>
          <Image
            source={starIcon}
            style={[styles.rewardIcon, { width: REWARD_ICON_SIZE, height: REWARD_ICON_SIZE }]}
            resizeMode="contain"
          />
          <Text style={styles.rewardLabel}>Étoiles</Text>
          <GradientText
            colors={['#FFD93F', '#FF7B2B']}
            style={styles.rewardValue}
          >
            +{totalStars}
          </GradientText>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <HoverableTouchableOpacity
          style={[styles.continueButton, { width: getContinueButtonDimensions().buttonWidth }]}
          onPress={handleContinue}
          activeOpacity={0.85}
          variant="button"
        >
          <Text style={styles.continueButtonText}>CONTINUER</Text>
        </HoverableTouchableOpacity>
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']} // Fond unifié Align
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, { width: '100%', minHeight: '100%' }]}
    >
      {/* Header en premier — même position que ModuleCompletion / écrans standards */}
      <Header />

      {/* Barre XP en position absolue sous le header — ne pousse pas le contenu */}
      <View style={[styles.xpBarWrapper, { top: HEADER_HEIGHT }]} pointerEvents="box-none">
        <XPBar
          animateXP={animateXP}
          newXPValue={newXPValue}
          startXP={currentXP}
          animateStars={animateStars}
          newStarsValue={newStarsValue}
          startStars={currentStars}
          onXPAnimationComplete={() => {
            console.log('[QuestCompletion] ✅ Animation XP terminée');
          }}
          onStarsAnimationComplete={() => {
            console.log('[QuestCompletion] ✅ Animation étoiles terminée');
          }}
        />
      </View>

      {/* Zone contenu : même paddingTop que ModuleCompletion (70) — pas de scroll par défaut */}
      <View style={[styles.contentWrapper, narrow && { paddingTop: 40, paddingHorizontal: 20 }]}>
        {showAllQuests ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, narrow && { paddingBottom: 40 }, { paddingBottom: 60 }]}
            showsVerticalScrollIndicator={true}
          >
            {mainContent}
          </ScrollView>
        ) : (
          <View style={styles.scrollContent}>
            {mainContent}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  xpBarWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 999,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  congratulationsTitle: {
    fontSize: 36,
    fontFamily: theme.fonts.title, // Bowlby One SC
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  questsSectionTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#ACACAC',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1.5,
  },
  questsList: {
    width: '100%',
    marginBottom: 40,
    gap: 24,
    alignItems: 'center',
  },
  questItem: {
    marginBottom: 20,
  },
  questTitle: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'left',
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBar: {
    height: 36,
    backgroundColor: '#FF7B2B', // Orange rempli
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    fontSize: 16,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  showMoreButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 123, 43, 0.6)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  showMoreButtonText: {
    fontSize: 15,
    fontFamily: theme.fonts.button,
    color: '#FF7B2B',
    fontWeight: 'bold',
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 80,
    marginBottom: 28,
  },
  rewardItem: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: REWARD_ICON_SIZE,
  },
  rewardIcon: {
    marginBottom: 6,
  },
  rewardLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#ACACAC',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rewardValue: {
    fontSize: 36,
    fontFamily: theme.fonts.button,
    fontWeight: 'bold',
    includeFontPadding: false,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  continueButton: {
    backgroundColor: '#FF7B2B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    fontFamily: theme.fonts.title,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    ...theme.buttonTextNoWrap,
  },
});
