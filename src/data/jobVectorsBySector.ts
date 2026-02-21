/**
 * Profils vectoriels (8 axes) des métiers par secteur.
 * Secteur pilote : business_entrepreneuriat (30 vecteurs).
 * droit_justice_securite : 2 tracks (default + defense_track), 30 vecteurs chacun.
 *
 * Archétypes Business : Stratégie/Direction, Finance/Perf, Marketing/Growth, Ops/Produit, Sales, Indépendants.
 * Droit default : ANALYSE/STRUCTURE élevés, CONTACT_HUMAIN moyen, LEADERSHIP variable.
 * Defense track : ACTION/RISK_TOLERANCE élevés, STRUCTURE moyen/haut, CONTACT_HUMAIN variable.
 */

import type { SectorId, JobTitle, SectorVariantKey } from './jobsBySector';
import { getJobsForSector, getJobsForSectorVariant, JOBS_BY_SECTOR, JOBS_BY_SECTOR_VARIANT } from './jobsBySector';
import type { JobVector } from '../domain/jobAxes';
import { JOB_AXES } from '../domain/jobAxes';
import { SECTOR_ARCHETYPES } from './sectorArchetypes';
import { generateVectorsForSector } from '../domain/generateSectorVectors';

/** Secteur pilote pour le moteur métier par axes. Modifiable pour basculer le pilote. */
export const PILOT_SECTOR: SectorId = 'business_entrepreneuriat';

function v(
  STRUCTURE: number,
  CREATIVITE: number,
  ACTION: number,
  CONTACT_HUMAIN: number,
  ANALYSE: number,
  RISK_TOLERANCE: number,
  STABILITE: number,
  LEADERSHIP: number
): JobVector {
  const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));
  return {
    STRUCTURE: clamp(STRUCTURE),
    CREATIVITE: clamp(CREATIVITE),
    ACTION: clamp(ACTION),
    CONTACT_HUMAIN: clamp(CONTACT_HUMAIN),
    ANALYSE: clamp(ANALYSE),
    RISK_TOLERANCE: clamp(RISK_TOLERANCE),
    STABILITE: clamp(STABILITE),
    LEADERSHIP: clamp(LEADERSHIP),
  };
}

/**
 * Pour chaque secteur activé : un enregistrement [JobTitle → JobVector].
 * Clés = chaînes exactes de JOBS_BY_SECTOR["business_entrepreneuriat"] (whitelist unique).
 */
