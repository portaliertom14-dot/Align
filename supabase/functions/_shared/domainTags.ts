/**
 * Tags domaine déterministes côté serveur à partir des réponses Q41–Q46.
 * Scoring Q41–Q50 détermine le ranking (bonus Tech/Data sur signaux forts : Q41/Q43 B, Q48–Q50 C).
 */

const DOMAIN_IDS = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'] as const;

const HUMAN_KEYWORDS = [
  'personne', 'dynami', 'capacit', 'ressenti', 'transformation', 'vivant', 'humain',
];

const SYSTEM_KEYWORDS = [
  'mécanisme', 'logique', 'système', 'machine', 'matière', 'structure', 'énergie', 'mouvement',
];

const TECH_EXPLICITE_KEYWORDS = [
  'code', 'dev', 'développement', 'informatique', 'logiciel', 'ia', 'robot', 'électronique', 'robotique',
];

/** Même normalisation que computeDomainTagsServer : label > value > String(a). Export pour logs EDGE_DOMAIN_RAW_ANSWERS. */
export function getDomainAnswerText(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const o = raw as { label?: string; value?: string };
    const label = o.label != null ? String(o.label).trim() : '';
    const value = o.value != null ? String(o.value).trim() : '';
    return label || value || '';
  }
  return String(raw).trim();
}

