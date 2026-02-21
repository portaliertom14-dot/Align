# Mode test — generate-dynamic-modules

## Appel minimal (payload réduit)

```json
{
  "traceId": "test-12345",
  "sectorId": "tech",
  "jobId": "developpeur",
  "contentVersion": "v1",
  "language": "fr",
  "personaCluster": "default"
}
```

## Logs attendus

### Côté client (dynamicModules.js)

```
[AI_DYNAMIC] CALL
  traceId, userId, chapitreId, moduleIndex, payloadSizeBytes, payloadKeys, __DEV__, platform, appVersion
```

```
[AI_DYNAMIC] RESPONSE
  traceId, status, hasData, hasError, errorCode, errorMessage, responseHeaders, dataSource, __DEV__, platform
```

Si timeout (25s) :
```
[AI_DYNAMIC] TIMEOUT
  traceId, __DEV__, platform
```

### Côté Edge Function (Supabase logs)

```
[AI_DYNAMIC_FN] IN
  traceId, userId, payloadKeys, payloadSizeBytes
```

```
[AI_DYNAMIC_FN] OPENAI_CALL
  traceId, model, promptTokensEstimate
```

Succès :
```
[AI_DYNAMIC_FN] OPENAI_OK { traceId }
[AI_DYNAMIC_FN] AFTER_RETURN { traceId, source: 'ok' }
```

Erreur :
```
[AI_DYNAMIC_FN] OPENAI_ERR { traceId, name, message, status }
[AI_DYNAMIC_FN] AFTER_RETURN { traceId, reason }
```

### Diagnostic 546

Si status 546 :
- Vérifier `responseHeaders` dans [AI_DYNAMIC] RESPONSE
- Vérifier logs Supabase à l'heure de l'erreur
- 546 n'est pas HTTP standard → proxy/CDN/WAF (Cloudflare, Supabase gateway) ou rate limit

## Test manuel

1. Démarrer l'app : `npm start`
2. Aller dans Chapitres → Chapitre 1 → Module 2 (Test secteur) ou Module 3 (Simulation)
3. Observer la console client et les logs debug (.cursor/debug.log)
4. Si échec : bannière "Génération indisponible. Réessayez." + bouton RÉESSAYER

## Redéployer l'Edge Function

```bash
supabase functions deploy generate-dynamic-modules
```