export const JOB_VECTORS_BY_SECTOR: Partial<Record<SectorId, Record<JobTitle, JobVector>>> = {
  [PILOT_SECTOR]: {
    Entrepreneur: v(4, 6, 9, 5, 6, 9, 2, 7),
    'CEO / Dirigeant d\'entreprise': v(7, 5, 7, 6, 8, 7, 5, 10),
    'Consultant en stratégie': v(6, 5, 6, 6, 8, 6, 4, 8),
    'Directeur général (DG)': v(7, 5, 7, 6, 8, 7, 5, 10),
    'Business Developer senior': v(5, 4, 8, 9, 5, 5, 5, 7),
    'Analyste financier': v(8, 2, 4, 3, 9, 4, 7, 4),
    'Contrôleur de gestion': v(8, 2, 4, 4, 9, 4, 7, 5),
    Auditeur: v(8, 2, 4, 4, 9, 4, 8, 5),
    'Responsable investissement': v(7, 3, 5, 5, 8, 6, 5, 6),
    Trader: v(6, 4, 8, 4, 7, 9, 3, 5),
    'Responsable marketing': v(6, 7, 6, 6, 6, 5, 5, 7),
    'Growth manager': v(5, 8, 8, 5, 6, 7, 3, 6),
    'Responsable acquisition': v(6, 7, 7, 6, 6, 6, 4, 7),
    'Brand manager': v(6, 8, 5, 6, 5, 5, 5, 6),
    'Directeur commercial': v(6, 4, 8, 8, 6, 5, 5, 9),
    'Chef de projet': v(8, 4, 6, 5, 7, 4, 6, 5),
    'Product Manager': v(7, 5, 6, 5, 7, 4, 6, 6),
    'Responsable opérations': v(8, 4, 6, 5, 7, 4, 6, 7),
    'Responsable supply chain': v(8, 3, 6, 5, 7, 4, 7, 6),
    'Responsable logistique': v(8, 3, 6, 5, 7, 4, 7, 5),
    'Commercial B2B': v(5, 4, 8, 9, 5, 5, 5, 6),
    'Account Manager': v(5, 4, 8, 9, 5, 5, 5, 6),
    'Négociateur immobilier': v(5, 4, 7, 9, 5, 5, 5, 6),
    'Responsable partenariats': v(5, 5, 7, 9, 5, 5, 5, 7),
    'Responsable grands comptes': v(5, 4, 8, 9, 6, 5, 5, 7),
    'Entrepreneur freelance': v(4, 6, 9, 5, 6, 9, 2, 7),
    'Consultant indépendant': v(6, 5, 6, 6, 8, 6, 4, 8),
    Startupper: v(4, 7, 9, 5, 6, 10, 1, 8),
    Franchiseur: v(5, 5, 8, 6, 6, 8, 4, 7),
    'Investisseur / Business angel': v(6, 5, 6, 5, 8, 9, 4, 7),
  },

  /** Secteur finance_assurance : 30 métiers, pas de variant. STRUCTURE/ANALYSE élevés, STABILITE élevée sauf Trader (RISK_TOLERANCE haut). */
  finance_assurance: {
    'Analyste financier': v(8, 2, 4, 3, 9, 4, 7, 4),
    Trader: v(5, 4, 9, 3, 7, 9, 2, 6),
    'Contrôleur de gestion': v(8, 2, 4, 4, 9, 4, 7, 5),
    Actuaire: v(9, 3, 3, 3, 9, 3, 8, 4),
    'Gestionnaire de portefeuille': v(7, 4, 6, 4, 8, 7, 5, 5),
    'Auditeur financier': v(8, 2, 4, 4, 9, 3, 8, 5),
    Comptable: v(9, 1, 4, 4, 8, 2, 9, 3),
    'Expert-comptable': v(8, 2, 4, 5, 9, 3, 8, 6),
    'Commissaire aux comptes': v(9, 2, 4, 4, 9, 3, 9, 6),
    'Chargé d\'affaires banque': v(6, 3, 6, 8, 7, 5, 6, 5),
    'Conseiller en gestion de patrimoine': v(6, 4, 5, 9, 7, 5, 6, 5),
    'Analyste crédit': v(8, 2, 4, 4, 9, 4, 7, 4),
    'Risk manager': v(8, 3, 5, 4, 9, 5, 7, 6),
    Trésorier: v(8, 3, 5, 5, 8, 5, 7, 8),
    'Directeur financier': v(8, 4, 6, 6, 8, 6, 6, 9),
    'Responsable back-office': v(8, 2, 5, 4, 8, 3, 8, 5),
    'Conseiller clientèle': v(6, 3, 5, 9, 6, 4, 7, 4),
    'Agent d\'assurance': v(7, 3, 5, 8, 6, 4, 7, 4),
    'Courtier en assurance': v(6, 4, 6, 9, 6, 5, 5, 5),
    'Souscripteur assurance': v(8, 3, 5, 5, 8, 4, 7, 5),
    'Gestionnaire sinistres': v(8, 2, 5, 6, 7, 4, 7, 5),
    'Analyste quantitatif': v(8, 4, 5, 3, 9, 6, 6, 4),
    'Compliance officer': v(9, 2, 4, 5, 9, 3, 8, 6),
    'Responsable conformité financière': v(8, 2, 4, 5, 9, 3, 8, 6),
    'Chargé de reporting': v(8, 2, 5, 4, 8, 3, 8, 4),
    'Analyste M&A': v(7, 5, 6, 5, 9, 7, 5, 6),
    'Consultant finance': v(7, 4, 5, 6, 8, 5, 5, 7),
    'Gestionnaire de fonds': v(7, 4, 6, 4, 8, 7, 5, 6),
    'Middle-office': v(8, 2, 5, 4, 8, 4, 8, 4),
    'Responsable contrôle interne': v(8, 2, 4, 5, 9, 3, 8, 6),
  },

  /** Secteur data_ia : 30 métiers, pas de variant. Profils variés pour similarité < 0.96 et réactivité metier_10 (ANALYSE vs CONTACT). */
  data_ia: {
    'Data scientist': v(8, 7, 5, 3, 9, 5, 6, 4),
    'Data engineer': v(9, 3, 6, 2, 9, 5, 8, 3),
    'Ingénieur machine learning': v(8, 5, 6, 2, 10, 6, 6, 3),
    'Analyste de données': v(7, 5, 4, 5, 9, 4, 8, 4),
    'Data analyst': v(7, 6, 5, 6, 8, 4, 7, 4),
    'Architecte data': v(9, 5, 4, 3, 9, 4, 8, 7),
    'Ingénieur ML ops': v(9, 3, 7, 2, 8, 5, 7, 4),
    'Expert NLP': v(7, 9, 5, 2, 9, 6, 5, 3),
    'Computer vision engineer': v(8, 7, 6, 2, 9, 5, 6, 3),
    'Data steward': v(9, 2, 3, 4, 8, 3, 9, 4),
    'Chief data officer': v(6, 4, 5, 8, 8, 5, 6, 9),
    'Analyste business intelligence': v(6, 7, 5, 7, 8, 4, 6, 5),
    'Développeur data': v(8, 5, 7, 2, 9, 6, 6, 3),
    'Ingénieur data pipeline': v(9, 3, 6, 2, 8, 4, 8, 3),
    'Data quality manager': v(9, 2, 4, 5, 8, 3, 9, 5),
    'Statisticien data': v(9, 3, 3, 2, 10, 7, 7, 3),
    'Consultant data': v(6, 6, 5, 8, 7, 5, 5, 7),
    'Responsable data': v(6, 4, 5, 7, 8, 5, 7, 8),
    'Ingénieur deep learning': v(8, 7, 6, 2, 10, 6, 5, 3),
    'Data product manager': v(6, 8, 5, 7, 7, 5, 6, 6),
    'Analyste décisionnel': v(8, 5, 4, 5, 9, 4, 7, 5),
    'Ingénieur feature store': v(9, 3, 5, 2, 8, 4, 8, 4),
    'Spécialiste data governance': v(9, 2, 3, 4, 8, 3, 9, 5),
    'Data architect': v(9, 5, 4, 3, 9, 4, 7, 6),
    'Ingénieur data platform': v(9, 3, 6, 2, 8, 5, 7, 4),
    'Scientifique des données': v(7, 7, 5, 2, 10, 6, 6, 4),
    'Ingénieur IA': v(7, 8, 6, 2, 10, 5, 5, 4),
    'Expert data visualization': v(6, 9, 5, 4, 7, 5, 5, 4),
    'Responsable analytics': v(6, 5, 5, 7, 8, 5, 6, 8),
    'Ingénieur data science': v(8, 6, 6, 3, 9, 5, 6, 4),
  },

  /** Secteur ingenierie_tech : 30 métiers, pas de variant. Profils variés pour similarité < 0.96 (ACTION/STABILITE/STRUCTURE, leadership technique). */
  ingenierie_tech: {
    'Ingénieur logiciel': v(8, 5, 6, 3, 8, 5, 8, 4),
    'Développeur backend': v(8, 3, 7, 2, 8, 5, 9, 3),
    'Développeur frontend': v(7, 8, 6, 3, 6, 5, 6, 3),
    'Développeur mobile': v(7, 7, 8, 3, 6, 6, 6, 3),
    'Architecte logiciel': v(9, 5, 4, 3, 8, 4, 8, 7),
    'DevOps engineer': v(9, 3, 7, 2, 7, 5, 9, 4),
    'Ingénieur cloud': v(9, 3, 6, 2, 7, 5, 9, 5),
    'Ingénieur cybersécurité': v(8, 4, 6, 3, 8, 5, 8, 4),
    'Ingénieur systèmes embarqués': v(8, 4, 8, 2, 8, 6, 7, 3),
    'Ingénieur robotique': v(7, 5, 9, 2, 7, 6, 6, 4),
    'Ingénieur mécanique': v(8, 3, 8, 3, 7, 5, 9, 3),
    'Ingénieur électrique': v(8, 3, 7, 2, 7, 5, 9, 3),
    'Ingénieur aéronautique': v(9, 4, 7, 2, 8, 6, 8, 4),
    'Ingénieur automobile': v(8, 3, 8, 3, 6, 5, 8, 3),
    'Ingénieur industriel': v(8, 2, 7, 4, 6, 4, 9, 4),
    'Architecte IT': v(9, 5, 4, 4, 8, 4, 7, 8),
    'Responsable infrastructure': v(8, 3, 6, 5, 7, 4, 9, 8),
    CTO: v(6, 5, 6, 7, 7, 6, 5, 10),
    'Ingénieur QA': v(9, 3, 6, 3, 7, 3, 9, 3),
    'Expert réseaux': v(9, 2, 6, 3, 7, 4, 9, 4),
    'Ingénieur R&D': v(6, 8, 7, 2, 8, 7, 5, 4),
    'Product engineer': v(7, 6, 7, 5, 7, 5, 6, 5),
    'Ingénieur data platform': v(9, 4, 6, 3, 8, 5, 8, 4),
    'Responsable innovation tech': v(5, 9, 6, 5, 6, 7, 4, 8),
    'Lead developer': v(8, 5, 6, 5, 8, 5, 6, 6),
    'Responsable transformation digitale': v(5, 4, 5, 8, 7, 5, 5, 9),
    'Ingénieur hardware': v(8, 3, 7, 2, 8, 5, 8, 3),
    'Intégrateur systèmes': v(9, 2, 6, 3, 7, 4, 9, 3),
    'Consultant tech': v(5, 5, 5, 8, 7, 5, 4, 7),
    'Responsable technique': v(6, 4, 6, 6, 7, 4, 6, 9),
  },
};

