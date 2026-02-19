/**
 * Tags domaine déterministes côté serveur à partir des réponses Q41–Q46.
 * Utilisé pour la règle produit : humain_direct => pas ingenierie_tech sans signaux tech.
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

export const MICRO_DOMAIN_IDS = ['secteur_47', 'secteur_48', 'secteur_49', 'secteur_50'] as const;

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

const ZERO_MICRO_SCORES: MicroDomainScores = {
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
 * Scores micro-domaines à partir de Q47–Q50 (déterministe).
 * Rééquilibré pour éviter que sport/env soient aspirés par business/éducation :
 * - Q48 B : sport +2, business +1 (performance/terrain plus discriminant pour sport).
 * - Q49 : +1 au lieu de +2 pour éviter mono-secteur qui aspire tout.
 * - Q50 B : environnement_agri +3 pour renforcer le signal vivant/écosystèmes.
 * Q47: A → +1 ingenierie_tech, industrie_artisanat | B → +1 data_ia, sciences_recherche | C → +1 social_humain, education_formation
 * Q48: A → +1 droit_justice_securite, defense_securite_civile | B → +2 sport_evenementiel, +1 business_entrepreneuriat | C → +1 creation_design, culture_patrimoine
 * Q49: A → +1 sciences_recherche, data_ia | B → +1 education_formation | C → +1 business_entrepreneuriat
 * Q50: A → +2 defense_securite_civile | B → +3 environnement_agri | C → +2 sante_bien_etre
 */
export function computeMicroDomainScores(rawAnswers: Record<string, unknown>): MicroDomainScores {
  const out = { ...ZERO_MICRO_SCORES };
  const q47 = getChoice(rawAnswers['secteur_47']);
  if (q47 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_47', rawAnswers['secteur_47']);
  const q48 = getChoice(rawAnswers['secteur_48']);
  if (q48 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_48', rawAnswers['secteur_48']);
  const q49 = getChoice(rawAnswers['secteur_49']);
  if (q49 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_49', rawAnswers['secteur_49']);
  const q50 = getChoice(rawAnswers['secteur_50']);
  if (q50 === null) console.log('MICRO_CHOICE_MISSING', 'secteur_50', rawAnswers['secteur_50']);

  if (q47 === 'A') {
    out.ingenierie_tech += 1;
    out.industrie_artisanat += 1;
  } else if (q47 === 'B') {
    out.data_ia += 1;
    out.sciences_recherche += 1;
  } else if (q47 === 'C') {
    out.social_humain += 1;
    out.education_formation += 1;
  }

  if (q48 === 'A') {
    out.droit_justice_securite += 1;
    out.defense_securite_civile += 1;
  } else if (q48 === 'B') {
    out.sport_evenementiel += 2;
    out.business_entrepreneuriat += 1;
  } else if (q48 === 'C') {
    out.creation_design += 1;
    out.culture_patrimoine += 1;
  }

  if (q49 === 'A') {
    out.sciences_recherche += 1;
    out.data_ia += 1;
  } else if (q49 === 'B') {
    out.education_formation += 1;
  } else if (q49 === 'C') {
    out.business_entrepreneuriat += 1;
  }

  if (q50 === 'A') {
    out.defense_securite_civile += 2;
  } else if (q50 === 'B') {
    out.environnement_agri += 3;
  } else if (q50 === 'C') {
    out.sante_bien_etre += 2;
  }

  return out;
}
