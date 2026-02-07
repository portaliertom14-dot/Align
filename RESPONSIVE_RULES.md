# Règles Responsive — Align

**Date** : 3 février 2026  
**Objectif** : Responsive propre sans casser le layout global.

---

## INTERDICTIONS ABSOLUES

### Sur le root / layout principal
- **INTERDIT** : `transform: scale(...)`, `zoom` pour rendre responsive
- **INTERDIT** : `maxWidth` + `alignSelf: 'center'` sur le wrapper principal d'un écran (cause shrink global)
- **INTERDIT** : `width: '90%'` ou similaire sur le container racine qui centre tout
- **INTERDIT** : ResponsiveWrapper global qui wrap l'app entière

### Règle d'or
> NE PLUS JAMAIS utiliser scale/transform/zoom pour rendre responsive.  
> Si un scale existe quelque part pour du responsive global → le retirer.

---

## CE QUI EST AUTORISÉ

### Responsive = local uniquement
- `fontSize` avec clamp (ex. `Math.min(Math.max(width * 0.022, 16), 26)`)
- `maxWidth` sur les **blocs de texte** (éviter mots orphelins)
- Tailles d'**images** avec clamp
- **Cercles / traits** checkpoint avec clamp (circleSize, lineWidth)
- `useWindowDimensions()` pour adapter les tailles dans les composants

### Background plein écran
- Chaque screen : `container: { flex: 1, width: '100%', height: '100%', backgroundColor }`
- Ou LinearGradient en style direct sur le parent
- Jamais de background dans un View centré/maxWidth

---

## FICHIERS CONCERNÉS (rollback appliqué le 3 fév. 2026)

Les écrans suivants avaient `maxWidth: 1100` + `alignSelf: 'center'` sur leur `content` — **supprimé** :
- PreQuestions, IntroQuestion, SectorQuizIntroScreen
- InterludeSecteur, FinCheckpoints, TonMetierDefini
- OnboardingInterlude
- OnboardingQuestionScreen (scrollContent)

---

## TESTS OBLIGATOIRES

1. **Desktop large** : écran remplit la fenêtre, pas de shrink
2. **Mobile** : aucun bord blanc, aucun élément hors écran
3. **Tablette** : idem
