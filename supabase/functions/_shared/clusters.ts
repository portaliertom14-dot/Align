/**
 * Clusters métiers — 12 clusters orientés "wow", candidats = jobIds whitelist.
 * Utilisé par scoring + analyze-job (sélection parmi candidats).
 */

export type ClusterId = string;

export interface ClusterDef {
  id: ClusterId;
  name: string;
  description_simple: string; // <= 120 chars
  candidateJobIds: string[];
}

/** Secteur v16 suggéré par cluster (pour dériver secteur depuis cluster). */
export const CLUSTER_TO_SECTOR_V16: Record<string, string> = {
  builder_tech: 'ingenierie_tech',
  maker_engineering: 'industrie_artisanat',
  healthcare_help: 'sante_bien_etre',
  law_security: 'droit_justice_securite',
  business_sales: 'business_entrepreneuriat',
  business_product: 'business_entrepreneuriat',
  creator_design: 'creation_design',
  creator_media: 'communication_media',
  science_research: 'sciences_recherche',
  education_support: 'education_formation',
  public_service: 'droit_justice_securite',
  field_ops: 'defense_securite_civile',
  environment_agri: 'environnement_agri',
};

export const CLUSTERS: ClusterDef[] = [
  {
    id: 'builder_tech',
    name: 'Builder Tech',
    description_simple: 'Développement, data, cybersécurité — tu construis des systèmes et des produits numériques.',
    candidateJobIds: ['developpeur', 'data_scientist', 'cybersecurity', 'devops', 'tech_lead', 'architect_software'],
  },
  {
    id: 'maker_engineering',
    name: 'Maker & Ingénierie',
    description_simple: 'Ingénierie, industrie, conception technique — tu fais naître des solutions concrètes.',
    candidateJobIds: ['ingenieur', 'technicien_procedes', 'chef_atelier'],
  },
  {
    id: 'healthcare_help',
    name: 'Santé & Aide',
    description_simple: 'Santé, bien-être, accompagnement des personnes — tu prends soin des autres.',
    candidateJobIds: ['medecin', 'psychologue'],
  },
  {
    id: 'law_security',
    name: 'Droit & Sécurité',
    description_simple: 'Droit, justice, défense, sécurité — tu protèges les règles et les personnes.',
    candidateJobIds: ['avocat', 'juriste', 'notaire', 'magistrat'],
  },
  {
    id: 'business_sales',
    name: 'Business & Vente',
    description_simple: 'Commerce, vente, négociation — tu fais grandir l’activité et les revenus.',
    candidateJobIds: ['commercial', 'entrepreneur', 'marketing'],
  },
  {
    id: 'business_product',
    name: 'Produit & Ops',
    description_simple: 'Product management, gestion de projet — tu organises et tu fais livrer.',
    candidateJobIds: ['product_manager', 'chef_projet', 'scrum_master'],
  },
  {
    id: 'creator_design',
    name: 'Créateur Design',
    description_simple: 'Design, UX, graphisme — tu donnes forme aux idées et à l’expérience.',
    candidateJobIds: ['graphiste', 'webdesigner', 'designer', 'ux_designer', 'directeur_artistique', 'motion_designer'],
  },
  {
    id: 'creator_media',
    name: 'Créateur Média',
    description_simple: 'Photo, vidéo, contenu, rédaction — tu racontes et tu rends visible.',
    candidateJobIds: ['redacteur', 'photographe'],
  },
  {
    id: 'science_research',
    name: 'Sciences & Recherche',
    description_simple: 'Recherche, labo, analyse — tu explores et tu fais avancer la connaissance.',
    candidateJobIds: ['data_scientist', 'chercheur', 'biostatisticien'],
  },
  {
    id: 'education_support',
    name: 'Éducation & Accompagnement',
    description_simple: 'Enseignement, formation, coaching — tu transmets et tu fais progresser.',
    candidateJobIds: ['enseignant', 'coach', 'sociologue'],
  },
  {
    id: 'public_service',
    name: 'Service public & Admin',
    description_simple: 'Administration, service public — tu fais tourner les institutions.',
    candidateJobIds: ['juriste', 'magistrat'],
  },
  {
    id: 'field_ops',
    name: 'Terrain & Ops',
    description_simple: 'Terrain, logistique, urgence, action directe — tu es en première ligne.',
    candidateJobIds: ['ingenieur', 'commercial'],
  },
  {
    id: 'environment_agri',
    name: 'Environnement & Agri',
    description_simple: 'Environnement, agriculture, transition — tu agis sur le terrain et la ressource.',
    candidateJobIds: ['agro_ingenieur', 'consultant_rse', 'technicien_environnement', 'chef_projet_vert', 'animateur_nature', 'conseiller_agricole'],
  },
];

