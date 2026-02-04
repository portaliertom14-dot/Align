/**
 * Écran de Completion d'un Module
 * Recréé à l'identique du visuel fourni — strictement ce fichier uniquement
 *
 * Header local : taille 25px (réduit de 7px par rapport à 32), remonté de 35px (paddingTop 25).
 * XPBar : même offset que Home (top: 122px).
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import StandardHeader from '../../components/StandardHeader';
import XPBar from '../../components/XPBar';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

import { getUserProgress } from '../../lib/userProgressSupabase';
import { getUserProfile } from '../../lib/userProfile';
import { handleModuleCompletion, navigateAfterModuleCompletion } from '../../lib/modules';
import { completeModule } from '../../lib/chapters/chapterSystem';

const HEADER_HEIGHT = 73;

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { module, score, totalItems, answers } = route.params || {};
  const [userName, setUserName] = useState('TOM');
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const [currentXP, setCurrentXP] = useState(0);
  const [currentStars, setCurrentStars] = useState(0);
  const [newXPValue, setNewXPValue] = useState(null);
  const [newStarsValue, setNewStarsValue] = useState(null);
  const [animateXP, setAnimateXP] = useState(false);
  const [animateStars, setAnimateStars] = useState(false);

  useEffect(() => {
    const loadCurrentProgress = async () => {
      try {
        const progress = await getUserProgress(true);
        const xpBefore = progress.currentXP || 0;
        const starsBefore = progress.totalStars || 0;
        setCurrentXP(xpBefore);
        setCurrentStars(starsBefore);

        if (module && score?.percentage >= 50 && !animationsTriggered) {
          setAnimationsTriggered(true);
          const feedback = module.feedback_final || {};
          const isPassed = score?.percentage >= 50;
          const XP_REWARD = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
          const STARS_REWARD = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;
          setNewXPValue(xpBefore + XP_REWARD);
          setNewStarsValue(starsBefore + STARS_REWARD);
          setAnimateXP(true);
          setAnimateStars(true);
        }
      } catch (error) {
        console.error('[ModuleCompletion] Erreur chargement progression:', error);
      }
    };
    if (module && score) loadCurrentProgress();
  }, []);

  useEffect(() => {
    if (!module || !score) {
      navigation.navigate('Main', { screen: 'Feed' });
    }
  }, [module, score, navigation]);

  useEffect(() => {
    const loadUserName = async () => {
      const profile = await getUserProfile();
      if (profile?.firstName || profile?.prenom) {
        setUserName((profile.firstName || profile.prenom).toUpperCase());
      }
    };
    loadUserName();
  }, []);

  if (!module || !score) return null;

  const isPassed = score?.percentage >= 50;
  const feedback = module.feedback_final || {};
  const rewardXP = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
  const rewardStars = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;

  const handleReturnToHome = async () => {
    try {
      const { chapterId, moduleIndex } = route.params || {};
      if (chapterId && typeof moduleIndex === 'number') {
        const moduleOrder = moduleIndex + 1;
        await completeModule(chapterId, moduleOrder);
      }

      const result = await handleModuleCompletion({
        moduleId: module.type || module.id || `module_${Date.now()}`,
        score: score?.percentage || 0,
        correctAnswers: Array.isArray(answers) ? answers.filter(a => a.correct).length : 0,
        totalQuestions: totalItems || (Array.isArray(answers) ? answers.length : 0),
        xpReward: rewardXP,
        starsReward: rewardStars,
      });

      if (result.success) {
        navigateAfterModuleCompletion(navigation, result);
      } else {
        navigation.navigate('Main', { screen: 'Feed' });
      }
    } catch (error) {
      console.error('[ModuleCompletion] Erreur complétion:', error);
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
      <StandardHeader title="ALIGN" />

      <View style={[styles.xpBarWrapper, { top: HEADER_HEIGHT }]} pointerEvents="box-none">
        <XPBar
          animateXP={animateXP}
          newXPValue={newXPValue}
          startXP={currentXP}
          animateStars={animateStars}
          newStarsValue={newStarsValue}
          onXPAnimationComplete={() => { setAnimateXP(false); setNewXPValue(null); }}
          onStarsAnimationComplete={() => { setAnimateStars(false); setNewStarsValue(null); }}
        />
      </View>

      {/* Contenu — container centré verticalement dans l'espace sous le header */}
      <View style={styles.content}>
        <View style={styles.contentBlock}>
          <View style={styles.titleSubtitleBlock}>
            <GradientText
              colors={['#FF7B2B', '#FFD93F']}
              style={styles.title}
            >
              FÉLICITATIONS {userName} !
            </GradientText>

            <Text style={styles.subtitle}>
              Tu te rapproches concrètement de la voie qui te correspond vraiment, tu es sur la bonne trajectoire !
            </Text>
          </View>

          {isPassed && (rewardStars > 0 || rewardXP > 0) && (
            <View style={styles.rewardsBlock}>
              <View style={styles.rewardItem}>
                <Image source={starIcon} style={styles.rewardIcon} resizeMode="contain" />
                <GradientText colors={['#FF7B2B', '#FFD93F']} style={styles.rewardNumber}>
                  {rewardStars}
                </GradientText>
              </View>
              <View style={[styles.rewardItem, styles.rewardItemRight]}>
                <Image source={xpIcon} style={styles.rewardIcon} resizeMode="contain" />
                <GradientText colors={['#FF7B2B', '#FFA36B']} style={styles.rewardNumber}>
                  {rewardXP}
                </GradientText>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleReturnToHome}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>CONTINUER</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingTop: 200,
    paddingBottom: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBlock: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 520,
  },
  titleSubtitleBlock: {
    marginTop: -40,
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: theme.fonts.title }),
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Platform.select({ web: 'Nunito, sans-serif', default: theme.fonts.body }),
    fontWeight: '900',
    fontSize: 19,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    maxWidth: 520,
    paddingHorizontal: 16,
  },
  rewardsBlock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 64,
  },
  rewardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardItemRight: {
    marginLeft: 0,
  },
  rewardIcon: {
    width: 168,
    height: 168,
    marginBottom: 14,
  },
  rewardNumber: {
    fontFamily: Platform.select({ web: 'Nunito, sans-serif', default: theme.fonts.body }),
    fontWeight: '900',
    fontSize: 36,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 40,
    paddingBottom: 8,
  },
  continueButton: {
    width: 340,
    height: 56,
    backgroundColor: '#FF7B2B',
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
    fontFamily: Platform.select({ web: 'Bowlby One SC, cursive', default: theme.fonts.title }),
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
