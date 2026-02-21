# PATCH ALIGN — Secteur↔Métier cohérent + Déterminisme + Fin fallbacks

## 1) PLAN (18 étapes)

1. **sectors.ts** — Retirer fallback silencieux : `SECTOR_FALLBACK_ID` utilisé uniquement en interne si besoin ; exporter `SECTOR_UNDETERMINED = 'undetermined'` ; pas de fallback automatique vers business.
2. **clusters.ts** — `getSectorIdForCluster(unknown)` → `null` ; enrichir jobs (≥6/secteur, ≥3/cluster) ; `getSectorIdsForJob` / `getClustersForSector` gèrent `null`.
3. **scoring.ts (secteur)** — Ajouter `SectorProfileAxes` (6 axes domaine + style), `SECTEUR_AXIS_DELTAS` (secteur_1..secteur_40), `buildSectorProfileFromSecteurAnswers()`, `scoreSectors()`, `sectorConfidence()` ; pas de keyword scoring.
4. **scoring.ts (métier)** — Garder `ProfileAxes` ; `METIER_COMMON_DELTAS` pour metier_common_1..12 ; `buildProfileFromMetierCommonAnswers()` ; `scoreJobsWithinSector(sectorId, commonProfile, sectorAnswers)` avec 8 questions/secteur ; pas de fallback job.
5. **analyze-sector/index.ts** — Supprimer `scoreSectorFromSummary`, `SECTOR_KEYWORDS`. Flux : buildSectorProfile → scoreSectors → top3 ; confidence < seuil → secteurId = "undetermined" ; IA uniquement pour secteurName + description. Retour : secteurId | "undetermined", secteurName, description, top3, confidence, promptVersion, whitelistVersion.
6. **validation.ts** — `getSectorIfWhitelisted(id)` : si id === 'undetermined' retourner un objet spécial (name/validId undetermined) ; pas de fallback business.
7. **analyze-job/index.ts** — lockedSectorId obligatoire pour éviter undetermined ; candidats = jobs du secteur uniquement ; si 0 candidat → réponse `jobId: "undetermined"`, message clair ; IA : liste fermée, si réponse hors liste → erreur ou 1 retry puis undetermined ; logs DEBUG_JOB_CANDIDATES, DEBUG_LOCKED_SECTOR.
8. **prompts.ts** — Adapter prompt copy sector pour accepter secteurId "undetermined" (description générique) ; prompt job : liste candidate stricte.
9. **quizSecteurQuestions.js** — 40 questions : 24 domaine (numérique/terrain/humain/création…) + 16 style (rythme, structure, social, risque) ; format id, question, options (label/value si besoin).
10. **quizMetierQuestions.js** — 12 questions communes (profil 6 axes) ; ids metier_common_1..12.
11. **quizMetierSectorQuestions/** — Créer environnement_agri.js, ingenierie_tech.js, creation_design.js (8 questions chacun) ; structure pour les 13 autres secteurs.
12. **Frontend** — Adapter écrans qui lisent secteurId/jobId pour gérer "undetermined" (message + CTA refaire quiz).
13. **analyzeJob.js (client)** — Envoyer lockedSectorId + answers (common + sector) ; gérer réponse undetermined.
14. **Logs** — DEBUG_SECTOR_PROFILE, DEBUG_SECTOR_TOP3, DEBUG_LOCKED_SECTOR, DEBUG_JOB_CANDIDATES, answersHash dans les deux Edge.
15. **Tests** — Fixture tech/data → ingenierie_tech confidence > 0.5 ; créa/design → creation_design > 0.5 ; ambivalent → undetermined < 0.35.
16. **Types** — SectorScore, SectorResult, JobResult avec undetermined.
17. **Exports data** — index ou barrel pour quizMetierSectorQuestions par secteurId.
18. **Documentation** — Ce fichier + commentaires dans clusters/scoring.

---

## 2) FILE MAP

| Fichier | Action |
|---------|--------|
| supabase/functions/_shared/sectors.ts | MODIFIER — undetermined, pas de fallback business |
| supabase/functions/_shared/clusters.ts | MODIFIER — getSectorIdForCluster → null, enrichir jobs |
| supabase/functions/_shared/scoring.ts | MODIFIER — + sector profile, scoreSectors, confidence, metier 12+8 |
| supabase/functions/_shared/validation.ts | MODIFIER — getSectorWithFallback → gérer null, undetermined |
| supabase/functions/analyze-sector/index.ts | MODIFIER — refacto complet déterministe + IA copy |
| supabase/functions/analyze-job/index.ts | MODIFIER — strict sector, undetermined, no fallback |
| supabase/functions/_shared/prompts.ts | MODIFIER — copy sector undetermined, job liste fermée |
| src/data/quizSecteurQuestions.js | REMPLACER — 40 questions discriminantes |
| src/data/quizMetierQuestions.js | REMPLACER — 12 communes |
| src/data/quizMetierSectorQuestions/ingenierie_tech.js | CRÉER |
| src/data/quizMetierSectorQuestions/creation_design.js | CRÉER |
| src/data/quizMetierSectorQuestions/environnement_agri.js | CRÉER |
| src/data/quizMetierSectorQuestions/index.js | CRÉER — export par secteurId |
| supabase/functions/tests/fixtures-sector-job.ts | CRÉER — 3 fixtures + expected |
| PATCH_ALIGN_SECTOR_JOB.md | CRÉER — ce doc |

---

## 3) TYPES (TS/JS)

```ts
// Sector
export const SECTOR_UNDETERMINED = 'undetermined';
export type SectorIdOrUndetermined = string; // whitelist id | 'undetermined'

export interface SectorScore { secteurId: string; score: number; }
export interface SectorResult {
  secteurId: string | 'undetermined';
  secteurName: string;
  description: string;
  top3: SectorScore[];
  confidence: number; // 0..1
  promptVersion?: string;
  whitelistVersion?: string;
}

// Job
export type JobIdOrUndetermined = string; // jobId | 'undetermined'
export interface JobResult {
  jobId: string | 'undetermined';
  jobName?: string;
  description?: string;
  reasonShort?: string;
  undeterminedReason?: string; // si jobId === 'undetermined'
  top3?: { jobId: string; score: number }[];
  promptVersion?: string;
}

// Scoring
export type SectorProfileAxes = ProfileAxes; // réutiliser 6 axes
export interface SectorQuestionDelta { [k in keyof ProfileAxes]?: number; }
```

---

## 4) FIXTURES TESTS (3) + expected

### Fixture 1 — Profil tech/data → ingenierie_tech
- **answers_secteur**: réponses favorisant logique, technique, numérique (secteur_* avec options 1 ou 2 selon deltas ingenierie_tech).
- **answers_metier_common**: 12 réponses profil technique/analytique.
- **answers_metier_sector** (ingenierie_tech): 8 réponses vers dev/data.
- **Attendu**: secteurId `ingenierie_tech`, confidence > 0.5 ; jobId parmi developpeur/data_scientist/cybersecurity.

### Fixture 2 — Profil créa/design → creation_design
- **answers_secteur**: créatif, visuel, création.
- **answers_metier_common**: créatif, peu structure.
- **answers_metier_sector** (creation_design): design, UX.
- **Attendu**: secteurId `creation_design`, confidence > 0.5 ; jobId parmi graphiste/webdesigner/designer.

### Fixture 3 — Ambivalent → undetermined
- **answers_secteur**: mélange 50/50 (ex. moitié options 0, moitié 2).
- **Attendu**: secteurId `undetermined`, confidence < 0.35, top3 cohérents.

Les fixtures sont dans supabase/functions/tests/fixtures-sector-job.ts.

---

## 5) NOUVELLES QUESTIONS (résumé)

### Quiz secteur 40 (ids secteur_1..secteur_40)
- 24 questions « domaine » : préférence numérique/terrain/humain/création (ex. « Tu préfères travailler sur : code / terrain / relation »).
- 16 questions « style » : rythme, structure, social, risque sans répétition.
- Format : `{ id, section, sectionTitle, question, options: [string] }`.
- Fichier : `src/data/quizSecteurQuestions.js` (existant, à remplacer par version discriminante ; les ids secteur_1..secteur_40 et les options doivent correspondre aux deltas dans sectorScoring.ts).

### Quiz métier 12 communes (ids metier_common_1..metier_common_12)
- Profil 6 axes : analytic, creative, operational, social, risk, structure.
- Format : `{ id, question, options }`.
- Fichier : `src/data/quizMetierQuestions.js` (remplacer les 20 par 12 avec ids metier_common_1..12).

### Quiz métier 8 par secteur (ids sector_specific_1..8)
- Un fichier par secteur : `src/data/quizMetierSectorQuestions/<secteurId>.js` exportant 8 questions.
- Exemples créés : ingenierie_tech, creation_design, environnement_agri.
- Les 13 autres secteurs : même structure (8 questions A/B/C).

---

## 6) DATA ENRICHIE (proposition)

### Jobs ≥6 par secteur (ids + labels)
- ingenierie_tech: developpeur, data_scientist, cybersecurity, ingenieur, devops, tech_lead
- creation_design: graphiste, webdesigner, designer, ux_designer, directeur_artistique, motion_designer
- environnement_agri: ingenieur, agro_ingenieur, consultant_rse, technicien_environnement, chef_projet_vert, animateur_nature
- (Autres secteurs : étendre JOB_IDS et CLUSTERS de la même façon pour atteindre 6/secteur.)

### Clusters ≥3 jobs
- builder_tech: 3+ jobs (ex. developpeur, data_scientist, cybersecurity, devops).
- environment_agri: 3+ jobs (ex. ingenieur, agro_ingenieur, consultant_rse).
- Tous les clusters dans clusters.ts doivent avoir candidateJobIds.length >= 3.
</think>
Implémentation des fichiers partagés : `sectors`, `clusters`, puis `scoring` (secteur + métier).
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
TodoWrite