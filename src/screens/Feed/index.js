import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text, Image, Dimensions, TouchableOpacity, Modal, Platform, useWindowDimensions, BackHandler, Animated, Easing, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HoverableTouchableOpacity from '../../components/HoverableTouchableOpacity';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProgress, invalidateProgressCache } from '../../lib/userProgressSupabase';
import { getChapterProgress } from '../../lib/chapterProgress';
import { calculateLevel, getXPNeededForNextLevel } from '../../lib/progression';
import Button from '../../components/Button';
import BottomNavBar from '../../components/BottomNavBar';
import Header from '../../components/Header';
import XPBar from '../../components/XPBar';
import GuidedTourOverlay from '../../components/GuidedTourOverlay';
import AlignLoading from '../../components/AlignLoading';
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

// way — IA OpenAI (réactivée)
import { getOrCreateModule, getModuleFromDBOrCache } from '../../services/aiModuleService';
import { preloadModules, getCachedModule } from '../../lib/modulePreloadCache';

// 🆕 SYSTÈMES V3
import { useMainAppProtection } from '../../hooks/useRouteProtection';
import { useQuestActivityTracking } from '../../lib/quests/useQuestTracking';
import { getAllModules, canStartModule, isModuleSystemReady, initializeModules, getModulesState } from '../../lib/modules';
import { getChapterById, getCurrentLesson, CHAPTERS } from '../../data/chapters';
import ChaptersModal from '../../components/ChaptersModal';

const DESKTOP_BREAKPOINT = 1100;
const MOBILE_BREAKPOINT = 480;

// Responsive sizing modules — breakpoints : SMALL < 420, MEDIUM 420–900, LARGE > 900
const BREAKPOINT_SMALL = 420;
const BREAKPOINT_LARGE = 900;
const BASE_CIRCLE_SIDE = 160;
const BASE_CIRCLE_MIDDLE = BASE_CIRCLE_SIDE + 24;
const CIRCLE_DELTA_SMALL = -40;
const CIRCLE_DELTA_LARGE = 30;
const BASE_BUTTON_WIDTH = 400;
const BASE_BUTTON_HEIGHT = 88;
const BLOC_DELTA_SMALL_WIDTH = 40;
const BLOC_DELTA_SMALL_HEIGHT = 20;

// Dimensions : identiques à l'origine, responsive desktop/tablet/mobile (utilisées pour styles statiques / fallback)
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_SIDE = Math.min(SCREEN_WIDTH * 0.2, 120) + 40;
const RESPONSIVE = {
  circleSizeSide: BASE_SIDE,
  circleSizeMiddle: BASE_SIDE + 24,
  circleSpacing: SCREEN_WIDTH * 0.02,
  modulesRowMarginTop: 0,
  middleElevation: 16,
  iconSizeSide: BASE_SIDE * 0.5,
  iconSizeMiddle: (BASE_SIDE + 24) * 0.5,
  buttonWidth: Math.min(SCREEN_WIDTH * 0.88, 400),
  buttonHeight: Math.min(SCREEN_HEIGHT * 0.13, 88),
  buttonBorderRadius: 24,
  buttonTopMargin: Math.min(SCREEN_HEIGHT * 0.04, 28),
  buttonPaddingVertical: 22,
  buttonPaddingHorizontal: 28,
  buttonTitleSize: Math.min(SCREEN_WIDTH * 0.048, 24),
  buttonSubtitleSize: Math.min(SCREEN_WIDTH * 0.034, 16),
};

// Ajustements design & UX — accueil, quêtes, profil
// Logos personnalisés pour les modules (facilite le remplacement manuel)
const bookLogo = require('../../../assets/images/modules/book.png');
const lightbulbLogo = require('../../../assets/images/modules/lightbulb.png');
const briefcaseLogo = require('../../../assets/images/modules/briefcase.png');
// Streaks désactivés temporairement — flameIcon retiré de l'UI

// Image star-gear pour le header
const starGearImage = require('../../../assets/images/star-gear.png');
let lockIcon = null;
try {
  lockIcon = require('../../../assets/locks/lock.png');
} catch (e) {
  lockIcon = null;
}

/**
 * Écran d'accueil Align
 * Affiche la progression dynamique (étoiles, XP, niveau)
 * et les options principales
 */
