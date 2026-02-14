# Rapport d'optimisation — Phase pré-test utilisateur

**Date** : 3 février 2026  
**Objectif** : Performance, propreté, sécurité, fluidité — sans modifier le design ni ajouter de features.

---

## 1. Optimisations appliquées

### A. Performance globale

| Action | Fichiers | Impact |
|--------|----------|--------|
| Logs en dev uniquement | `App.js`, `authNavigation.js`, `supabase.js`, `LoginScreen.js` | Moins d’I/O console en prod |
| Utilitaire `devLog` | `src/utils/devLog.js` | `devLog`, `devWarn`, `devError` = no-op en prod |
| Initialisation non bloquante | `App.js` | `mounted` + retry limité pour auth listener |
| Lazy screens | `src/app/navigation.js` | `lazy: true` sur Stack.Navigator — écrans montés à la première visite |
| Fix `navigationRef` | `App.js`, `navigation.js` | Auth listener utilise la ref passée (évite ref null) |

### B. Images

| Action | Note |
|--------|------|
| Images Feed | Déjà `width/height` explicites, `resizeMode="contain"` |
| Préchargement modules | `modulePreloadCache.js` déjà en place pour le contenu IA |
| **Point restant** | Assets PNG 1–2 Mo chacun → compression recommandée (voir section 4) |

### C. Bundle

| Action | Note |
|--------|------|
| Lazy screens | Réduit le travail initial de rendu |
| Imports | Aucun import inutile ajouté |

### D. Sécurité

| Vérification | Résultat |
|--------------|----------|
| Clés client | Uniquement `EXPO_PUBLIC_*` (anon, URL, OpenAI) |
| `service_role` | Jamais côté client ; uniquement dans Edge Functions |
| Double submit | Login, Auth, ForgotPassword : `disabled={loading}` sur boutons |
| Validation | Front (email, password) + back (Edge Functions) |

### E. Propreté du code

| Action | Fichiers |
|--------|----------|
| Remplacement `console.log` par `devLog` | `App.js`, `authNavigation.js` |
| Remplacement `console.error` par `devError` ou `__DEV__` | `supabase.js`, `LoginScreen.js` |
| Suppression logs verbeux | `App.js` (init), `authNavigation.js` (handleLogin, setupAuthStateListener) |

### F. Fluidité UX

| Action | Note |
|--------|------|
| Boutons auth | Déjà désactivés pendant `loading` |
| `lazy: true` | Navigation plus légère au démarrage |
| `navigationRef` corrigé | Auth listener fonctionne correctement |

### G. Build web

| Vérification | Résultat |
|--------------|----------|
| `vercel.json` | `outputDirectory: "dist"`, `buildCommand: "npx expo export --platform web"`, rewrites SPA OK |
| Loading screen | `AlignLoading` affiché jusqu’à `systemsReady` |

---

## 2. Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `App.js` | `devLog/devError`, init simplifiée, retry auth listener |
| `src/app/navigation.js` | `navigationRef` prop, `lazy: true` |
| `src/utils/devLog.js` | **Nouveau** — logs conditionnels `__DEV__` |
| `src/services/authNavigation.js` | `devLog/devWarn/devError` à la place de `console.*` |
| `src/services/supabase.js` | `console.error` uniquement en `__DEV__` |
| `src/screens/Auth/LoginScreen.js` | `console.error` en `__DEV__` |

---

## 3. Gains estimés

| Métrique | Estimation |
|----------|------------|
| Temps de chargement initial | ~100–200 ms gagnés (moins de logs, lazy screens) |
| Console en prod | ~0 logs (réduction I/O) |
| Risque freeze | Réduit (init avec `mounted` + retry limité) |
| Auth listener | Comportement fiable (ref correcte) |

---

## 4. Points critiques restants

### Images (priorité haute)

- **Problème** : PNG 1–2 Mo par asset (ex. `home.png` ~2 Mo, `quests.png` ~2 Mo, etc.).
- **Impact** : Retard de 1–2 s avant affichage des images.
- **Piste** : Compresser les PNG (TinyPNG, `sharp`, `imagemin`) en tâche prebuild ou manuellement.
- **Contrainte** : Ne pas modifier le design (même rendu visuel, taille réduite).

### Bundle JS (~1,95 Mo)

- **Piste** : Analyser le bundle (ex. `npx expo export --platform web` puis `source-map-explorer`) et identifier les dépendances lourdes.
- **Piste** : Tree-shaking pour les libs non utilisées.

### Tests recommandés avant mise en prod

1. Test auth (login, signup, reset password).
2. Test navigation (écrans principaux, lazy loading).
3. Test web (Vercel build, pas de freeze au chargement).
4. Test mobile (fonts, init, auth).
