# Traçabilité IA — logs à copier et plan de test

Instrumentation : `analyze-sector`, `analyze-job`, `generate-dynamic-modules`, clients `analyzeSector.js` et `analyzeJob.js`.  
Objectif : corréler client/serveur via `requestId`, debugger les résultats génériques (secteurId="creation", jobId="entrepreneur"), et éviter double invocation (single-flight).

---

## 1. Lignes de logs à copier

### Client Secteur (console React Native / Metro)

| Contexte | Préfixe / clés à noter |
|----------|------------------------|
| Avant appel | `[IA_SECTOR] payload` → **requestId**, **answerCount**, **questionCount**, **sample**, **answersHash** |
| Après réponse | `[IA_SECTOR] response` → **requestId**, **source**, **secteurId**, **secteurName**, **ok** |
| Payload invalide | `[IA_SECTOR] INVALID_PAYLOAD` → **requestId**, **answerCount**, **MIN_EXPECTED** |
| Single-flight | `[IA_SECTOR] GUARD — déjà en cours` si double appel détecté |

### Client Métier (console React Native / Metro)

| Contexte | Préfixe / clés à noter |
|----------|------------------------|
| Avant appel | `[IA_JOB] payload` → **requestId**, **answerCount**, **questionCount**, **sample**, **answersHash** |
| Après réponse | `[IA_JOB] response` → **requestId**, **source**, **jobId**, **jobName**, **ok** |
| Payload invalide | `[IA_JOB] INVALID_PAYLOAD` → **requestId**, **answerCount**, **MIN_EXPECTED** |
| Single-flight | `[IA_JOB] GUARD — déjà en cours` si double appel détecté |

### Serveur analyze-sector (Supabase → Logs Edge Function)

| Événement | Log JSON (exemple) |
|-----------|-------------------|
| Début | `{"event":"analyze_sector_start","requestId":"...","userId":"...","answerCount":40,"questionCount":40,"answersHash":"..."}` |
| Avant OpenAI | `{"event":"analyze_sector_openai_before","requestId":"...","AI_ENABLED":true,"model":"gpt-4o-mini","promptVersion":"v1"}` |
| Succès OpenAI | `{"event":"analyze_sector_openai_ok","requestId":"...","openaiCalled":true,"latencyMs":1234,"secteurId":"..."}` |

### Serveur analyze-job (Supabase → Logs Edge Function)

| Événement | Log JSON (exemple) |
|-----------|-------------------|
| Début | `{"event":"analyze_job_start","requestId":"...","userId":"...","answerCount":20,"questionCount":20,"answersHash":"..."}` |
| Avant OpenAI | `{"event":"analyze_job_openai_before","requestId":"...","AI_ENABLED":true,"model":"gpt-4o-mini","promptVersion":"v1"}` |
| Succès OpenAI | `{"event":"analyze_job_openai_ok","requestId":"...","openaiCalled":true,"latencyMs":1234,"jobId":"..."}` |

### Serveur generate-dynamic-modules (Supabase → Logs Edge Function)

| Événement | Log JSON (exemple) |
|-----------|-------------------|
| IA désactivée | `{"event":"generate_dynamic_disabled","requestId":"...","AI_ENABLED":false}` |
| Quota dépassé | `{"event":"generate_dynamic_quota","requestId":"..."}` |
| Avant OpenAI | `{"event":"generate_dynamic_openai_before","requestId":"...","model":"gpt-4o-mini","promptTokensEstimate":123}` |
| Succès OpenAI | `{"event":"generate_dynamic_openai_ok","requestId":"...","openaiCalled":true,"latencyMs":1234}` |

---

## 2. Plan de test (tech vs créatif)

### Single-flight (éviter double CALL)

- Si la console affiche `CALL` x2 pour une même soumission → le guard doit apparaître la seconde fois : `[IA_SECTOR] GUARD — déjà en cours` ou `[IA_JOB] GUARD — déjà en cours`.
- Causes possibles de double CALL : double mount React, double submit bouton, useEffect sans dépendances stables.

### A) Parcours « tech » (quiz secteur ou métier)

- Faire le quiz en répondant de façon très orientée **tech** (code, données, systèmes, processus).
- À la fin, copier :
  - **Client** : `[IA_SECTOR] payload` → noter **answersHash**, **answerCount**.
  - **Client** : `[IA_SECTOR] response` → noter **secteurId**, **source**.
  - **Serveur** : log `analyze_sector_start` avec le même **requestId** → **answersHash**, **answerCount**.
  - **Serveur** : log `analyze_sector_openai_ok` avec ce **requestId** → **openaiCalled: true**, **secteurId**.

### B) Parcours « créatif »

- Refaire le quiz avec des réponses très orientées **créatif** (art, design, idées, création).
- Copier les **mêmes** lignes qu’en A.
- Vérifier : **answersHash** doit être **différent** de l’étape A.

### C) Comparaison / preuve

- **answersHash A ≠ answersHash B** (obligatoire si réponses différentes).
- **secteurId A ≠ secteurId B** (souhaité si l’IA dépend bien des réponses).
- Si **secteurId identique** alors que **answersHash diffèrent** et **openaiCalled: true** → problème côté prompt / réponse OpenAI.
- Si **answersHash identique** ou **openaiCalled absent** → problème payload, désactivation, quota ou erreur en amont.
- Même logique pour **analyze-job** : comparer **answersHash** et **jobId** entre runs tech vs créatif.

---

## 3. Codes HTTP (aucun 200 en erreur)

| Cas | HTTP | Body (exemples) |
|-----|------|------------------|
| IA désactivée (analyze-sector / analyze-job / generate-dynamic-modules) | 503 | `source: 'disabled'` / `error: 'AI_DISABLED'`, **requestId** |
| Quota dépassé | 429 | `source: 'quota'` / `error: 'QUOTA_EXCEEDED'`, **requestId** |
| Erreurs métier (payload, OpenAI, DB, etc.) | 400 / 500 | **requestId** + `source` ou `error` + `message` |

Toutes les réponses (succès et erreur) incluent **requestId** pour corrélation avec les logs.
