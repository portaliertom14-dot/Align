# 🎯 Système d'XP Align - Version 2.0

## Objectif

Mettre en place un système d'XP **scalable, lisible et durable**, sans explosion de chiffres aux hauts niveaux, et sans multiplicateurs incontrôlés.

Le système doit :
- ✅ Ralentir progressivement la montée en niveau
- ✅ Garder des valeurs d'XP compréhensibles humainement
- ✅ Éviter toute croissance exponentielle double
- ✅ Être simple à maintenir et ajuster

---

## 🎯 Règles fondamentales

### 1. Une seule croissance progressive
→ **Uniquement sur l'XP requise** pour passer de niveau  
→ **Aucun multiplicateur violent** sur les XP gagnées

### 2. Les XP gagnées sont FIXES ou quasi fixes
→ **Jamais multipliées** par le niveau  
→ Pas de ×2, ×5, ×10 selon le niveau

---

## 📈 Calcul de l'XP requise pour passer au niveau suivant

Utiliser une **courbe douce de type puissance**, pas exponentielle.

### Formule

```
XP_required(level) = baseXP + growth * (level ^ 1.5)
```

### Constantes recommandées

```javascript
baseXP = 20
growth = 8
```

### Exemples de valeurs

| Niveau | XP requise |
|--------|-----------|
| 1      | ~28       |
| 5      | ~60       |
| 10     | ~95       |
| 20     | ~180      |
| 50     | ~400      |
| 100    | ~800      |

👉 Les valeurs exactes peuvent être arrondies pour l'UI.

---

## ⭐ XP gagnées (événements)

Les gains d'XP sont **constants, indépendants du niveau**.

### Valeurs recommandées

```javascript
export const XP_REWARDS = {
  QUIZ_COMPLETED: 15,        // Quiz terminé
  DAILY_SERIES: 10,          // Série quotidienne
  MODULE_COMPLETED: 25,      // Module complété
  CHAPTER_COMPLETED: 50,     // Chapitre complété
  QUEST_COMPLETED: 30,       // Quête terminée
};
```

👉 **Aucun bonus lié au niveau du joueur.**

---

## 🧠 Logique de progression

1. **L'XP cumulée s'incrémente normalement**
2. Lorsque `XP_actuelle >= XP_required(level)` :
   - `level +1`
   - XP restante conservée (overflow autorisé)
3. La barre d'XP affiche :
   ```
   XP_actuelle / XP_required(level)
   ```

---

## 🚫 À NE PAS FAIRE

❌ Multiplier les XP gagnées selon le niveau  
❌ Doubler l'XP requise tous les X niveaux  
❌ Ajouter des pourcentages cumulés (+5%, +10%, etc.)  
❌ Générer des nombres à plus de 5–6 chiffres

---

## 🧩 Objectif UX

**La progression doit être ressentie, pas calculée.**

Même à haut niveau, l'utilisateur doit comprendre :  
→ *"Je progresse, mais plus lentement"*

**Align n'est pas un RPG hardcore**, c'est un produit d'engagement long terme.

---

## 📦 Implémentation

### Fichiers créés/modifiés

#### ✅ Nouveau fichier principal
- `src/lib/xpSystem.js` - Système XP V2 complet

#### ✅ Fichiers modifiés
- `src/lib/progression.js` - Alias de compatibilité vers xpSystem.js
- `src/screens/ModuleCompletion/index.js` - Utilise XP_REWARDS.MODULE_COMPLETED
- `src/lib/modules/modules.js` - Utilise XP_REWARDS.MODULE_COMPLETED

### Fonctions principales

```javascript
import {
  calculateLevel,           // XP totale → Niveau
  getTotalXPForLevel,       // Niveau → XP totale nécessaire
  getXPRequiredForLevel,    // XP requise pour passer au niveau N
  getXPInCurrentLevel,      // XP dans le niveau actuel
  getXPNeededForNextLevel,  // XP requise pour le prochain niveau
  getLevelProgressPercent,  // Pourcentage de progression (0-100)
  XP_REWARDS,               // Constantes XP gagnées
} from './lib/xpSystem';
```

### Migration depuis l'ancien système

#### ❌ Ancienne formule (croissance exponentielle)
```javascript
// PROBLÈME : Croissance exponentielle × multiplicateurs
BASE_XP * (1.05 ^ level)  // Explose à 4+ milliards d'XP
calculateXPForModule(50, level)  // ×2, ×4, ×8... selon niveau
```

#### ✅ Nouvelle formule (croissance progressive)
```javascript
// SOLUTION : Croissance douce, gains fixes
20 + 8 * (level ^ 1.5)    // Max ~800 XP au niveau 100
XP_REWARDS.MODULE_COMPLETED  // 25 XP fixe, toujours
```

### Exemples de code

#### Ajouter de l'XP après un module
```javascript
import { XP_REWARDS } from './lib/xpSystem';
import { addXP } from './lib/userProgressSupabase';

// Module complété
await addXP(XP_REWARDS.MODULE_COMPLETED); // +25 XP fixe
```

