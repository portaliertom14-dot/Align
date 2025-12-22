import AsyncStorage from '@react-native-async-storage/async-storage';

const METRICS_STORAGE_KEY = '@align_metrics';

/**
 * Métriques MVP à observer
 */
const DEFAULT_METRICS = {
  quizStarted: 0,
  quizCompleted: 0,
  resultViewed: 0,
  serieStarted: 0,
  level1Completed: 0,
  level2Completed: 0,
  level3Completed: 0,
};

/**
 * Récupère les métriques actuelles
 */
export async function getMetrics() {
  try {
    const metricsJson = await AsyncStorage.getItem(METRICS_STORAGE_KEY);
    if (metricsJson) {
      return JSON.parse(metricsJson);
    }
    return DEFAULT_METRICS;
  } catch (error) {
    console.error('Erreur lors de la récupération des métriques:', error);
    return DEFAULT_METRICS;
  }
}

/**
 * Incrémente une métrique
 */
export async function incrementMetric(metricName) {
  try {
    const metrics = await getMetrics();
    metrics[metricName] = (metrics[metricName] || 0) + 1;
    await AsyncStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
    return metrics;
  } catch (error) {
    console.error('Erreur lors de l\'incrémentation de la métrique:', error);
    return null;
  }
}

/**
 * Fonctions utilitaires pour les métriques principales
 */
export async function trackQuizStarted() {
  return await incrementMetric('quizStarted');
}

export async function trackQuizCompleted() {
  return await incrementMetric('quizCompleted');
}

export async function trackResultViewed() {
  return await incrementMetric('resultViewed');
}

export async function trackSerieStarted() {
  return await incrementMetric('serieStarted');
}

export async function trackLevelCompleted(levelNumber) {
  if (levelNumber === 1) {
    return await incrementMetric('level1Completed');
  } else if (levelNumber === 2) {
    return await incrementMetric('level2Completed');
  } else if (levelNumber === 3) {
    return await incrementMetric('level3Completed');
  }
}

/**
 * Calcule les taux de conversion
 */
export async function getConversionRates() {
  const metrics = await getMetrics();
  
  return {
    quizCompletionRate: metrics.quizStarted > 0 
      ? ((metrics.quizCompleted / metrics.quizStarted) * 100).toFixed(1)
      : 0,
    serieStartRate: metrics.quizCompleted > 0
      ? ((metrics.serieStarted / metrics.quizCompleted) * 100).toFixed(1)
      : 0,
    level1CompletionRate: metrics.serieStarted > 0
      ? ((metrics.level1Completed / metrics.serieStarted) * 100).toFixed(1)
      : 0,
  };
}

/**
 * Réinitialise les métriques (pour les tests)
 */
export async function resetMetrics() {
  try {
    await AsyncStorage.removeItem(METRICS_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation des métriques:', error);
    return false;
  }
}
