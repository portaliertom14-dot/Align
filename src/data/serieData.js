/**
 * Données des séries Align
 * Chaque série correspond à une direction principale
 * SECTEUR_IDS_V16 défini localement pour éviter undefined au runtime (ordre de chargement / circular deps).
 */
import { SECTOR_FALLBACK_ID } from '../constants/sectors';

/** Liste des 16 secteurs v16 (copie locale pour fiabilité runtime). Alignée avec src/constants/sectors.js */
const SECTEUR_IDS_V16 = [
  'ingenierie_tech', 'creation_design', 'business_entrepreneuriat', 'sante_bien_etre',
  'droit_justice_securite', 'defense_securite_civile', 'education_formation', 'sciences_recherche',
  'data_ia', 'industrie_artisanat', 'environnement_agri', 'communication_media',
  'finance_assurance', 'sport_evenementiel', 'social_humain', 'culture_patrimoine',
];

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
 * Anciens ids secteur → nouvel id officiel v16-sectors.
 */
export const LEGACY_SECTEUR_ID_TO_NEW = {
  creation: 'creation_design',
  tech: 'ingenierie_tech',
  business: 'business_entrepreneuriat',
  droit: 'droit_justice_securite',
  sante: 'sante_bien_etre',
  design: 'creation_design',
  data: 'data_ia',
  finance: 'finance_assurance',
  media: 'communication_media',
  justice: 'droit_justice_securite',
  science: 'sciences_recherche',
  education: 'education_formation',
  architecture: 'culture_patrimoine',
  industrie: 'industrie_artisanat',
  sport: 'sport_evenementiel',
  social: 'social_humain',
  environnement: 'environnement_agri',
  defense: 'defense_securite_civile',
  sante_medical: 'sante_bien_etre',
  droit_justice: 'droit_justice_securite',
  defense_securite: 'defense_securite_civile',
  education_transmission: 'education_formation',
  communication_medias: 'communication_media',
  finance_audit: 'finance_assurance',
  industrie_production: 'industrie_artisanat',
  sport_performance: 'sport_evenementiel',
  social_accompagnement: 'social_humain',
  environnement_energie: 'environnement_agri',
  architecture_urbanisme: 'culture_patrimoine',
};

/**
 * Mapping secteurId v16 → libellé direction (DIRECTION_TO_SERIE). Zéro "Direction inconnue".
 */
export const SECTEUR_ID_TO_DIRECTION = {
  ingenierie_tech: 'Sciences & Technologies',
  data_ia: 'Sciences & Technologies',
  sciences_recherche: 'Sciences & Technologies',
  industrie_artisanat: 'Sciences & Technologies',
  environnement_agri: 'Sciences & Technologies',
  creation_design: 'Arts & Communication',
  communication_media: 'Arts & Communication',
  culture_patrimoine: 'Arts & Communication',
  business_entrepreneuriat: 'Commerce & Entrepreneuriat',
  finance_assurance: 'Commerce & Entrepreneuriat',
  droit_justice_securite: 'Droit & Argumentation',
  defense_securite_civile: 'Droit & Argumentation',
  sante_bien_etre: 'Sciences Humaines & Sociales',
  education_formation: 'Sciences Humaines & Sociales',
  sport_evenementiel: 'Sciences Humaines & Sociales',
  social_humain: 'Sciences Humaines & Sociales',
};

/** Direction label → un secteurId canonique v16. */
export const DIRECTION_TO_FIRST_SECTEUR = {
  'Sciences & Technologies': 'ingenierie_tech',
  'Arts & Communication': 'creation_design',
  'Commerce & Entrepreneuriat': 'business_entrepreneuriat',
  'Droit & Argumentation': 'droit_justice_securite',
  'Sciences Humaines & Sociales': 'sante_bien_etre',
};

/** Réexport pour compatibilité (source de vérité : constants/sectors.js). */
export { SECTEUR_IDS_V16 };

/** Normalise tout secteurId en id v16 valide. Fallback déterministe. Log si inconnu. */
export function normalizeSecteurIdToV16(raw) {
  const s = (raw && typeof raw === 'string') ? raw.trim().toLowerCase().replace(/\s+/g, '_') : '';
  if (!s) return SECTOR_FALLBACK_ID;
  const legacy = LEGACY_SECTEUR_ID_TO_NEW[s] || s;
  const list = Array.isArray(SECTEUR_IDS_V16) ? SECTEUR_IDS_V16 : [];
  if (list.length && list.includes(legacy)) return legacy;
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[serieData] sectorId inconnu, fallback:', raw, '->', SECTOR_FALLBACK_ID);
  }
  return SECTOR_FALLBACK_ID;
}

/**
 * Récupère une série par son ID
 */
export function getSerieById(serieId) {
  return series[serieId] || null;
}

/**
 * Récupère une série par la direction (libellé, ex. "Sciences & Technologies")
 */
export function getSerieByDirection(direction) {
  const serieId = DIRECTION_TO_SERIE[direction];
  return serieId ? series[serieId] : null;
}

/**
 * Récupère une série par secteurId v16 (activeDirection stocke un secteurId).
 */
export function getSerieBySecteurId(secteurId) {
  const normalized = normalizeSecteurIdToV16(secteurId);
  const direction = SECTEUR_ID_TO_DIRECTION[normalized];
  return direction ? getSerieByDirection(direction) : series[DIRECTION_TO_SERIE['Sciences & Technologies']];
}

/** Récupère un secteurId v16 à partir d'un serieId (ex: sciences_technologies → ingenierie_tech). */
export function getSecteurIdFromSerieId(serieId) {
  if (!serieId || typeof serieId !== 'string') return SECTOR_FALLBACK_ID;
  const direction = Object.entries(DIRECTION_TO_SERIE).find(([, s]) => s === serieId.trim())?.[0];
  return direction ? (DIRECTION_TO_FIRST_SECTEUR[direction] ?? SECTOR_FALLBACK_ID) : SECTOR_FALLBACK_ID;
}