const CLUSTER_BY_ID = new Map<string, ClusterDef>(CLUSTERS.map((c) => [c.id, c]));

export function getClusterById(id: string): ClusterDef | null {
  return CLUSTER_BY_ID.get(id) ?? null;
}

export function getClusterCandidates(clusterId: string): string[] {
  const c = CLUSTER_BY_ID.get(clusterId);
  return c ? [...c.candidateJobIds] : [];
}

/** Retourne le secteur v16 du cluster, ou null si cluster inconnu (pas de fallback business). */
export function getSectorIdForCluster(clusterId: string): string | null {
  const sid = CLUSTER_TO_SECTOR_V16[clusterId];
  return sid ?? null;
}

/** Premier cluster contenant ce jobId (pour dériver secteur depuis job). */
export function getClusterIdForJob(jobId: string): string | null {
  const id = (jobId ?? '').trim().toLowerCase();
  for (const c of CLUSTERS) {
    if (c.candidateJobIds.some((j) => j.toLowerCase() === id)) return c.id;
  }
  return null;
}

/** Secteur v16 pour un jobId (premier cluster trouvé). Retourne null si job inconnu. */
export function getSectorIdForJob(jobId: string): string | null {
  const cid = getClusterIdForJob(jobId);
  if (!cid) return null;
  return getSectorIdForCluster(cid);
}

/** Tous les secteurs v16 auxquels ce job appartient (un job peut être dans plusieurs clusters). */
export function getSectorIdsForJob(jobId: string): string[] {
  const id = (jobId ?? '').trim().toLowerCase();
  const sectors = new Set<string>();
  for (const c of CLUSTERS) {
    if (c.candidateJobIds.some((j) => j.toLowerCase() === id)) {
      const sid = CLUSTER_TO_SECTOR_V16[c.id];
      if (sid) sectors.add(sid);
    }
  }
  return Array.from(sectors);
}

/** Liste des clusterIds dont le secteur v16 est sectorId (pour contrainte secteur verrouillé). */
export function getClustersForSector(sectorId: string): string[] {
  const sid = (sectorId ?? '').trim().toLowerCase();
  if (!sid) return [];
  return (CLUSTERS as ClusterDef[])
    .filter((c) => (CLUSTER_TO_SECTOR_V16[c.id] ?? '').toLowerCase() === sid)
    .map((c) => c.id);
}

/** Tous les jobIds candidats pour un secteur (union des clusters du secteur). Ordre non garanti. Source de vérité pour candidateList. */
export function getCandidateJobIdsForSector(sectorId: string): string[] {
  const clusterIds = getClustersForSector(sectorId);
  const ids = new Set<string>();
  for (const cid of clusterIds) {
    const cand = getClusterCandidates(cid);
    cand.forEach((j) => ids.add(j));
  }
  return Array.from(ids);
}

/** JOBS_BY_SECTOR : secteurId → jobIds (dérivé de getCandidateJobIdsForSector). Pour vérifier que chaque secteur a une liste non vide. */
export const JOBS_BY_SECTOR: Record<string, string[]> = (() => {
  const sectorIds = new Set<string>(Object.values(CLUSTER_TO_SECTOR_V16));
  const out: Record<string, string[]> = {};
  for (const sid of sectorIds) {
    out[sid] = getCandidateJobIdsForSector(sid);
  }
  return out;
})();