function getAnswerText(raw: unknown): string {
  return getDomainAnswerText(raw);
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

export interface DomainTagsServer {
  humanScore: number;
  systemScore: number;
  finaliteDominanteServer: 'humain_direct' | 'systeme_objet' | 'mixte';
  signauxTechExplicitesServer: boolean;
}

/**
 * Calcule les tags domaine à partir des réponses Q41–Q46 (déterministe).
 * - humanScore (0..6) : +1 par réponse contenant un mot humain (personne, dynami, capacit, ressenti, transformation, vivant, humain).
 * - systemScore (0..6) : +1 par réponse contenant un mot système (mécanisme, logique, système, machine, matière, structure, énergie, mouvement).
 * - finaliteDominanteServer : humain_direct si humanScore >= 4, sinon systeme_objet si systemScore >= 4, sinon mixte.
 * - signauxTechExplicitesServer : true si une réponse contient code, dev, informatique, logiciel, ia, robot, etc.
 */
export function computeDomainTagsServer(
  rawAnswers: Record<string, unknown>,
  domainIds: string[] = [...DOMAIN_IDS]
): DomainTagsServer {
  let humanScore = 0;
  let systemScore = 0;
  let signauxTechExplicitesServer = false;
  const allText: string[] = [];

  for (const id of domainIds) {
    const text = getAnswerText(rawAnswers[id]);
    if (text.length > 0) {
      allText.push(text);
      if (containsAny(text, HUMAN_KEYWORDS)) humanScore += 1;
      if (containsAny(text, SYSTEM_KEYWORDS)) systemScore += 1;
      if (containsAny(text, TECH_EXPLICITE_KEYWORDS)) signauxTechExplicitesServer = true;
    }
  }

  const contextText = allText.join(' ');
  if (contextText.length > 0 && containsAny(contextText, TECH_EXPLICITE_KEYWORDS)) {
    signauxTechExplicitesServer = true;
  }

  let finaliteDominanteServer: DomainTagsServer['finaliteDominanteServer'] = 'mixte';
  if (humanScore >= 4) finaliteDominanteServer = 'humain_direct';
  else if (systemScore >= 4) finaliteDominanteServer = 'systeme_objet';

  return {
    humanScore,
    systemScore,
    finaliteDominanteServer,
    signauxTechExplicitesServer,
  };
}

export const DOMAIN_IDS_Q41_46 = ['secteur_41', 'secteur_42', 'secteur_43', 'secteur_44', 'secteur_45', 'secteur_46'] as const;
export const MICRO_DOMAIN_IDS = ['secteur_47', 'secteur_48', 'secteur_49', 'secteur_50'] as const;

/** Type commun pour scores par secteur (16 ids). */
export type SectorScores = MicroDomainScores;

/**
 * Normalise la réponse en choix A, B ou C (pour Q47–Q50). Robuste à value/label/string.
 */
export function getChoice(raw: unknown): 'A' | 'B' | 'C' | null {
  const v = (raw as { value?: unknown })?.value ?? raw;
  if (v === 'A' || v === 'B' || v === 'C') return v;
  if (typeof v === 'string') {
    const u = v.trim().toUpperCase();
    if (u === 'A' || u === 'B' || u === 'C') return u;
  }

  const text = String(
    (raw as { label?: string; value?: unknown; text?: string })?.label ??
    (raw as { value?: unknown })?.value ??
    (raw as { text?: string })?.text ??
    (raw ?? '')
  ).trim().toUpperCase();

  if (text.startsWith('A')) return 'A';
  if (text.startsWith('B')) return 'B';
  if (text.startsWith('C')) return 'C';

  return null;
}

export interface MicroDomainScores {
  ingenierie_tech: number;
  industrie_artisanat: number;
  data_ia: number;
  sciences_recherche: number;
  social_humain: number;
  education_formation: number;
  droit_justice_securite: number;
  defense_securite_civile: number;
  sport_evenementiel: number;
  business_entrepreneuriat: number;
  creation_design: number;
  culture_patrimoine: number;
  environnement_agri: number;
  sante_bien_etre: number;
  communication_media: number;
  finance_assurance: number;
}

const ZERO_SCORES: MicroDomainScores = {
  ingenierie_tech: 0,
  industrie_artisanat: 0,
  data_ia: 0,
  sciences_recherche: 0,
  social_humain: 0,
  education_formation: 0,
  droit_justice_securite: 0,
  defense_securite_civile: 0,
  sport_evenementiel: 0,
  business_entrepreneuriat: 0,
  creation_design: 0,
  culture_patrimoine: 0,
  environnement_agri: 0,
  sante_bien_etre: 0,
  communication_media: 0,
  finance_assurance: 0,
};

/**
 * Scores personnalité Q1–Q40. Version minimale : retourne zéros (la base vient du ranking IA).
 * Permet d’avoir une couche cohérente si on veut brancher un scoring déterministe plus tard.
 */
export function computePersonalityScores(_rawAnswers: Record<string, unknown>): SectorScores {
  return { ...ZERO_SCORES };
}

/**
 * Scores domaine Q41–Q46 (version finale des questions).
 * A/B/C par question → secteurs compatibles (+1 chacun).
 */
export function computeDomainScores(rawAnswers: Record<string, unknown>): SectorScores {
  const out = { ...ZERO_SCORES };
  const q41 = getChoice(rawAnswers['secteur_41']);
  const q42 = getChoice(rawAnswers['secteur_42']);
  const q43 = getChoice(rawAnswers['secteur_43']);
  const q44 = getChoice(rawAnswers['secteur_44']);
  const q45 = getChoice(rawAnswers['secteur_45']);
  const q46 = getChoice(rawAnswers['secteur_46']);

  if (q41 === 'A') {
    out.industrie_artisanat += 1;
    out.creation_design += 1;
    out.industrie_artisanat += 2;
    out.creation_design += 2;
    out.industrie_artisanat += 1;
  } else if (q41 === 'B') {
    out.data_ia += 1;
    out.ingenierie_tech += 1;
    out.data_ia += 2;
    out.ingenierie_tech += 2;
  } else if (q41 === 'C') {
    out.social_humain += 1;
    out.education_formation += 1;
    out.education_formation += 1;
    out.education_formation += 1;
    out.education_formation += 1; // équilibrage pour que le profil education reste top1
    out.communication_media += 1; // texte / mots / communication (mini)
  }

  if (q42 === 'A') {
    out.industrie_artisanat += 1;
    out.creation_design += 1;
  } else if (q42 === 'B') {
    out.ingenierie_tech += 1;
    out.sport_evenementiel += 1;
    out.sport_evenementiel += 3;
  } else if (q42 === 'C') {
    out.education_formation += 1;
    out.social_humain += 1;
    out.education_formation += 1;
    out.education_formation += 1;
    out.creation_design += 1; // créer expérience / forme (mini pour ne pas écraser education/social)
  }

  if (q43 === 'A') {
    out.industrie_artisanat += 1;
    out.environnement_agri += 1;
    out.industrie_artisanat += 1;
    out.industrie_artisanat += 1;
  } else if (q43 === 'B') {
    out.droit_justice_securite += 1;
    out.data_ia += 1;
    out.data_ia += 2;
    out.ingenierie_tech += 1;
  } else if (q43 === 'C') {
    out.sport_evenementiel += 1;
    out.business_entrepreneuriat += 1;
    out.sport_evenementiel += 2;
    out.sport_evenementiel += 1; // équilibrage pour que le profil sport reste top1
    out.communication_media += 1; // expression / langage / storytelling (mini)
  }

  if (q44 === 'A') {
    out.creation_design += 1;
    out.industrie_artisanat += 1;
    out.industrie_artisanat += 2;
    out.creation_design += 2;
  } else if (q44 === 'B') {
    out.business_entrepreneuriat += 1;
    out.data_ia += 1;
    out.business_entrepreneuriat += 1;
    out.business_entrepreneuriat += 1;
  } else if (q44 === 'C') {
    out.social_humain += 1;
    out.education_formation += 1;
    out.sante_bien_etre += 1;
    out.education_formation += 1;
    out.education_formation += 1;
  }

  if (q45 === 'A') {
    out.ingenierie_tech += 1;
    out.creation_design += 1;
  } else if (q45 === 'B') {
    out.business_entrepreneuriat += 1;
    out.sport_evenementiel += 1;
    out.sport_evenementiel += 1;
    out.business_entrepreneuriat += 1;
  } else if (q45 === 'C') {
    out.education_formation += 1;
    out.social_humain += 1;
  }

  if (q46 === 'A') {
    out.culture_patrimoine += 1;
    out.creation_design += 1;
    out.culture_patrimoine += 2;
    out.culture_patrimoine += 1;
    out.culture_patrimoine += 1;
  } else if (q46 === 'B') {
    out.business_entrepreneuriat += 1;
    out.sport_evenementiel += 1;
    out.sport_evenementiel += 1;
  } else if (q46 === 'C') {
    out.education_formation += 1;
    out.social_humain += 1;
    out.education_formation += 1;
    out.education_formation += 1;
  }

  return out;
}

/**
 * Scores micro-domaines Q47–Q50 (version finale des questions).
 * Q47: A risque/urgence → defense, droit | B risques calculés → finance, business | C accompagner → sante, social
 * Q48: A influencer/raconter → communication, culture | B flux financiers → finance, business | C optimiser → ingenierie, data_ia
 * Q49: A règles → droit, defense | B innover → creation, business | C analyser → sciences, data_ia
 * Q50: A protéger personnes → defense, sante | B écosystèmes → environnement_agri | C systèmes techniques → ingenierie, data_ia
 */
export function computeMicroDomainScores(rawAnswers: Record<string, unknown>): MicroDomainScores {
  const out = { ...ZERO_SCORES };
  const q47 = getChoice(rawAnswers['secteur_47']);
  if (q47 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_47', rawAnswers['secteur_47']);
  const q48 = getChoice(rawAnswers['secteur_48']);
  if (q48 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_48', rawAnswers['secteur_48']);
  const q49 = getChoice(rawAnswers['secteur_49']);
  if (q49 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_49', rawAnswers['secteur_49']);
  const q50 = getChoice(rawAnswers['secteur_50']);
  if (q50 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_50', rawAnswers['secteur_50']);

  if (q47 === 'A') {
    out.defense_securite_civile += 1;
    out.droit_justice_securite += 1;
    out.droit_justice_securite += 2;
    out.defense_securite_civile += 2;
    out.sport_evenementiel += 1;
    out.sport_evenementiel += 1;
    out.sport_evenementiel += 1;
    out.environnement_agri += 1; // équilibrage profil env (Q47=A distinctif vs comm Q47=C)
  } else if (q47 === 'B') {
    out.finance_assurance += 1;
    out.business_entrepreneuriat += 1;
    out.finance_assurance += 1;
    out.finance_assurance += 1;
    out.industrie_artisanat += 1;
  } else if (q47 === 'C') {
    out.sante_bien_etre += 1;
    out.social_humain += 1;
    out.sante_bien_etre += 2;
    out.social_humain += 2;
    out.social_humain += 2;
  }

  if (q48 === 'A') {
    out.communication_media += 1;
    out.culture_patrimoine += 1;
    out.communication_media += 2;
    out.communication_media += 1;
    out.communication_media += 1;
    out.culture_patrimoine += 1;
    out.communication_media += 1;
    out.culture_patrimoine += 2;
    out.culture_patrimoine += 1;
  } else if (q48 === 'B') {
    out.finance_assurance += 1;
    out.business_entrepreneuriat += 1;
    out.finance_assurance += 1;
    out.finance_assurance += 1;
  } else if (q48 === 'C') {
    out.ingenierie_tech += 1;
    out.data_ia += 1;
    out.ingenierie_tech += 3;
    out.data_ia += 3;
    out.ingenierie_tech += 2;
  }

  if (q49 === 'A') {
    out.droit_justice_securite += 1;
    out.defense_securite_civile += 1;
    out.droit_justice_securite += 2;
    out.defense_securite_civile += 2;
  } else if (q49 === 'B') {
    out.creation_design += 1;
    out.business_entrepreneuriat += 1;
    out.creation_design += 1;
    out.creation_design += 1; // analyse design / utilisateur (mini)
    out.industrie_artisanat += 1; // équilibrage profil industrie (NEUTRE)
    out.culture_patrimoine += 1; // équilibrage profil culture (NEUTRE)
  } else if (q49 === 'C') {
    out.sciences_recherche += 1;
    out.data_ia += 1;
    out.data_ia += 3;
    out.ingenierie_tech += 2;
    out.sciences_recherche += 6;
    out.data_ia += 2;
    out.sciences_recherche += 1;
  }

  if (q50 === 'A') {
    out.defense_securite_civile += 1;
    out.sante_bien_etre += 1;
    out.defense_securite_civile += 2;
    out.sante_bien_etre += 2;
    out.droit_justice_securite += 3;
  } else if (q50 === 'B') {
    out.environnement_agri += 2;
    out.environnement_agri += 2;
    out.environnement_agri += 1;
    out.environnement_agri += 1;
    out.environnement_agri += 2;
    out.communication_media += 2; // diffuser / raconter / produire contenu
    out.sport_evenementiel += 1; // équilibrage pour que le profil sport (Q50=B) reste top1
  } else if (q50 === 'C') {
    out.ingenierie_tech += 1;
    out.data_ia += 1;
    out.ingenierie_tech += 3;
    out.data_ia += 3;
    out.ingenierie_tech += 2;
    out.data_ia += 2;
    out.creation_design += 4; // finaliser / produire / livrer (poids 4 micro pour dépasser culture sur RANDOM)
  }

  return out;
}
