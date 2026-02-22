/**
 * Écran de Completion d'un Module
 * Recréé à l'identique du visuel fourni — strictement ce fichier uniquement
 *
 * Header local : taille 25px (réduit de 7px par rapport à 32), remonté de 35px (paddingTop 25).
 * XPBar : même offset que Home (top: 122px).
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { useNavigation, useRoute } from '@react-navigation/native';
import StandardHeader from '../../components/StandardHeader';
import XPBar from '../../components/XPBar';
import GradientText from '../../components/GradientText';
import { theme } from '../../styles/theme';

import { getUserProgress, invalidateProgressCache } from '../../lib/userProgressSupabase';
import { getUserProfile } from '../../lib/userProfile';
import {
  handleModuleCompletion,
  getNextRouteAfterModuleCompletion,
  setPostModuleNavigationLock,
} from '../../lib/modules';
import { completeModule } from '../../lib/chapters/chapterSystem';
import { getCompletionFeedback } from '../../services/getCompletionFeedback';

const HEADER_HEIGHT = 73;

const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

const NARROW_BREAKPOINT = 430;

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const narrow = width <= NARROW_BREAKPOINT;
  const { module, score, totalItems, answers } = route.params || {};
  const [userName, setUserName] = useState('');
  const [animationsTriggered, setAnimationsTriggered] = useState(false);
  const [currentXP, setCurrentXP] = useState(0);
  const [currentStars, setCurrentStars] = useState(0);
  const [newXPValue, setNewXPValue] = useState(null);
  const [newStarsValue, setNewStarsValue] = useState(null);
  const [animateXP, setAnimateXP] = useState(false);
  const [animateStars, setAnimateStars] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [feedbackPhrase, setFeedbackPhrase] = useState(null);
  const routingLockRef = useRef(false);
  const hasTriggeredAnimationsRef = useRef(false);

  useEffect(() => {
    const loadCurrentProgress = async () => {
      try {
        const progress = await getUserProgress(true);
        const xpBefore = progress.currentXP || 0;
        const starsBefore = progress.totalStars || 0;
        setCurrentXP(xpBefore);
        setCurrentStars(starsBefore);

        if (module && score?.percentage >= 50 && !hasTriggeredAnimationsRef.current) {
          hasTriggeredAnimationsRef.current = true;
          setAnimationsTriggered(true);
          const feedback = module.feedback_final || {};
          const isPassed = score?.percentage >= 50;
          const XP_REWARD = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
          const STARS_REWARD = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;
          const targetXP = xpBefore + XP_REWARD;
          const targetStars = starsBefore + STARS_REWARD;
          if (__DEV__) {
            console.log('[ModuleCompletion] 🎬 Animation:', { prevXP: xpBefore, prevLevel: Math.floor(xpBefore / 50) + 1, targetXP, targetStars: targetStars, prevStars: starsBefore });
          }
          setNewXPValue(targetXP);
          setNewStarsValue(targetStars);
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
      const raw = (profile?.firstName ?? profile?.prenom ?? '').toString().trim();
      if (raw && raw.toLowerCase() !== 'utilisateur') {
        setUserName(raw.toUpperCase());
      }
    };
    loadUserName();
  }, []);

  useEffect(() => {
    if (!module || !score || feedbackPhrase !== null) return;
    const seriesType =
      module.type === 'apprentissage_mindset'
        ? 'apprentissage'
        : module.type === 'test_secteur'
          ? 'secteur'
          : 'simulation';
    const result = (score?.percentage ?? 0) >= 50 ? 'success' : 'neutral';
    let choice = 'B';
    if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
      const indices = Object.keys(answers).map(Number).filter((n) => !Number.isNaN(n));
      const lastIndex = Math.max(...indices);
      const optionId = answers[lastIndex];
      if (typeof optionId === 'string' && /^option_\d$/.test(optionId)) {
        const i = parseInt(optionId.replace('option_', ''), 10);
        if (i >= 0 && i <= 2) choice = ['A', 'B', 'C'][i];
      }
    }
    getCompletionFeedback({ seriesType, choice, result }).then((r) => setFeedbackPhrase(r?.feedback ?? ''));
  }, [module, score, answers, feedbackPhrase]);

  if (!module || !score) return null;

  const isPassed = score?.percentage >= 50;
  const feedback = module.feedback_final || {};
  const rewardXP = (isPassed && feedback.recompense?.xp) ? feedback.recompense.xp : 0;
  const rewardStars = (isPassed && feedback.recompense?.etoiles) ? feedback.recompense.etoiles : 0;

  const goToFeed = () => {
    if (__DEV__) console.log('[ModuleCompletion] Navigation vers Main/Feed');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'Feed' } }],
    });
  };

  const handleReturnToHome = async () => {
    if (routingLockRef.current || continuing) return;
    routingLockRef.current = true;
    setContinuing(true);
    setPostModuleNavigationLock(true);
    if (__DEV__) console.log('[ModuleCompletion] Continuer pressé');

    const params = route.params || {};
    const { chapterId, moduleIndex } = params;
    const moduleData = {
      moduleId: module.type || module.id || `module_${Date.now()}`,
      score: score?.percentage || 0,
      correctAnswers: Array.isArray(answers) ? answers.filter(a => a.correct).length : 0,
      totalQuestions: totalItems || (Array.isArray(answers) ? answers.length : 0),
      xpReward: rewardXP,
      starsReward: rewardStars,
    };

    try {
      const next = await getNextRouteAfterModuleCompletion(moduleData);

      // CRITIQUE: Persister AVANT navigation pour que le Feed charge la progression à jour
      try {
        if (chapterId != null && typeof moduleIndex === 'number') {
          await completeModule(chapterId, moduleIndex + 1);
        }
        await handleModuleCompletion(moduleData, { skipQuestEvents: true });
        invalidateProgressCache();
      } catch (err) {
        console.error('[ModuleCompletion] Erreur complétion:', err);
      }

      routingLockRef.current = false;
      if (next.route === 'QuestCompletion') {
        if (__DEV__) console.log('[ModuleCompletion] Navigation vers QuestCompletion');
        navigation.reset({
          index: 0,
          routes: [{ name: 'QuestCompletion', params: next.params || {} }],
        });
      } else {
        goToFeed();
      }
    } catch (err) {
      console.error('[ModuleCompletion] Erreur calcul route:', err);
      routingLockRef.current = false;
      goToFeed();
    } finally {
      setTimeout(() => {
        setPostModuleNavigationLock(false);
        setContinuing(false);
      }, 500);
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

      <View style={[styles.xpBarWrapper, { top: HEADER_HEIGHT }, { pointerEvents: 'box-none' }]}>
        <XPBar
          animateXP={animateXP}
          newXPValue={newXPValue}
          startXP={currentXP}
          animateStars={animateStars}
          newStarsValue={newStarsValue}
          startStars={currentStars}
          onXPAnimationComplete={() => { setAnimateXP(false); setNewXPValue(null); }}
          onStarsAnimationComplete={() => { setAnimateStars(false); setNewStarsValue(null); }}
        />
      </View>

      {/* Contenu — bloc félicitations remonté de 50px pour recentrage vertical */}
      <View style={[styles.content, narrow && { paddingTop: 40, paddingHorizontal: 20 }]}>
        <View style={styles.contentBlock}>
          <View style={styles.titleSubtitleBlock}>
            <GradientText
              colors={['#FF7B2B', '#FFD93F']}
              style={[styles.title, narrow && { fontSize: 28, marginBottom: 14 }]}
            >
              {userName ? `FÉLICITATIONS ${userName} !` : 'FÉLICITATIONS !'}
            </GradientText>

            <Text
              style={[
                styles.subtitle,
                narrow && { fontSize: 17, lineHeight: 24, marginBottom: 24 },
              ]}
            >
              {feedbackPhrase ?? 'Tu te rapproches concrètement de la voie qui te correspond vraiment, tu es sur la bonne trajectoire !'}
            </Text>
          </View>

          {isPassed && (rewardStars > 0 || rewardXP > 0) && (
            <View style={[styles.rewardsBlock, narrow && { gap: 48 }]}>
              <View style={styles.rewardItem}>
                <Image
                  source={starIcon}
                  style={[styles.rewardIcon, narrow && { width: 120, height: 120, marginBottom: 10 }]}
                  resizeMode="contain"
                />
                <GradientText colors={['#FF7B2B', '#FFD93F']} style={[styles.rewardNumber, narrow && { fontSize: 30 }]}>
                  {rewardStars}
                </GradientText>
              </View>
              <View style={[styles.rewardItem, styles.rewardItemRight]}>
                <Image
                  source={xpIcon}
                  style={[styles.rewardIcon, narrow && { width: 120, height: 120, marginBottom: 10 }]}
                  resizeMode="contain"
                />
                <GradientText colors={['#FF7B2B', '#FFA36B']} style={[styles.rewardNumber, narrow && { fontSize: 30 }]}>
                  {rewardXP}
                </GradientText>
              </View>
            </View>
          )}

          <View style={[styles.buttonContainer, narrow && { marginTop: 28, paddingBottom: 24 }]}>
            <HoverableTouchableOpacity
              style={[
                styles.continueButton,
                narrow && { width: Math.min(340, width * 0.88) },
                continuing && styles.continueButtonDisabled,
              ]}
              onPress={handleReturnToHome}
              activeOpacity={0.8}
              variant="button"
              disabled={continuing}
            >
              <Text style={styles.continueButtonText}>CONTINUER</Text>
            </HoverableTouchableOpacity>
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
    paddingTop: 70,
    paddingBottom: 40,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  contentBlock: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
  },
  titleSubtitleBlock: {
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
    fontSize: 19,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 16,
  },
  rewardsBlock: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 64,
    marginTop: 0,
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
    marginTop: 60,
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
  continueButtonDisabled: {
    opacity: 0.7,
    ...(Platform.OS === 'web' && { cursor: 'not-allowed' }),
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
