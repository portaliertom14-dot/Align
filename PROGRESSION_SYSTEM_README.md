# 🎯 Système de Progression Centralisé - Align

## 📋 Vue d'ensemble

Nouveau système complet de gestion XP / Niveaux / Étoiles pour Align.

**Caractéristiques principales:**
- ✅ Calcul déterministe des niveaux depuis totalXP
- ✅ Animations fluides pour barre XP et étoiles
- ✅ Écran de récompense dédié
- ✅ Persistence Supabase
- ✅ Validation et sécurité intégrées

## 🗂️ Structure des fichiers

### Core
- `src/lib/progressionSystem.js` - Logique de calcul XP/niveaux
- `src/lib/progressionService.js` - Service Supabase pour persistence

### Composants UI
- `src/components/Progression/XPBar.js` - Barre XP avec animation
- `src/components/Progression/StarsCounter.js` - Compteur étoiles avec animation

### Écrans
- `src/screens/Reward/index.js` - Écran de récompense après complétion module

### Migration
- `supabase/migrations/ADD_PROGRESSION_SYSTEM.sql` - Migration Supabase

## 🚀 Installation

### 1. Migration Supabase

Exécuter dans Supabase SQL Editor:
```sql
-- Voir: supabase/migrations/ADD_PROGRESSION_SYSTEM.sql
```

### 2. Utilisation

```javascript
import { getProgression, completeModule } from './lib/progressionService';
import { calculateProgression, calculateLevel } from './lib/progressionSystem';

// Récupérer la progression
const progression = await getProgression();

// Compléter un module (ajoute automatiquement les récompenses)
const newProgression = await completeModule();

// Calculer depuis totalXP (déterministe)
const level = calculateLevel(progression.totalXP);
```

## 📊 Structure de données

```javascript
{
  totalXP: 0,              // XP totale accumulée (source de vérité)
  level: 1,                 // Niveau (calculé depuis totalXP)
  xpInCurrentLevel: 0,      // XP dans le niveau actuel
  xpRequiredForNextLevel: 0, // XP requise pour niveau suivant
  stars: 0,                 // Étoiles totales
  completedModulesCount: 0,  // Nombre de modules complétés
}
```

## 🎨 Animations

### Barre XP
- Animation progressive de la barre
- Gestion automatique des montées de niveau (reset visuel)
- Animation séquentielle si plusieurs niveaux

### Étoiles
- Animation type "machine à sous"
- Incrémentation rapide jusqu'à la valeur finale
- Arrêt précis sur la valeur calculée

## 🔒 Sécurité

- Validation automatique des valeurs
- Correction automatique en cas d'incohérence
- Impossible d'avoir XP/étoiles négatives
- Niveau toujours cohérent avec totalXP

## 📝 Notes importantes

- Le niveau est **UNIQUEMENT** calculé depuis totalXP (déterministe)
- Aucun niveau stocké manuellement sans recalcul
- Toutes les valeurs sont recalculables depuis le backend
- Les animations sont **UNIQUEMENT** visuelles
