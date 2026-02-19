# Reachability tests (analyze-sector)

Vérifient que les secteurs cibles peuvent sortir top1 quand les signaux Q41–Q50 sont maximaux, **sans appeler OpenAI**.

## Prérequis : Deno

Les tests Supabase Edge utilisent Deno. Si `deno` n’est pas installé :

- **macOS (Homebrew)** : `brew install deno`
- **Install script** : `curl -fsSL https://deno.land/install.sh | sh` (puis ajouter le binaire au PATH si besoin, ex. `~/.deno/bin`)

Vérifier : `deno --version`

## Run

**Si vous êtes déjà dans `supabase/functions`** (invite du type `… functions %`) :

```bash
deno test analyze-sector/reachability.test.ts --allow-read --allow-env
```

**Si vous êtes à la racine du repo** (`align-app`) :

```bash
cd supabase/functions && deno test analyze-sector/reachability.test.ts --allow-read --allow-env
```

Ou sans `cd`, en appelant le test par son chemin depuis la racine :

```bash
deno test supabase/functions/analyze-sector/reachability.test.ts --allow-read --allow-env
```

## Cas couverts

| Profil | Réponses clés | Top1 attendu |
|--------|----------------|-------------|
| A) Sport | Q41–Q46 mouvement/performance, Q48=B | `sport_evenementiel` |
| B) Environnement | Q41–Q46 vivant/écosystèmes, Q50=B | `environnement_agri` |
| C) Droit | Q41–Q46 règles/sécurité, Q48=A, Q50 omis | `droit_justice_securite` |

Le test applique la même logique que l’Edge : `computeMicroDomainScores` → rerank (bonus × 4) → hard rule humain_direct/no-tech.

## Logs

En cas de succès, les tests loguent `EDGE_MICRO_DOMAIN_SCORES` et `EDGE_AFTER_MICRO_RERANK` (top3) pour chaque profil.