/** Secteur droit_justice_securite : vecteurs par variante (default = Droit/Justice, defense_track = Défense & Sécurité civile). 30 métiers par track. */
const DROIT_SECTOR: SectorId = 'droit_justice_securite';

export const JOB_VECTORS_BY_SECTOR_VARIANT: Partial<
  Record<SectorId, Partial<Record<SectorVariantKey, Record<JobTitle, JobVector>>>>
> = {
  [DROIT_SECTOR]: {
    default: {
      Avocat: v(7, 4, 5, 7, 9, 4, 6, 7),
      Magistrat: v(8, 2, 4, 5, 9, 2, 8, 8),
      Juge: v(8, 2, 3, 5, 9, 2, 9, 7),
      Procureur: v(8, 3, 6, 6, 9, 4, 7, 8),
      Notaire: v(8, 3, 4, 6, 8, 3, 8, 6),
      'Huissier de justice': v(7, 2, 6, 5, 7, 3, 7, 5),
      'Juriste d\'entreprise': v(7, 3, 4, 5, 9, 3, 7, 5),
      'Consultant juridique': v(6, 4, 5, 6, 9, 4, 5, 7),
      Greffier: v(8, 2, 3, 4, 8, 2, 9, 4),
      'Responsable conformité': v(8, 2, 4, 5, 9, 3, 8, 6),
      'Inspecteur des impôts': v(8, 2, 5, 4, 9, 2, 8, 5),
      'Juriste international': v(7, 4, 5, 6, 9, 4, 5, 6),
      'Avocat fiscaliste': v(7, 3, 4, 5, 9, 3, 7, 6),
      'Avocat pénaliste': v(7, 4, 6, 7, 8, 5, 5, 7),
      'Juriste social': v(7, 3, 4, 6, 8, 3, 7, 5),
      'Juriste immobilier': v(7, 3, 4, 5, 8, 3, 7, 5),
      'Compliance officer': v(8, 2, 4, 5, 9, 3, 8, 6),
      'Responsable affaires juridiques': v(7, 3, 4, 6, 9, 3, 7, 7),
      'Analyste risques réglementaires': v(8, 2, 3, 4, 9, 3, 8, 5),
      'Expert judiciaire': v(7, 4, 4, 5, 9, 3, 6, 6),
      'Clerc de notaire': v(8, 2, 4, 5, 7, 2, 8, 3),
      'Juriste fiscal': v(8, 2, 3, 4, 9, 2, 8, 5),
      'Juriste en propriété intellectuelle': v(7, 5, 4, 5, 8, 4, 6, 5),
      'Médiateur juridique': v(6, 4, 5, 9, 7, 3, 6, 5),
      'Collaborateur d\'avocat': v(7, 3, 5, 5, 8, 3, 6, 4),
      'Juriste contentieux': v(7, 4, 6, 6, 8, 4, 5, 5),
      'Juriste RH': v(7, 3, 4, 6, 8, 3, 7, 5),
      'Délégué à la protection des données': v(8, 2, 4, 4, 9, 3, 8, 5),
      'Chargé d\'études juridiques': v(7, 3, 4, 5, 8, 3, 7, 4),
      'Secrétaire juridique': v(8, 2, 4, 6, 6, 2, 8, 3),
    },
    defense_track: {
      Militaire: v(7, 2, 9, 5, 5, 8, 4, 7),
      'Officier d\'armée': v(7, 2, 8, 6, 6, 7, 5, 9),
      'Sous-officier': v(7, 2, 8, 5, 5, 7, 5, 6),
      Pompier: v(6, 2, 9, 5, 4, 8, 4, 6),
      'Officier pompier': v(7, 2, 8, 6, 5, 7, 5, 8),
      Gendarme: v(8, 2, 8, 5, 5, 6, 6, 7),
      CRS: v(7, 1, 9, 4, 4, 7, 5, 6),
      'Agent de sécurité': v(6, 1, 7, 5, 4, 5, 5, 4),
      'Responsable sûreté': v(7, 2, 6, 5, 6, 5, 6, 7),
      'Analyste défense': v(7, 3, 5, 4, 8, 5, 6, 5),
      'Responsable gestion de crise': v(7, 3, 8, 6, 7, 6, 4, 8),
      'Spécialiste cybersécurité défense': v(8, 4, 6, 4, 8, 5, 5, 5),
      'Commandant d\'unité': v(8, 2, 8, 6, 6, 7, 5, 9),
      'Agent de protection civile': v(6, 2, 8, 5, 4, 6, 5, 5),
      Secouriste: v(5, 2, 8, 6, 4, 6, 4, 4),
      'Contrôleur aérien militaire': v(8, 2, 6, 4, 7, 5, 6, 6),
      'Officier marine': v(7, 2, 8, 5, 6, 7, 5, 8),
      'Responsable sécurité industrielle': v(8, 2, 5, 5, 7, 5, 7, 7),
      'Responsable sécurité aéroport': v(8, 2, 6, 5, 6, 5, 6, 7),
      'Coordinateur secours': v(7, 2, 8, 6, 5, 6, 4, 7),
      'Pilote militaire': v(7, 3, 8, 4, 6, 8, 4, 7),
      'Ingénieur défense': v(8, 4, 6, 4, 8, 5, 6, 5),
      'Sauveteur en mer': v(5, 2, 9, 5, 4, 7, 3, 5),
      'Chef de centre secours': v(7, 2, 8, 6, 5, 6, 5, 8),
      'Réserviste opérationnel': v(6, 2, 8, 5, 5, 7, 4, 6),
      'Inspecteur sécurité': v(7, 2, 6, 5, 7, 5, 6, 6),
      'Formateur secourisme': v(6, 3, 7, 7, 5, 5, 5, 5),
      'Agent de sécurité incendie': v(6, 2, 8, 5, 4, 6, 5, 5),
      'Responsable sécurité site sensible': v(8, 2, 6, 5, 7, 5, 7, 7),
      'Officier des armées': v(7, 2, 8, 6, 6, 7, 5, 9),
    },
  },
};