#### Afficher la progression
```javascript
import { calculateLevel, getXPInCurrentLevel, getXPNeededForNextLevel } from './lib/xpSystem';

const totalXP = 500;
const currentLevel = calculateLevel(totalXP);        // Ex: 8
const xpInLevel = getXPInCurrentLevel(totalXP);      // Ex: 42
const xpNeeded = getXPNeededForNextLevel(totalXP);   // Ex: 85
const percent = (xpInLevel / xpNeeded) * 100;        // Ex: 49.4%

console.log(`Niveau ${currentLevel} - ${xpInLevel}/${xpNeeded} XP (${percent.toFixed(1)}%)`);
```

---

## 🔧 Base de données

### Migration nécessaire

Si vous rencontrez l'erreur `"out of range for type integer"`, exécutez :

```sql
-- Changer currentXP de INTEGER à BIGINT
-- (Voir MIGRATE_XP_TO_BIGINT.sql pour le script complet)
ALTER TABLE public.user_progress 
  ALTER COLUMN "currentXP" TYPE BIGINT 
  USING "currentXP"::BIGINT;
```

### Colonnes concernées

- `user_progress.xp` (ou `currentXP`) - Type: `BIGINT`
- `user_progress.niveau` (ou `currentLevel`) - Type: `INTEGER`
- `user_progress.etoiles` (ou `totalStars`) - Type: `INTEGER`

---

## 📊 Table de référence

Générer une table de référence pour les tests :

```javascript
import { generateLevelTable } from './lib/xpSystem';

const table = generateLevelTable(100);
console.table(table);
```

Exemple de sortie :

```
┌─────────┬───────┬─────────────┬──────────┐
│ (index) │ level │ xpRequired  │ totalXP  │
├─────────┼───────┼─────────────┼──────────┤
│    0    │   1   │     28      │    28    │
│    1    │   2   │     42      │    70    │
│    2    │   3   │     52      │   122    │
│    3    │   4   │     60      │   182    │
│    4    │   5   │     67      │   249    │
│   ...   │  ...  │     ...     │   ...    │
│   99    │  100  │    820      │  54820   │
└─────────┴───────┴─────────────┴──────────┘
```

---

## 🧪 Tests

### Tester le système

```javascript
import { getProgressReport } from './lib/xpSystem';

// Rapport détaillé pour debug
const report = getProgressReport(500);
console.log(report);
/*
{
  totalXP: 500,
  currentLevel: 8,
  xpInLevel: 42,
  xpNeeded: 85,
  progressPercent: 49.4,
  totalXPForNextLevel: 542,
  isMaxLevel: false
}
*/
```

### Valider les valeurs

```javascript
import { isValidXP, isValidLevel } from './lib/xpSystem';

console.log(isValidXP(500));     // true
console.log(isValidXP(-10));     // false
console.log(isValidLevel(50));   // true
console.log(isValidLevel(2000)); // false (> MAX_LEVEL)
```

---

## 🎨 Interface utilisateur

### Barre d'XP

Le composant `XPBar` a été mis à jour pour utiliser le nouveau système :

```jsx
<XPBar 
  animateXP={true}
  newXPValue={525}  // Nouvelle valeur après gain
  onXPAnimationComplete={() => console.log('Animation terminée')}
/>
```

### Affichage recommandé

- **Niveau actuel** : `Niveau 8`
- **Progression** : `42/85 XP` (XP dans le niveau / XP requise)
- **Barre** : Pourcentage visuel (49.4%)

Éviter d'afficher l'XP totale (500) qui est moins parlante pour l'utilisateur.

---

## ⚠️ Compatibilité

### Fonctions dépréciées

Ces fonctions sont maintenues pour compatibilité mais déconseillées :

```javascript
// ❌ Déprécié
calculateXPForModule(50, level)  // → Utiliser XP_REWARDS.MODULE_COMPLETED
getXPForNextLevel(level)         // → Utiliser getXPRequiredForLevel(level)
getXPNeededForCurrentLevel(xp)   // → Utiliser getXPNeededForNextLevel(xp)
```

### Migration progressive

Vous pouvez migrer progressivement en :
1. Utilisant le nouveau système pour les nouvelles features
2. Gardant l'ancien système pour les écrans non critiques
3. Migrant écran par écran quand nécessaire

---

## 📝 Changelog

### Version 2.0 (Janvier 2026)

**✅ Ajouté**
- Nouveau système XP avec formule progressive douce
- XP gagnées fixes (indépendantes du niveau)
- Fonction de validation et debug
- Documentation complète

**🔧 Modifié**
- `progression.js` est maintenant un alias vers `xpSystem.js`
- `ModuleCompletion` utilise XP_REWARDS.MODULE_COMPLETED
- `modules.js` utilise XP_REWARDS.MODULE_COMPLETED

**❌ Supprimé**
- `calculateXPForModule` (multiplicateurs interdits)
- Croissance exponentielle avec XP_MULTIPLIER = 1.05

**🐛 Corrigé**
- Valeurs XP astronomiques (4+ milliards)
- Dépassement de la limite INTEGER en base de données
- Progression trop rapide aux hauts niveaux

---

## 🤝 Support

Pour toute question ou suggestion :
1. Consulter `src/lib/xpSystem.js` (code documenté)
2. Tester avec `getProgressReport(xp)` et `generateLevelTable()`
3. Vérifier la console pour les avertissements de dépréciation

---

**Align - Système d'XP Scalable et Durable** 🚀
