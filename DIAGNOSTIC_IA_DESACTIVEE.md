# Diagnostic — Aucun appel IA

## Causes possibles

### 1. Mode Mock activé (aucun appel IA)
- **URL web** : `?mock=1` dans l'URL → données fixes (Finance) sans IA
- **Variables d'environnement** : `EXPO_PUBLIC_PREVIEW_RESULT=true` ou `VITE_PREVIEW_RESULT=true`

**Vérifier** : Console doit afficher `[ResultatSecteur] MODE MOCK — aucun appel IA`

### 2. AI_ENABLED=false dans Supabase
- Supabase Dashboard → Project Settings → Edge Functions → Secrets / Environment
- Si `AI_ENABLED` = `"false"` (string) → toutes les Edge Functions retournent `source: 'disabled'` sans appeler OpenAI

**Corriger** : Supprimer `AI_ENABLED` ou le définir à une autre valeur que `"false"`

### 3. OPENAI_API_KEY manquante côté Supabase
- Les Edge Functions utilisent `Deno.env.get('OPENAI_API_KEY')` — définie dans Supabase secrets
- Si absente → `source: 'disabled'` ou erreur 500

**Corriger** :
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

### 4. Edge Functions non déployées
- Les fonctions `analyze-sector`, `analyze-job`, `generate-dynamic-modules` doivent être déployées

**Vérifier** :
```bash
supabase functions list
```

**Déployer** :
```bash
supabase functions deploy analyze-sector
supabase functions deploy analyze-job
supabase functions deploy generate-dynamic-modules
```

### 5. Pas encore arrivé à l'écran qui déclenche l'IA
- **Quiz secteur** : L'appel `analyze-sector` ne se fait qu'après la dernière question → écran ResultatSecteur
- **Quiz métier** : L'appel `analyze-job` ne se fait qu'après soumission du quiz métier → écran PropositionMetier
- **Modules dynamiques** : L'appel `fetchDynamicModules` ne se fait qu'en ouvrant un module 2 ou 3 d'un chapitre

**Vérifier** : Console doit afficher `[analyzeSector] CALL` ou `[analyzeJob] CALL` ou `[AI_DYNAMIC] CALL` quand l'écran concerné est atteint

## Logs de diagnostic ajoutés

- `[analyzeSector] CALL` / `[analyzeSector] RESPONSE` — quiz secteur
- `[analyzeJob] CALL` / `[analyzeJob] RESPONSE` — quiz métier  
- `[AI_DYNAMIC] CALL` / `[AI_DYNAMIC] RESPONSE` — modules dynamiques
- `[ResultatSecteur] MODE MOCK` — si mode mock actif

Si aucun de ces logs n'apparaît → vous n'êtes pas encore sur l'écran qui déclenche l'IA.
