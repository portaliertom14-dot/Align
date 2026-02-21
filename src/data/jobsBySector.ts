/**
 * Source de vérité unique : listes de métiers par secteur (noms uniquement).
 * 16 secteurs v16, 30 métiers par secteur. Pas de scoring, pas d'IA, pas d'axes.
 */

import { normalizeJobKey } from '../domain/normalizeJobKey';

// Aligné sur supabase/functions/_shared/sectors.ts
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

export type SectorId = (typeof SECTOR_IDS)[number];
export type JobTitle = string;

export const JOBS_BY_SECTOR: Record<SectorId, JobTitle[]> = {
  ingenierie_tech: [
    'Ingénieur logiciel',
    'Développeur backend',
    'Développeur frontend',
    'Développeur mobile',
    'Architecte logiciel',
    'DevOps engineer',
    'Ingénieur cloud',
    'Ingénieur cybersécurité',
    'Ingénieur systèmes embarqués',
    'Ingénieur robotique',
    'Ingénieur mécanique',
    'Ingénieur électrique',
    'Ingénieur aéronautique',
    'Ingénieur automobile',
    'Ingénieur industriel',
    'Architecte IT',
    'Responsable infrastructure',
    'CTO',
    'Ingénieur QA',
    'Expert réseaux',
    'Ingénieur R&D',
    'Product engineer',
    'Ingénieur data platform',
    'Responsable innovation tech',
    'Lead developer',
    'Responsable transformation digitale',
    'Ingénieur hardware',
    'Intégrateur systèmes',
    'Consultant tech',
    'Responsable technique',
  ],
  creation_design: [
    'Designer graphique',
    'UX designer',
    'UI designer',
    'Designer produit',
    'Designer industriel',
    'Directeur artistique',
    'Illustrateur',
    'Motion designer',
    'Photographe',
    'Vidéaste',
    'Réalisateur',
    'Scénariste',
    'Architecte d\'intérieur',
    'Styliste',
    'Créateur de marque',
    'Designer packaging',
    'Game designer',
    'Sound designer',
    'Animateur 3D',
    'Web designer',
    'Designer textile',
    'Directeur créatif',
    'Storyboarder',
    'Concept artist',
    'Designer d\'expérience',
    'Designer événementiel',
    'Designer mobilier',
    'Designer automobile',
    'Artiste digital',
    'Curateur artistique',
  ],
  business_entrepreneuriat: [
    'Entrepreneur',
    'CEO / Dirigeant d\'entreprise',
    'Consultant en stratégie',
    'Directeur général (DG)',
    'Business Developer senior',
    'Analyste financier',
    'Contrôleur de gestion',
    'Auditeur',
    'Responsable investissement',
    'Trader',
    'Responsable marketing',
    'Growth manager',
    'Responsable acquisition',
    'Brand manager',
    'Directeur commercial',
    'Chef de projet',
    'Product Manager',
    'Responsable opérations',
    'Responsable supply chain',
    'Responsable logistique',
    'Commercial B2B',
    'Account Manager',
    'Négociateur immobilier',
    'Responsable partenariats',
    'Responsable grands comptes',
    'Entrepreneur freelance',
    'Consultant indépendant',
    'Startupper',
    'Franchiseur',
    'Investisseur / Business angel',
  ],
  sante_bien_etre: [
    'Médecin généraliste',
    'Chirurgien',
    'Infirmier',
    'Kinésithérapeute',
    'Psychologue',
    'Psychiatre',
    'Sage-femme',
    'Pharmacien',
    'Dentiste',
    'Ostéopathe',
    'Nutritionniste',
    'Coach sportif santé',
    'Ergothérapeute',
    'Orthophoniste',
    'Manipulateur radio',
    'Biologiste médical',
    'Responsable clinique',
    'Aide-soignant',
    'Podologue',
    'Sophrologue',
    'Naturopathe',
    'Responsable EHPAD',
    'Directeur d\'hôpital',
    'Coordinateur de soins',
    'Préparateur en pharmacie',
    'Ambulancier',
    'Technicien de laboratoire',
    'Conseiller bien-être',
    'Responsable prévention santé',
    'Chercheur biomédical',
  ],
  droit_justice_securite: [
    'Avocat',
    'Magistrat',
    'Juge',
    'Procureur',
    'Notaire',
    'Huissier de justice',
    'Juriste d\'entreprise',
    'Consultant juridique',
    'Greffier',
    'Responsable conformité',
    'Inspecteur des impôts',
    'Juriste international',
    'Avocat fiscaliste',
    'Avocat pénaliste',
    'Juriste social',
    'Juriste immobilier',
    'Compliance officer',
    'Responsable affaires juridiques',
    'Analyste risques réglementaires',
    'Expert judiciaire',
    'Clerc de notaire',
    'Juriste fiscal',
    'Juriste en propriété intellectuelle',
    'Médiateur juridique',
    'Collaborateur d\'avocat',
    'Juriste contentieux',
    'Juriste RH',
    'Délégué à la protection des données',
    'Chargé d\'études juridiques',
    'Secrétaire juridique',
  ],
  defense_securite_civile: [
    'Militaire',
    'Officier d\'armée',
    'Sous-officier',
    'Pompier',
    'Officier pompier',
    'Gendarme',
    'CRS',
    'Agent de sécurité',
    'Responsable sûreté',
    'Analyste défense',
    'Responsable gestion de crise',
    'Spécialiste cybersécurité défense',
    'Commandant d\'unité',
    'Agent de protection civile',
    'Secouriste',
    'Contrôleur aérien militaire',
    'Officier marine',
    'Responsable sécurité industrielle',
    'Responsable sécurité aéroport',
    'Coordinateur secours',
    'Pilote militaire',
    'Ingénieur défense',
    'Sauveteur en mer',
    'Chef de centre secours',
    'Réserviste opérationnel',
    'Inspecteur sécurité',
    'Formateur secourisme',
    'Agent de sécurité incendie',
    'Responsable sécurité site sensible',
    'Officier des armées',
  ],
  education_formation: [
    'Enseignant du premier degré',
    'Enseignant du second degré',
    'Professeur agrégé',
    'Professeur certifié',
    'Formateur professionnel',
    'Conseiller principal d\'éducation',
    'Conseiller d\'orientation',
    'Enseignant-chercheur',
    'Professeur des écoles',
    'Formateur indépendant',
    'Ingénieur pédagogique',
    'Responsable formation',
    'Coordinateur pédagogique',
    'Enseignant en lycée pro',
    'Professeur en BTS',
    'Formateur en entreprise',
    'Tuteur',
    'Médiateur éducatif',
    'Animateur pédagogique',
    'Concepteur de formations',
    'Chargé de mission éducation',
    'Directeur d\'établissement',
    'Inspecteur de l\'éducation nationale',
    'Professeur documentaliste',
    'Enseignant spécialisé',
    'Formateur numérique',
    'Coach scolaire',
    'Intervenant en milieu scolaire',
    'Responsable CFA',
    'Directeur de centre de formation',
  ],
  sciences_recherche: [
    'Chercheur CNRS',
    'Enseignant-chercheur',
    'Ingénieur de recherche',
    'Post-doctorant',
    'Doctorant',
    'Chargé de recherche',
    'Technicien de recherche',
    'Data scientist (recherche)',
    'Biologiste',
    'Chimiste',
    'Physicien',
    'Mathématicien',
    'Épidémiologiste',
    'Statisticien recherche',
    'Archéologue',
    'Géologue',
    'Écologue',
    'Neurobiologiste',
    'Généticien',
    'Pharmacologue',
    'Responsable laboratoire',
    'Ingénieur d\'études',
    'Assistant ingénieur',
    'Documentaliste scientifique',
    'Responsable valorisation recherche',
    'Coordinateur projet recherche',
    'Analyste en recherche clinique',
    'Biostatisticien',
    'Expert scientifique',
    'Consultant en R&D',
  ],
  data_ia: [
    'Data scientist',
    'Data engineer',
    'Ingénieur machine learning',
    'Analyste de données',
    'Data analyst',
    'Architecte data',
    'Ingénieur ML ops',
    'Expert NLP',
    'Computer vision engineer',
    'Data steward',
    'Chief data officer',
    'Analyste business intelligence',
    'Développeur data',
    'Ingénieur data pipeline',
    'Data quality manager',
    'Statisticien data',
    'Consultant data',
    'Responsable data',
    'Ingénieur deep learning',
    'Data product manager',
    'Analyste décisionnel',
    'Ingénieur feature store',
    'Spécialiste data governance',
    'Data architect',
    'Ingénieur data platform',
    'Scientifique des données',
    'Ingénieur IA',
    'Expert data visualization',
    'Responsable analytics',
    'Ingénieur data science',
  ],
  industrie_artisanat: [
    'Artisan ébéniste',
    'Chaudronnier',
    'Soudeur',
    'Tourneur-fraiseur',
    'Usineur',
    'Électricien industriel',
    'Mécanicien industriel',
    'Opérateur de production',
    'Conducteur de machine',
    'Technicien de maintenance',
    'Chef d\'atelier',
    'Artisan plombier',
    'Artisan électricien',
    'Carreleur',
    'Peintre en bâtiment',
    'Menuisier',
    'Serriste',
    'Forgeron',
    'Serrurier',
    'Artisan pâtissier',
    'Boulanger artisan',
    'Charpentier',
    'Couverture zingueur',
    'Artisan verrier',
    'Céramiste',
    'Tapissier',
    'Horloger',
    'Bijoutier',
    'Maroquinier',
    'Facteur d\'instruments',
  ],
  environnement_agri: [
    'Ingénieur agronome',
    'Agriculteur',
    'Technicien environnement',
    'Chargé de mission environnement',
    'Écologue',
    'Gestionnaire d\'espaces naturels',
    'Animateur nature',
    'Ingénieur forestier',
    'Technicien forestier',
    'Ouvrier agricole',
    'Éleveur',
    'Viticulteur',
    'Maraîcher',
    'Conseiller agricole',
    'Ingénieur en dépollution',
    'Chargé HSE',
    'Auditeur environnement',
    'Responsable QHSE',
    'Technicien traitement des eaux',
    'Ingénieur énergies renouvelables',
    'Chargé de projet éolien',
    'Consultant RSE',
    'Responsable biodiversité',
    'Technicien rivière',
    'Gardien de refuge',
    'Paysagiste',
    'Jardinier',
    'Ouvrier espaces verts',
    'Conseiller en agroécologie',
    'Technicien de la mer et du littoral',
  ],
  communication_media: [
    'Journaliste',
    'Rédacteur',
    'Community manager',
    'Attaché de presse',
    'Chargé de communication',
    'Responsable communication',
    'Rédacteur en chef',
    'Rédacteur web',
    'Photographe',
    'Vidéaste',
    'Monteur vidéo',
    'Réalisateur',
    'Producteur',
    'Animateur radio',
    'Présentateur',
    'Social media manager',
    'Influenceur (métier)',
    'Content manager',
    'Copywriter',
    'Traducteur',
    'Interprète',
    'Relationniste',
    'Chargé de relations publiques',
    'Directeur de la communication',
    'Consultant en communication',
    'Graphiste (voir creation_design)',
    'Médiateur culturel',
    'Animateur de communauté',
    'Responsable éditorial',
    'Chef de projet communication',
  ],
  finance_assurance: [
    'Analyste financier',
    'Trader',
    'Contrôleur de gestion',
    'Actuaire',
    'Gestionnaire de portefeuille',
    'Auditeur financier',
    'Comptable',
    'Expert-comptable',
    'Commissaire aux comptes',
    'Chargé d\'affaires banque',
    'Conseiller en gestion de patrimoine',
    'Analyste crédit',
    'Risk manager',
    'Trésorier',
    'Directeur financier',
    'Responsable back-office',
    'Conseiller clientèle',
    'Agent d\'assurance',
    'Courtier en assurance',
    'Souscripteur assurance',
    'Gestionnaire sinistres',
    'Analyste quantitatif',
    'Compliance officer',
    'Responsable conformité financière',
    'Chargé de reporting',
    'Analyste M&A',
    'Consultant finance',
    'Gestionnaire de fonds',
    'Middle-office',
    'Responsable contrôle interne',
  ],
  sport_evenementiel: [
    'Éducateur sportif',
    'Coach sportif',
    'Organisateur d\'événements',
    'Entraîneur',
    'Professeur de sport',
    'Animateur sportif',
    'Directeur de club sportif',
    'Agent sportif',
    'Métiers du stade (exploitation)',
    'Chargé de projet événementiel',
    'Régisseur événementiel',
    'Coordinateur événements',
    'Responsable animation',
    'Moniteur de ski',
    'Moniteur d\'équitation',
    'Instructeur fitness',
    'Préparateur physique',
    'Arbitre',
    'Journaliste sportif',
    'Commentateur sportif',
    'Responsable partenariats sport',
    'Chargé de communication sport',
    'Gestionnaire d\'équipements sportifs',
    'Directeur de complexe sportif',
    'Organisateur de compétitions',
    'Scout sportif',
    'Responsable billetterie',
    'Chargé de production événementielle',
    'Animateur de team building',
    'Responsable sponsoring',
  ],
  social_humain: [
    'Éducateur spécialisé',
    'Assistant de service social',
    'Médiateur social',
    'Conseiller en insertion',
    'Animateur socio-culturel',
    'Éducateur jeunes enfants',
    'Moniteur-éducateur',
    'Conseiller conjugal',
    'Travailleur familial',
    'Chargé de mission insertion',
    'Coordinateur social',
    'Responsable de structure sociale',
    'Accompagnant éducatif',
    'Médiateur familial',
    'Conseiller en économie sociale',
    'Coordinateur ateliers',
    'Référent parcours',
    'Chargé de développement local',
    'Animateur de réseau',
    'Responsable vie résidentielle',
    'Coordinateur handicap',
    'Conseiller emploi',
    'Délégué à la tutelle',
    'Accompagnant personnes âgées',
    'Coordinateur bénévolat',
    'Chargé de projet solidarité',
    'Responsable association',
    'Animateur jeunesse',
    'Intervenant social',
    'Coordinateur parentalité',
  ],
  culture_patrimoine: [
    'Conservateur du patrimoine',
    'Médiateur culturel',
    'Régisseur d\'œuvres',
    'Chargé de mission patrimoine',
    'Archiviste',
    'Documentaliste',
    'Bibliothécaire',
    'Muséographe',
    'Commissaire d\'exposition',
    'Guide-conférencier',
    'Animateur du patrimoine',
    'Restaurateur d\'art',
    'Registrar',
    'Responsable de collection',
    'Chargé de production culturelle',
    'Directeur de lieu culturel',
    'Programmateur culturel',
    'Attaché de conservation',
    'Médiateur scientifique',
    'Chargé d\'action culturelle',
    'Coordinateur projets culturels',
    'Responsable des publics',
    'Régisseur spectacle',
    'Administrateur de production',
    'Chargé de diffusion',
    'Responsable mécénat culturel',
    'Chef de projet patrimoine',
    'Conservateur-restaurateur',
    'Historien de l\'art',
    'Chargé de valorisation patrimoniale',
  ],
};