/** Cache mémoire des vecteurs générés par (sectorId, variant). */
const GENERATED_CACHE = new Map<string, Record<JobTitle, JobVector>>();

/**
 * Valide qu'un mapping vecteurs correspond exactement à la whitelist et que chaque vecteur a 8 axes 0..10.
 */
export function validateVectorsAgainstWhitelist(
  jobList: JobTitle[],
  vectors: Record<string, JobVector>,
  expectedCount: number = 30
): void {
  if (!Array.isArray(jobList) || jobList.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] Whitelist doit avoir ${expectedCount} métiers, trouvé: ${jobList?.length ?? 0}`
    );
  }
  const vectorKeys = Object.keys(vectors);
  if (vectorKeys.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] Vecteurs doit avoir ${expectedCount} entrées, trouvé: ${vectorKeys.length}`
    );
  }
  const jobSet = new Set(jobList);
  for (const key of vectorKeys) {
    if (!jobSet.has(key)) {
      throw new Error(`[jobVectorsBySector] Vecteur orphelin: "${key}" absent de la whitelist`);
    }
  }
  for (const jobTitle of jobList) {
    if (!(jobTitle in vectors)) {
      throw new Error(`[jobVectorsBySector] Métier sans vecteur: "${jobTitle}"`);
    }
    const vec = vectors[jobTitle]!;
    for (const axis of JOB_AXES) {
      const val = vec[axis];
      if (typeof val !== 'number' || val < 0 || val > 10) {
        throw new Error(
          `[jobVectorsBySector] Vecteur invalide pour "${jobTitle}", axe ${axis}: doit être 0..10, trouvé: ${val}`
        );
      }
    }
  }
}

