# Tester l’appel analyze-sector (CORS, réseau, debug)

## 1) Vérifier que l’appel part correctement

- Lancer l’app (Expo web ou mobile).
- Aller jusqu’à la fin des **40 questions** du quiz secteur, puis cliquer sur **Analyser**.
- Dans la console navigateur / Metro :
  - Tu dois voir `[IA_SECTOR] START` puis `[IA_SECTOR] response` ou `[IA_SECTOR] FATAL ERROR`.
  - En cas d’erreur réseau : `[IA_SECTOR] retry after network error` (1 retry), puis soit succès soit message « Problème de connexion ».

**À regarder :** pas de boucle infinie, et après erreur l’overlay de chargement disparaît (loading toujours libéré dans `finally`).

---

## 2) Tester l’étape « affiner » (micro-questions)

- Après la première analyse, si l’app propose des **questions d’affinage**, y répondre puis valider.
- En cas de **connexion perdue** ou **CORS** :
  - L’app doit afficher une alerte « Problème de connexion » et un **bandeau avec bouton « Réessayer »** en bas de l’écran.
  - Cliquer sur **Réessayer** relance l’appel avec les mêmes réponses ; l’écran ne doit pas rester bloqué.

**À regarder :** `[IA_SECTOR] START` avec `(retry 1)` si un premier appel a échoué ; puis soit succès soit à nouveau le bandeau Réessayer.

---

## 3) Activer les logs debug (optionnel)

Pour logger **URL, présence d’Authorization, status, erreur exacte** côté client :

- **Expo / React Native :** définir la variable d’environnement `DEBUG_ANALYZE_SECTOR=true` avant de lancer (par ex. dans `.env` ou `EXPO_PUBLIC_DEBUG_ANALYZE_SECTOR=true` si tu lis cette clé dans le code).
- Ou dans `src/services/analyzeSector.js` mettre temporairement `export const DEBUG_ANALYZE_SECTOR = true;`.

Puis refaire un parcours quiz → analyse (ou affinage). Dans la console :

- `[IA_SECTOR] DEBUG` : `url`, `hasAuthorization`, `attempt`, `requestId`.
- `[IA_SECTOR] DEBUG response` : `durationMs`, `hasData`, `hasError`, `errorName`, `errorMessage`.
- `[IA_SECTOR] DEBUG error` en cas de throw.

Côté **Edge Function** (logs Supabase Dashboard → Edge Functions → analyze-sector → Logs) :

- `EDGE_ANALYZE_SECTOR` : `requestId`, `method`, `origin`, `hasAuthHeader`, `durationMs`.
- `EDGE_ANALYZE_SECTOR_DONE` : succès avec `durationMs`.
- `EDGE_ANALYZE_SECTOR_ERROR` : erreur avec message et `durationMs`.

Vérifier en particulier : `hasAuthHeader: true` quand l’utilisateur est connecté, et `origin` cohérent avec ton front (ex. `http://localhost:8081`).
