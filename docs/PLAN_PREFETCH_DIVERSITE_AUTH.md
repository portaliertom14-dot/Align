# Plan prefetch / diversité / auth — exécution et tests

## Checklist d’exécution

- [x] **A** Stabiliser prefetch : single-flight, AbortError en warn + `PREFETCH_ABORTED`, timeout 12s, guard sectorId/jobId
- [x] **B** Guards écrans : TonMetierDefini + PropositionMetier — `prefetchTriggeredRef`, un call par montage
- [x] **C** getCurrentUser : sur 403 → `refreshSession()` puis signOut si échec ; logs status/étape
- [x] **D** Diversité métiers : `applyRecentPenalties` + `ai_recent` dans `user_progress` ; logs analyze_job_*
- [x] **E** Secteur : scoring déterministe (keywords) + IA uniquement pour rédaction (secteurName/description) ; logs analyze_sector_scored

## Fichiers modifiés (diffs résumés)

### A — `src/services/prefetchDynamicModulesSafe.js`
- Single-flight global : état `inFlight` avec `key = sectorId|jobId` ; si même key → `{ ok: false, error: 'PREFETCH_SKIPPED', message: 'in-flight' }` ; si key différent → `inFlight.controller.abort()` puis nouveau fetch.
- Appel direct `fetch()` avec `AbortController` + timeout 12s (plus d’usage de `supabase.functions.invoke` pour pouvoir abort).
- En cas d’erreur : si `AbortError` / "Fetch is aborted" → `console.warn` + retour `{ ok: false, error: 'PREFETCH_ABORTED' }` (pas de throw).
- Headers : `Authorization: Bearer` = session?.access_token ?? anon key.
- Log durée : `[PREFETCH] durationMs X status Y`.

### B — `src/screens/TonMetierDefini/index.js`
- `useRef(prefetchTriggeredRef)` : si déjà `true` au début de `runPrefetch`, return sans lancer.
- Après avoir sectorId/jobId valides, `prefetchTriggeredRef.current = true` avant l’appel.
- Ne pas afficher d’erreur utilisateur pour `PREFETCH_SKIPPED` / `PREFETCH_ABORTED`.

### B — `src/screens/PropositionMetier/index.js`
- `useRef(prefetchTriggeredRef)`.
- Premier prefetch (après résultat analyzeJob) : exécuter seulement si `!prefetchTriggeredRef.current`, puis `prefetchTriggeredRef.current = true`.
- Regenerate : idem, prefetch seulement si `!prefetchTriggeredRef.current`.

### C — `src/services/auth.js` (getCurrentUser)
- Si `error && status === 403` : log "status=403, tentative refresh", puis `supabase.auth.refreshSession()`. Si succès → retourner `refreshData.session.user`. Si échec → log "refresh ko, déconnexion" puis `signOut()`, return null.
- `user_not_found` : garder signOut, mais ne plus traiter 403 comme "utilisateur supprimé" sans refresh.
- Dans le catch : si `status === 403`, même logique refresh puis signOut.
- Logs : status code, "refresh ok" / "refresh ko".

### D — `supabase/functions/_shared/scoring.ts`
- `applyRecentPenalties(clusterScores, recentJobIds?, recentClusterIds?)` : pénalité -0.4 si cluster dans recentClusterIds, -0.8 (pondéré) si jobs du cluster dans recentJobIds ; retourne scores triés.
- `pickTopCandidates` : options étendues avec `recentJobIds?` et `recentClusterIds?` (conservés pour compat, la diversité est gérée via `applyRecentPenalties` avant appel).

### D — `supabase/functions/analyze-job/index.ts`
- Chargement `user_progress.ai_recent` pour `userId` (select `ai_recent` où `id = userId`).
- `recentJobIds` / `recentClusterIds` = derniers 20 (slice depuis ai_recent).
- Après `scoreClusters(profile)` : `clusterScoresAdjusted = applyRecentPenalties(clusterScores, recentJobIds, recentClusterIds)` ; `topClusters = clusterScoresAdjusted.slice(0, 3)` ; candidats avec `clusterScoresAdjusted`.
- Logs : `analyze_job_profile`, `analyze_job_top` (topClusters + nb recent), `analyze_job_candidates`, `analyze_job_final` (jobId, clusterId).
- Après succès : update `user_progress` avec `ai_recent: { jobIds: [...recentJobIds, finalJob.validId].slice(-10), clusterIds: [...recentClusterIds, clusterId].slice(-10) }` (update par `id = userId`).

### D — Migration SQL
- `supabase/migrations/ADD_AI_RECENT_TO_USER_PROGRESS.sql` : `ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS ai_recent JSONB DEFAULT NULL;`

### E — `supabase/functions/analyze-sector/index.ts`
- Si pas de `hintClusterId` / `jobIdHint` : scoring déterministe `scoreSectorFromSummary(summary)` (keywords par secteur, top3 + winnerId).
- Log `analyze_sector_scored` : top3 + winnerId.
- Secteur utilisé = winner (validé whitelist) ou SECTOR_FALLBACK_ID.
- Prompt IA : `promptAnalyzeSectorCopyOnly(sectorId, sectorName, summary)` — l’IA ne renvoie que `secteurName` et `description`.
- Réponse : secteurId = winner (scoring), secteurName/description = sortie IA ou fallback.

### E — `supabase/functions/_shared/prompts.ts`
- Nouveau `promptAnalyzeSectorCopyOnly(sectorId, sectorName, summary)` pour rédaction seule (secteurName + description).

---

## Checklist de test (3 runs + vérifs)

1. **Run “tech”**  
   - Parcours : quiz secteur → réponses orientées tech / logique / code.  
   - Vérifier :  
     - Logs Edge `analyze_sector_scored` avec winner cohérent (ex. ingenierie_tech ou data_ia).  
     - Quiz métier → `analyze_job_profile` / `analyze_job_top` / `analyze_job_final` présents.  
     - Prefetch : un seul appel réussi (ou PREFETCH_SKIPPED), log `[PREFETCH] durationMs` sans double-call.  
     - Pas de déconnexion intempestive (pas de 403 → logout sans refresh).

2. **Run “créatif”**  
   - Quiz secteur orienté création / design / visuel.  
   - Vérifier :  
     - `analyze_sector_scored` winner type creation_design / communication_media.  
     - Métier cohérent (ex. graphiste, designer si cluster top).  
     - Un seul prefetch, pas d’AbortError en error.

3. **Run “terrain”**  
   - Réponses orientées terrain / opérationnel / sport / défense.  
   - Vérifier :  
     - Secteur possible : defense_securite_civile, sport_evenementiel, etc.  
     - Pas toujours les mêmes 3 secteurs/métiers sur 3 runs différents (diversité ai_recent).  
     - Pas de double prefetch (TonMetierDefini puis PropositionMetier : un seul call par écran).

4. **Vérifs transverses**  
   - Console app : pas de `[PREFETCH] EDGE_ERROR` en error pour AbortError (uniquement warn + PREFETCH_ABORTED).  
   - Boot avec token expiré ou 403 : log "refresh" puis soit user récupéré soit déconnexion après échec refresh.  
   - Logs Edge : `analyze_job_final`, `analyze_sector_scored`, `analyze_sector_derived` (si hint fourni) présents et cohérents.

---

## Déploiement

- Appliquer la migration : `supabase db push` ou exécuter `ADD_AI_RECENT_TO_USER_PROGRESS.sql`.
- Redéployer les Edge Functions :  
  `supabase functions deploy analyze-job`  
  `supabase functions deploy analyze-sector`