/**
 * Retourne les vecteurs métiers pour un secteur et une variante.
 * 1) Secteurs manuels (JOB_VECTORS_BY_SECTOR) : priorité, inchangés.
 * 2) Droit (JOB_VECTORS_BY_SECTOR_VARIANT) : default / defense_track.
 * 3) Secteurs avec archétype : génération déterministe + cache.
 * 4) Sinon : null (fallback).
 */
export function getVectorsForSectorAndVariant(
  sectorId: SectorId,
  variant: SectorVariantKey
): Record<JobTitle, JobVector> | null {
  const direct = JOB_VECTORS_BY_SECTOR[sectorId];
  if (direct && typeof direct === 'object') {
    return direct;
  }
  const byVariant = JOB_VECTORS_BY_SECTOR_VARIANT[sectorId];
  if (byVariant && typeof byVariant === 'object') {
    const vectors = byVariant[variant];
    if (vectors && typeof vectors === 'object') return vectors;
  }
  const archetype = SECTOR_ARCHETYPES[sectorId];
  if (archetype) {
    const jobs = getJobsForSectorVariant(sectorId, variant) ?? getJobsForSector(sectorId);
    if (jobs.length !== 30) {
      throw new Error(
        `[jobVectorsBySector] Secteur "${sectorId}" doit avoir 30 métiers pour génération, trouvé: ${jobs.length}`
      );
    }
    const cacheKey = `${sectorId}::${variant}`;
    const cached = GENERATED_CACHE.get(cacheKey);
    if (cached) return cached;
    const vectors = generateVectorsForSector(sectorId, archetype, jobs);
    validateVectorsAgainstWhitelist(jobs, vectors, 30);
    GENERATED_CACHE.set(cacheKey, vectors);
    return vectors;
  }
  return null;
}