/** Nombre de métiers par track pour les variantes (droit_justice_securite). */
export const JOBS_PER_VARIANT_TRACK = 30;

/**
 * Listes métiers par variante (sous-profil) pour certains secteurs.
 * droit_justice_securite : default = Droit/Justice, defense_track = Défense & Sécurité civile.
 * N = 30 par track (pas de fusion, 2 listes séparées).
 */
export type SectorVariantKey = 'default' | 'defense_track';
/** Variante droit_justice_securite : default = pôle Droit/Justice (30), defense_track = pôle Défense & Sécurité civile (30). */
export const JOBS_BY_SECTOR_VARIANT: Partial<Record<SectorId, Record<SectorVariantKey, JobTitle[]>>> = {
  droit_justice_securite: {
    default: [
      'Avocat',
      'Magistrat',
      'Juge',
      'Procureur',
      'Notaire',
      'Huissier de justice',
      'Juriste d\'entreprise',
      'Consultant juridique',
      'Greffier',
      'Responsable conformité',
      'Inspecteur des impôts',
      'Juriste international',
      'Avocat fiscaliste',
      'Avocat pénaliste',
      'Juriste social',
      'Juriste immobilier',
      'Compliance officer',
      'Responsable affaires juridiques',
      'Analyste risques réglementaires',
      'Expert judiciaire',
      'Clerc de notaire',
      'Juriste fiscal',
      'Juriste en propriété intellectuelle',
      'Médiateur juridique',
      'Collaborateur d\'avocat',
      'Juriste contentieux',
      'Juriste RH',
      'Délégué à la protection des données',
      'Chargé d\'études juridiques',
      'Secrétaire juridique',
    ],
    defense_track: [
      'Militaire',
      'Officier d\'armée',
      'Sous-officier',
      'Pompier',
      'Officier pompier',
      'Gendarme',
      'CRS',
      'Agent de sécurité',
      'Responsable sûreté',
      'Analyste défense',
      'Responsable gestion de crise',
      'Spécialiste cybersécurité défense',
      'Commandant d\'unité',
      'Agent de protection civile',
      'Secouriste',
      'Contrôleur aérien militaire',
      'Officier marine',
      'Responsable sécurité industrielle',
      'Responsable sécurité aéroport',
      'Coordinateur secours',
      'Pilote militaire',
      'Ingénieur défense',
      'Sauveteur en mer',
      'Chef de centre secours',
      'Réserviste opérationnel',
      'Inspecteur sécurité',
      'Formateur secourisme',
      'Agent de sécurité incendie',
      'Responsable sécurité site sensible',
      'Officier des armées',
    ],
  },
};

