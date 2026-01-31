import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Image, Dimensions, TouchableOpacity, Modal } from 'react-native';
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
import { getAllModules, canStartModule, isModuleSystemReady, initializeModules } from '../../lib/modules';

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
  const [modulesReady, setModulesReady] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // 🆕 SYSTÈME AUTH/REDIRECTION V1 - Protection de la route
  const { isChecking: isCheckingProtection, isAllowed } = useMainAppProtection();

  // 🆕 SYSTÈME DE QUÊTES V3 - Tracking activité
  const { startTracking, stopTracking } = useQuestActivityTracking();

  // 🆕 CRITICAL: Vérifier et initialiser le système de modules si nécessaire
  useEffect(() => {
    const ensureModulesReady = async () => {
      if (!isModuleSystemReady()) {
        console.log('[FeedScreen] ModuleSystem non prêt, tentative d\'initialisation...');
        try {
          await initializeModules();
          console.log('[FeedScreen] ✅ ModuleSystem initialisé avec succès');
          setModulesReady(true);
        } catch (error) {
          console.warn('[FeedScreen] ⚠️ Erreur init ModuleSystem (non bloquant):', error.message);
          // Continuer quand même, modules sera un tableau vide
          setModulesReady(true);
        }
      } else {
        setModulesReady(true);
      }
    };
    
    ensureModulesReady();
  }, []);

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
      // Re-vérifier si modules prêts
      if (!isModuleSystemReady()) {
        initializeModules().then(() => setModulesReady(true)).catch(() => {});
      }
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

      // Log du module courant pour debug
      const currentModuleIndex = userProgress.currentModuleIndex ?? 0;
      const currentModuleNumber = currentModuleIndex + 1; // Convertir 0-2 → 1-3
      console.log('[Feed] Module courant:', currentModuleNumber, '(index:', currentModuleIndex, ')');
      console.log('[Feed] États modules:', {
        module1: canStartModule(1),
        module2: canStartModule(2),
        module3: canStartModule(3),
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

  // Obtenir le module courant (1, 2, ou 3)
  const getCurrentModuleNumber = () => {
    if (!progress) return 1;
    const currentModuleIndex = progress.currentModuleIndex ?? 0;
    return currentModuleIndex + 1; // Convertir 0-2 → 1-3
  };

  // Obtenir les couleurs du module courant pour le dropdown
  const getCurrentModuleColors = () => {
    const moduleNumber = getCurrentModuleNumber();
    switch (moduleNumber) {
      case 1:
        return ['#00FF41', '#19602B']; // Vert (Module 1)
      case 2:
        return ['#FF7B2B', '#FFD93F']; // Orange/Jaune (Module 2)
      case 3:
        return ['#00AAFF', '#00EEFF']; // Bleu Cyan (Module 3)
      default:
        return ['#FF7F00', '#FF4500']; // Orange par défaut
    }
  };

  // Obtenir le nom du module courant
  const getCurrentModuleName = () => {
    const moduleNumber = getCurrentModuleNumber();
    switch (moduleNumber) {
      case 1:
        return 'SIMULATION MÉTIER';
      case 2:
        return 'APPRENTISSAGE';
      case 3:
        return 'TEST DE SECTEUR';
      default:
        return 'MODULE';
    }
  };

  // Navigation vers un module spécifique
  const handleNavigateToModule = async (moduleNumber) => {
    const moduleStatus = getModuleStatus();
    const moduleKey = `module${moduleNumber}`;
    
    if (!moduleStatus[moduleKey]) {
      alert(`Le module ${moduleNumber} est verrouillé. Complète d'abord le module précédent.`);
      setDropdownVisible(false);
      return;
    }

    let moduleType;
    switch (moduleNumber) {
      case 1:
        moduleType = 'mini_simulation_metier';
        break;
      case 2:
        moduleType = 'apprentissage_mindset';
        break;
      case 3:
        moduleType = 'test_secteur';
        break;
      default:
        return;
    }

    setDropdownVisible(false);
    await handleStartModule(moduleType);
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

        {/* Dropdown de navigation sous les ronds - Permet de naviguer entre modules 1/2/3 */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDropdownVisible(!dropdownVisible)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={getCurrentModuleColors()}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.dropdownGradient}
            >
              <Text style={styles.dropdownButtonText}>
                MODULE {getCurrentModuleNumber()} · {getCurrentModuleName()}
              </Text>
              <Text style={styles.dropdownArrow}>{dropdownVisible ? '▲' : '▼'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Menu déroulant */}
          <Modal
            visible={dropdownVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setDropdownVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setDropdownVisible(false)}
            >
              <View style={styles.dropdownMenu}>
                {[1, 2, 3].map((moduleNumber) => {
                  const moduleStatus = getModuleStatus();
                  const moduleKey = `module${moduleNumber}`;
                  const isLocked = !moduleStatus[moduleKey];
                  const isCurrent = moduleNumber === getCurrentModuleNumber();
                  
                  // Couleurs selon le module
                  let moduleColors = ['#00FF41', '#19602B']; // Vert par défaut
                  let moduleName = 'SIMULATION MÉTIER';
                  if (moduleNumber === 2) {
                    moduleColors = ['#FF7B2B', '#FFD93F'];
                    moduleName = 'APPRENTISSAGE';
                  } else if (moduleNumber === 3) {
                    moduleColors = ['#00AAFF', '#00EEFF'];
                    moduleName = 'TEST DE SECTEUR';
                  }

                  return (
                    <TouchableOpacity
                      key={moduleNumber}
                      style={[
                        styles.dropdownMenuItem,
                        isCurrent && styles.dropdownMenuItemCurrent,
                        isLocked && styles.dropdownMenuItemLocked
                      ]}
                      onPress={() => handleNavigateToModule(moduleNumber)}
                      disabled={isLocked}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={isLocked ? ['#666', '#444'] : moduleColors}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.dropdownMenuItemGradient}
                      >
                        <Text style={styles.dropdownMenuItemText}>
                          MODULE {moduleNumber} · {moduleName}
                          {isLocked ? ' 🔒' : ''}
                          {isCurrent ? ' ✓' : ''}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
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
  // Styles pour le dropdown de navigation
  dropdownContainer: {
    width: RESPONSIVE.buttonWidth,
    marginTop: RESPONSIVE.buttonTopMargin,
    marginBottom: 20,
  },
  dropdownButton: {
    width: '100%',
    height: RESPONSIVE.buttonHeight,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dropdownGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RESPONSIVE.buttonPaddingHorizontal,
    paddingVertical: RESPONSIVE.buttonPaddingVertical,
  },
  dropdownButtonText: {
    fontSize: RESPONSIVE.buttonTitleSize * 1.1,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: RESPONSIVE.buttonWidth,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownMenuItem: {
    width: '100%',
    height: RESPONSIVE.buttonHeight * 0.9,
    marginBottom: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dropdownMenuItemCurrent: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  dropdownMenuItemLocked: {
    opacity: 0.6,
  },
  dropdownMenuItemGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RESPONSIVE.buttonPaddingHorizontal,
    paddingVertical: RESPONSIVE.buttonPaddingVertical * 0.8,
  },
  dropdownMenuItemText: {
    fontSize: RESPONSIVE.buttonTitleSize,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
