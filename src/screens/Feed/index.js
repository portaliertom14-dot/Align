import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, Dimensions } from 'react-native';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import Button from '../../components/Button';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import { theme } from '../../styles/theme';
// wayMock — remplacé plus tard par wayAI (OpenAI)
import { 
  wayGenerateModuleMiniSimulationMetier, 
  wayGenerateModuleApprentissage, 
  wayGenerateModuleTestSecteur 
} from '../../services/wayMock';

// 🆕 SYSTÈMES V3
import { useMainAppProtection } from '../../hooks/useRouteProtection';
import { useQuestActivityTracking } from '../../lib/quests/useQuestTracking';
import { getAllModules, canStartModule } from '../../lib/modules';

// Dimensions de l'écran
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculs de dimensions responsive EXACTEMENT comme dans les images de référence
const RESPONSIVE = {
  // Ronds (modules circulaires) - BEAUCOUP plus grands
  circleSize: Math.min(SCREEN_WIDTH * 0.21, 280), // 21% largeur, max 280px
  circleSpacing: SCREEN_WIDTH * 0.045, // 4.5% largeur (plus serré)
  circleTopPosition: SCREEN_HEIGHT * 0.38, // 38% hauteur (plus haut)
  
  // Icônes dans les ronds (50% du diamètre du rond pour être plus visibles)
  iconSize: Math.min(SCREEN_WIDTH * 0.21, 280) * 0.50,
  
  // Bloc "SIMULATION MÉTIER"
  buttonWidth: SCREEN_WIDTH * 0.32, // 32% largeur
  buttonHeight: SCREEN_HEIGHT * 0.07, // 7% hauteur
  buttonBorderRadius: SCREEN_HEIGHT * 0.035, // 3.5% hauteur
  buttonTopMargin: SCREEN_HEIGHT * 0.08, // 8% hauteur (espacement avec ronds)
  
  // Texte du bouton
  buttonTitleSize: SCREEN_WIDTH * 0.016, // 1.6% largeur
  buttonSubtitleSize: SCREEN_WIDTH * 0.011, // 1.1% largeur
  buttonPaddingVertical: SCREEN_HEIGHT * 0.015, // 1.5% hauteur
  buttonPaddingHorizontal: SCREEN_WIDTH * 0.025, // 2.5% largeur
};

// Ajustements design & UX — accueil, quêtes, profil
// Logos personnalisés pour les modules (facilite le remplacement manuel)
const bookLogo = require('../../../assets/images/modules/book.png');
const lightbulbLogo = require('../../../assets/images/modules/lightbulb.png');
const briefcaseLogo = require('../../../assets/images/modules/briefcase.png');

// Image star-gear pour le header
const starGearImage = require('../../../assets/images/star-gear.png');

/**
 * Écran d'accueil Align
 * Affiche la progression dynamique (étoiles, XP, niveau)
 * et les options principales
 */
