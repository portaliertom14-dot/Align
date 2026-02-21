# PR — Secteur verrouillé avant quiz métier

## Objectif produit

- Le secteur est déterminé par le quiz secteur (40 questions) et est **verrouillé** avant le quiz métier.
- Le quiz métier (20 questions) choisit **uniquement** le meilleur métier **dans** le secteur verrouillé. Aucun métier hors secteur.
- Résout l’incohérence "secteur A + métier hors secteur (ex. Agro + Data scientist)".

## Résumé des changements

### Edge

1. **`supabase/functions/_shared/clusters.ts`**
   - `getSectorIdForJob(jobId)` : retourne le secteur v16 du premier cluster contenant le job.
   - `getSectorIdsForJob(jobId)` : retourne **tous** les secteurs auxquels le job appartient (un job peut être dans plusieurs clusters).
   - `getClustersForSector(sectorId)` : retourne les `clusterId` dont le secteur v16 est `sectorId`.
   - Nouveau cluster `environment_agri` → secteur `environnement_agri`, candidat `ingenieur` (pour run "Agro").

2. **`supabase/functions/analyze-job/index.ts`**
   - **Body** : `lockedSectorId?: string` (optionnel).
   - **Validation** : `lockedSectorId` validé via `getSectorWithFallback` → `lockedSectorValidId`.
   - **Pipeline si secteur verrouillé** :
     - a) Profil + `scoreClusters` + `applyRecentPenalties` inchangés.
     - b) Filtrage des clusters : ne garder que les clusters dont `getSectorIdForCluster(clusterId) === lockedSectorValidId`. Si vide, on garde les top clusters (fallback) puis filtre strict sur les jobs.
     - c) `pickTopCandidates` sur les clusters (filtrés ou non).
     - d) Filtrage des candidats : ne garder que les jobs dont `getSectorIdsForJob(jobId).includes(lockedSectorValidId)`.
     - e) Si la liste filtrée est vide : fallback = tous les jobs des clusters du secteur (`getClustersForSector` + `getClusterCandidates`).
     - f) OpenAI appelé avec la liste de candidats filtrée.
     - g) Si OpenAI renvoie un `jobId` hors liste → fallback = premier candidat de la liste.
     - h) Réponse inclut `sectorIdLocked` quand un secteur est verrouillé.
   - **Logs** : `analyze_job_locked_sector`, `analyze_job_filtered_clusters` (before/after), `analyze_job_filtered_candidates` (before/after, `lockedSectorId`), `analyze_job_final` avec `sectorIdLocked`.
   - **clusterId** : dérivé du job retenu (`getClusterIdForJob(finalJob.validId)`) pour cohérence.

### App

3. **`src/services/analyzeJob.js`**
   - `opts.lockedSectorId` (et fallback `opts.sectorId` si absent).
   - Envoi de `lockedSectorId` dans le body.
   - Log `[IA_JOB] lockedSectorId`.
   - Réponse : `sectorIdLocked` exposé dans le résultat.

4. **`src/screens/PropositionMetier/index.js`**
   - `activeSecteurId` = secteur verrouillé (quiz secteur) : `progress.activeDirection` ou `progress.activeSerie` normalisé.
   - **Blocage** : si `!activeSecteurId`, message "Secteur manquant. Complète d’abord le quiz secteur." et pas d’appel à `analyzeJob`.
   - Appel : `analyzeJob(answers, questions, { lockedSectorId: activeSecteurId })`.

5. **TonMetierDefini**
   - Aucun changement : le secteur affiché reste `progress.activeDirection` (déjà le secteur verrouillé du quiz secteur).

## Points de test

- **Run "Agro"** : Choisir le secteur **Environnement & Agri**, puis faire le quiz métier avec des réponses “tech”. Le job retourné doit rester dans le secteur agro (ex. ingenieur). Les logs Edge doivent montrer `analyze_job_filtered_clusters` et `analyze_job_filtered_candidates` avec `lockedSectorId: environnement_agri`.
- **Run "Tech"** : Secteur **Ingénierie & Tech** + quiz métier orienté tech → jobs type developpeur / data_scientist / cybersecurity OK.
- **Logs Edge** : Vérifier la présence de `analyze_job_locked_sector`, `analyze_job_filtered_clusters`, `analyze_job_filtered_candidates` et `analyze_job_final` avec `sectorIdLocked` lorsque `lockedSectorId` est envoyé.
- **Secteur manquant** : Accéder au quiz métier sans avoir de secteur (ex. pas de `activeDirection`) → message d’erreur et pas d’appel Edge.

## Contraintes respectées

- Pas de changement des whitelists v16 / fallback existants (validation via `getSectorWithFallback`).
- Toujours un `jobId` whitelist valide (fallback premier candidat si réponse OpenAI hors liste).
- Cas vides gérés par fallback (clusters du secteur, puis liste candidats) sans 500/503.
