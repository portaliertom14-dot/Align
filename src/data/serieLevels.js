/**
 * Structure des niveaux pour chaque série
 */
export const serieLevels = {
  droit_argumentation: [
    { level: 1, title: 'Découverte', description: 'Explore les bases du droit et de l\'argumentation' },
    { level: 2, title: 'Mise en situation', description: 'Teste-toi dans des cas concrets' },
    { level: 3, title: 'Projection réelle', description: 'Visualise ton avenir dans ce domaine' },
  ],
  arts_communication: [
    { level: 1, title: 'Découverte', description: 'Explore ta créativité et tes moyens d\'expression' },
    { level: 2, title: 'Mise en situation', description: 'Crée et communique dans différents contextes' },
    { level: 3, title: 'Projection réelle', description: 'Visualise ta place dans les arts et la communication' },
  ],
  commerce_entrepreneuriat: [
    { level: 1, title: 'Découverte', description: 'Découvre l\'entrepreneuriat et le commerce' },
    { level: 2, title: 'Mise en situation', description: 'Teste-toi dans des projets concrets' },
    { level: 3, title: 'Projection réelle', description: 'Imagine ton futur entrepreneurial' },
  ],
  sciences_technologies: [
    { level: 1, title: 'Découverte', description: 'Explore les sciences et les technologies' },
    { level: 2, title: 'Mise en situation', description: 'Résous des problèmes concrets' },
    { level: 3, title: 'Projection réelle', description: 'Visualise ton parcours scientifique' },
  ],
  sciences_humaines_sociales: [
    { level: 1, title: 'Découverte', description: 'Explore les sciences humaines et sociales' },
    { level: 2, title: 'Mise en situation', description: 'Analyse des situations humaines' },
    { level: 3, title: 'Projection réelle', description: 'Imagine ton impact dans ce domaine' },
  ],
};

/**
 * Récupère les niveaux d'une série
 */
export function getSerieLevels(serieId) {
  return serieLevels[serieId] || [];
}

/**
 * Récupère un niveau spécifique d'une série
 */
export function getSerieLevel(serieId, levelNumber) {
  const levels = getSerieLevels(serieId);
  return levels.find(level => level.level === levelNumber) || null;
}