export default function FeedScreen() {
  const navigation = useNavigation();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingModule, setGeneratingModule] = useState(null);
  const [modulesRefreshKey, setModulesRefreshKey] = useState(0);

  // 🆕 SYSTÈME AUTH/REDIRECTION V1 - Protection de la route
  const { isChecking: isCheckingProtection, isAllowed } = useMainAppProtection();

  // 🆕 SYSTÈME DE QUÊTES V3 - Tracking activité
  const { startTracking, stopTracking } = useQuestActivityTracking();

  useEffect(() => {
    // Démarrer le tracking d'activité
    startTracking();
    
    // Nettoyer au démontage
    return () => {
      stopTracking();
    };
  }, []);

  useEffect(() => {
    loadProgress();
    // Recharger la progression quand l'écran est focus
    const unsubscribe = navigation.addListener('focus', loadProgress);
    return unsubscribe;
  }, [navigation]);

  // 🆕 Forcer le rechargement des modules quand l'écran est focus
  useFocusEffect(
    React.useCallback(() => {
      setModulesRefreshKey(prev => prev + 1);
    }, [])
  );

  const loadProgress = async () => {
    try {
      // CRITIQUE: Forcer le refresh pour avoir les dernières valeurs après une complétion
      const userProgress = await getUserProgress(true);
      
      // Calculer le niveau à partir de l'XP
      const currentXP = userProgress.currentXP || 0;
      const currentLevel = calculateLevel(currentXP);
      const xpForNextLevel = getXPNeededForNextLevel(currentXP);
      
      // Récupérer les étoiles (si elles existent, sinon 0)
      const stars = userProgress.totalStars || 0;

      setProgress({
        ...userProgress,
        currentLevel,
        xpForNextLevel,
        stars,
        currentXP,
        activeModule: userProgress.activeModule || 'mini_simulation_metier',
        currentChapter: userProgress.currentChapter || 1,
        currentLesson: userProgress.currentLesson || 1,
      });
    } catch (error) {
      console.error('Erreur lors du chargement de la progression:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 SYSTÈME DE MODULES V1 - Récupérer les modules avec leurs états
  // Le modulesRefreshKey force le rechargement quand l'écran est focus
  const modules = getAllModules();
  
  // Vérifier quels modules sont débloqués (legacy, pour compatibilité)
  const getModuleStatus = () => {
    if (!progress) return { module1: true, module2: false, module3: false };
    
    // 🆕 Utiliser le système de modules V1
    return {
      module1: canStartModule(1),
      module2: canStartModule(2),
      module3: canStartModule(3),
    };
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleStartModule = async (moduleType) => {
    try {
      setGeneratingModule(moduleType);
      
      const progress = await getUserProgress();
      // Secteurs autorisés dans wayMock : tech, business, creation, droit, sante
      // Fallback sur 'tech' si aucun secteur n'est déterminé
      const secteurId = progress.activeDirection || 'tech';
      const metierId = progress.activeMetier || null;
      
      let module;
      
      switch (moduleType) {
        case 'mini_simulation_metier':
          if (!metierId) {
            alert('Aucun métier déterminé. Complète d\'abord les quiz.');
            return;
          }
          module = await wayGenerateModuleMiniSimulationMetier(secteurId, metierId, progress.currentLevel || 1);
          break;
        case 'apprentissage_mindset':
          module = await wayGenerateModuleApprentissage(secteurId, metierId, progress.currentLevel || 1);
          break;
        case 'test_secteur':
          module = await wayGenerateModuleTestSecteur(secteurId, progress.currentLevel || 1);
          break;
        default:
          return;
      }

      if (module) {
        // Mettre à jour le module actif dans la progression
        const { updateUserProgress } = require('../../lib/userProgress');
        await updateUserProgress({ activeModule: moduleType });
        navigation.navigate('Module', { module });
      }
    } catch (error) {
      console.error('Erreur lors de la génération du module:', error);
      alert(`Erreur lors de la génération du module: ${error.message}`);
    } finally {
      setGeneratingModule(null);
    }
  };

  // 🆕 SYSTÈME AUTH/REDIRECTION V1 - Vérification de la protection
  if (isCheckingProtection) {
    return (
      <LinearGradient
        colors={['#1A1B23', '#1A1B23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Vérification...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Si accès refusé, ne rien afficher (redirection en cours)
  if (!isAllowed) {
    return null;
  }

  // UX finalisée — prête pour branchement IA ultérieur
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

  return (
    <LinearGradient
      colors={['#1A1B23', '#1A1B23']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Header avec settings et "ALIGN" (sans star-gear) */}
      <Header showSettings={true} onSettingsPress={handleSettings} />
      
      {/* XP Bar */}
      <XPBar />

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Types de Modules - Affichage en ronds avec déblocage progressif */}
        <View style={styles.modulesContainer}>
          {/* Module 1 : Mini-Simulations - VERT BRILLANT */}
          <HoverableTouchableOpacity 
            style={[
              styles.moduleCircle,
              !canStartModule(1) && styles.moduleCircleLocked
            ]}
            onPress={() => handleStartModule('mini_simulation_metier')}
            disabled={!canStartModule(1) || generatingModule === 'mini_simulation_metier'}
            activeOpacity={0.8}
            variant="button"
          >
            <LinearGradient 
              colors={['#00FF41', '#19602B']} 
              start={{ x: 0.5, y: 0.5 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.moduleCircleGradient}
            >
              <Image source={bookLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
              {!canStartModule(1) && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </LinearGradient>
          </HoverableTouchableOpacity>

          {/* Module 2 : Apprentissage - ORANGE/JAUNE */}
          <HoverableTouchableOpacity 
            style={[
              styles.moduleCircle,
              !canStartModule(2) && styles.moduleCircleLocked
            ]}
            onPress={() => handleStartModule('apprentissage_mindset')}
            disabled={!canStartModule(2) || generatingModule === 'apprentissage_mindset'}
            activeOpacity={0.8}
            variant="button"
          >
            <LinearGradient 
              colors={['#FF7B2B', '#FFD93F']} 
              start={{ x: 0.5, y: 0.5 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.moduleCircleGradient}
            >
              <Image source={lightbulbLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
              {!canStartModule(2) && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </LinearGradient>
          </HoverableTouchableOpacity>

          {/* Module 3 : Test de Secteur - BLEU CYAN */}
          <HoverableTouchableOpacity 
            style={[
              styles.moduleCircle,
              !canStartModule(3) && styles.moduleCircleLocked
            ]}
            onPress={() => handleStartModule('test_secteur')}
            disabled={!canStartModule(3) || generatingModule === 'test_secteur'}
            activeOpacity={0.8}
            variant="button"
          >
            <LinearGradient 
              colors={['#00AAFF', '#00EEFF']} 
              start={{ x: 0.5, y: 0.5 }} 
              end={{ x: 1, y: 1 }} 
              style={styles.moduleCircleGradient}
            >
              <Image source={briefcaseLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
              {!canStartModule(3) && (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </LinearGradient>
          </HoverableTouchableOpacity>
        </View>

        {/* Bloc rectangulaire sous les ronds - Titre/Sous-titre dynamiques */}
        {(() => {
            const moduleStatus = getModuleStatus();
          const activeModule = progress?.activeModule || 'mini_simulation_metier';
          const currentChapter = progress?.currentChapter || 1;
          const currentLesson = progress?.currentLesson || 1;
          
          let moduleTitle = '';
          let moduleColors = ['#FF7F00', '#FF4500']; // Orange saturé comme dans les images
          
          if (activeModule === 'mini_simulation_metier') {
            moduleTitle = 'SIMULATION MÉTIER';
            moduleColors = ['#FF7F00', '#FF4500']; // Orange vers rouge-orange
          } else if (activeModule === 'apprentissage_mindset') {
            moduleTitle = 'APPRENTISSAGE';
            moduleColors = ['#FF7F00', '#FF4500'];
          } else if (activeModule === 'test_secteur') {
            moduleTitle = 'TEST DE SECTEUR';
            moduleColors = ['#FF7F00', '#FF4500'];
          }
            
            return (
            <View style={styles.moduleInfoBlock}>
                <LinearGradient
                colors={moduleColors}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                  style={styles.moduleInfoGradient}
                >
                      <Text style={styles.moduleInfoTitle}>{moduleTitle}</Text>
                      <Text style={styles.moduleInfoSubtitle}>
                  CHAPITRE {currentChapter} · Identifier ses centres d'intérêt
                      </Text>
              </LinearGradient>
                  </View>
          );
        })()}
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
    paddingTop: 0, // Pas de padding top
    paddingBottom: 100, // Espace pour la barre de navigation
    paddingHorizontal: 0, // Centrage géré par les éléments
    alignItems: 'center',
  },
  modulesContainer: {
    marginTop: SCREEN_HEIGHT * 0.05, // Monté de 150px (environ 20% -> 5%)
    marginBottom: RESPONSIVE.buttonTopMargin, // Espacement avec le bouton
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: RESPONSIVE.circleSpacing, // Espacement entre ronds
  },
  moduleCircle: {
    width: RESPONSIVE.circleSize,
    height: RESPONSIVE.circleSize,
    borderRadius: RESPONSIVE.circleSize / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  moduleCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleCircleLogo: {
    width: RESPONSIVE.iconSize,
    height: RESPONSIVE.iconSize,
  },
  moduleCircleLocked: {
    opacity: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  lockIcon: {
    fontSize: 48,
  },
  moduleInfoBlock: {
    width: RESPONSIVE.buttonWidth,
    height: RESPONSIVE.buttonHeight,
    borderRadius: 10, // Angles beaucoup moins arrondis (10px au lieu de 3.5% hauteur)
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  moduleInfoGradient: {
    width: '100%',
    height: '100%',
    paddingVertical: RESPONSIVE.buttonPaddingVertical,
    paddingHorizontal: RESPONSIVE.buttonPaddingHorizontal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleInfoTitle: {
    fontSize: RESPONSIVE.buttonTitleSize * 1.1, // Légèrement plus grand
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1.2,
    marginBottom: RESPONSIVE.buttonHeight * 0.1,
  },
  moduleInfoSubtitle: {
    fontSize: RESPONSIVE.buttonSubtitleSize * 1.05, // Légèrement plus grand
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
});
