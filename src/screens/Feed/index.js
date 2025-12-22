import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import Button from '../../components/Button';
import BottomNavBar from '../../components/BottomNavBar';
import { theme } from '../../styles/theme';
// wayMock — remplacé plus tard par wayAI (OpenAI)
import { 
  wayGenerateModuleMiniSimulationMetier, 
  wayGenerateModuleApprentissage, 
  wayGenerateModuleTestSecteur 
} from '../../services/wayMock';

// Ajustements design & UX — accueil, quêtes, profil
// Logos personnalisés pour les modules (facilite le remplacement manuel)
const brainLogo = require('../../../assets/images/modules/brain.png');
const lightningLogo = require('../../../assets/images/modules/lightning.png');
const compassLogo = require('../../../assets/images/modules/compass.png');

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

  useEffect(() => {
    loadProgress();
    // Recharger la progression quand l'écran est focus
    const unsubscribe = navigation.addListener('focus', loadProgress);
    return unsubscribe;
  }, [navigation]);

  const loadProgress = async () => {
    try {
      const userProgress = await getUserProgress();
      
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

  // Vérifier quels modules sont débloqués
  // UX finalisée — prête pour branchement IA ultérieur
  const getModuleStatus = () => {
    if (!progress) return { module1: true, module2: false, module3: false };
    const completedModules = progress.completedModules || [];
    return {
      module1: true, // Module 1 toujours disponible
      module2: completedModules.includes('mini_simulation_metier'), // Module 2 débloqué si Module 1 complété
      module3: completedModules.includes('apprentissage_mindset'), // Module 3 débloqué si Module 2 complété
    };
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleStartModule = async (moduleType) => {
    try {
      setGeneratingModule(moduleType);
      
      const progress = await getUserProgress();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:74',message:'BEFORE module generation',data:{moduleType,activeDirection:progress.activeDirection,activeDirectionType:typeof progress.activeDirection,activeMetier:progress.activeMetier,usingFallback:!progress.activeDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      // Secteurs autorisés dans wayMock : tech, business, creation, droit, sante
      // Fallback sur 'tech' si aucun secteur n'est déterminé
      const secteurId = progress.activeDirection || 'tech';
      const metierId = progress.activeMetier || null;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:81',message:'AFTER secteur/metier extraction',data:{secteurId,metierId,willUseFallback:!progress.activeDirection},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      let module;
      
      switch (moduleType) {
        case 'mini_simulation_metier':
          if (!metierId) {
            alert('Aucun métier déterminé. Complète d\'abord les quiz.');
            return;
          }
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:86',message:'BEFORE wayGenerateModuleMiniSimulationMetier',data:{secteurId,metierId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          module = await wayGenerateModuleMiniSimulationMetier(secteurId, metierId, progress.currentLevel || 1);
          break;
        case 'apprentissage_mindset':
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:89',message:'BEFORE wayGenerateModuleApprentissage',data:{secteurId,metierId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          module = await wayGenerateModuleApprentissage(secteurId, metierId, progress.currentLevel || 1);
          break;
        case 'test_secteur':
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:92',message:'BEFORE wayGenerateModuleTestSecteur',data:{secteurId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
          // #endregion
          module = await wayGenerateModuleTestSecteur(secteurId, progress.currentLevel || 1);
          break;
        default:
          return;
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:98',message:'AFTER module generation',data:{moduleType,moduleItemsCount:module?.items?.length,firstItemHasOptions:!!module?.items?.[0]?.options,firstItemOptionsCount:module?.items?.[0]?.options?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion

      if (module) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:115',message:'BEFORE navigation to Module',data:{moduleType:module.type,moduleSecteur:module.secteur,moduleMetier:module.métier,itemsCount:module.items.length,firstItemQuestion:module.items[0]?.question?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H4'})}).catch(()=>{});
        // #endregion
        // Mettre à jour le module actif dans la progression
        const { updateUserProgress } = require('../../lib/userProgress');
        await updateUserProgress({ activeModule: moduleType });
        navigation.navigate('Module', { module });
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c3486511-bd0d-40ae-abb5-cf26cf10d8a1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Feed/index.js:118',message:'ERROR in handleStartModule',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,300),moduleType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'API_CALL'})}).catch(()=>{});
      // #endregion
      console.error('Erreur lors de la génération du module:', error);
      alert(`Erreur lors de la génération du module: ${error.message}`);
    } finally {
      setGeneratingModule(null);
    }
  };

  // UX finalisée — prête pour branchement IA ultérieur
  if (loading || !progress) {
    return (
      <LinearGradient
        colors={theme.colors.gradient.align}
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
      colors={theme.colors.gradient.align}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        {/* Bouton paramètres */}
        <TouchableOpacity
          onPress={handleSettings}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>

        {/* Titre ALIGN */}
        <Text style={styles.headerTitle}>ALIGN</Text>

        {/* Barre d'XP - Centrée au milieu de l'écran, en dessous de "ALIGN" */}
        <View style={styles.xpBarContainer}>
          <View style={styles.levelProgressBarContainer}>
            <View style={styles.levelProgressBar}>
              <LinearGradient
                colors={['#34C659', '#00AAFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.levelProgressFill,
                  { width: `${((progress.currentXP % 100) / 100) * 100}%` }
                ]}
              />
              <Text style={styles.levelProgressText}>
                {progress.currentXP}/{progress.xpForNextLevel} XP
              </Text>
            </View>
            <Text style={styles.levelText}>
              Niveau {progress.currentLevel}
            </Text>
          </View>
        </View>

        {/* Progression - Étoiles */}
        <View style={styles.progressionContainer}>
          <View style={styles.starsContainer}>
            <Text style={styles.starsText}>
              ⭐ {progress.stars}
            </Text>
          </View>
        </View>
      </View>

      {/* Contenu principal */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* 3 Types de Modules - Affichage en ronds */}
        <View style={styles.modulesContainer}>
          {(() => {
            const moduleStatus = getModuleStatus();
            
            return (
              <>
                {/* Module 1 : Mini-Simulations Métier - Cerveau */}
                <TouchableOpacity 
                  style={styles.moduleCircle}
                  onPress={() => handleStartModule('mini_simulation_metier')}
                  disabled={generatingModule === 'mini_simulation_metier'}
                  activeOpacity={0.8}
                >
                  <LinearGradient 
                    colors={['#FF7B2B', '#FF842D', '#FFD93F']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.moduleCircleGradient}
                  >
                    <Image source={brainLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
                    <Text style={styles.moduleCircleTitle}>Mini-Simulations</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Module 2 : Apprentissage & Mindset - Éclair */}
                <TouchableOpacity 
                  style={[styles.moduleCircle, !moduleStatus.module2 && styles.moduleCircleLocked]}
                  onPress={() => moduleStatus.module2 && handleStartModule('apprentissage_mindset')}
                  disabled={!moduleStatus.module2 || generatingModule === 'apprentissage_mindset'}
                  activeOpacity={moduleStatus.module2 ? 0.8 : 1}
                >
                  {moduleStatus.module2 ? (
                    <LinearGradient 
                      colors={['#34C659', '#00AAFF']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={styles.moduleCircleGradient}
                    >
                      <Image source={lightningLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
                      <Text style={styles.moduleCircleTitle}>Apprentissage</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.moduleCircleLockedView}>
                      <Text style={styles.moduleCircleLockIcon}>🔒</Text>
                      <Text style={styles.moduleCircleTitle}>Apprentissage</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Module 3 : Test de Secteur - Boussole */}
                <TouchableOpacity 
                  style={[styles.moduleCircle, !moduleStatus.module3 && styles.moduleCircleLocked]}
                  onPress={() => moduleStatus.module3 && handleStartModule('test_secteur')}
                  disabled={!moduleStatus.module3 || generatingModule === 'test_secteur'}
                  activeOpacity={moduleStatus.module3 ? 0.8 : 1}
                >
                  {moduleStatus.module3 ? (
                    <LinearGradient 
                      colors={theme.colors.gradient.align} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={styles.moduleCircleGradient}
                    >
                      <Image source={compassLogo} style={styles.moduleCircleLogo} resizeMode="contain" />
                      <Text style={styles.moduleCircleTitle}>Test Secteur</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.moduleCircleLockedView}>
                      <Text style={styles.moduleCircleLockIcon}>🔒</Text>
                      <Text style={styles.moduleCircleTitle}>Test Secteur</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </>
            );
          })()}
        </View>

        {/* Bloc rectangulaire sous les ronds - Titre/Sous-titre dynamiques */}
        {(() => {
          const moduleStatus = getModuleStatus();
          const activeModule = progress?.activeModule || 'mini_simulation_metier';
          const currentChapter = progress?.currentChapter || 1;
          const currentLesson = progress?.currentLesson || 1;
          
          let moduleTitle = '';
          let moduleColors = ['#FF7B2B', '#FF842D', '#FFD93F'];
          
          if (activeModule === 'mini_simulation_metier') {
            moduleTitle = 'SIMULATION MÉTIER';
            moduleColors = ['#FF7B2B', '#FF842D', '#FFD93F'];
          } else if (activeModule === 'apprentissage_mindset') {
            moduleTitle = 'APPRENTISSAGE';
            moduleColors = ['#34C659', '#00AAFF'];
          } else if (activeModule === 'test_secteur') {
            moduleTitle = 'TEST DE SECTEUR';
            moduleColors = theme.colors.gradient.align;
          }
          
          return (
            <View style={styles.moduleInfoBlock}>
              <LinearGradient
                colors={moduleColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleInfoGradient}
              >
                <Text style={styles.moduleInfoTitle}>{moduleTitle}</Text>
                <Text style={styles.moduleInfoSubtitle}>
                  CHAPITRE {currentChapter}, LEÇON {currentLesson}
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
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: theme.fonts.title,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 24,
  },
  xpBarContainer: {
    width: '100%',
    alignItems: 'center', // Centre la barre d'XP au milieu de l'écran
    marginTop: 16,
    marginBottom: 16,
  },
  progressionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  starsContainer: {
    alignItems: 'center',
  },
  starsText: {
    fontSize: 18,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
  },
  levelProgressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  levelProgressBar: {
    width: 280, // Largeur fixe pour une bonne visibilité au centre de l'écran
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
    paddingTop: 40,
    paddingBottom: 100, // Espace pour la barre de navigation
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  modulesContainer: {
    marginTop: 32,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center', // Centrés horizontalement à la moitié de l'écran
    alignItems: 'center',
    gap: 32, // Espacés d'au moins 2cm visuels (32px ≈ 2cm sur mobile)
  },
  moduleCircle: {
    width: 180, // Éléments les PLUS GROS de la page (environ 3-4cm visuels)
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  moduleCircleLocked: {
    opacity: 0.5,
  },
  moduleCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  moduleCircleLockedView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(128, 128, 128, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  moduleCircleLogo: {
    width: 100, // Logo très visible, proportionnellement grand
    height: 100,
    marginBottom: 8,
  },
  moduleCircleLockIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  moduleCircleTitle: {
    fontSize: 12,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  moduleInfoBlock: {
    marginTop: 24,
    marginBottom: 32,
    marginHorizontal: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  moduleInfoGradient: {
    padding: 20,
    alignItems: 'center',
  },
  moduleInfoTitle: {
    fontSize: 20,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  moduleInfoSubtitle: {
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    gap: 20,
  },
  iconTouchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconCircleLeft: {
    // Boussole - opacité 50%
  },
  iconCircleCenter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    // Légèrement plus grand pour le focus visuel
  },
  iconCircleRight: {
    // Cerveau - opacité 50%
  },
  iconImage: {
    width: '80%',
    height: '80%',
  },
  simulationButton: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF7B2B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  simulationButtonGradient: {
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  simulationButtonText: {
    fontSize: 24,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  simulationButtonSubtext: {
    fontSize: 16,
    fontFamily: theme.fonts.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
