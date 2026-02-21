# MASTER PATCH ALIGN — Plan, file map, types

## 1) PLAN (18 étapes)

1. **types.ts** — Définir SectorScore, SectorResult, JobScore, JobResult, answersHash type.
2. **sectors.ts** — SECTOR_UNDETERMINED = 'undetermined' ; pas de fallback silencieux (SECTOR_FALLBACK_ID commenté / usage interne only).
3. **clusters.ts** — getSectorIdForCluster(unknown) => null ; enrichir CLUSTERS + JOB_IDS pour ≥6 jobs/secteur, ≥3 jobs/cluster ; mapping strict job→sector (exceptions max 2).
4. **prompts.ts** — Étendre JOB_IDS / JOB_NAMES pour nouveaux jobs (devops, tech_lead, ux_designer, agro_ingenieur, etc.).
5. **sectorScoring.ts** — Déjà en place : buildSectorProfileFromSecteurAnswers, scoreSectors, sectorConfidence ; stableHash(answers) pour answersHash.
6. **scoring.ts** — Ajouter METIER_COMMON_DELTAS (metier_common_1..12), buildProfileFromMetierCommonAnswers ; SECTOR_JOB_DELTAS (8 questions × jobs par secteur), scoreJobsWithinSector(sectorId, commonProfile, sectorAnswers).
7. **analyze-sector/index.ts** — Supprimer tout keyword scoring ; choix secteur 100% code (sectorScoring) ; IA copy only ; retour top3, confidence ; si confidence < 0.35 => secteurId "undetermined" ; logs DEBUG_SECTOR_PROFILE, DEBUG_SECTOR_TOP3, answersHash.
8. **analyze-job/index.ts** — Accepter body.answers_common (12) + body.answers_sector (8) + body.lockedSectorId ; profil depuis 12 communes ; candidats = jobs du secteur uniquement ; scoreJobsWithinSector pour ordonner ; si 0 candidat => jobId "undetermined" ; IA liste fermée ; si IA hors liste => retry 1 fois puis "undetermined" ; logs DEBUG_LOCKED_SECTOR, DEBUG_JOB_CANDIDATES.
9. **quizSecteurQuestions.js** — Remplacer par 40 questions (24 domaine + 16 style), format { id, question, options: [{ label, value }] }.
10. **quizMetierQuestions.js** — Remplacer par 12 questions communes (metier_common_1..12).
11. **quizMetierSectorQuestions/** — 16 fichiers (secteurId).js, 8 questions chacun ; 3 complets (ingenierie_tech, creation_design, environnement_agri) + template pour les 13 autres.
12. **data/index.js** — Exporter quizSecteurQuestions, quizMetierQuestions, getQuizMetierSectorQuestions.
13. **validation.ts** — getSectorIfWhitelisted uniquement (pas de getSectorWithFallback pour le flux principal).
14. **fixtures.test.ts** — 3 fixtures (tech/data, créa/design, ambivalent) + expected (secteurId, confidence, jobId si applicable).
15. **Frontend** — Adapter écrans pour afficher "undetermined" (secteur ou métier) avec message + CTA.
16. **Client analyzeJob** — Envoyer answers_common + answers_sector + lockedSectorId ; gérer jobId "undetermined".
17. **Logs** — Tous les logs structurés (DEBUG_*) avec requestId et données nécessaires.
18. **Règles** — Aucun fallback silencieux ; getSectorIdForCluster(unknown) => null partout.

---

## 2) FILE MAP

| Fichier | Action |
|---------|--------|
| supabase/functions/_shared/types.ts | NEW |
| supabase/functions/_shared/sectors.ts | MOD |
| supabase/functions/_shared/clusters.ts | MOD (enrichi) |
| supabase/functions/_shared/prompts.ts | MOD (JOB_IDS/NAMES) |
| supabase/functions/_shared/sectorScoring.ts | MOD (+ answersHash) |
| supabase/functions/_shared/scoring.ts | MOD (+ 12 common + scoreJobsWithinSector) |
| supabase/functions/analyze-sector/index.ts | MOD (déjà refacto, vérifier logs/hash) |
| supabase/functions/analyze-job/index.ts | MOD (12+8, retry, undetermined) |
| supabase/functions/_shared/validation.ts | MOD (pas de fallback secteur) |
| supabase/functions/_shared/fixtures.test.ts | NEW |
| src/data/quizSecteurQuestions.js | MOD (40 questions discriminantes) |
| src/data/quizMetierQuestions.js | MOD (12 communes) |
| src/data/quizMetierSectorQuestions/ingenierie_tech.js | MOD (8, format label/value) |
| src/data/quizMetierSectorQuestions/creation_design.js | MOD (8) |
| src/data/quizMetierSectorQuestions/environnement_agri.js | MOD (8) |
| src/data/quizMetierSectorQuestions/*.js (13 autres) | NEW (template) |
| src/data/quizMetierSectorQuestions/index.js | MOD (export 16 secteurs) |
| src/data/index.js | MOD (exports) |

---

## 3) TYPES (TypeScript)

```ts
// _shared/types.ts

export const SECTOR_UNDETERMINED = 'undetermined';
export const JOB_UNDETERMINED = 'undetermined';

export type SectorIdOrUndetermined = string; // whitelist id | 'undetermined'
export type JobIdOrUndetermined = string;

export interface SectorScore {
  secteurId: string;
  score: number;
}

export interface SectorResult {
  secteurId: string | typeof SECTOR_UNDETERMINED;
  secteurName: string;
  description: string;
  top3: SectorScore[];
  confidence: number;
  promptVersion?: string;
  whitelistVersion?: string;
}

export interface JobScore {
  jobId: string;
  score: number;
}

export interface JobResult {
  jobId: string | typeof JOB_UNDETERMINED;
  jobName?: string;
  description?: string;
  reasonShort?: string;
  undeterminedReason?: string;
  top3?: JobScore[];
  promptVersion?: string;
}

export function stableAnswersHash(answers: Record<string, unknown>): string {
  const str = JSON.stringify(answers);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(16);
}
```

---

## 5) NOUVELLES QUESTIONS

### 40 questions secteur (ids secteur_1..secteur_40)
- Déjà en place dans `src/data/quizSecteurQuestions.js` (conserver les ids et le format).
- 24 « domaine » (penser numérique / terrain / humain / création) + 16 « style » (rythme, structure, social, risque).
- Format : `{ id, section, sectionTitle, question, options: [string] }` ou `options: [{ label, value }]`.

### 12 communes métier (ids metier_common_1..metier_common_12)
- Fichier : `src/data/quizMetierQuestions.js` (remplacé par 12 questions).
- Liste : voir contenu actuel du fichier (technique / créatif / opérationnel, rythme, expertise, risque, équipe, missions, problème, plaisir, évolution, objectif).

### 8 questions spécifiques × 3 secteurs (exemples)
- **ingenierie_tech** : `src/data/quizMetierSectorQuestions/ingenierie_tech.js` (écrire du code vs données vs infra, environnement, livraison, doc, réunion, profil, critère).
- **creation_design** : `src/data/quizMetierSectorQuestions/creation_design.js` (créer visuels vs UX vs expérience, outil, brief, contrainte, position, feedback, livrer, critère).
- **environnement_agri** : `src/data/quizMetierSectorQuestions/environnement_agri.js` (terrain vs transition vs conception, environnement, technique/réglementation/sensibilisation, structure, donnée, profil, critère, convaincre).

### Template pour les 13 autres secteurs
- Créer `src/data/quizMetierSectorQuestions/<secteurId>.js` (ex. `business_entrepreneuriat.js`, `sante_bien_etre.js`).
- Export : `export default [ { id: 'sector_specific_1', question: '...', options: [...] }, ... ]` (8 questions).
- Chaque question : 3 options A/B/C discriminantes pour les métiers du secteur.
- Enregistrer dans `src/data/quizMetierSectorQuestions/index.js` : `import q from './<secteurId>.js'; ... [secteurId]: q, ...`.

---

## 6) DATA ENRICHIE

### ≥6 jobs par secteur (ids + labels)
- **ingenierie_tech** : developpeur, data_scientist, cybersecurity, devops, tech_lead, architect_software.
- **creation_design** : graphiste, webdesigner, designer, ux_designer, directeur_artistique, motion_designer.
- **environnement_agri** : agro_ingenieur, consultant_rse, technicien_environnement, chef_projet_vert, animateur_nature, conseiller_agricole.
- **industrie_artisanat** : ingenieur, technicien_procedes, chef_atelier.
- **business_entrepreneuriat** : commercial, entrepreneur, marketing, product_manager, chef_projet, scrum_master.
- **sciences_recherche** : data_scientist, chercheur, biostatisticien (data_scientist = exception 2 secteurs).
- Autres secteurs : étendre `JOB_IDS` / `JOB_NAMES` et `CLUSTERS` de la même façon.

### Clusters ≥3 jobs
- builder_tech: 6 ; maker_engineering: 3 ; business_product: 3 ; creator_design: 6 ; science_research: 3 ; environment_agri: 6.
- Voir `supabase/functions/_shared/clusters.ts` et `prompts.ts` (JOB_IDS / JOB_NAMES).

### Mapping job → secteur strict
- Un job = un secteur par défaut (cluster unique).
- Exceptions (max 2) : **data_scientist** (ingenierie_tech + sciences_recherche), commentées dans le code.

---

## 7) 3 FIXTURES TESTS + expected

- **FIXTURE_1_TECH_DATA** : answers_secteur (option 0 pour 1–24, structurées pour 25–40), answers_metier_common (toutes option technique).  
  **Expected** : secteurId `ingenierie_tech`, confidence > 0.5 ; jobId dans la liste ingenierie_tech.

- **FIXTURE_2_CREA_DESIGN** : answers_secteur (créer / flexibles), answers_metier_common (toutes créatif).  
  **Expected** : secteurId `creation_design`, confidence > 0.5 ; jobId dans la liste creation_design.

- **FIXTURE_3_AMBIVALENT** : answers_secteur et answers_metier_common en rotation A/B/C.  
  **Expected** : secteurId `undetermined`, confidence < 0.35 ; top3 cohérents.

Code : `supabase/functions/_shared/fixtures.test.ts` (export des 3 fixtures + expected_secteur / expected_job_in_sector).
