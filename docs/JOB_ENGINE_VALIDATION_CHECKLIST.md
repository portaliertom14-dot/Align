# Checklist validation réelle — Moteur métiers prod-ready

Objectif : vérifier en conditions réelles (app + logs) que le moteur utilise **cosine partout**, **aucun fallback**, et que la **diversité** (réponses différentes → jobs différents) fonctionne.

---

## 1. Activer les logs étendus

En dev, avant de lancer l’app :

```bash
export DEBUG_JOB_AXES=true
# ou dans .env / config : DEBUG_JOB_AXES=true
```

Chaque appel à la recommandation métiers loggera alors `[JOB_AXES]` avec :  
`sectorId`, `variant`, `engine`, `isFallback`, `topJobTitle`, `topJobScore`, `top3` (title+score), `scoreSpread`.

---

## 2. Cinq parcours secteurs différents

Pour **5 secteurs distincts** (ex. business_entrepreneuriat, culture_patrimoine, sante_bien_etre, data_ia, communication_media) :

1. Compléter le quiz secteur jusqu’à obtenir ce secteur en **top1**.
2. Enchaîner sur le quiz métier (30 ou 35 questions selon droit/défense).
3. À l’affichage du résultat métiers, vérifier dans les logs **console** (ou logs métro/serveur) :

- [ ] **engine** = `"cosine"` (jamais `"fallback"`).
- [ ] **isFallback** = `false`.
- [ ] **topJobScore** (et scores dans **top3**) ≠ `0.5` (pas de score fallback).

Répéter pour les 5 secteurs. Si un seul log montre `engine: 'fallback'` ou `isFallback: true` ou score `0.5` → investiguer (vecteurs manquants pour ce secteur/variant).

---

## 3. Diversité : un secteur (ex. business), trois runs métiers différents

Secteur fixe : **business_entrepreneuriat** (ou un autre de ton choix).

1. **Run 1** : Compléter le quiz métier avec un profil “très structuré” (réponses majoritairement A sur les questions métier).
2. **Run 2** : Même secteur, quiz métier avec un profil “créatif” (majoritairement B).
3. **Run 3** : Même secteur, quiz métier avec un profil “action/terrain” (majoritairement C).

Vérifications :

- [ ] Les **top1** (premier métier recommandé) ne sont **pas tous identiques** entre les 3 runs (au moins 2 profils donnent un top1 différent).
- [ ] Les **top3** (liste des 3 métiers) **changent** d’un run à l’autre (ordre et/ou contenu).
- [ ] Dans les logs `[JOB_AXES]`, les **scores** (topJobScore, top3[].score) sont **réalistes** (variation, pas toujours les mêmes valeurs).

Si les 3 runs donnent exactement le même top1 et le même top3 → vérifier que les réponses métier sont bien prises en compte (computeJobProfile, passage au moteur).

---

## 4. Garde-fou fallback (__DEV__)

En environnement **dev** (ou test), si un secteur/variant n’a **pas de vecteurs** :

- [ ] Un **console.error** `[JOB_AXES] ERROR: getVectorsForSectorAndVariant returned null` apparaît.
- [ ] Une **exception** est levée (fallback désactivé en dev) pour que le problème soit visible tout de suite.

En prod, seul le log ERROR est émis ; le fallback peut encore s’exécuter si un jour des vecteurs manquent (éviter de casser l’app), mais le log permet de corriger.

---

## 5. Résumé des critères “prod-ready”

| Critère | Où vérifier |
|--------|-------------|
| engine = cosine pour tous les secteurs testés | Logs `[JOB_AXES]` après résultat métiers |
| isFallback = false | Idem |
| Aucun score 0.5 sur les résultats affichés | topJobScore, top3[].score dans les logs |
| Réponses différentes → jobs différents (diversité) | 3 runs métier sur 1 secteur, comparer top1/top3 |
| Erreur visible en dev si vecteurs manquants | console.error + throw en __DEV__ |

Une fois ces points validés, le moteur peut être considéré **prod-ready** (cosine partout, diversité réelle, garde-fous actifs).
