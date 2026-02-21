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

## Profils (6)

| # | Secteur cible | Top1 attendu |
|---|----------------|--------------|
| 1 | sport_evenementiel | sport_evenementiel |
| 2 | environnement_agri | environnement_agri |
| 3 | droit_justice_securite | droit_justice_securite |
| 4 | communication_media | communication_media |
| 5 | finance_assurance | finance_assurance |
| 6 | culture_patrimoine | culture_patrimoine |

Chaque profil : Q1–Q40 neutres (B), Q41–Q50 orientés secteur. Logique : baseScores × 1 + computeDomainScores × 2 + computeMicroDomainScores × 4, puis tri et hard rule humain_direct/no-tech.

## Logs

En cas de succès : `[EDGE_FINAL_TOP2] <profil> profile top3` avec id et score.
