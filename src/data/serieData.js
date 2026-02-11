/**
 * Données des séries Align
 * Chaque série correspond à une direction principale
 */
export const series = {
  droit_argumentation: {
    id: 'droit_argumentation',
    title: 'Droit & Argumentation',
    description: 'Découvre si le droit te correspond vraiment.',
    totalLevels: 3,
    xpPerLevel: 100,
    icon: '⚖️',
  },
  arts_communication: {
    id: 'arts_communication',
    title: 'Arts & Communication',
    description: 'Explore ta créativité et ta façon de communiquer.',
    totalLevels: 3,
    xpPerLevel: 100,
    icon: '🎨',
  },
  commerce_entrepreneuriat: {
    id: 'commerce_entrepreneuriat',
    title: 'Commerce & Entrepreneuriat',
    description: 'Teste ton goût pour créer et transformer des idées.',
    totalLevels: 3,
    xpPerLevel: 100,
    icon: '🚀',
  },
  sciences_technologies: {
    id: 'sciences_technologies',
    title: 'Sciences & Technologies',
    description: 'Découvre si l\'innovation et la résolution de problèmes t\'animent.',
    totalLevels: 3,
    xpPerLevel: 100,
    icon: '🔬',
  },
  sciences_humaines_sociales: {
    id: 'sciences_humaines_sociales',
    title: 'Sciences Humaines & Sociales',
    description: 'Explore ta curiosité pour l\'humain et la société.',
    totalLevels: 3,
    xpPerLevel: 100,
    icon: '🌍',
  },
};

/**
 * Mapping des directions principales vers les séries
 */
export const DIRECTION_TO_SERIE = {
  'Droit & Argumentation': 'droit_argumentation',
  'Arts & Communication': 'arts_communication',
  'Commerce & Entrepreneuriat': 'commerce_entrepreneuriat',
  'Sciences & Technologies': 'sciences_technologies',
  'Sciences Humaines & Sociales': 'sciences_humaines_sociales',
};

/**
 * Mapping secteurId (IA / wayMock) → libellé direction attendu par DIRECTION_TO_SERIE.
 * Évite "Direction inconnue" quand l'écran passe result.secteurId (ex. "tech").
 */
export const SECTEUR_ID_TO_DIRECTION = {
  tech: 'Sciences & Technologies',
  business: 'Commerce & Entrepreneuriat',
  finance: 'Commerce & Entrepreneuriat',
  creation: 'Arts & Communication',
  design: 'Arts & Communication',
  communication: 'Arts & Communication',
  droit: 'Droit & Argumentation',
  sante: 'Sciences Humaines & Sociales',
  enseignement: 'Sciences Humaines & Sociales',
  sciences_humaines: 'Sciences Humaines & Sociales',
  recherche: 'Sciences & Technologies',
  ingenierie: 'Sciences & Technologies',
  architecture: 'Sciences & Technologies',
};

/**
 * Récupère une série par son ID
 */
export function getSerieById(serieId) {
  return series[serieId] || null;
}

/**
 * Récupère une série par la direction
 */
export function getSerieByDirection(direction) {
  const serieId = DIRECTION_TO_SERIE[direction];
  return serieId ? series[serieId] : null;
}








