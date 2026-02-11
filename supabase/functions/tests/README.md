# Tests manuels — Qualité & standardisation

Fichier principal : `quality-payloads.ts`.

## Payloads

- **Secteur** : `sectorPayload1`, `sectorPayload2`, `sectorPayload3` → body pour `analyze-sector`.
- **Job** : `jobPayload1`, `jobPayload2`, `jobPayload3` → body pour `analyze-job`.

## Vérifications

1. **JSON** : la réponse doit être un JSON valide avec les clés attendues (`secteurId`/`jobId`, `secteurName`/`jobName`, `description`).
2. **Whitelist** : `secteurId` dans la liste des secteurs, `jobId` dans la liste des métiers (`_shared/prompts.ts`).
3. **Longueur** : `description` ≤ 240 caractères (2–3 phrases).

## Helpers

- `checkSectorResponse(body)` : retourne `{ ok, errors }` pour une réponse analyze-sector.
- `checkJobResponse(body)` : idem pour analyze-job.

Exemple (après un appel HTTP) :

```ts
import { checkSectorResponse } from './quality-payloads.ts';
const result = checkSectorResponse(await response.json());
if (!result.ok) console.error(result.errors);
```

## Exécution

Tests manuels : envoyer les payloads avec Postman, curl ou le client Supabase vers les Edge Functions, puis vérifier le JSON et appeler les helpers si besoin.
