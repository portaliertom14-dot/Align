/**
 * Whitelist secteurs v16-sectors — alignée avec Edge (_shared/sectors.ts).
 * Utilisée pour mapping direction, normalisation, affichage.
 */

export const WHITELIST_VERSION = 'v16-sectors';

export const SECTOR_IDS_V16 = [
  'ingenierie_tech',
  'creation_design',
  'business_entrepreneuriat',
  'sante_bien_etre',
  'droit_justice_securite',
  'defense_securite_civile',
  'education_formation',
  'sciences_recherche',
  'data_ia',
  'industrie_artisanat',
  'environnement_agri',
  'communication_media',
  'finance_assurance',
  'sport_evenementiel',
  'social_humain',
  'culture_patrimoine',
];

export const SECTOR_NAMES = {
  ingenierie_tech: 'Ingénierie & Tech',
  creation_design: 'Création & Design',
  business_entrepreneuriat: 'Business & Entrepreneuriat',
  sante_bien_etre: 'Santé & Bien-être',
  droit_justice_securite: 'Droit, Justice & Sécurité',
  defense_securite_civile: 'Défense & Sécurité civile',
  education_formation: 'Éducation & Formation',
  sciences_recherche: 'Sciences & Recherche',
  data_ia: 'Data & IA',
  industrie_artisanat: 'Industrie & Artisanat',
  environnement_agri: 'Environnement & Agri',
  communication_media: 'Communication & Médias',
  finance_assurance: 'Finance & Assurance',
  sport_evenementiel: 'Sport & Événementiel',
  social_humain: 'Social & Humain',
  culture_patrimoine: 'Culture & Patrimoine',
};

export const SECTOR_FALLBACK_ID = 'business_entrepreneuriat';