/**
 * Retourne la liste des métiers pour un secteur et une variante, ou null si pas de variante définie.
 * Pour droit_justice_securite : utilise default ou defense_track. Les autres secteurs => null.
 */
export function getJobsForSectorVariant(
  sectorId: SectorId,
  variant: SectorVariantKey
): JobTitle[] | null {
  const byVariant = JOBS_BY_SECTOR_VARIANT[sectorId];
  if (!byVariant || !byVariant[variant]) return null;
  return [...byVariant[variant]!];
}

/**
 * Vérifie l'intégrité de JOBS_BY_SECTOR_VARIANT : droit_justice_securite a default et defense_track,
 * chaque liste a exactement N métiers (N=30), pas de doublons à l'intérieur d'un track.
 */
export function validateJobsBySectorVariant(): void {
  const N = JOBS_PER_VARIANT_TRACK;
  const sectorId = 'droit_justice_securite' as SectorId;
  const byVariant = JOBS_BY_SECTOR_VARIANT[sectorId];
  if (!byVariant) {
    throw new Error('[jobsBySectorVariant] droit_justice_securite manquant dans JOBS_BY_SECTOR_VARIANT');
  }
  for (const track of ['default', 'defense_track'] as const) {
    const list = byVariant[track];
    if (!Array.isArray(list)) {
      throw new Error(`[jobsBySectorVariant] droit_justice_securite.${track} doit être un tableau`);
    }
    if (list.length !== N) {
      throw new Error(
        `[jobsBySectorVariant] droit_justice_securite.${track} doit avoir ${N} métiers, trouvé: ${list.length}`
      );
    }
    const seen = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const name = list[i];
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error(
          `[jobsBySectorVariant] Métier vide ou non-string dans droit_justice_securite.${track} à l'index ${i}`
        );
      }
      const normalized = name.trim();
      if (seen.has(normalized)) {
        throw new Error(
          `[jobsBySectorVariant] Doublon dans droit_justice_securite.${track}: "${normalized}"`
        );
      }
      seen.add(normalized);
    }
  }
}

