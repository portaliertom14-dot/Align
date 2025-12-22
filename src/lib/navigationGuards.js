import { getUserProfile } from './userProfile';
import { getUserProgress } from './userProgress';

/**
 * Vérifie si l'utilisateur peut accéder au Quiz
 * Nécessite d'avoir terminé l'onboarding
 */
export async function canAccessQuiz() {
  // Pour le MVP, on accepte que l'utilisateur accède au quiz
  // L'onboarding peut être passé, donc on retourne true
  return true;
}

/**
 * Vérifie si l'utilisateur peut accéder aux Résultats
 * Nécessite d'avoir un profil calculé (quiz terminé)
 */
export async function canAccessResults() {
  const profile = await getUserProfile();
  return profile !== null;
}

/**
 * Vérifie si l'utilisateur peut accéder à la série
 * Nécessite d'avoir une série active
 */
export async function canAccessSeries() {
  const progress = await getUserProgress();
  return progress.activeSerie !== null && progress.activeDirection !== null;
}

/**
 * Vérifie si l'utilisateur peut accéder à un niveau de série
 * Nécessite d'avoir une série active
 */
export async function canAccessSerieLevel(levelNumber) {
  const progress = await getUserProgress();
  
  if (!progress.activeSerie) {
    return false;
  }

  // Vérifier que les niveaux précédents sont complétés
  if (levelNumber > 1) {
    const completedLevels = progress.completedLevels || [];
    
    // Pour accéder au niveau 2, il faut avoir complété le niveau 1
    if (levelNumber === 2 && !completedLevels.includes(1)) {
      return false;
    }
    
    // Pour accéder au niveau 3, il faut avoir complété le niveau 2
    if (levelNumber === 3 && !completedLevels.includes(2)) {
      return false;
    }
  }

  return true;
}

/**
 * Redirige l'utilisateur vers l'écran approprié selon son état
 * @param {Object} navigation - Objet navigation de React Navigation
 */
export async function redirectToAppropriateScreen(navigation) {
  const profile = await getUserProfile();
  const progress = await getUserProgress();

  // Si pas de profil, aller au quiz
  if (!profile) {
    navigation.replace('Main', { screen: 'Quiz' });
    return;
  }

  // Si pas de série active, aller aux résultats
  if (!progress.activeSerie) {
    navigation.replace('Resultat');
    return;
  }

  // Sinon, aller à l'accueil où l'utilisateur peut choisir un module
  navigation.replace('Feed');
}








