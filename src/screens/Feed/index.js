import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Image, Dimensions, TouchableOpacity, Modal, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { getUserProgress } from '../../lib/userProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import Button from '../../components/Button';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import GuidedTourOverlay from '../../components/GuidedTourOverlay';
import { theme } from '../../styles/theme';
import { getAuthState } from '../../services/authState';

// DEBUG: Forcer l'affichage du tuto pour validation. Remettre à false après correction.
const FORCE_TUTORIAL = false;

// Flag persistant : tutoriel Home affiché une seule fois par utilisateur (jamais reset par module/progression).
const HOME_TUTORIAL_SEEN_KEY = (userId) => `@align_home_tutorial_seen_${userId || 'anonymous'}`;

/*
 * REPRODUCTION STEPS — Tutoriel Home (1 seule fois)
 * Voir REPRODUCTION_STEPS_TUTORIAL.md à la racine pour le détail.
 * Scénario A (nouveau) : signup → onboarding → Home → tutoriel s'affiche ; module → fin → Home → tutoriel ne se relance pas.
 * Scénario B (existant) : relance app / reconnexion → Home → tutoriel ne s'affiche pas.
 * En console : [HomeTutorial] gate check + DECISION pour diagnostiquer.
 */

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
import { getChapterById, getCurrentLesson } from '../../data/chapters';

