# BUG + PERF MOBILE (WEB) — Correctifs iOS Safari

**Date** : 3 février 2026

---

## 1) Navbar mobile cachée (iOS Safari)

### Problème
La navbar passait sous la barre Safari (zone du navigateur), la rendant parfois inutilisable.

### Cause
- `100vh` sur iOS inclut la zone sous la barre Safari → le contenu et la navbar sont poussés vers le bas
- `position: absolute; bottom: 0` positionne la navbar au bord bas du viewport, qui peut être sous la barre Safari
- Pas de prise en compte de `safe-area-inset-bottom`

### Solution appliquée

1. **web/index.html**
   - `viewport-fit=cover` dans le meta viewport (active `env(safe-area-inset-*)`)
   - `min-height: 100dvh` (avec fallback `100vh`) pour une hauteur correcte sur iOS
   - Classe `.align-bottom-nav-web` avec `bottom: max(12px, env(safe-area-inset-bottom, 12px))` pour élever la navbar au-dessus de la barre Safari

2. **BottomNavBar.js**
   - Classe `align-bottom-nav-web` appliquée au wrapper en web

3. **Feed contentContainer**
   - `paddingBottom: 100` sur web pour laisser de la place sous la navbar

### Avant / Après

| Avant | Après |
|-------|-------|
| Navbar collée au bord, parfois sous Safari | Navbar au-dessus de la zone safe (env(safe-area-inset-bottom)) |
| 100vh = hauteur totale iOS (inclut barre Safari) | 100dvh = hauteur utile, viewport-fit=cover active |

---

## 2) Loader module en retard / 1 fois sur 2

### Problème
- Feedback visuel absent au clic sur un module
- Loader parfois visible très tard (30–60 s)
- Impression d’app bloquée

### Solution appliquée

1. **Feedback immédiat**
   - `setGeneratingModule(moduleType)` en toute première ligne de `handleStartModule`
   - Modal « Chargement du module… » affichée dès le début

2. **Timeout 4 s**
   - Si chargement > 4 s : message « Ça prend plus de temps que prévu… »
   - Bouton « Réessayer »

3. **Navigation avant fetch**
   - Navigation vers l’écran Module dès que les données nécessaires sont prêtes
   - Le fetch des questions se fait ensuite dans l’écran Module

---

## 3) Modules trop lents au lancement

### Problème
- Clic sur « Lancer » → attente longue avant l’affichage

### Solution appliquée

1. **Navigation immédiate**
   - Navigation vers Module dès `getUserProgress()` terminé (≈100–500 ms)
   - Plus d’attente du fetch IA avant la navigation

2. **Skeleton / AlignLoading**
   - Affichage immédiat de l’écran Module avec AlignLoading pendant le chargement des questions

3. **Cache**
   - Utilisation de `getCachedModule()` avant les appels IA (modulePreloadCache)
   - Évite les doubles fetch via `fetchStartedRef`

### Avant / Après

| Avant | Après |
|-------|-------|
| Clic → fetch IA 10–30 s → navigation | Clic → navigation (~200 ms) → skeleton → chargement IA en arrière-plan |
| Aucun feedback visuel au clic | Modal + skeleton immédiats |

---

## 4) Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `web/index.html` | viewport-fit=cover, 100dvh, classe `.align-bottom-nav-web` |
| `src/components/BottomNavBar.js` | Classe `align-bottom-nav-web` pour le wrapper |
| `src/screens/Feed/index.js` | `handleStartModule` refactor, Modal loader + timeout 4 s, navigation immédiate, paddingBottom web |
| `src/screens/Module/index.js` | Support des params de chargement, fetch en arrière-plan, skeleton, erreur + bouton Retour |

---

## 5) Tests à effectuer

- [ ] iPhone Safari : navbar toujours visible et cliquable
- [ ] Tap sur onglets : changement immédiat
- [ ] Tap sur lancer module : écran Module affiché immédiatement avec skeleton
- [ ] Aucun loader qui apparaît 30 s après le clic
