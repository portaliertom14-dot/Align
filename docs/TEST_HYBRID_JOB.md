# Tests moteur hybride (scoring + clusters + IA)

## Où tester

1. **Run "tech"**  
   Quiz métier : privilégier options type "maîtrises des outils précis", "analyser / résoudre", "diagnostic complet", "formation structurée", "seul ou petit comité", "précision et méthode".  
   **Attendu** : `clusterId` = `builder_tech` en top 1, `jobId` parmi `developpeur`, `data_scientist`, `cybersecurity`. Logs Edge : `analyze_job_profile` avec `topClusters[0].clusterId === 'builder_tech'`.

2. **Run "créatif"**  
   Quiz métier : privilégier "inventes des idées", "imaginer / créer", "solution créative", "voir une idée naître", "équipe créative", "originalité et esthétique".  
   **Attendu** : `clusterId` = `creator_design` ou `creator_media` en top 1, `jobId` parmi `graphiste`, `webdesigner`, `designer`, `redacteur`, `photographe`. Pas systématiquement "designer" grâce à l’anti-générique.

3. **Run "terrain"**  
   Quiz métier : privilégier "agis vite sur le terrain", "intense et rythmé", "exécuter / livrer", "élevé — j'adore l'action", "équipe opérationnelle / mouvante", "agis tout de suite pour limiter les dégâts".  
   **Attendu** : `clusterId` = `field_ops` dans le top 2, candidats orientés opérationnel.

## Tests unitaires Edge (Deno)

```bash
cd supabase/functions && deno test _shared/scoring.test.ts --allow-read
```

- `profil tech => builder_tech top1`
- `profil créatif => creator top1` (creator_design ou creator_media)
- `profil terrain => field_ops dans top 2`
- `pickTopCandidates returns candidates from top clusters`

## Logs structurés à vérifier

- `analyze_job_start` : requestId, answersHash, answerCount
- `analyze_job_profile` : axes (analytic, creative, …), topClusters (clusterId + score)
- `analyze_job_candidates` : clusters + candidateJobIds, topCandidates
- `analyze_job_openai_ok` : finalJobId, clusterId, sectorIdSuggested

Côté client : `[IA_JOB] response` avec jobId, clusterId, reasonShort (tronqué).

## Récap

- **Scoring** : `_shared/scoring.ts` (buildProfileFromMetierAnswers, scoreClusters, pickTopCandidates).
- **Clusters** : `_shared/clusters.ts` (12 clusters, candidateJobIds, CLUSTER_TO_SECTOR_V16).
- **analyze-job** : profil → topClusters → candidats (anti-générique) → OpenAI choisit 1 jobId + reasonShort + description.
- **analyze-sector** : option `hintClusterId` ou `jobId` dans le body pour dériver le secteur sans appeler l’IA.
- **App** : `analyzeJob(answers, questions, { sectorId })`, affichage de `reasonShort` sur l’écran résultat métier.