/**
 * Vérifie que pour le secteur pilote :
 * - il y a exactement 30 jobs,
 * - chaque job a un vecteur complet (8 axes, valeurs 0..10).
 * Lève si la structure est vide ou invalide.
 */
export function validateJobVectorsForPilot(): void {
  const vectors = JOB_VECTORS_BY_SECTOR[PILOT_SECTOR];
  const jobs = getJobsForSector(PILOT_SECTOR);

  if (!vectors || typeof vectors !== 'object') {
    throw new Error(
      `[jobVectorsBySector] Secteur pilote "${PILOT_SECTOR}" : JOB_VECTORS_BY_SECTOR non initialisé. Remplir les 30 vecteurs métier.`
    );
  }

  const entries = Object.keys(vectors);
  if (entries.length !== 30) {
    throw new Error(
      `[jobVectorsBySector] Secteur pilote doit avoir exactement 30 métiers, trouvé: ${entries.length}`
    );
  }

  for (const jobTitle of jobs) {
    const vec = vectors[jobTitle];
    if (!vec || typeof vec !== 'object') {
      throw new Error(
        `[jobVectorsBySector] Métier sans vecteur dans le pilote: "${jobTitle}"`
      );
    }
    for (const axis of JOB_AXES) {
      const val = vec[axis];
      if (typeof val !== 'number' || val < 0 || val > 10) {
        throw new Error(
          `[jobVectorsBySector] Vecteur invalide pour "${jobTitle}", axe ${axis}: doit être 0..10, trouvé: ${val}`
        );
      }
    }
  }
}

/**
 * Vérifie l'intégrité des vecteurs pour un secteur sans variante (ex. finance_assurance).
 * Whitelist = JOBS_BY_SECTOR[sectorId], mapping = JOB_VECTORS_BY_SECTOR[sectorId].
 * Clés vecteurs doivent être exactement les titres de la whitelist, chaque vecteur 8 axes 0..10.
 */
