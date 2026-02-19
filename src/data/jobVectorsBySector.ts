/**
 * Profils vectoriels (8 axes) des métiers par secteur.
 * Secteur pilote : business_entrepreneuriat (30 vecteurs remplis).
 *
 * Archétypes Business utilisés pour cohérence :
 * A) Stratégie/Direction — CEO, DG, Entrepreneur, Consultant stratégie : LEADERSHIP haut, ANALYSE haut, RISK_TOLERANCE moyen-haut
 * B) Finance/Perf — Analyste, Contrôleur, Auditeur : ANALYSE haut, STRUCTURE haut, CONTACT_HUMAIN bas-moyen
 * C) Marketing/Growth — Resp marketing, Growth, Brand, Dir commercial : CREATIVITE moyen-haut, ACTION moyen-haut
 * D) Ops/Produit — Chef de projet, Product Manager, Resp ops : STRUCTURE haut, ANALYSE moyen-haut, STABILITE moyen
 * E) Sales/Négociation — Commercial, Account, Partenariats, Grands comptes : CONTACT_HUMAIN haut, ACTION haut, LEADERSHIP moyen
 * F) Indépendants/Hybrides — Entrepreneur, Consultant indé, Startupper : RISK_TOLERANCE haut, ACTION haut, STABILITE bas
 */

import type { SectorId, JobTitle } from './jobsBySector';
import { getJobsForSector } from './jobsBySector';
import type { JobVector } from '../domain/jobAxes';
import { JOB_AXES } from '../domain/jobAxes';

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
 * Clés = chaînes exactes de JOBS_BY_SECTOR["business_entrepreneuriat"].
 */
export const JOB_VECTORS_BY_SECTOR: Partial<Record<SectorId, Record<JobTitle, JobVector>>> = {
  [PILOT_SECTOR]: {
    // D Ops/Produit (base: STRUCTURE 8, ANALYSE 7, STABILITE 6)
    'Chef de projet': v(8, 4, 6, 5, 7, 4, 6, 5),
    // F Indépendants (base: RISK_TOLERANCE 9, ACTION 9, STABILITE 2)
    'Entrepreneur': v(4, 6, 9, 5, 6, 9, 2, 7),
    // E Sales
    'Business developer': v(5, 4, 8, 9, 5, 5, 5, 7),
    // A Stratégie + F (consultant peut être indé)
    'Consultant': v(6, 5, 6, 6, 8, 6, 4, 8),
    // D Ops/Produit
    'Product manager': v(7, 5, 6, 5, 7, 4, 6, 6),
    // E Sales
    'Responsable commercial': v(5, 4, 8, 9, 5, 5, 5, 8),
    'Account manager': v(5, 4, 8, 9, 5, 5, 5, 6),
    'Chargé d\'affaires': v(5, 4, 8, 8, 5, 5, 5, 6),
    'Directeur commercial': v(6, 4, 8, 8, 6, 5, 5, 9),
    // F Indépendants
    'Fondateur startup': v(4, 7, 9, 5, 6, 10, 1, 8),
    // C Marketing/Growth
    'Growth hacker': v(5, 8, 8, 5, 6, 7, 3, 6),
    // E Sales (partenariats = contact + négociation)
    'Responsable partenariats': v(5, 5, 7, 9, 5, 5, 5, 7),
    // B Finance/Perf
    'Business analyst': v(8, 2, 4, 3, 9, 4, 7, 4),
    // E Sales / développement commercial
    'Chargé de développement': v(5, 4, 7, 8, 5, 5, 5, 6),
    // A Stratégie/Direction
    'Directeur général': v(7, 5, 7, 6, 8, 7, 5, 10),
    'Responsable stratégie': v(7, 5, 6, 5, 9, 6, 5, 9),
    // A Stratégie (organisation)
    'Consultant en organisation': v(8, 4, 5, 6, 8, 5, 6, 7),
    // D Ops (mission = cadre structuré)
    'Chargé de mission': v(7, 4, 6, 5, 6, 4, 6, 5),
    // A Stratégie (filiale = direction)
    'Responsable filiale': v(7, 5, 7, 6, 7, 6, 5, 9),
    // D Ops/Produit
    'Directeur de projet': v(8, 4, 6, 5, 7, 4, 6, 7),
    'Responsable activité': v(7, 5, 7, 6, 6, 5, 5, 8),
    // E Sales
    'Key account manager': v(5, 4, 8, 9, 6, 5, 5, 7),
    'Responsable export': v(6, 4, 8, 7, 5, 6, 4, 7),
    'Directeur d\'agence': v(6, 4, 8, 8, 5, 5, 5, 9),
    'Responsable secteur': v(6, 5, 7, 7, 6, 5, 5, 8),
    // E Sales (ingé d'affaires = technique + vente)
    'Ingénieur d\'affaires': v(6, 4, 7, 8, 6, 5, 5, 6),
    // D Ops/Produit (offre)
    'Responsable offre': v(7, 5, 6, 5, 7, 4, 6, 6),
    'Chef de produit': v(7, 5, 6, 5, 7, 4, 6, 5),
    // C Marketing/Growth (innovation)
    'Responsable innovation': v(6, 8, 7, 5, 6, 6, 4, 7),
    // D Ops (coordination)
    'Coordinateur projet': v(8, 4, 5, 5, 6, 3, 7, 5),
  },
};

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