/**
 * Vérifie l'intégrité de JOBS_BY_SECTOR : secteurs, longueur 30, pas de vide, pas de doublon interne.
 * En dev, appeler au chargement ou dans un test pour fail fast.
 */
export function validateJobsBySector(): void {
  const sectorIds = SECTOR_IDS as readonly string[];
  for (const id of sectorIds) {
    if (!(id in JOBS_BY_SECTOR)) {
      throw new Error(`[jobsBySector] Secteur manquant: ${id}`);
    }
    const list = JOBS_BY_SECTOR[id as SectorId];
    if (!Array.isArray(list)) {
      throw new Error(`[jobsBySector] Liste invalide pour secteur: ${id}`);
    }
    if (list.length !== 30) {
      throw new Error(
        `[jobsBySector] Secteur "${id}" doit avoir 30 métiers, trouvé: ${list.length}`
      );
    }
    const seen = new Set<string>();
    for (let i = 0; i < list.length; i++) {
      const name = list[i];
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error(
          `[jobsBySector] Métier vide ou non-string dans "${id}" à l'index ${i}`
        );
      }
      const normalized = name.trim();
      if (seen.has(normalized)) {
        throw new Error(
          `[jobsBySector] Doublon dans secteur "${id}": "${normalized}"`
        );
      }
      seen.add(normalized);
    }
  }
}

/**
 * Retourne une copie de la liste des métiers pour un secteur (évite les mutations).
 */
export function getJobsForSector(sectorId: SectorId): JobTitle[] {
  const list = JOBS_BY_SECTOR[sectorId];
  if (!list) {
    throw new Error(`[jobsBySector] Secteur inconnu: ${sectorId}`);
  }
  return [...list];
}

/**
 * Retourne un Set de clés normalisées (normalizeJobKey) pour les métiers du secteur.
 * Utilisé pour valider qu'un jobTitle reçu (ex. "Producteur") est bien dans la whitelist du secteur.
 */
export function getJobsForSectorNormalizedSet(
  sectorId: SectorId,
  variant: SectorVariantKey = 'default'
): Set<string> {
  const list =
    getJobsForSectorVariant(sectorId, variant) ?? getJobsForSector(sectorId);
  return new Set(list.map((title) => normalizeJobKey(title)));
}

// En dev, valider au chargement du module (optionnel, décommenter si souhaité)
// if (typeof __DEV__ !== 'undefined' && __DEV__) {
//   validateJobsBySector();
// }
