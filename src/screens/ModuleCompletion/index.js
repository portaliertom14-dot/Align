/**
 * Écran de Completion d'un Module
 * Affiche le feedback final, badge, récompenses avec XP/étoiles animées
 * Redirection automatique vers l'accueil après quelques secondes
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';
import { addXP, addStars, getUserProgress } from '../../lib/userProgressSupabase';
import { getUserProfile } from '../../lib/userProfile';
import { questEventEmitter, QUEST_EVENT_TYPES } from '../../lib/quests/v2/events';

// 🆕 SYSTÈME DE MODULES V1
import { handleModuleCompletion, navigateAfterModuleCompletion } from '../../lib/modules';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import des icônes
const xpIcon = require('../../../assets/icons/xp.png');
const starIcon = require('../../../assets/icons/star.png');

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module, score, totalItems, answers, timeSpentMinutes } = route.params || {};
  const [userName, setUserName] = useState('TOM');
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  
  // États pour les animations de la barre XP
  const [currentXP, setCurrentXP] = useState(0);
  const [currentStars, setCurrentStars] = useState(0);
  const [newXPValue, setNewXPValue] = useState(null);
  const [newStarsValue, setNewStarsValue] = useState(null);
  const [animateXP, setAnimateXP] = useState(false);
  const [animateStars, setAnimateStars] = useState(false);

  // Déclencher l'animation IMMÉDIATEMENT au montage de l'écran
  useEffect(() => {
    // Charger les valeurs actuelles d'XP et d'étoiles et déclencher l'animation
    const loadCurrentProgress = async () => {
      try {
        const progress = await getUserProgress(true);
        const xpBefore = progress.currentXP || 0;
        const starsBefore = progress.totalStars || 0;
        
        setCurrentXP(xpBefore);
        setCurrentStars(starsBefore);
        
        // Déclencher l'animation IMMÉDIATEMENT si le module est validé
        if (module && score?.percentage >= 50 && !animationsTriggered) {
          setAnimationsTriggered(true);
          
          // Utiliser les valeurs RÉELLES du module (feedback_final.recompense)
          const feedback = module.feedback_final || {};
          const isPassed = score?.percentage >= 50;
          const XP_REWARD = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
          const STARS_REWARD = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;
          
          const xpAfter = xpBefore + XP_REWARD;
          const starsAfter = starsBefore + STARS_REWARD;
          
          // Déclencher l'animation IMMÉDIATEMENT
          setNewXPValue(xpAfter);
          setNewStarsValue(starsAfter);
          setAnimateXP(true);
          setAnimateStars(true);
        }
      } catch (error) {
        console.error('[ModuleCompletion] Erreur lors du chargement de la progression:', error);
      }
    };
    
    // Appeler immédiatement au montage
    if (module && score) {
      loadCurrentProgress();
    }
  }, []); // Dépendances vides = exécuté une seule fois au montage

  // NOTE: Les récompenses sont maintenant ajoutées par handleModuleCompletion (appelé dans handleReturnToHome)
  // L'animation est déclenchée dans le useEffect ci-dessus au montage de l'écran

  useEffect(() => {
    // Redirection vers l'accueil si données manquantes
    if (!module || !score) {
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }, [module, score, navigation]);

  // Récupérer le nom de l'utilisateur depuis le profil
  useEffect(() => {
    const loadUserName = async () => {
      const profile = await getUserProfile();
      if (profile?.firstName || profile?.prenom) {
        setUserName((profile.firstName || profile.prenom).toUpperCase());
      }
    };
    loadUserName();
  }, []);

  if (!module || !score) {
    return null;
  }

  const isPassed = score?.percentage >= 50;
  const feedback = module.feedback_final || {};
  const rewardXP = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
  const rewardStars = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;

  const handleReturnToHome = async () => {
    try {
      // 🆕 SYSTÈME DE MODULES V1 - Gérer la complétion complète
      // NOTE: Les récompenses sont déjà ajoutées visuellement (animation déclenchée au montage)
      // handleModuleCompletion va les ajouter en base de données avec les mêmes valeurs
      const result = await handleModuleCompletion({
        moduleId: module.type || module.id || `module_${Date.now()}`,
        score: score?.percentage || 0,
        correctAnswers: Array.isArray(answers) ? answers.filter(a => a.correct).length : 0,
        totalQuestions: totalItems || (Array.isArray(answers) ? answers.length : 0),
        xpReward: rewardXP, // Valeurs réelles du module
        starsReward: rewardStars, // Valeurs réelles du module
      });

      console.log('[ModuleCompletion] Résultat complétion:', result);

      if (result.success) {
        // Navigation intelligente (vers QuestCompletion si quêtes complétées, sinon Feed)
        navigateAfterModuleCompletion(navigation, result);
      } else {
        // Fallback: retour au Feed
        navigation.navigate('Main', { screen: 'Feed' });
      }
    } catch (error) {
      console.error('[ModuleCompletion] Erreur lors de la complétion:', error);
      // Fallback: retour au Feed
      navigation.navigate('Main', { screen: 'Feed' });
    }
  };

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Barre XP avec animations */}
      <XPBar
        animateXP={animateXP}
        newXPValue={newXPValue}
        startXP={currentXP}
        animateStars={animateStars}
        newStarsValue={newStarsValue}
        onXPAnimationComplete={() => {
          console.log('[ModuleCompletion] Animation XP terminée');
          // Réinitialiser les props d'animation pour éviter qu'elles se relancent
          setAnimateXP(false);
          setNewXPValue(null);
        }}
        onStarsAnimationComplete={() => {
          console.log('[ModuleCompletion] Animation étoiles terminée');
          // Réinitialiser les props d'animation pour éviter qu'elles se relancent
          setAnimateStars(false);
          setNewStarsValue(null);
        }}
      />
      
      {/* Header avec ALIGN */}
      <Header />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Titre FELICITATIONS avec dégradé */}
        <GradientText 
          colors={['#FFD93F', '#FF7B2B']}
          style={styles.congratulationsTitle}
        >
          FELICITATIONS {userName}!
        </GradientText>

        {/* Sous-titre */}
        <Text style={styles.subtitle}>
          TU AS TERMINÉ CE MODULE
        </Text>
        <Text style={styles.subtitle}>
          CONTINUE COMME ÇA !
        </Text>

        {/* Section Récompenses */}
        {isPassed && feedback.recompense && (
          <View style={styles.rewardsContainer}>
            {/* XP */}
            {feedback.recompense.xp && (
              <View style={styles.rewardItem}>
                <Image source={xpIcon} style={styles.rewardIconXP} />
                <GradientText 
                  colors={['#FE942C', '#FE6824']}
                  style={styles.rewardValue}
                >
                  {feedback.recompense.xp}
                </GradientText>
              </View>
            )}

            {/* Étoiles */}
            {feedback.recompense.etoiles && (
              <View style={styles.rewardItem}>
                <Image source={starIcon} style={styles.rewardIconStar} />
                <GradientText 
                  colors={['#FFD93F', '#FF7B2B']}
                  style={styles.rewardValue}
                >
                  {feedback.recompense.etoiles}
                </GradientText>
              </View>
            )}
          </View>
        )}

        {/* Bouton CONTINUER */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleReturnToHome}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.colors.gradient.buttonOrange}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>CONTINUER</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 24,
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
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 80,
    marginTop: 60,
    marginBottom: 70,
  },
  rewardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconXP: {
    width: 177,
    height: 177,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  rewardIconStar: {
    width: 160,
    height: 160,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  rewardValue: {
    fontSize: 36,
    fontFamily: theme.fonts.button,
    fontWeight: 'bold',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 60,
  },
  continueButton: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.title, // Bowlby One SC
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
