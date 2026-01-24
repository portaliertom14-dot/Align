/**
 * Composant Barre d'XP avec animation
 * 
 * Règles strictes:
 * - Animation UNIQUEMENT sur cette barre (en haut à droite)
 * - Écoute les événements de progressionAnimationEmitter
 * - Animation purement visuelle
 * - Valeurs calculées AVANT l'animation
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Text, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgressSupabase';
import { calculateLevel, getXPNeededForNextLevel, getTotalXPForLevel } from '../../lib/progression';
import { theme } from '../../styles/theme';
import { progressionAnimationEmitter, PROGRESSION_EVENTS } from '../../lib/progressionAnimation';

const starIcon = require('../../../assets/icons/star.png');

export default function XPBar({ 
  animateXP: propAnimateXP = false,
  newXPValue: propNewXPValue = null,
  startXP: propStartXP = null,
  animateStars: propAnimateStars = false,
  newStarsValue: propNewStarsValue = null,
  onXPAnimationComplete,
  onStarsAnimationComplete,
}) {
  const [progress, setProgress] = useState({
    currentLevel: 1,
    xpForNextLevel: 100,
    stars: 0,
    currentXP: 0,
  });

  // États d'animation
  const [isAnimatingXP, setIsAnimatingXP] = useState(false);
  const [isAnimatingStars, setIsAnimatingStars] = useState(false);
  const [animatedXP, setAnimatedXP] = useState(0);
  const [animatedStars, setAnimatedStars] = useState(0);
  const [animatedLevel, setAnimatedLevel] = useState(1);

  const progressBarWidth = useRef(new Animated.Value(0)).current;
  const animationInProgress = useRef(false);
  const xpAnimationTimeoutRef = useRef(null);
  const starsAnimationTimeoutRef = useRef(null);

  /**
   * Calcule le pourcentage de progression
   */
  const getProgressPercent = (xp, level) => {
    const totalXPForNextLevel = getTotalXPForLevel(level + 1);
    return totalXPForNextLevel > 0 ? (xp / totalXPForNextLevel) * 100 : 0;
  };

  /**
   * Charge la progression depuis Supabase
   */
  const loadProgress = async () => {
    try {
      
      const userProgress = await getUserProgress(true);
      
      const currentXP = userProgress.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      const xpForNextLevel = getXPNeededForNextLevel(currentXP);
      const totalXPForNextLevel = getTotalXPForLevel(currentLevel + 1);
      const stars = userProgress.totalStars || 0;
      
      setProgress({
        currentLevel,
        xpForNextLevel,
        totalXPForNextLevel,
        stars,
        currentXP,
      });

      // Initialiser la barre si pas d'animation
      // CRITICAL: Ne pas réinitialiser si on anime via props (ModuleCompletion) ou si animation en cours
      if (!animationInProgress.current && !propAnimateXP && !isAnimatingXP) {
        const progressPercent = totalXPForNextLevel > 0 ? (currentXP / totalXPForNextLevel) * 100 : 0;
        const currentValue = progressBarWidth._value || 0;
        
        // Ne mettre à jour que si la valeur a vraiment changé (évite de réinitialiser après animation)
        // CRITICAL: Si la barre a une valeur > 0 et que currentXP est 0, c'est probablement après une animation
        // où les récompenses ne sont pas encore sauvegardées dans la DB
        // Ne pas réinitialiser dans ce cas pour éviter de perdre la valeur animée
        if (currentValue > 0 && currentXP === 0) {
          // Ne pas réinitialiser - la barre garde sa valeur animée
          // CRITICAL: Ne PAS réinitialiser animatedXP et animatedStars non plus - ils gardent leurs valeurs animées
          // Les valeurs affichées utiliseront animatedXP/animatedStars au lieu de currentXP/stars
          // setAnimatedLevel(currentLevel); // Ne pas réinitialiser
          // setAnimatedXP(currentXP); // Ne pas réinitialiser - garder la valeur animée
          // setAnimatedStars(stars); // Ne pas réinitialiser - garder la valeur animée
        } else if (Math.abs(currentValue - progressPercent) > 1) {
          progressBarWidth.setValue(Math.min(progressPercent, 100));
          setAnimatedLevel(currentLevel);
          setAnimatedXP(currentXP);
          setAnimatedStars(stars);
        } else {
          // Valeur déjà correcte, juste mettre à jour les états
        setAnimatedLevel(currentLevel);
          setAnimatedXP(currentXP);
          setAnimatedStars(stars);
        }
      }
    } catch (error) {
      console.error('[XPBar] Erreur lors du chargement:', error);
    }
  };

  // Charger au focus
  // CRITICAL: Ne pas charger si on anime via props (ModuleCompletion)
  useFocusEffect(
    React.useCallback(() => {
      // Ne pas charger si on anime via props (évite de réinitialiser la barre pendant l'animation)
      if (!propAnimateXP && !animationInProgress.current) {
        loadProgress();
      }
    }, [propAnimateXP])
  );

  /**
   * Anime le chiffre XP (incrémentation progressive)
   */
  const animateXPNumber = (start, end, duration) => {
    // Nettoyer l'animation précédente
    if (xpAnimationTimeoutRef.current) {
      clearTimeout(xpAnimationTimeoutRef.current);
    }
    
    const steps = 30;
    const stepSize = (end - start) / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep >= steps) {
        setAnimatedXP(end);
        return;
      }
      
      currentStep++;
      const currentValue = Math.floor(start + (stepSize * currentStep));
      setAnimatedXP(Math.min(currentValue, end));
      
      xpAnimationTimeoutRef.current = setTimeout(animate, stepDuration);
    };
    
    animate();
  };

  /**
   * Anime les étapes séquentiellement
   */
  const animateStepsSequentially = (steps, stepIndex, onComplete) => {
    if (stepIndex >= steps.length) {
      onComplete();
      return;
    }
    
    const step = steps[stepIndex];
    const startPercent = getProgressPercent(step.from, step.fromLevel);
    const endPercent = step.isLevelUp ? 100 : getProgressPercent(step.to, step.toLevel);
    
    console.log('[XPBar] Animation étape', stepIndex + 1, '/', steps.length, ':', {
      from: step.from,
      to: step.to,
      fromLevel: step.fromLevel,
      toLevel: step.toLevel,
      isLevelUp: step.isLevelUp,
      startPercent,
      endPercent,
    });
    
    // Animer la barre
    Animated.timing(progressBarWidth, {
      toValue: endPercent,
      duration: step.isLevelUp ? 800 : 1200,
      useNativeDriver: false,
    }).start((finished) => {
      if (step.isLevelUp) {
        // Reset visuel + incrément niveau
        progressBarWidth.setValue(0);
        setAnimatedLevel(step.toLevel);
        console.log('[XPBar] Passage de niveau:', step.fromLevel, '→', step.toLevel);
        
        // Petite pause avant de continuer
    setTimeout(() => {
          animateStepsSequentially(steps, stepIndex + 1, onComplete);
        }, 300);
      } else {
        // Dernière étape : s'assurer que la barre reste à sa valeur finale
        // La barre est déjà à endPercent grâce à l'animation
        // S'assurer que la barre est bien à endPercent
        if (Math.abs(progressBarWidth._value - endPercent) > 0.1) {
          progressBarWidth.setValue(endPercent);
        }
        
        // Continuer avec l'étape suivante (ou terminer)
        animateStepsSequentially(steps, stepIndex + 1, onComplete);
      }
    });
    
    // Animer le chiffre XP en parallèle
    animateXPNumber(step.from, step.to, step.isLevelUp ? 800 : 1200);
  };

  /**
   * Anime la barre XP
   */
  const animateXPBar = (xpBefore, xpAfter, levelBefore, levelAfter) => {
    if (animationInProgress.current) {
      console.log('[XPBar] Animation déjà en cours, ignorée');
      return;
    }
    
    console.log('[XPBar] Démarrage animation XP:', { xpBefore, xpAfter, levelBefore, levelAfter });
    
      animationInProgress.current = true;
    setIsAnimatingXP(true);
    
    // Initialiser les valeurs de départ
    setAnimatedXP(xpBefore);
    setAnimatedLevel(levelBefore);
    
    // Calculer le pourcentage de départ
    const startPercent = getProgressPercent(xpBefore, levelBefore);
    
    progressBarWidth.setValue(startPercent);
    
    // Si on a un callback, l'appeler à la fin
    const onComplete = () => {
      setIsAnimatingXP(false);
      animationInProgress.current = false;
      setAnimatedXP(xpAfter);
      setAnimatedLevel(levelAfter);
      
      // CRITICAL: Ne PAS réinitialiser la barre après l'animation
      // La barre est déjà à sa valeur finale grâce à l'animation
      // S'assurer qu'elle reste à la bonne valeur
      const finalLevel = calculateLevel(xpAfter);
      const finalPercent = getProgressPercent(xpAfter, finalLevel);
      
      // S'assurer que la barre est à la valeur finale (au cas où)
      if (Math.abs(progressBarWidth._value - finalPercent) > 0.1) {
        progressBarWidth.setValue(finalPercent);
      }
      
      if (onXPAnimationComplete) {
        onXPAnimationComplete();
      }
      // Ne PAS appeler loadProgress() ici car cela réinitialiserait la barre
    };
    
    // Calculer les étapes d'animation (gérer les montées de niveau)
    const steps = [];
    let currentXP = xpBefore;
    let currentLevel = levelBefore;
    
    while (currentXP < xpAfter) {
      const nextLevelXP = getTotalXPForLevel(currentLevel + 1);
      
      if (nextLevelXP !== Infinity && xpAfter >= nextLevelXP) {
        // Passage de niveau
        steps.push({
          from: currentXP,
          to: nextLevelXP,
          fromLevel: currentLevel,
          toLevel: currentLevel + 1,
          isLevelUp: true,
        });
        currentXP = nextLevelXP;
        currentLevel = currentLevel + 1;
      } else {
        // Reste dans le même niveau
        steps.push({
          from: currentXP,
          to: xpAfter,
          fromLevel: currentLevel,
          toLevel: levelAfter,
          isLevelUp: false,
        });
        currentXP = xpAfter;
      }
    }
    
    // Animer séquentiellement
    animateStepsSequentially(steps, 0, onComplete);
  };
  
  // Si des props d'animation sont fournies, les utiliser au lieu des événements
  useEffect(() => {
    // CRITICAL: Ne déclencher l'animation que si :
    // 1. Les props sont actives
    // 2. L'animation n'est pas déjà en cours
    // 3. Les valeurs sont valides
    if (propAnimateXP && propNewXPValue !== null && propStartXP !== null && !animationInProgress.current && !isAnimatingXP) {
      // Attendre un court délai pour s'assurer que le composant est monté
      const timer = setTimeout(() => {
        // Vérifier à nouveau que l'animation n'a pas commencé entre-temps
        if (!animationInProgress.current && !isAnimatingXP) {
          const levelBefore = calculateLevel(propStartXP);
          const levelAfter = calculateLevel(propNewXPValue);
          animateXPBar(propStartXP, propNewXPValue, levelBefore, levelAfter);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [propAnimateXP, propNewXPValue, propStartXP, isAnimatingXP]);
  
  useEffect(() => {
    if (propAnimateStars && propNewStarsValue !== null && !isAnimatingStars) {
      const starsBefore = progress.stars || 0;
      animateStarsCounter(starsBefore, propNewStarsValue);
    }
  }, [propAnimateStars, propNewStarsValue]);

  /**
   * Anime les étoiles (machine à sous)
   */
  const animateStarsCounter = (starsBefore, starsAfter) => {
    console.log('[XPBar] Démarrage animation étoiles:', { starsBefore, starsAfter });
    
    // Nettoyer l'animation précédente
    if (starsAnimationTimeoutRef.current) {
      clearTimeout(starsAnimationTimeoutRef.current);
    }
    
    setIsAnimatingStars(true);
    setAnimatedStars(starsBefore);
    
    const difference = starsAfter - starsBefore;
    if (difference <= 0) {
      setAnimatedStars(starsAfter);
      setIsAnimatingStars(false);
      if (onStarsAnimationComplete) {
        onStarsAnimationComplete();
      }
      return;
    }
    
    const duration = Math.min(2000, Math.max(500, difference * 50));
    const steps = Math.min(30, difference);
    const stepSize = difference / steps;
    const stepDuration = duration / steps;
    
    let currentStep = 0;
    
    const animate = () => {
      if (currentStep >= steps) {
        setAnimatedStars(starsAfter);
        setIsAnimatingStars(false);
        if (onStarsAnimationComplete) {
          onStarsAnimationComplete();
            }
            return;
          }
          
      currentStep++;
      const currentValue = Math.floor(starsBefore + (stepSize * currentStep));
      setAnimatedStars(Math.min(currentValue, starsAfter));
      
      starsAnimationTimeoutRef.current = setTimeout(animate, stepDuration);
    };
    
    animate();
  };

  // Écouter les événements d'animation
  useEffect(() => {
    const handleXPAnimation = (data) => {
      console.log('[XPBar] Événement animation XP reçu:', data);
      animateXPBar(data.xpBefore, data.xpAfter, data.levelBefore, data.levelAfter);
    };
    
    const handleStarsAnimation = (data) => {
      console.log('[XPBar] Événement animation étoiles reçu:', data);
      animateStarsCounter(data.starsBefore, data.starsAfter);
    };
    
    progressionAnimationEmitter.on(PROGRESSION_EVENTS.ANIMATE_XP, handleXPAnimation);
    progressionAnimationEmitter.on(PROGRESSION_EVENTS.ANIMATE_STARS, handleStarsAnimation);
    
    return () => {
      progressionAnimationEmitter.off(PROGRESSION_EVENTS.ANIMATE_XP, handleXPAnimation);
      progressionAnimationEmitter.off(PROGRESSION_EVENTS.ANIMATE_STARS, handleStarsAnimation);
      // Nettoyer les timeouts
      if (xpAnimationTimeoutRef.current) clearTimeout(xpAnimationTimeoutRef.current);
      if (starsAnimationTimeoutRef.current) clearTimeout(starsAnimationTimeoutRef.current);
    };
  }, []);

  // Calculer les valeurs d'affichage
  // Si des props sont fournies, les utiliser en priorité
  // CRITICAL: Si animatedXP/animatedStars ont des valeurs > 0 mais que progress.currentXP/stars sont 0,
  // c'est probablement après une animation où les récompenses ne sont pas encore sauvegardées.
  // Dans ce cas, utiliser animatedXP/animatedStars pour l'affichage.
  const shouldUseAnimatedValues = (animatedXP > 0 && progress.currentXP === 0) || (animatedStars > 0 && progress.stars === 0);
  
  const displayXP = (propAnimateXP && propNewXPValue !== null)
    ? (isAnimatingXP ? animatedXP : propNewXPValue)
    : (isAnimatingXP || shouldUseAnimatedValues ? animatedXP : progress.currentXP);
  const displayLevel = (propAnimateXP && propNewXPValue !== null)
    ? (isAnimatingXP ? animatedLevel : calculateLevel(propNewXPValue))
    : (isAnimatingXP || shouldUseAnimatedValues ? animatedLevel : progress.currentLevel);
  const displayStars = (propAnimateStars && propNewStarsValue !== null)
    ? (isAnimatingStars ? animatedStars : propNewStarsValue)
    : (isAnimatingStars || shouldUseAnimatedValues ? animatedStars : progress.stars);
  const displayTotalXPForNextLevel = getTotalXPForLevel(displayLevel + 1);

  // Calculer la largeur de la barre
  // Toujours utiliser Animated pour la cohérence, mais initialiser avec la bonne valeur
  const barWidth = progressBarWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });
  
  // Initialiser la barre avec la valeur correcte si on anime via props
  useEffect(() => {
    if (propAnimateXP && propStartXP !== null && !animationInProgress.current && isAnimatingXP) {
      // CRITICAL: Ne réinitialiser que si l'animation n'a PAS encore commencé
      // Si isAnimatingXP est false, l'animation est terminée, ne pas réinitialiser
      const levelBefore = calculateLevel(propStartXP);
      const startPercent = getProgressPercent(propStartXP, levelBefore);
      const currentValue = progressBarWidth._value || 0;
      
      // Ne réinitialiser que si la valeur actuelle est très différente (évite de réinitialiser après animation)
      if (Math.abs(currentValue - startPercent) > 5) {
        progressBarWidth.setValue(startPercent);
      }
    } else if (!propAnimateXP && !isAnimatingXP && !animationInProgress.current) {
      // Seulement mettre à jour si on n'est pas en train d'animer
      // CRITICAL: Ne pas réinitialiser si la barre a déjà une valeur (après animation)
      const staticPercent = displayTotalXPForNextLevel > 0 ? (displayXP / displayTotalXPForNextLevel) * 100 : 0;
      const currentValue = progressBarWidth._value || 0;
      
      // CRITICAL: Si la barre a une valeur > 0 mais displayXP est 0, c'est probablement après une animation
      // où les récompenses ne sont pas encore sauvegardées. Ne pas réinitialiser.
      if (currentValue > 0 && displayXP === 0) {
        // Ne pas réinitialiser - la barre garde sa valeur animée
      } else if (Math.abs(currentValue - staticPercent) > 1) {
        progressBarWidth.setValue(Math.min(staticPercent, 100));
      }
    } else if (propAnimateXP && !isAnimatingXP && !animationInProgress.current) {
      // CRITICAL: Si propAnimateXP est true mais l'animation est terminée, NE RIEN FAIRE
      // La barre doit rester à sa valeur finale (déjà animée)
      // Ne rien faire - la barre reste à sa valeur finale
    }
  }, [propAnimateXP, propStartXP, displayXP, displayTotalXPForNextLevel, isAnimatingXP]);
  

  return (
    <View style={styles.container}>
      {/* Barre d'XP */}
      <View style={styles.xpBarContainer}>
        <View style={styles.levelProgressBarContainer}>
          <Animated.View style={styles.levelProgressBar}>
              <Animated.View
                style={[
                  styles.levelProgressFill,
                { width: barWidth }
                ]}
              >
                <LinearGradient
                  colors={['#FF7B2B', '#EC3912']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            <Text style={styles.levelProgressText}>
              {displayXP}/{displayTotalXPForNextLevel} XP
            </Text>
          </Animated.View>
          <Text style={styles.levelText}>
            Niveau {displayLevel}
          </Text>
        </View>
      </View>

      {/* Étoiles */}
      <View style={styles.progressionContainer}>
        <View style={styles.starsContainer}>
          <Image source={starIcon} style={styles.starIconImage} resizeMode="contain" />
            <Text style={styles.starsText}>
            {displayStars}
            </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingRight: 24,
  },
  xpBarContainer: {
    width: '100%',
    alignItems: 'flex-end',
  },
  levelProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  levelProgressBar: {
    width: 280,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 14,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  levelProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 14,
  },
  levelProgressText: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    fontWeight: '600',
    zIndex: 1,
  },
  levelText: {
    fontSize: 14,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  progressionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  starIconImage: {
    width: 28,
    height: 28,
  },
  starsText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
});
