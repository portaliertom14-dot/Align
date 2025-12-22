/**
 * Écran de Completion d'un Module
 * Affiche le feedback final, badge, récompenses
 * Redirection automatique vers l'accueil après quelques secondes
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../components/Header';
import RewardAnimation from '../../components/RewardAnimation';
import { theme } from '../../styles/theme';
import { addXP, addStars } from '../../lib/userProgress';

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module, score, totalItems, answers } = route.params || {};
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);

  useEffect(() => {
    // Ajouter les récompenses seulement si le module est validé (score >= 50%)
    const addRewards = async () => {
      if (module?.feedback_final?.recompense && score?.percentage >= 50) {
        const { xp, etoiles } = module.feedback_final.recompense;
        if (xp) await addXP(xp);
        if (etoiles) await addStars(etoiles);
        
        // Marquer le module comme complété dans userProgress
        // UX finalisée — prête pour branchement IA ultérieur
        const { updateUserProgress, getUserProgress } = require('../../lib/userProgress');
        const progress = await getUserProgress();
        const completedModules = progress.completedModules || [];
        // Utiliser module.type comme identifiant (mini_simulation_metier, apprentissage, test_secteur)
        if (module.type && !completedModules.includes(module.type)) {
          completedModules.push(module.type);
          await updateUserProgress({ completedModules });
        }
        
        // Afficher l'animation de récompenses
        setShowRewardAnimation(true);
      }
    };
    
    addRewards();
  }, []);

  useEffect(() => {
    // Redirection vers l'accueil si données manquantes
    if (!module || !score) {
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }, [module, score, navigation]);

  if (!module || !score) {
    return null;
  }

  const isPassed = score?.percentage >= 50;
  const feedback = module.feedback_final || {};
  const badge = isPassed ? (feedback.badge || 'Module complété') : 'Tu progresses !';
  const message = isPassed 
    ? (feedback.message || 'Bravo !')
    : 'Tu progresses, réessaie 👍';
  const rewardXP = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
  const rewardStars = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;

  const handleReturnToHome = () => {
    navigation.navigate('Main', { screen: 'Feed' });
  };

  // Récupérer le nom de l'utilisateur depuis le profil
  const [userName, setUserName] = useState('TOM');
  useEffect(() => {
    const loadUserName = async () => {
      const { getUserProfile } = require('../../lib/userProfile');
      const profile = await getUserProfile();
      if (profile?.firstName || profile?.prenom) {
        setUserName((profile.firstName || profile.prenom).toUpperCase());
      }
    };
    loadUserName();
  }, []);

  return (
    <LinearGradient
      colors={theme.colors.gradient.align}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Header />
      
      {/* Animation de récompenses */}
      {isPassed && (
        <RewardAnimation
          visible={showRewardAnimation}
          stars={rewardStars}
          xp={rewardXP}
          onAnimationComplete={() => setShowRewardAnimation(false)}
        />
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Texte de félicitations - directement en blanc sur le fond */}
        <View style={styles.congratulationsContainer}>
          <Text style={styles.congratulationsText}>
            FÉLICITATIONS {userName} !{'\n'}
            TU AS TERMINÉ CE MODULE{'\n'}
            CONTINUE COMME ÇA !
          </Text>
        </View>

        {/* Section Récompenses */}
        {isPassed && feedback.recompense && (
          <View style={styles.rewardsSection}>
            <Text style={styles.rewardsTitle}>RÉCOMPENSES</Text>
            <View style={styles.rewardsContainer}>
              {feedback.recompense.etoiles && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardIcon}>⭐</Text>
                  <Text style={styles.rewardValue}>{feedback.recompense.etoiles}</Text>
                </View>
              )}
              {feedback.recompense.xp && (
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardIconXP}>XP</Text>
                  <Text style={styles.rewardValue}>{feedback.recompense.xp}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bouton continuer */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleReturnToHome}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>CONTINUER</Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  congratulationsContainer: {
    marginTop: 40,
    marginBottom: 60,
    alignItems: 'center',
  },
  congratulationsText: {
    fontSize: 28,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
    lineHeight: 38,
    letterSpacing: 0.5,
  },
  rewardsSection: {
    marginTop: 40,
    marginBottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  rewardsTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    marginBottom: 32,
    fontWeight: '400',
  },
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 60,
  },
  rewardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  rewardIconXP: {
    fontSize: 48,
    fontFamily: theme.fonts.title,
    color: '#FF7B2B',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rewardValue: {
    fontSize: 24,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 40,
    width: '100%',
    paddingHorizontal: 24,
  },
  continueButton: {
    backgroundColor: '#FF7B2B',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});