// Dimensions de l'écran
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensions des ronds : 1 et 3 (+50px), 2 légèrement plus grand que 1/3
const BASE_SIDE = (Math.min(SCREEN_WIDTH * 0.2, 160) + 100) / 2;
const RESPONSIVE = {
  // Ronds 1 et 3 : taille de base + 50px
  circleSizeSide: BASE_SIDE + 50,
  // Rond 2 : légèrement plus grand que 1 et 3 (différence visible mais subtile)
  circleSizeMiddle: BASE_SIDE + 50 + 28,
  circleSpacing: SCREEN_WIDTH * 0.03,
  modulesRowMarginTop: -150,

  // Icônes (50% du diamètre de chaque rond)
  iconSizeSide: (BASE_SIDE + 50) * 0.5,
  iconSizeMiddle: (BASE_SIDE + 50 + 28) * 0.5,

  // Bloc SIMULATION (pill/capsule) — largeur, hauteur, padding généreux
  buttonWidth: Math.min(SCREEN_WIDTH * 0.85, 380),
  buttonHeight: Math.min(SCREEN_HEIGHT * 0.11, 72),
  buttonBorderRadius: 20,
  buttonTopMargin: Math.min(SCREEN_HEIGHT * 0.03, 20),
  buttonPaddingVertical: 18,
  buttonPaddingHorizontal: 24,

  // Texte bloc : ligne 1 (titre) plus grande, ligne 2 (sous-titre) plus petite
  buttonTitleSize: Math.min(SCREEN_WIDTH * 0.045, 22),
  buttonSubtitleSize: Math.min(SCREEN_WIDTH * 0.032, 16),
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
  const route = useRoute();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingModule, setGeneratingModule] = useState(null);
  const [modulesRefreshKey, setModulesRefreshKey] = useState(0);
  const [modulesReady, setModulesReady] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const module1Ref = useRef(null);
  const xpBarStarsRef = useRef(null);
  const questsIconRef = useRef(null);
  const tourVisibleRef = useRef(false);
  const tourStepIndexRef = useRef(0);
  const isMountedRef = useRef(true);
  const hasMarkedSeenRef = useRef(false);
  const alreadyTriggeredRef = useRef(false);
  const loadingRef = useRef(true);
  const progressRef = useRef(null);
  loadingRef.current = loading;
  progressRef.current = progress;
  tourVisibleRef.current = tourVisible;
  tourStepIndexRef.current = tourStepIndex;

  // Tutoriel guidé : steps (spotlight, texte typing, bouton SUIVANT ou clic module1)
  const GUIDED_TOUR_STEPS = [
    {
      targetKeys: ['module1'],
      text: "Voici un module, chaque module t'aide à avancer sur un point essentiel à la réussite de ton parcours professionnel de manière ludique",
      showButton: true,
    },
    {
      phases: [
        {
          text: "Tu as aussi une barre d'XP et des étoiles, pour en gagner il suffit de faire des modules...",
          targetKeys: ['xpBarStars'],
        },
        {
          text: " ou de terminer des quêtes visibles via le menu en bas à droite",
          targetKeys: ['xpBarStars', 'questsIcon'],
        },
      ],
      showButton: true,
    },
    {
      targetKeys: ['module1', 'xpBarStars', 'questsIcon'],
      text: "Lance ton premier module en cliquant dessus !",
      showButton: false,
      clickableTarget: 'module1',
    },
  ];

  const getTargetsLayout = useCallback(() => {
    return new Promise((resolve) => {
      const out = {};
      let count = 0;
      const tryResolve = () => {
        count += 1;
        if (count >= 3) {
          resolve({
            module1: out.module1 ?? { x: 0, y: 0, width: 1, height: 1 },
            xpBarStars: out.xpBarStars ?? { x: 0, y: 0, width: 1, height: 1 },
            questsIcon: out.questsIcon ?? { x: 0, y: 0, width: 1, height: 1 },
          });
        }
      };
      if (module1Ref.current) {
        module1Ref.current.measureInWindow((x, y, w, h) => {
          out.module1 = { x, y, width: w, height: h };
          tryResolve();
        });
      } else {
        tryResolve();
      }
      if (xpBarStarsRef.current) {
        xpBarStarsRef.current.measureInWindow((x, y, w, h) => {
          out.xpBarStars = { x, y, width: w, height: h };
          tryResolve();
        });
      } else {
        tryResolve();
      }
      if (questsIconRef.current) {
        questsIconRef.current.measureInWindow((x, y, w, h) => {
          out.questsIcon = { x, y, width: w, height: h };
          tryResolve();
        });
      } else {
        tryResolve();
      }
    });
  }, []);

  const handleTourNext = useCallback(() => {
    if (tourStepIndex < GUIDED_TOUR_STEPS.length - 1) {
      setTourStepIndex((prev) => prev + 1);
    }
  }, [tourStepIndex]);

  const startModuleRef = useRef(null);
  const handleTourFinish = useCallback(() => {
    setTourVisible(false);
    setTourStepIndex(0);
    AsyncStorage.setItem('guidedTourDone', '1').catch(() => {});
    startModuleRef.current?.('mini_simulation_metier');
  }, []);

  const tutorialActive = tourVisible;

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Fonction locale (pas useCallback) pour éviter stale closure — lit tout au moment de l'appel.
  async function runTutorialGate() {
    const fromOnboardingComplete = route.params?.fromOnboardingComplete === true;
    if (fromOnboardingComplete) {
      navigation.setParams({ fromOnboardingComplete: undefined });
      if (isMountedRef.current) {
        alreadyTriggeredRef.current = true;
        setTourVisible(true);
        setTourStepIndex(0);
      }
      console.log('[HomeTutorial] DECISION: fromOnboardingComplete → show tour (right after loading screen)');
      return;
    }

    const forceTourParam = route.params?.forceTour === true;
    if (forceTourParam) {
      navigation.setParams({ forceTour: undefined });
      if (isMountedRef.current) {
        alreadyTriggeredRef.current = true;
        setTourVisible(true);
        setTourStepIndex(0);
      }
      console.log('[HomeTutorial] DECISION: forceTour param → show tour');
      return;
    }

    if (alreadyTriggeredRef.current) return;

    // Force refresh depuis la DB : après onboarding, le cache peut encore avoir hasCompletedOnboarding: false.
    let auth = { userId: null, isAuthenticated: false, hasCompletedOnboarding: false, onboardingStep: 0 };
    try {
      auth = await getAuthState(true);
    } catch (e) {
      console.warn('[HomeTutorial] getAuthState error', e?.message);
    }
    const userId = auth?.userId ?? null;
    const homeTutorialSeen = userId ? (await AsyncStorage.getItem(HOME_TUTORIAL_SEEN_KEY(userId)).catch(() => null)) === '1' : false;
    const legacyDone = (await AsyncStorage.getItem('guidedTourDone').catch(() => null)) === '1';
    let homeSeen = homeTutorialSeen;
    if (legacyDone && userId && !homeTutorialSeen) {
      await AsyncStorage.setItem(HOME_TUTORIAL_SEEN_KEY(userId), '1').catch(() => {});
      homeSeen = true;
    }

    const homeReady = !loadingRef.current && progressRef.current;
    const showTour =
      FORCE_TUTORIAL ||
      (!homeSeen && (auth?.hasCompletedOnboarding || homeReady));

    console.log('[HomeTutorial] gate check', {
      loading: loadingRef.current,
      progress: !!progressRef.current,
      homeReady,
      isAuthenticated: auth?.isAuthenticated ?? false,
      hasCompletedOnboarding: auth?.hasCompletedOnboarding ?? false,
      onboardingStep: auth?.onboardingStep ?? 0,
      homeTutorialSeen: homeSeen,
      showTutorial: tourVisibleRef.current,
      alreadyTriggered: alreadyTriggeredRef.current,
    });
    console.log('[HomeTutorial] DECISION:', showTour ? 'show' : 'skip');

    if (!showTour || !isMountedRef.current) return;
    alreadyTriggeredRef.current = true;
    setTourVisible(true);
    if (!tourVisibleRef.current) setTourStepIndex(0);
  }

  // Marquer home_tutorial_seen UNIQUEMENT quand le tutoriel a réellement démarré sur Home (pas avant, pas pendant onboarding).
  useEffect(() => {
    if (!tourVisible) return;
    if (hasMarkedSeenRef.current) return;
    hasMarkedSeenRef.current = true;
    (async () => {
      try {
        const auth = await getAuthState();
        const userId = auth?.userId ?? null;
        if (userId) await AsyncStorage.setItem(HOME_TUTORIAL_SEEN_KEY(userId), '1');
      } catch (e) {
        console.warn('[HomeTutorial] set home_tutorial_seen error', e?.message);
      }
    })();
  }, [tourVisible]);

  // Déclencher le gate quand Home est prêt (loading false + progress chargé). Auth lu DANS runTutorialGate pour éviter race avec setState.
  useEffect(() => {
    if (loading) return;
    if (!progress) return;
    runTutorialGate();
  }, [loading, progress]);

  useFocusEffect(() => {
    runTutorialGate();
  });

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

  // Obtenir le nom du module courant (ligne 1 — titre en majuscules)
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

  // Sous-titre du module courant (ligne 2 — pas en majuscules, dynamique)
  const getCurrentModuleSubtitle = () => {
    const moduleNumber = getCurrentModuleNumber();
    switch (moduleNumber) {
      case 1:
        return 'Simulation métier';
      case 2:
        return 'Apprentissage';
      case 3:
        return 'Test de secteur';
      default:
        return 'Module';
    }
  };

  // Chapitre actuel + de quoi traite le module (ex. "Chapitre 1 - Identifier ses centres d'intérêt")
  const getCurrentChapterLabel = () => {
    if (!progress) return 'Chapitre 1';
    const chapterNum = progress.currentChapter || 1;
    const chapter = getChapterById(chapterNum);
    const moduleIndex = progress.currentModuleIndex ?? 0;
    const lessonTitle = getCurrentLesson(chapterNum, moduleIndex);
    return `Chapitre ${chapterNum} - ${lessonTitle}`;
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
  startModuleRef.current = handleStartModule;

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
      {/* Quand le tutoriel est actif, désactiver les touches sur le feed pour que l’overlay les intercepte. */}
      <View
        style={[
          styles.feedContentWrapper,
          tutorialActive && { pointerEvents: 'none' },
        ]}
      >
      <Header showSettings={true} onSettingsPress={handleSettings} />

      <View ref={xpBarStarsRef} {...(Platform.OS !== 'web' ? { collapsable: false } : {})}>
        <XPBar />
      </View>

      <View style={styles.content}>
        <View style={styles.contentContainer}>
        <View style={[styles.modulesContainer, { marginTop: RESPONSIVE.modulesRowMarginTop }]}>
              <View ref={module1Ref} {...(Platform.OS !== 'web' ? { collapsable: false } : {})}>
                <HoverableTouchableOpacity 
                  style={[
                    styles.moduleCircleSide,
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
                    <Image source={bookLogo} style={[styles.moduleCircleLogo, { width: RESPONSIVE.iconSizeSide, height: RESPONSIVE.iconSizeSide }]} resizeMode="contain" />
                    {!canStartModule(1) && (
                      <View style={styles.lockOverlay}>
                        <Text style={styles.lockIcon}>🔒</Text>
                      </View>
                    )}
                  </LinearGradient>
                </HoverableTouchableOpacity>
              </View>

              {/* Module 2 : Apprentissage - ORANGE/JAUNE (rond du milieu, plus grand) */}
              <HoverableTouchableOpacity 
                style={[
                  styles.moduleCircleMiddle,
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
                  <Image source={lightbulbLogo} style={[styles.moduleCircleLogo, { width: RESPONSIVE.iconSizeMiddle, height: RESPONSIVE.iconSizeMiddle }]} resizeMode="contain" />
                  {!canStartModule(2) && (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                  )}
                </LinearGradient>
              </HoverableTouchableOpacity>

              {/* Module 3 : Test de Secteur - BLEU CYAN (taille latérale) */}
              <HoverableTouchableOpacity 
                style={[
                  styles.moduleCircleSide,
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
                  <Image source={briefcaseLogo} style={[styles.moduleCircleLogo, { width: RESPONSIVE.iconSizeSide, height: RESPONSIVE.iconSizeSide }]} resizeMode="contain" />
                  {!canStartModule(3) && (
                    <View style={styles.lockOverlay}>
                      <Text style={styles.lockIcon}>🔒</Text>
                    </View>
                  )}
                </LinearGradient>
              </HoverableTouchableOpacity>
        </View>

        {/* Bloc SIMULATION MÉTIER (pill/capsule) — 2 lignes, titre + sous-titre, couleurs dynamiques */}
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
              <View style={styles.dropdownTextBlock}>
                <Text style={styles.dropdownButtonTitle} numberOfLines={1}>
                  {getCurrentModuleName()}
                </Text>
                <Text style={styles.dropdownChapterLine} numberOfLines={1}>
                  {getCurrentChapterLabel()}
                </Text>
              </View>
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
        </View>
      </View>

      <BottomNavBar questsIconRef={questsIconRef} />
      </View>

      {/* Tutoriel : Modal garantit que l'overlay est au premier plan (couche native). */}
      <Modal
        visible={tourVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {tourVisible ? (
            <GuidedTourOverlay
              visible={tourVisible}
              stepIndex={tourStepIndex}
              steps={GUIDED_TOUR_STEPS}
              onNext={handleTourNext}
              onFinish={handleTourFinish}
              getTargetsLayout={getTargetsLayout}
              onSettingsPress={handleSettings}
            />
        ) : null}
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedContentWrapper: {
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
    flex: 1,
    paddingTop: 0,
    paddingBottom: 8,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modulesContainer: {
    marginBottom: RESPONSIVE.buttonTopMargin,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: RESPONSIVE.circleSpacing,
  },
  moduleCircleSide: {
    width: RESPONSIVE.circleSizeSide,
    height: RESPONSIVE.circleSizeSide,
    borderRadius: RESPONSIVE.circleSizeSide / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  moduleCircleMiddle: {
    width: RESPONSIVE.circleSizeMiddle,
    height: RESPONSIVE.circleSizeMiddle,
    borderRadius: RESPONSIVE.circleSizeMiddle / 2,
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
  moduleCircleLogo: {},
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
    marginBottom: 12,
  },
  dropdownButton: {
    width: '100%',
    height: RESPONSIVE.buttonHeight,
    borderRadius: RESPONSIVE.buttonBorderRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
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
  dropdownTextBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownButtonTitle: {
    fontSize: RESPONSIVE.buttonTitleSize,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  dropdownButtonSubtitle: {
    fontSize: RESPONSIVE.buttonSubtitleSize,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 2,
    opacity: 0.95,
    textAlign: 'center',
  },
  dropdownChapterLine: {
    fontSize: RESPONSIVE.buttonSubtitleSize * 0.95,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: '900',
    marginTop: 4,
    opacity: 0.9,
    textAlign: 'center',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
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