export function validateJobVectorsForSector(
  sectorId: SectorId,
  expectedCount: number = 30
): void {
  const jobList = JOBS_BY_SECTOR[sectorId];
  if (!Array.isArray(jobList) || jobList.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] Secteur "${sectorId}" doit avoir une whitelist de ${expectedCount} métiers, trouvé: ${jobList?.length ?? 0}`
    );
  }

  const vectors = JOB_VECTORS_BY_SECTOR[sectorId];
  if (!vectors || typeof vectors !== 'object') {
    throw new Error(
      `[jobVectorsBySector] Secteur "${sectorId}" : pas de mapping vecteurs dans JOB_VECTORS_BY_SECTOR`
    );
  }

  const vectorKeys = Object.keys(vectors);
  if (vectorKeys.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] Secteur "${sectorId}" doit avoir ${expectedCount} vecteurs, trouvé: ${vectorKeys.length}`
    );
  }

  const jobSet = new Set(jobList);
  for (const key of vectorKeys) {
    if (!jobSet.has(key)) {
      throw new Error(
        `[jobVectorsBySector] Vecteur orphelin dans "${sectorId}": "${key}" absent de la whitelist`
      );
    }
  }
  for (const jobTitle of jobList) {
    if (!(jobTitle in vectors)) {
      throw new Error(
        `[jobVectorsBySector] Métier sans vecteur dans "${sectorId}": "${jobTitle}"`
      );
    }
    const vec = vectors[jobTitle]!;
    for (const axis of JOB_AXES) {
      const val = vec[axis];
      if (typeof val !== 'number' || val < 0 || val > 10) {
        throw new Error(
          `[jobVectorsBySector] Vecteur invalide pour "${jobTitle}", axe ${axis}: doit être 0..10, trouvé: ${val}`
        );
      }
    }
  }
}

/**
 * Vérifie qu'un secteur/variante a une whitelist, un mapping de vecteurs avec les mêmes clés,
 * et que chaque vecteur a 8 axes avec valeurs 0..10. expectedCount = nombre de métiers attendu (ex. 30).
 */
export function validateJobVectorsForSectorVariant(
  sectorId: SectorId,
  variant: SectorVariantKey,
  expectedCount: number
): void {
  const byVariant = JOBS_BY_SECTOR_VARIANT[sectorId];
  if (!byVariant || typeof byVariant !== 'object') {
    throw new Error(
      `[jobVectorsBySector] Secteur "${sectorId}" n'a pas de variante dans JOBS_BY_SECTOR_VARIANT`
    );
  }
  const jobList = byVariant[variant];
  if (!Array.isArray(jobList) || jobList.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] ${sectorId}.${variant} doit avoir ${expectedCount} métiers, trouvé: ${jobList?.length ?? 0}`
    );
  }

  const vectorsByVariant = JOB_VECTORS_BY_SECTOR_VARIANT[sectorId];
  if (!vectorsByVariant || typeof vectorsByVariant !== 'object') {
    throw new Error(
      `[jobVectorsBySector] Pas de vecteurs pour secteur "${sectorId}"`
    );
  }
  const vectors = vectorsByVariant[variant];
  if (!vectors || typeof vectors !== 'object') {
    throw new Error(
      `[jobVectorsBySector] Pas de vecteurs pour ${sectorId}.${variant}`
    );
  }

  const vectorKeys = Object.keys(vectors);
  if (vectorKeys.length !== expectedCount) {
    throw new Error(
      `[jobVectorsBySector] ${sectorId}.${variant} doit avoir ${expectedCount} vecteurs, trouvé: ${vectorKeys.length}`
    );
  }

  const jobSet = new Set(jobList);
  for (const key of vectorKeys) {
    if (!jobSet.has(key)) {
      throw new Error(
        `[jobVectorsBySector] Vecteur orphelin dans ${sectorId}.${variant}: "${key}" absent de la whitelist`
      );
    }
  }
  for (const jobTitle of jobList) {
    if (!vectorKeys.includes(jobTitle)) {
      throw new Error(
        `[jobVectorsBySector] Métier sans vecteur dans ${sectorId}.${variant}: "${jobTitle}"`
      );
    }
    const vec = vectors[jobTitle]!;
    for (const axis of JOB_AXES) {
      const val = vec[axis];
      if (typeof val !== 'number' || val < 0 || val > 10) {
        throw new Error(
          `[jobVectorsBySector] Vecteur invalide pour "${jobTitle}", axe ${axis}: doit être 0..10, trouvé: ${val}`
        );
      }
    }
  }
}
