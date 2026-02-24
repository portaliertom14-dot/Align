# Apprentissage universel — Admin `learning_templates`

Ce document décrit comment remplir une seule fois la table `learning_templates` (templates d’apprentissage universels) et comment vérifier le résultat.

---

## 1. Où mettre `ADMIN_SECRET` dans Supabase

1. Ouvrez le **Supabase Dashboard** de votre projet.
2. Allez dans **Project Settings** (icône engrenage) → **Edge Functions** (ou **Settings** → **API** selon la version).
3. Dans la section **Edge Function Secrets** (ou **Secrets** / **Environment Variables** pour les fonctions), ajoutez une variable d’environnement :
   - **Name:** `ADMIN_SECRET`
   - **Value:** une chaîne secrète de votre choix (ex: un long token aléatoire).
4. Sauvegardez. Cette valeur sera disponible dans l’edge function `generate-learning-templates` via `Deno.env.get('ADMIN_SECRET')`.

**Alternative (Variables d’environnement globales)**  
Si votre dashboard propose **Settings → Edge Functions → Secrets**, ajoutez là le secret `ADMIN_SECRET`. Les edge functions peuvent y accéder.

---

## 2. Commande `curl` pour appeler `generate-learning-templates`

L’edge function accepte soit le header **`X-Admin-Secret`**, soit **`Authorization: Bearer <SERVICE_ROLE_JWT>`** (ou les deux).

### Option A — Avec `X-Admin-Secret` (recommandé pour scripts)

Remplacez `YOUR_ADMIN_SECRET` par la valeur définie dans le dashboard et `YOUR_PROJECT_REF` par l’ID du projet Supabase (ex: `abcdefghijklmnop`).

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-learning-templates" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

### Option B — Avec JWT Service Role

Récupérez le **Service Role Key** (JWT) dans le dashboard : **Project Settings → API → Project API keys → `service_role` (secret)**.

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-learning-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_JWT"
```

### Option C — Les deux (maximal)

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-learning-templates" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_JWT" \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

Réponse attendue en succès (exemple) :

```json
{ "ok": true, "inserted": 29 }
```

(9 templates chapitres 1–9 + 20 templates chapitre 10 = 29 lignes.)

---

## 3. Vérifier le nombre de lignes dans `learning_templates`

### Dans le Supabase Dashboard

1. **Table Editor** → ouvrez la table **`learning_templates`**.
2. Le nombre de lignes s’affiche en bas (ou comptez les lignes).
3. Attendu :
   - **Chapitres 1–9 :** 9 lignes (`chapter_id` 1…9, `module_index` 0).
   - **Chapitre 10 :** 20 lignes (`chapter_id` 10, `module_index` 0…19).
   - **Total : 29 lignes.**

### En SQL (Supabase SQL Editor)

```sql
SELECT chapter_id, module_index, COUNT(*) OVER () AS total
FROM learning_templates
ORDER BY chapter_id, module_index;
```

Ou seulement le total :

```sql
SELECT COUNT(*) AS total FROM learning_templates;
```

Résultat attendu : `total = 29`.

---

## Résumé

| Étape | Action |
|-------|--------|
| 1 | Créer le secret **ADMIN_SECRET** dans Supabase (Edge Function Secrets / env). |
| 2 | Appeler une fois `generate-learning-templates` avec `curl` (X-Admin-Secret ou Bearer service_role). |
| 3 | Vérifier dans Table Editor ou avec `SELECT COUNT(*) FROM learning_templates;` → 29 lignes. |

Après ça, le **seed-modules** (et l’app) utilisent ces templates pour remplir les modules d’apprentissage sans génération IA par utilisateur.
