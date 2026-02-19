/**
 * Whitelist secteurs v16-sectors — source de vérité Edge.
 * Utilisé par analyze-sector, generate-dynamic-modules, generate-feed-module, validation.
 */

export const WHITELIST_VERSION = 'v16-sectors';

export const SECTOR_IDS = [
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
] as const;

export const SECTOR_NAMES: Record<string, string> = {
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

/** Valeur retournée quand le secteur ne peut pas être déterminé (confiance trop faible). Pas de fallback silencieux. */
export const SECTOR_UNDETERMINED = 'undetermined';

/** Utilisé uniquement en interne (ex: validation legacy). Ne pas utiliser pour le choix secteur analyze-sector. */
export const SECTOR_FALLBACK_ID = 'business_entrepreneuriat';
