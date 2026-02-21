# Checklist test — Secteurs v16 et chaîne IA

## 1. Run "tech" vs "créatif"

- **Run A (tech)** : Répondre au quiz secteur en privilégiant logique, structure, technique. Noter `secteurId` et `jobId` affichés (ou dans les logs `[IA_SECTOR]` / `[IA_JOB]`).
- **Run B (créatif)** : Répondre en privilégiant créativité, communication, arts. Noter `secteurId` et `jobId`.
- **Vérifier** : `answersHash` différents entre A et B ; `secteurId` différent au moins la plupart du temps ; `jobId` différent la plupart du temps.

## 2. Console sans erreurs

- Aucun log `Direction inconnue`.
- Aucun log `sectorId invalide`.
- Aucun `Cannot access uninitialized variable` (prefetch / PropositionMetier / TonMetierDefini).

## 3. Logs Edge

- `analyze_sector_start` contient `whitelistVersion: "v16-sectors"` et `promptVersion: "v16"`.
- En cas de secteur refusé par l’IA : `analyze_sector_fallback` avec `rawSecteurId` et `fallbackId`.
- En cas de secteur inconnu côté modules : `generate_dynamic_sector_fallback` ou `generate_feed_sector_fallback` avec `sectorIdReceived` et `sectorIdUsed`.

## 4. Modules warmup

- Après résultat secteur puis métier : prefetch déclenché.
- Logs côté client ou Edge : `GENERATE_START` puis succès (pas d’erreur "Génération indisponible" sans raison).
- Modules accessibles sur l’écran de vérification (checkpoints).

## 5. Persistance

- `activeDirection` contient un `secteurId` v16 (ex. `creation_design`, `ingenierie_tech`), pas un libellé ni un ancien id.
- Retour sur TonMetierDefini après résultat : pas de crash, prefetch avec le bon `sectorId`/`jobId`.

---

**IDs secteurs v16** (source de vérité : `supabase/functions/_shared/sectors.ts` et `src/constants/sectors.js`) :

ingenierie_tech, creation_design, business_entrepreneuriat, sante_bien_etre, droit_justice_securite, defense_securite_civile, education_formation, sciences_recherche, data_ia, industrie_artisanat, environnement_agri, communication_media, finance_assurance, sport_evenementiel, social_humain, culture_patrimoine
