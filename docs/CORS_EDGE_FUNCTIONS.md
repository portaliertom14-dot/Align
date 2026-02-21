# CORS — Edge Functions (Expo Web)

Les Edge Functions appelées depuis Expo Web (`http://localhost:8081`) doivent répondre correctement au **preflight OPTIONS** et inclure les en-têtes CORS sur toutes les réponses.

## verify_jwt = false pour les appels navigateur

Le preflight **OPTIONS** envoyé par le navigateur ne contient pas d’en-tête `Authorization`. Si `verify_jwt = true` (défaut), le gateway Supabase peut rejeter la requête OPTIONS (503/401) **avant** qu’elle n’atteigne la fonction. Les fonctions appelées depuis le navigateur ont donc `verify_jwt = false` dans `supabase/config.toml` ; l’auth peut être vérifiée en code dans le handler si besoin.

## Déploiement obligatoire après modification

**Toute modification des fichiers Edge ne prend effet qu’après déploiement.**

```bash
# Déployer une function
supabase functions deploy generate-dynamic-modules
supabase functions deploy generate-feed-module
supabase functions deploy analyze-job
supabase functions deploy analyze-sector

# Ou toutes d’un coup
supabase functions deploy
```

Sans déploiement, le cloud continue d’exécuter l’ancienne version → preflight peut rester en 503 ou sans CORS.

---

## Sanity check : preflight OPTIONS

Remplacer `<SUPABASE_PROJECT_REF>` par la ref du projet (ex. `yuqybxhqhgmeqmcpgtvw`) et `<ANON_KEY>` par la clé anon si besoin pour les appels POST.

### OPTIONS (preflight) — doit répondre 200 ou 204 avec CORS

```bash
curl -i -X OPTIONS \
  "https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/generate-dynamic-modules" \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type"
```

**Résultat attendu :**
- Status **200** (ou 204)
- En-têtes contenant au moins :
  - `Access-Control-Allow-Origin: *` (ou `http://localhost:8081`)
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

Si vous voyez **503** ou l’absence de `Access-Control-Allow-*`, vérifier que les functions ont bien été déployées après les changements CORS.

### Autres functions (même test en changeant l’URL)

```bash
# analyze-sector
curl -i -X OPTIONS "https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/analyze-sector" \
  -H "Origin: http://localhost:8081" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: authorization, content-type"

# analyze-job
curl -i -X OPTIONS "https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/analyze-job" \
  -H "Origin: http://localhost:8081" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: authorization, content-type"

# generate-feed-module
curl -i -X OPTIONS "https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/generate-feed-module" \
  -H "Origin: http://localhost:8081" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: authorization, content-type"
```

---

## Fichiers concernés

- `supabase/functions/generate-dynamic-modules/index.ts`
- `supabase/functions/generate-feed-module/index.ts`
- `supabase/functions/analyze-job/index.ts`
- `supabase/functions/analyze-sector/index.ts`

Chacun définit `corsHeaders`, gère `OPTIONS` en tout début de handler et utilise `...corsHeaders` + `Content-Type: application/json` sur toutes les réponses JSON.
