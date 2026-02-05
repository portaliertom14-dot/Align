/**
 * Écran de Completion d'une Quête
 * Affiche les récompenses obtenues après complétion de quêtes
 * Design exact correspondant à l'image de référence
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Image, BackHandler, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { addXP, addStars, getUserProgress, invalidateProgressCache } from '../../lib/userProgressSupabase';
import { getUserProfile } from '../../lib/userProfile';
import { theme } from '../../styles/theme';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import GradientText from '../../components/GradientText';
import Button from '../../components/Button';
import { getCompletedQuestsInSession, clearCompletedQuestsInSession } from '../../lib/quests/questEngineUnified';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import des icônes
const starIcon = require('../../../assets/icons/star.png');
const xpIcon = require('../../../assets/icons/xp.png');

export default function QuestCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
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
          
          // Ajouter les récompenses en base de données (après un court délai)
          setTimeout(async () => {
            if (totalXP > 0) {
              await addXP(totalXP);
              console.log('[QuestCompletion] ✅ XP ajouté:', totalXP);
            }
            if (totalStars > 0) {
              await addStars(totalStars);
              console.log('[QuestCompletion] ✅ Étoiles ajoutées:', totalStars);
            }
            
            // CRITICAL: Invalider le cache pour forcer le rechargement des données dans Feed
            invalidateProgressCache();
            console.log('[QuestCompletion] ✅ Cache invalidé pour forcer le rechargement');
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
    if (route.params?.showFlameScreen) {
      navigation.navigate('FlameScreen');
    } else {
      navigation.navigate('Main', { screen: 'Feed' });
    }
  };

  // Si aucune quête, ne rien afficher
  if (completedQuests.length === 0) {
    return null;
  }

  const questCount = completedQuests.length;
  // Convertir le nombre en texte français
  const questCountText = questCount === 1 
    ? 'UNE QUÊTE' 
    : questCount === 2 
    ? 'DEUX QUÊTES'
    : questCount === 3
    ? 'TROIS QUÊTES'
    : `${questCount} QUÊTES`;

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']} // Fond unifié Align
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
          console.log('[QuestCompletion] ✅ Animation XP terminée');
        }}
        onStarsAnimationComplete={() => {
          console.log('[QuestCompletion] ✅ Animation étoiles terminée');
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
          TU AS TERMINÉ {questCountText}
        </Text>

        {/* Liste des quêtes complétées */}
        <View style={styles.questsList}>
          {completedQuests.map((q, index) => (
            <View key={q.id || index} style={styles.questItem}>
              <Text style={styles.questTitle}>{q.title}</Text>
              {/* Barre de progression orange remplie */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Text style={styles.progressText}>
                    {q.target} / {q.target}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Récompenses */}
        <View style={styles.rewardsContainer}>
          {/* XP */}
          <View style={styles.rewardItem}>
            <Image source={xpIcon} style={styles.rewardIconXP} />
            <GradientText 
              colors={['#FE942C', '#FE6824']}
              style={styles.rewardValue}
            >
              {totalXP}
            </GradientText>
          </View>

          {/* Étoiles */}
          <View style={styles.rewardItem}>
            <Image source={starIcon} style={styles.rewardIconStar} />
            <GradientText 
              colors={['#FFD93F', '#FF7B2B']}
              style={styles.rewardValue}
            >
              {totalStars}
            </GradientText>
          </View>
        </View>

        {/* Bouton CONTINUER */}
        <View style={styles.buttonContainer}>
          <Button
            title="CONTINUER"
            onPress={handleContinue}
            style={styles.continueButton}
          />
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
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  questsList: {
    width: '100%',
    marginBottom: 40,
    gap: 24,
    alignItems: 'center',
  },
  questItem: {
    width: SCREEN_WIDTH * 0.75, // Réduire la largeur pour être moins large que le bouton (0.85)
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
  rewardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 80,
    marginBottom: 70,
  },
  rewardItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIconXP: {
    width: 177, // Même taille que ModuleCompletion
    height: 177,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  rewardIconStar: {
    width: 160, // Même taille que ModuleCompletion
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
    marginTop: 60, // Descendre le bouton plus bas
  },
  continueButton: {
    width: SCREEN_WIDTH * 0.85,
  },
});