export default function FeedScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingModule, setGeneratingModule] = useState(null);
  const [moduleLoadingTimeout, setModuleLoadingTimeout] = useState(false);
  const [modulesRefreshKey, setModulesRefreshKey] = useState(0);
  const [modulesReady, setModulesReady] = useState(false);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [chaptersProgress, setChaptersProgress] = useState(null);
  /** Sélection active depuis la modal Chapitres : affichage bloc uniquement, pas d'auto-start module */
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState(null);
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isMobileSmall = windowWidth < MOBILE_BREAKPOINT;
  const isDesktop = windowWidth >= DESKTOP_BREAKPOINT;

  // Responsive sizing modules : SMALL < 420, MEDIUM 420–900, LARGE > 900
  const isSmall = windowWidth < BREAKPOINT_SMALL;
  const isLarge = windowWidth > BREAKPOINT_LARGE;
  const circleSizeSide = isLarge ? BASE_CIRCLE_SIDE + CIRCLE_DELTA_LARGE : isSmall ? BASE_CIRCLE_SIDE + CIRCLE_DELTA_SMALL : BASE_CIRCLE_SIDE;
  const circleSizeMiddle = isLarge ? BASE_CIRCLE_MIDDLE + CIRCLE_DELTA_LARGE : isSmall ? BASE_CIRCLE_MIDDLE + CIRCLE_DELTA_SMALL : BASE_CIRCLE_MIDDLE;
  const circleSpacingModules = Math.max(4, Math.min(windowWidth * 0.02, 24));
  // Bloc Simulation métier : LARGE/MEDIUM = base ; SMALL = légèrement plus compact (-40px visuel)
  const blocButtonWidth = isSmall ? Math.min(windowWidth * 0.88, BASE_BUTTON_WIDTH - BLOC_DELTA_SMALL_WIDTH) : Math.min(windowWidth * 0.88, BASE_BUTTON_WIDTH);
  const blocButtonHeight = isSmall ? Math.min(windowHeight * 0.12, BASE_BUTTON_HEIGHT - BLOC_DELTA_SMALL_HEIGHT) : Math.min(windowHeight * 0.13, BASE_BUTTON_HEIGHT);

  // Animation "clique sur moi" : rond + icône synchronisés, uniquement sur le module à faire maintenant
  const CIRCLE_SCALE_PEAK = 1.05;
  const ICON_SCALE_PEAK = 1.03;
  const ICON_FLOAT_PX = -2;
  const PULSE_MS = 700;
  const circleScale1 = useRef(new Animated.Value(1)).current;
  const circleScale2 = useRef(new Animated.Value(1)).current;
  const circleScale3 = useRef(new Animated.Value(1)).current;
  const iconScale1 = useRef(new Animated.Value(1)).current;
  const iconScale2 = useRef(new Animated.Value(1)).current;
  const iconScale3 = useRef(new Animated.Value(1)).current;
  const iconFloat1 = useRef(new Animated.Value(0)).current;
  const iconFloat2 = useRef(new Animated.Value(0)).current;
  const iconFloat3 = useRef(new Animated.Value(0)).current;
  const peak1 = useRef(new Animated.Value(0)).current;
  const peak2 = useRef(new Animated.Value(0)).current;
  const peak3 = useRef(new Animated.Value(0)).current;

  // Réduction UNIQUEMENT sur petits écrans (legacy compat) : scale fluide entre 320 et 480
  const smallScale = isMobileSmall
    ? Math.min(1, Math.max(0.7, 0.7 + ((windowWidth - 320) / 160) * 0.3))
    : 1;
  const smallCircleSide = isMobileSmall ? Math.round(circleSizeSide * smallScale) : null;
  const smallCircleMiddle = isMobileSmall ? Math.round(circleSizeMiddle * smallScale) : null;
  const smallButtonWidth = isMobileSmall ? Math.round(blocButtonWidth * smallScale) : null;
  const smallButtonHeight = isMobileSmall ? Math.round(blocButtonHeight * smallScale) : null;
  const smallCircleSpacing = isMobileSmall ? Math.max(4, Math.round(circleSpacingModules * smallScale)) : null;
  const effectiveCircleSide = smallCircleSide ?? circleSizeSide;
  const effectiveCircleMiddle = smallCircleMiddle ?? circleSizeMiddle;
  const effectiveIconSide = effectiveCircleSide * 0.5;
  const effectiveIconMiddle = effectiveCircleMiddle * 0.5;

  const isShortViewport = false;
  const shortViewportCircleSide = circleSizeSide;
  const shortViewportCircleMiddle = circleSizeMiddle;

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
  const syncCurrentProgressFromSourceOfTruth = useCallback(async () => {
    invalidateProgressCache();
    try {
      await initializeModules();
      // Cache invalidé → getUserProgress(false) fera un fetch (dedupé si en cours)
      const userProgress = await getUserProgress(false);
      const cp = await getChapterProgress(true);
      if (cp) setChaptersProgress(cp);
      const currentChapterId = userProgress?.currentChapter ?? 1;
      const currentModuleIndex = userProgress?.currentModuleIndex ?? 0;
      const currentModuleId = currentModuleIndex + 1;
      setProgress(prev => (prev ? { ...prev, ...userProgress, currentChapter: currentChapterId, currentModuleIndex } : null));
      const moduleUnlocked = [canStartModule(1), canStartModule(2), canStartModule(3)];
      console.log('[Feed] syncCurrentProgressFromSourceOfTruth:', {
        currentChapterId,
        currentModuleId,
        currentModuleIndex,
        moduleUnlocked,
      });
    } catch (e) {
      console.warn('[Feed] syncCurrentProgressFromSourceOfTruth error:', e);
    }
  }, []);

  const handleTourFinish = useCallback(() => {
    setTourVisible(false);
    setTourStepIndex(0);
    setSelectedChapterId(null);
    setSelectedModuleIndex(null);
    AsyncStorage.setItem('guidedTourDone', '1').catch(() => {});
    syncCurrentProgressFromSourceOfTruth();
    loadProgress();
    startModuleRef.current?.('mini_simulation_metier');
  }, [syncCurrentProgressFromSourceOfTruth]);

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

    // Force refresh depuis la DB
    let auth = { userId: null, isAuthenticated: false, hasCompletedOnboarding: false, onboardingStep: 0 };
    try {
      auth = await getAuthState(true);
    } catch (e) {
      console.warn('[HomeTutorial] getAuthState error', e?.message);
    }

    // RÈGLE: Login normal (déjà onboardé) => JAMAIS de tutoriel. Uniquement après onboarding.
    if (auth?.hasCompletedOnboarding === true) {
      console.log('[HomeTutorial] DECISION: hasCompletedOnboarding → skip (login normal)');
      return;
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
    const showTour = FORCE_TUTORIAL || (!homeSeen && homeReady);

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

  // Pendant le tutoriel : interdire toute sortie (back Android, Escape web)
  useEffect(() => {
    if (!tourVisible) return;
    const onBack = () => true;
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    let removeKeyDown;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onKeyDown = (e) => { if (e.key === 'Escape') e.preventDefault(); };
      window.addEventListener('keydown', onKeyDown, true);
      removeKeyDown = () => window.removeEventListener('keydown', onKeyDown, true);
    }
    return () => {
      sub.remove();
      if (removeKeyDown) removeKeyDown();
    };
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

  // Préchargement : getOrCreateModule (DB first, 0 appel IA si déjà en DB)
  useEffect(() => {
    if (!progress) return;
    const secteurId = progress.activeDirection || 'ingenierie_tech';
    const metierId = progress.activeMetier || null;
    const level = progress.currentLevel || 1;
    const chapterId = progress.currentChapter ?? 1;
    preloadModules(secteurId, metierId, level, chapterId);
  }, [progress?.activeDirection, progress?.activeMetier, progress?.currentLevel, progress?.currentChapter]);

  // Rechargement modules + préchargement IA. Reset sélection quand on revient sur Feed (ex: après Module)
  // pour afficher la progression réelle. La sélection reste active quand on ferme juste la modal (pas de nav).
  useFocusEffect(
    React.useCallback(() => {
      setModulesRefreshKey(prev => prev + 1);
      setSelectedChapterId(null);
      setSelectedModuleIndex(null);
      if (!isModuleSystemReady()) {
        initializeModules().then(() => setModulesReady(true)).catch(() => {});
      }
      if (progress) {
        const secteurId = progress.activeDirection || 'ingenierie_tech';
        const metierId = progress.activeMetier || null;
        const level = progress.currentLevel || 1;
        const chapterId = progress.currentChapter ?? 1;
        preloadModules(secteurId, metierId, level, chapterId);
      }
    }, [progress?.activeDirection, progress?.activeMetier, progress?.currentLevel, progress?.currentChapter])
  );

  // Recharger la progression chapitres quand on ouvre la modal (barres = valeurs réelles)
  useEffect(() => {
    if (isChaptersOpen) {
      invalidateProgressCache();
      loadProgress();
      getChapterProgress(true).then((cp) => {
        if (cp) setChaptersProgress(cp);
      }).catch(() => setChaptersProgress(null));
    } else {
      setChaptersProgress(null);
    }
  }, [isChaptersOpen]);

  const loadProgress = async () => {
    try {
      // Hydratation: utiliser cache si dispo (false). Après ModuleCompletion, invalidateProgressCache
      // est appelé → cache vide → fetch automatique. Évite forceRefresh en boucle au login.
      const userProgress = await getUserProgress(false);
      
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

      const chapterId = userProgress.currentChapter ?? 1;
      const lastCompleted = Array.isArray(userProgress.completedModulesInChapter) && userProgress.completedModulesInChapter.length > 0
        ? Math.max(...userProgress.completedModulesInChapter)
        : -1;
      const unlockedIndex = typeof userProgress.currentModuleInChapter === 'number' ? userProgress.currentModuleInChapter : 0;
      const completedIdsCount = Array.isArray(userProgress.completedModulesInChapter) ? userProgress.completedModulesInChapter.length : 0;
      console.log('[PROGRESSION] loaded', { chapterId, lastCompleted, unlockedIndex, completedIdsCount });

      const secteurId = userProgress.activeDirection || 'ingenierie_tech';
      const metierId = userProgress.activeMetier || null;
      const level = userProgress.currentLevel || 1;
      const chapterIdForPreload = userProgress.currentChapter ?? 1;

      // Warmup READ ONLY (SELECT DB, ZÉRO appel IA) — seed NE s'exécute JAMAIS ici (uniquement fin onboarding)
      preloadModules(secteurId, metierId, level, chapterIdForPreload).catch(() => {});

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

  // 🆕 SOURCE UNIQUE : progression = module system (évite désync bloc "module X" vs locked/unlocked)
  const deriveModuleDisplayState = () => {
    if (!isModuleSystemReady()) {
      return { currentModuleNumber: 1, currentChapter: 1 };
    }
    try {
      const state = getModulesState();
      let currentModuleNumber = state.currentModuleIndex;
      const currentChapter = state.currentChapter ?? 1;
      if (!canStartModule(currentModuleNumber)) {
        currentModuleNumber = state.maxUnlockedModuleIndex ?? 1;
      }
      return { currentModuleNumber, currentChapter };
    } catch (e) {
      return { currentModuleNumber: 1, currentChapter: 1 };
    }
  };

  const modules = getAllModules();

  const getModuleStatus = () => ({
    module1: canStartModule(1),
    module2: canStartModule(2),
    module3: canStartModule(3),
  });

  /**
   * Source de vérité UI : chapitre/module affiché.
   * Si sélection menu active (selectedChapterId/selectedModuleIndex) → utiliser la sélection.
   * Sinon → progression réelle (progress/chaptersProgress).
   */
  const getDisplayChapterAndModule = () => {
    const source = chaptersProgress || progress;
    const realChapter = source?.currentChapter ?? 1;
    const realModuleIndex = typeof source?.currentModuleInChapter === 'number'
      ? source.currentModuleInChapter
      : (progress?.currentModuleIndex ?? 0);

    if (selectedChapterId != null && selectedModuleIndex != null) {
      return {
        chapter: selectedChapterId,
        moduleIndex0: selectedModuleIndex,
        isSelection: true,
        realChapter,
      };
    }
    return {
      chapter: realChapter,
      moduleIndex0: realModuleIndex,
      isSelection: false,
      realChapter,
    };
  };

  /**
   * LOCKS ÉCRAN (ronds) — dépend UNIQUEMENT de la sélection affichée.
   * Utilisé pour les 3 ronds à l'écran.
   * selectedModuleIndex (0-based) : 0 → seul mod1 déverrouillé, 1 → mod1+2, 2 → tous.
   */
  const getScreenLocks = (displayModuleIndex0) => {
    const idx = displayModuleIndex0 ?? 0;
    return {
      module1: { unlocked: idx >= 0 },
      module2: { unlocked: idx >= 1 },
      module3: { unlocked: idx >= 2 },
    };
  };

  /** État des ronds : utilise getScreenLocks avec le module affiché (sélection ou progression). */
  const getViewStateForRounds = () => {
    const { moduleIndex0 } = getDisplayChapterAndModule();
    return getScreenLocks(moduleIndex0);
  };

  /** Calcule les statuts complets pour les 3 modules (pour logs [PROGRESSION]). */
  const getRenderStatuses = () => {
    const source = chaptersProgress || progress;
    const currentChapter = source?.currentChapter ?? 1;
    const currentModuleInChapter = typeof source?.currentModuleInChapter === 'number'
      ? source.currentModuleInChapter
      : (source?.currentModuleIndex ?? 0);
    const completedInChapter = Array.isArray(source?.completedModulesInChapter)
      ? source.completedModulesInChapter
      : [];
    return [0, 1, 2].map((idx) => {
      const completed = completedInChapter.includes(idx);
      const unlocked = idx <= currentModuleInChapter;
      const status = completed ? 'completed' : (unlocked ? 'unlocked' : 'locked');
      return { index: idx, status, completed, unlocked };
    });
  };

  useEffect(() => {
    const statuses = getRenderStatuses();
    console.log('[PROGRESSION] renderStatuses', statuses.map((s) => s.status));
  }, [progress?.currentChapter, progress?.currentModuleInChapter, progress?.completedModulesInChapter, chaptersProgress?.currentChapter, chaptersProgress?.currentModuleInChapter, chaptersProgress?.completedModulesInChapter, selectedChapterId, selectedModuleIndex]);

  /**
   * LOCKS MENU (sous-menu modules) — dépend UNIQUEMENT de la progression réelle.
   * Permet de recliquer un module déjà unlock pour revenir à sa progression actuelle.
   * @param {number} chapterId
   * @param {Object} source - chaptersProgress || progress
   * @returns {{ unlocked: boolean }[]} pour modules 0, 1, 2
   */
  const getMenuLocksForChapter = (chapterId, source) => {
    const currentChapter = source?.currentChapter ?? 1;
    const currentModuleInChapter = typeof source?.currentModuleInChapter === 'number'
      ? source.currentModuleInChapter
      : (source?.currentModuleIndex ?? 0);

    if (chapterId < currentChapter) {
      return [{ unlocked: true }, { unlocked: true }, { unlocked: true }];
    }
    if (chapterId === currentChapter) {
      return [
        { unlocked: 0 <= currentModuleInChapter },
        { unlocked: 1 <= currentModuleInChapter },
        { unlocked: 2 <= currentModuleInChapter },
      ];
    }
    return [{ unlocked: false }, { unlocked: false }, { unlocked: false }];
  };

  // Animation "clique sur moi" : rond (scale + glow) + icône — sur le module "à faire" affiché
  const { moduleIndex0: displayModuleIndex0 } = getDisplayChapterAndModule();
  const nextModuleToDo = displayModuleIndex0 + 1; // 1, 2 ou 3
  useEffect(() => {
    const easeInOut = Easing.inOut(Easing.ease);
    const run = (isNext, circleScale, iconScale, iconFloat, peak) => {
      if (!isNext) {
        circleScale.setValue(1);
        iconScale.setValue(1);
        iconFloat.setValue(0);
        peak.setValue(0);
        return;
      }
      circleScale.stopAnimation();
      iconScale.stopAnimation();
      iconFloat.stopAnimation();
      peak.stopAnimation();
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(circleScale, { toValue: CIRCLE_SCALE_PEAK, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(circleScale, { toValue: 1, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(iconScale, { toValue: ICON_SCALE_PEAK, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(iconScale, { toValue: 1, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(iconFloat, { toValue: ICON_FLOAT_PX, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(iconFloat, { toValue: 0, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(peak, { toValue: 1, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
            Animated.timing(peak, { toValue: 0, duration: PULSE_MS, easing: easeInOut, useNativeDriver: true }),
          ]),
        ])
      );
      loop.start();
      return loop;
    };
    const loops = [
      run(nextModuleToDo === 1, circleScale1, iconScale1, iconFloat1, peak1),
      run(nextModuleToDo === 2, circleScale2, iconScale2, iconFloat2, peak2),
      run(nextModuleToDo === 3, circleScale3, iconScale3, iconFloat3, peak3),
    ];
    return () => {
      [circleScale1, circleScale2, circleScale3, iconScale1, iconScale2, iconScale3, iconFloat1, iconFloat2, iconFloat3, peak1, peak2, peak3].forEach((a) => a.stopAnimation());
      loops.forEach((l) => l && typeof l.stop === 'function' && l.stop());
    };
  }, [progress, modulesRefreshKey, nextModuleToDo]);

  // Module courant (1–3) affiché : sélection ou progression réelle
  const getCurrentModuleNumber = () => {
    const { moduleIndex0 } = getDisplayChapterAndModule();
    return Math.min(3, Math.max(1, moduleIndex0 + 1));
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

  // Source de vérité pour le bloc Home : sélection menu ou progression réelle
  const getCurrentChapterForHomeBlock = () => {
    const { chapter, moduleIndex0 } = getDisplayChapterAndModule();
    return { currentChapter: chapter, currentModuleIndex: moduleIndex0 };
  };

  const getCurrentChapterLines = () => {
    const { currentChapter, currentModuleIndex: currentModule0 } = getCurrentChapterForHomeBlock();
    const shortTitle = getCurrentLesson(currentChapter, currentModule0, true);
    return { chapterLine: `Chapitre ${currentChapter}`, phraseLine: shortTitle || '' };
  };

  // Chapitres pour le modal : progression réelle (getMenuLocksForChapter) — jamais la sélection
  const getChaptersForModal = () => {
    const source = chaptersProgress || progress;
    const currentChapter = source?.currentChapter ?? deriveModuleDisplayState().currentChapter ?? 1;
    const currentModuleInChapter = typeof source?.currentModuleInChapter === 'number' ? source.currentModuleInChapter : 0;
    const completedInChapter = Array.isArray(source?.completedModulesInChapter)
      ? source.completedModulesInChapter
      : [];
    const totalSteps = 3;
    const completedSteps = completedInChapter.length;
    const currentChapterProgress = completedSteps / totalSteps;

    return CHAPTERS.map((ch) => {
      let status = 'locked';
      let progressVal = 0;
      let completedStepsForCh = 0;
      const menuLocks = getMenuLocksForChapter(ch.id, source);
      if (ch.id < currentChapter) {
        status = 'done';
        progressVal = 1;
        completedStepsForCh = totalSteps;
      } else if (ch.id === currentChapter) {
        completedStepsForCh = completedSteps;
        progressVal = Math.min(1, currentChapterProgress);
        status = progressVal >= 1 ? 'done' : 'current';
      }

      const modules = [0, 1, 2].map((idx) => ({
        index: idx,
        shortLabel: ch.shortTitles?.[idx] ?? ch.lessons?.[idx] ?? `Module ${idx + 1}`,
        completed: ch.id < currentChapter || completedInChapter.includes(idx),
        isCurrent: ch.id === currentChapter && currentModuleInChapter === idx,
        unlocked: menuLocks[idx]?.unlocked ?? false,
      }));

      const shortTitle = ch.shortTitles?.[0] ?? ch.lessons?.[0] ?? '';
      return {
        id: ch.id,
        title: `Chapitre ${ch.id} — ${shortTitle}`,
        status,
        progress: progressVal,
        completedSteps: completedStepsForCh,
        totalSteps,
        modules,
      };
    });
  };

  // Clic module dans la modal = sélection active uniquement (bloc UI), pas de lancement module
  const handleSelectModule = (chapterId, moduleIndex) => {
    const source = chaptersProgress || progress;
    const maxChapter = source?.currentChapter ?? 1;
    if (chapterId > maxChapter) {
      // Chapitre futur verrouillé : on voit la liste mais on ne peut pas y aller
      return;
    }
    setSelectedChapterId(chapterId);
    setSelectedModuleIndex(moduleIndex);
    setIsChaptersOpen(false);
  };

  // Navigation vers un module spécifique (utilise l'état affiché des ronds)
  const handleNavigateToModule = async (moduleNumber) => {
    const viewState = getViewStateForRounds();
    const moduleKey = `module${moduleNumber}`;
    const unlocked = viewState[moduleKey]?.unlocked ?? false;
    if (!unlocked) {
      alert(`Le module ${moduleNumber} est verrouillé. Complète d'abord le module précédent.`);
      setIsChaptersOpen(false);
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

    setIsChaptersOpen(false);
    await handleStartModule(moduleType);
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleStartModule = async (moduleType) => {
    setGeneratingModule(moduleType);
    try {
      const progress = await getUserProgress(moduleType === 'mini_simulation_metier');
      const secteurId = progress.activeDirection || 'ingenierie_tech';
      const metierId = progress.activeMetier || null;

      if (moduleType === 'mini_simulation_metier' && !metierId) {
        if (__DEV__) console.warn('[Feed] activeMetier manquant');
        alert('Aucun métier déterminé. Complète d\'abord les quiz.');
        setGeneratingModule(null);
        return;
      }

      // 1) Cache préchargé (warmup) 2) DB only si onboarding complété (ZÉRO appel IA) 3) getOrCreateModule uniquement si pas encore onboardé
      let module = getCachedModule(moduleType);
      if (!module) {
        const chapterId = selectedChapterId ?? progress?.currentChapter ?? 1;
        const moduleIndex = moduleType === 'mini_simulation_metier' ? 0 : moduleType === 'apprentissage_mindset' ? 1 : 2;
        let hasCompletedOnboarding = false;
        try {
          const auth = await getAuthState(false);
          hasCompletedOnboarding = auth?.hasCompletedOnboarding === true;
        } catch (_) {}
        module = await getModuleFromDBOrCache(chapterId, moduleIndex, moduleType);
        if (!module && !hasCompletedOnboarding) {
          module = await getOrCreateModule({
            chapterId,
            moduleIndex,
            moduleType,
            secteurId,
            metierId,
            level: progress.currentLevel || 1,
          });
        }
      }

      if (!module) {
        alert('Module non disponible. Réessaie dans un moment.');
        return;
      }

      const { updateUserProgress } = require('../../lib/userProgressSupabase');
      await updateUserProgress({ activeModule: moduleType });
      const replayChapterId = selectedChapterId ?? progress?.currentChapter ?? 1;
      const replayModuleIndex = moduleType === 'mini_simulation_metier' ? 0 : moduleType === 'apprentissage_mindset' ? 1 : 2;
      const isFirstModuleAfterOnboarding =
        !selectedChapterId &&
        moduleType === 'mini_simulation_metier' &&
        (progress?.currentChapter ?? 1) === 1 &&
        (progress?.currentModuleIndex ?? 0) === 0 &&
        !(chaptersProgress?.completedModulesInChapter?.length);

      const rootNav = navigation.getParent?.() ?? navigation;
      rootNav.navigate('Module', {
        module,
        ...(replayChapterId != null && replayModuleIndex != null
          ? { chapterId: replayChapterId, moduleIndex: replayModuleIndex }
          : {}),
        ...(isFirstModuleAfterOnboarding ? { isFirstModuleAfterOnboarding: true } : {}),
      });
    } catch (error) {
      if (__DEV__) console.error('[Feed] Start module:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setGeneratingModule(null);
    }
  };
  startModuleRef.current = handleStartModule;

  useEffect(() => {
    if (!generatingModule) {
      setModuleLoadingTimeout(false);
      return;
    }
    const t = setTimeout(() => setModuleLoadingTimeout(true), 4000);
    return () => clearTimeout(t);
  }, [generatingModule]);

  // 🆕 SYSTÈME AUTH/REDIRECTION V1 - Vérification de la protection
  if (isCheckingProtection) {
    return <AlignLoading />;
  }

  // Si accès refusé, ne rien afficher (redirection en cours)
  if (!isAllowed) {
    return null;
  }

  // UX finalisée — prête pour branchement IA ultérieur
  if (loading || !progress) {
    return <AlignLoading />;
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
      <View
        {...(Platform.OS === 'web' ? { className: 'align-header-zone-safe' } : {})}
        style={Platform.OS !== 'web' ? { paddingTop: insets.top + 10 } : undefined}
      >
        <Header showSettings={true} onSettingsPress={handleSettings} settingsOnLeft={true} />
        <View ref={xpBarStarsRef} {...(Platform.OS !== 'web' ? { collapsable: false } : {})}>
          <XPBar />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.contentContainer}>
        <View style={[
          styles.modulesContainer,
          isShortViewport && { marginTop: -200, marginBottom: RESPONSIVE.buttonTopMargin + 10 },
          (isMobileSmall && smallCircleSpacing != null) && { gap: smallCircleSpacing },
          !isMobileSmall && { gap: circleSpacingModules },
        ]}>
              {/* Module 1 — wrapper fixe (ombre), inner circle scale+glow, icône scale+float synchronisés */}
              <View ref={module1Ref} {...(Platform.OS !== 'web' ? { collapsable: false } : {})}>
                <View
                  style={[
                    styles.moduleCircleSide,
                    {
                      width: effectiveCircleSide,
                      height: effectiveCircleSide,
                      borderRadius: effectiveCircleSide / 2,
                      overflow: 'visible',
                    },
                    !getViewStateForRounds().module1.unlocked && styles.moduleCircleLocked,
                  ]}
                >
                  <Animated.View
                    style={[
                      { flex: 1, transform: [{ scale: circleScale1 }] },
                      Platform.OS === 'web' && { willChange: 'transform' },
                    ]}
                  >
                    {/* Glow léger au pic (même élément que le rond) */}
                    {nextModuleToDo === 1 && (
                      <Animated.View
                        style={[
                          styles.moduleCircleGradient,
                          {
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: effectiveCircleSide / 2,
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            opacity: peak1.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
                            pointerEvents: 'none',
                          },
                        ]}
                      />
                    )}
                    {/* Micro ring au pic (optionnel) */}
                    {nextModuleToDo === 1 && (
                      <Animated.View
                        style={[
                          {
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            borderRadius: effectiveCircleSide / 2,
                            borderWidth: 2,
                            borderColor: 'rgba(255,255,255,0.6)',
                            opacity: peak1.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                            pointerEvents: 'none',
                          },
                        ]}
                      />
                    )}
                    <HoverableTouchableOpacity
                      style={[styles.moduleCircleGradient, { borderRadius: effectiveCircleSide / 2, overflow: 'hidden' }]}
                      onPress={() => handleStartModule('mini_simulation_metier')}
                      disabled={!getViewStateForRounds().module1.unlocked || generatingModule === 'mini_simulation_metier'}
                      activeOpacity={0.8}
                      variant="breath"
                    >
                      <LinearGradient
                        colors={['#00FF41', '#19602B']}
                        start={{ x: 0.5, y: 0.5 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.moduleCircleGradient}
                      >
                        {getViewStateForRounds().module1.unlocked && (
                          <LinearGradient colors={['rgba(255,255,255,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moduleGlossyOverlay} />
                        )}
                        <Animated.View style={[{ transform: [{ scale: iconScale1 }, { translateY: iconFloat1 }] }, Platform.OS === 'web' && { willChange: 'transform' }]}>
                          <Image source={bookLogo} style={[styles.moduleCircleLogo, { width: effectiveIconSide, height: effectiveIconSide }]} resizeMode="contain" />
                        </Animated.View>
                        {!getViewStateForRounds().module1.unlocked && (
                          <View style={styles.lockOverlay}>
                            {lockIcon ? (
                              <Image source={lockIcon} style={styles.lockIconImage} resizeMode="contain" />
                            ) : (
                              <Text style={styles.lockIcon}>🔒</Text>
                            )}
                          </View>
                        )}
                      </LinearGradient>
                    </HoverableTouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Module 2 : Apprentissage - ORANGE/JAUNE (rond du milieu), même animation synchronisée */}
              <View
                style={[
                  styles.moduleCircleMiddle,
                  {
                    width: effectiveCircleMiddle,
                    height: effectiveCircleMiddle,
                    borderRadius: effectiveCircleMiddle / 2,
                    marginBottom: -12,
                    overflow: 'visible',
                  },
                  isMobileSmall && smallCircleMiddle != null && { marginBottom: -10 },
                  !getViewStateForRounds().module2.unlocked && styles.moduleCircleLocked,
                ]}
              >
                <Animated.View
                  style={[
                    { flex: 1, transform: [{ scale: circleScale2 }] },
                    Platform.OS === 'web' && { willChange: 'transform' },
                  ]}
                >
                  {nextModuleToDo === 2 && (
                    <Animated.View
                      style={[
                        styles.moduleCircleGradient,
                        {
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: effectiveCircleMiddle / 2,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          opacity: peak2.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
                          pointerEvents: 'none',
                        },
                      ]}
                    />
                  )}
                  {nextModuleToDo === 2 && (
                    <Animated.View
                      style={[
                        {
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: effectiveCircleMiddle / 2,
                          borderWidth: 2,
                          borderColor: 'rgba(255,255,255,0.6)',
                          opacity: peak2.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                          pointerEvents: 'none',
                        },
                      ]}
                    />
                  )}
                  <HoverableTouchableOpacity
                    style={[styles.moduleCircleGradient, { borderRadius: effectiveCircleMiddle / 2, overflow: 'hidden' }]}
                    onPress={() => handleStartModule('apprentissage_mindset')}
                    disabled={!getViewStateForRounds().module2.unlocked || generatingModule === 'apprentissage_mindset'}
                    activeOpacity={0.8}
                    variant="breath"
                  >
                    <LinearGradient
                      colors={['#FF7B2B', '#FFD93F']}
                      start={{ x: 0.5, y: 0.5 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.moduleCircleGradient}
                    >
                      {getViewStateForRounds().module2.unlocked && (
                        <LinearGradient colors={['rgba(255,255,255,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moduleGlossyOverlay} />
                      )}
                      <Animated.View style={[{ transform: [{ scale: iconScale2 }, { translateY: iconFloat2 }] }, Platform.OS === 'web' && { willChange: 'transform' }]}>
                        <Image source={lightbulbLogo} style={[styles.moduleCircleLogo, { width: effectiveIconMiddle, height: effectiveIconMiddle }]} resizeMode="contain" />
                      </Animated.View>
                      {!getViewStateForRounds().module2.unlocked && (
                        <View style={styles.lockOverlay}>
                          {lockIcon ? (
                            <Image source={lockIcon} style={styles.lockIconImage} resizeMode="contain" />
                          ) : (
                            <Text style={styles.lockIcon}>🔒</Text>
                          )}
                        </View>
                      )}
                    </LinearGradient>
                  </HoverableTouchableOpacity>
                </Animated.View>
              </View>

              {/* Module 3 : Test de Secteur - BLEU CYAN (taille latérale), même animation synchronisée */}
              <View
                style={[
                  styles.moduleCircleSide,
                  {
                    width: effectiveCircleSide,
                    height: effectiveCircleSide,
                    borderRadius: effectiveCircleSide / 2,
                    overflow: 'visible',
                  },
                  !getViewStateForRounds().module3.unlocked && styles.moduleCircleLocked,
                ]}
              >
                <Animated.View
                  style={[
                    { flex: 1, transform: [{ scale: circleScale3 }] },
                    Platform.OS === 'web' && { willChange: 'transform' },
                  ]}
                >
                  {nextModuleToDo === 3 && (
                    <Animated.View
                      style={[
                        styles.moduleCircleGradient,
                        {
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: effectiveCircleSide / 2,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          opacity: peak3.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
                          pointerEvents: 'none',
                        },
                      ]}
                    />
                  )}
                  {nextModuleToDo === 3 && (
                    <Animated.View
                      style={[
                        {
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          borderRadius: effectiveCircleSide / 2,
                          borderWidth: 2,
                          borderColor: 'rgba(255,255,255,0.6)',
                          opacity: peak3.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }),
                          pointerEvents: 'none',
                        },
                      ]}
                    />
                  )}
                  <HoverableTouchableOpacity
                    style={[styles.moduleCircleGradient, { borderRadius: effectiveCircleSide / 2, overflow: 'hidden' }]}
                    onPress={() => handleStartModule('test_secteur')}
                    disabled={!getViewStateForRounds().module3.unlocked || generatingModule === 'test_secteur'}
                    activeOpacity={0.8}
                    variant="breath"
                  >
                    <LinearGradient
                      colors={['#00AAFF', '#00EEFF']}
                      start={{ x: 0.5, y: 0.5 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.moduleCircleGradient}
                    >
                      {getViewStateForRounds().module3.unlocked && (
                        <LinearGradient colors={['rgba(255,255,255,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moduleGlossyOverlay} />
                      )}
                      <Animated.View style={[{ transform: [{ scale: iconScale3 }, { translateY: iconFloat3 }] }, Platform.OS === 'web' && { willChange: 'transform' }]}>
                        <Image source={briefcaseLogo} style={[styles.moduleCircleLogo, { width: effectiveIconSide, height: effectiveIconSide }]} resizeMode="contain" />
                      </Animated.View>
                      {!getViewStateForRounds().module3.unlocked && (
                        <View style={styles.lockOverlay}>
                          {lockIcon ? (
                            <Image source={lockIcon} style={styles.lockIconImage} resizeMode="contain" />
                          ) : (
                            <Text style={styles.lockIcon}>🔒</Text>
                          )}
                        </View>
                      )}
                    </LinearGradient>
                  </HoverableTouchableOpacity>
                </Animated.View>
              </View>
        </View>

        {/* Bloc Simulation métier — responsive: SMALL plus compact, LARGE inchangé */}
        <View style={[styles.dropdownContainer, { width: smallButtonWidth ?? blocButtonWidth, alignSelf: 'center' }]}>
          <HoverableTouchableOpacity
            style={[styles.dropdownButton, { height: smallButtonHeight ?? blocButtonHeight }]}
            onPress={() => setIsChaptersOpen(true)}
            activeOpacity={0.9}
            variant="button"
            {...(Platform.OS === 'web' ? { tabIndex: 0 } : {})}
          >
            <LinearGradient
              colors={getCurrentModuleColors()}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[styles.dropdownGradient, isMobileSmall && { paddingVertical: 12, paddingHorizontal: 16, paddingRight: 32 }]}
            >
              <View style={styles.dropdownTextBlock}>
                <Text style={[styles.dropdownLine1, isMobileSmall && { fontSize: Math.max(14, RESPONSIVE.buttonTitleSize - 4) }]} numberOfLines={1}>
                  {getCurrentModuleSubtitle()}
                </Text>
                <Text style={[styles.dropdownLine2, isMobileSmall && { fontSize: Math.min(12, RESPONSIVE.buttonSubtitleSize - 2), marginTop: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                  {(() => {
                    const { chapterLine, phraseLine } = getCurrentChapterLines();
                    return phraseLine ? `${chapterLine} — ${phraseLine}` : chapterLine;
                  })()}
                </Text>
              </View>
              <Text style={styles.dropdownArrow}>›</Text>
            </LinearGradient>
          </HoverableTouchableOpacity>
        </View>

        <ChaptersModal
          open={isChaptersOpen}
          onClose={() => setIsChaptersOpen(false)}
          moduleTitle={getCurrentModuleSubtitle()}
          chapters={getChaptersForModal()}
          onSelectModule={handleSelectModule}
        />
        </View>
      </View>

      <BottomNavBar questsIconRef={questsIconRef} />
      </View>

      {/* Loader module : feedback immédiat + timeout 4s + réessayer */}
      <Modal visible={!!generatingModule} transparent animationType="fade">
        <View style={styles.moduleLoadingOverlay}>
          <View style={styles.moduleLoadingBox}>
            <ActivityIndicator size="large" color="#FF7B2B" />
            <Text style={styles.moduleLoadingText}>
              {moduleLoadingTimeout ? 'Ça prend plus de temps que prévu…' : 'Chargement du module…'}
            </Text>
            {moduleLoadingTimeout ? (
              <TouchableOpacity
                style={styles.moduleLoadingRetry}
                onPress={() => {
                  setModuleLoadingTimeout(false);
                  const m = generatingModule;
                  if (m) handleStartModule(m);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.moduleLoadingRetryText}>Réessayer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Tutoriel : Modal garantit que l'overlay est au premier plan (couche native). */}
      <Modal
        visible={tourVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
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
  moduleLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleLoadingBox: {
    backgroundColor: '#2D3241',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 260,
  },
  moduleLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: theme.fonts.body,
  },
  moduleLoadingRetry: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF7B2B',
    borderRadius: 999,
  },
  moduleLoadingRetryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: theme.fonts.button,
    fontWeight: '900',
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
    paddingTop: 8,
    paddingBottom: Platform.OS === 'web' ? 100 : 24,
    paddingHorizontal: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  modulesContainer: {
    marginTop: -150,
    marginBottom: RESPONSIVE.buttonTopMargin,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: RESPONSIVE.circleSpacing,
  },
  moduleCircleSide: {
    width: RESPONSIVE.circleSizeSide,
    height: RESPONSIVE.circleSizeSide,
    borderRadius: RESPONSIVE.circleSizeSide / 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  moduleCircleMiddle: {
    width: RESPONSIVE.circleSizeMiddle,
    height: RESPONSIVE.circleSizeMiddle,
    borderRadius: RESPONSIVE.circleSizeMiddle / 2,
    overflow: 'hidden',
    marginBottom: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  moduleCircleGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  moduleGlossyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 999,
    overflow: 'hidden',
  },
  moduleCircleLogo: {},
  moduleCircleLocked: {
    backgroundColor: '#2A2E36',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444B57',
  },
  lockIcon: {
    fontSize: 48,
    color: '#B8B8B8',
  },
  lockIconImage: {
    width: 48,
    height: 48,
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
    position: 'relative',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  dropdownGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RESPONSIVE.buttonPaddingHorizontal,
    paddingVertical: RESPONSIVE.buttonPaddingVertical,
    paddingRight: 36,
  },
  dropdownTextBlock: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 8,
  },
  dropdownLine1: {
    fontSize: RESPONSIVE.buttonTitleSize,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  dropdownLine2: {
    fontSize: Math.min(RESPONSIVE.buttonSubtitleSize, 14),
    fontFamily: Platform.select({ web: 'Lato, sans-serif', default: 'System' }),
    fontWeight: '900',
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    marginTop: 2,
  },
  dropdownArrow: {
    position: 'absolute',
    right: 20,
    fontSize: 22,
    fontFamily: theme.fonts.button,
    color: '#FFFFFF',
    opacity: 0.95,
  },
});
