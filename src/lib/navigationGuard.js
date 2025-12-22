import { getUserProgress } from './userProgress';
import { getUserProfile } from './userProfile';

/**
 * États du parcours utilisateur
 */
export const JOURNEY_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  ONBOARDING: 'ONBOARDING',
  QUIZ: 'QUIZ',
  RESULTAT: 'RESULTAT',
  SERIE_START: 'SERIE_START',
  SERIE_LEVEL_1: 'SERIE_LEVEL_1',
  SERIE_LEVEL_2: 'SERIE_LEVEL_2',
  SERIE_LEVEL_3: 'SERIE_LEVEL_3',
};

/**
 * Détermine l'état actuel du parcours utilisateur
 */
export async function getCurrentJourneyState() {
  try {
    const profile = await getUserProfile();
    const progress = await getUserProgress();

    // Si pas de profil → Onboarding
    if (!profile) {
      return JOURNEY_STATES.ONBOARDING;
    }

    // Si pas de série active → Résultat (quiz fait mais série pas démarrée)
    if (!progress.activeSerie && !progress.activeDirection) {
      return JOURNEY_STATES.RESULTAT;
    }

    // Si série active → Série
    if (progress.activeSerie) {
      // Vérifier le niveau actuel
      if (progress.currentLevel === 1) {
        return JOURNEY_STATES.SERIE_LEVEL_1;
      } else if (progress.currentLevel === 2) {
        return JOURNEY_STATES.SERIE_LEVEL_2;
      } else if (progress.currentLevel === 3) {
        return JOURNEY_STATES.SERIE_LEVEL_3;
      }
      return JOURNEY_STATES.SERIE_START;
    }

    // Par défaut, résultat
    return JOURNEY_STATES.RESULTAT;
  } catch (error) {
    console.error('Erreur lors de la vérification du parcours:', error);
    return JOURNEY_STATES.ONBOARDING;
  }
}

/**
 * Vérifie si l'utilisateur peut accéder à un écran spécifique
 */
export async function canAccessScreen(screenName) {
  const currentState = await getCurrentJourneyState();

  // Mapping des écrans vers les états requis
  const screenRequirements = {
    'Onboarding': [JOURNEY_STATES.NOT_STARTED, JOURNEY_STATES.ONBOARDING],
    'Quiz': [JOURNEY_STATES.ONBOARDING, JOURNEY_STATES.QUIZ],
    'Resultat': [JOURNEY_STATES.QUIZ, JOURNEY_STATES.RESULTAT],
    // Anciens écrans Series supprimés - toujours autoriser Feed
    'Feed': [], // Feed accessible depuis n'importe quel état
    'Module': [], // Module accessible depuis Feed
    'ModuleCompletion': [], // ModuleCompletion accessible depuis Module
  };

  const allowedStates = screenRequirements[screenName] || [];
  return allowedStates.includes(currentState) || allowedStates.length === 0;
}

/**
 * Récupère l'écran de redirection si l'accès est refusé
 */
export async function getRedirectScreen() {
  const currentState = await getCurrentJourneyState();

  const redirectMap = {
    [JOURNEY_STATES.NOT_STARTED]: 'Onboarding',
    [JOURNEY_STATES.ONBOARDING]: 'Onboarding',
    [JOURNEY_STATES.QUIZ]: 'Quiz',
    [JOURNEY_STATES.RESULTAT]: 'Resultat',
    // Anciens écrans Series supprimés - rediriger vers Feed
    [JOURNEY_STATES.SERIE_START]: 'Feed',
    [JOURNEY_STATES.SERIE_LEVEL_1]: 'Feed',
    [JOURNEY_STATES.SERIE_LEVEL_2]: 'Feed',
    [JOURNEY_STATES.SERIE_LEVEL_3]: 'Feed',
  };

  return redirectMap[currentState] || 'Onboarding';
}
