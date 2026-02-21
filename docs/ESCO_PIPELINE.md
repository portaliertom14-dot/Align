# Pipeline ESCO — Align

Le système de proposition métier utilise ESCO + embeddings + IA pour proposer (quasi) tous les métiers, avec des descriptions ultra simples.

## Architecture

```
Quiz Métier (réponses) → profileText → embedding OpenAI
                                      ↓
                    rpc_search_esco_occupations(query_embedding, 30)
                                      ↓
                    top 30 candidats ESCO (recherche sémantique)
                                      ↓
                    OpenAI chat : choisir 1 occupation_id parmi la liste
                                      ↓
                    Validation : occupation_id ∈ candidats
                                      ↓
                    Réponse : jobId, jobName, description, bullets
```

## Prérequis

- Supabase (Postgres + pgvector)
- **Scripts (ingest + embed)** : dans `.env` (voir `.env.example`) :
  - `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API → service_role)
  - `OPENAI_API_KEY` ou `EXPO_PUBLIC_OPENAI_API_KEY`
- **Edge Function analyze-job** : `OPENAI_API_KEY` dans Supabase → Edge Functions → Secrets

## 1. Migrations

```bash
supabase db push
# ou
supabase migration up
```

Fichier : `supabase/migrations/20250203000000_CREATE_ESCO_SYSTEM.sql`

- Tables : `esco_groups`, `esco_occupations`, `esco_embeddings` (pgvector, index HNSW)
- RPC : `rpc_search_esco_occupations(query_embedding vector, k int)`

## 2. Import ESCO

Placer le fichier JSON dans `data/esco/` (voir `data/esco/README.md`).

Format attendu : `occupations.json` ou `sample_occupations.json`

```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
node scripts/ingest_esco.mjs data/esco/sample_occupations.json
```

Ou avec `.env` contenant `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` :

```bash
node scripts/ingest_esco.mjs
```

## 3. Embeddings

Calcule les vecteurs pour chaque occupation (OpenAI `text-embedding-3-small`).

```bash
export OPENAI_API_KEY="sk-..."
node scripts/embed_esco.mjs
```

- Batch 20, délai 2s entre batches
- Retry exponentiel en cas de rate limit
- Reprise : ignore les occupations déjà embedées

## 4. Vérification

```sql
SELECT COUNT(*) FROM esco_occupations;
SELECT COUNT(*) FROM esco_embeddings;
```

Les deux comptes doivent être égaux pour que la recherche sémantique fonctionne.

## 5. Déploiement Edge Function

```bash
supabase functions deploy analyze-job
```

Variables d'environnement (Supabase Dashboard → Edge Functions → analyze-job) :

- `OPENAI_API_KEY`
- `AI_ENABLED` (optionnel, true par défaut)

## Test Plan

1. **Run "tech"** : réponses orientées tech/data/ingénierie → métier type développeur, data scientist, ingénieur
2. **Run "créatif"** : réponses orientées création → designer, graphiste, photographe
3. **Vérifier jobId** : doit être un `occupation_id` ESCO (ex: `developpeur`, `medecin`), pas l’ancienne whitelist codée en dur
4. **Logs** : `requestId` cohérent entre client (`[IA_JOB]`) et serveur (`analyze_job_start`, `analyze_job_openai_ok`)
5. **Erreurs** : si 0 candidats ESCO → 500 `empty_candidates` ; si occupation_id hors liste → 500 `Métier non autorisé`

## Commandes rapides

```bash
# Tout le pipeline (après migration)
node scripts/ingest_esco.mjs data/esco/sample_occupations.json
node scripts/embed_esco.mjs
supabase functions deploy analyze-job
```

## Obtenir les données ESCO complètes

- API ESCO : https://ec.europa.eu/esco/api
- Téléchargement bulk : https://esco.ec.europa.eu/en/use-esco/download
- Convertir le CSV/XML ESCO vers le JSON attendu (scripts ou outils custom)
