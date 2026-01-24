# Système de Quêtes Align V3

## Vue d'ensemble

Système de quêtes **complet, robuste et scalable** pour l'application Align. 

### Fonctionnalités principales

✅ **Trois types de quêtes**
- **Quotidiennes** : Se renouvellent chaque jour (temps actif, modules, étoiles)
- **Hebdomadaires** : Se renouvellent quand toutes sont complétées (séries parfaites, modules, temps, étoiles)
- **Performance** : Objectifs long-terme (niveaux, total séries parfaites)

✅ **Adaptation automatique au niveau**
- Les objectifs augmentent progressivement avec le niveau utilisateur
- Les récompenses s'ajustent automatiquement
- Régénération intelligente quand l'écart de niveau est important

✅ **Tracking automatique**
- **Temps actif** : Tracking avec pause automatique sur inactivité (5 min)
- **Séries** : Tracking séries normales et séries parfaites (sans erreur)
- **Progression** : Mise à jour en temps réel des quêtes

✅ **Renouvellement automatique**
- Quêtes quotidiennes : Reset à minuit (changement de jour)
- Quêtes hebdomadaires : Reset quand toutes sont complétées
- Quêtes performance : Mise à jour continue selon progression

✅ **Persistance robuste**
- AsyncStorage (rapide, toujours disponible)
- Supabase (synchronisation, backup)
- Gestion automatique des conflits utilisateur

✅ **Écran de récompense conditionnel**
- S'affiche uniquement si au moins une quête est complétée
- Contenu dynamique selon le type de quête
- Récompenses cumulées (XP + étoiles)

## Architecture

```
src/lib/quests/
├── index.js                      # Point d'entrée principal (API publique)
├── questGenerator.js             # Génération quêtes adaptées au niveau
├── questEngineUnified.js         # Moteur principal (renouvellement, événements)
├── questIntegrationUnified.js    # Intégration dans les écrans
├── activityTracker.js            # Tracking temps actif
├── seriesTracker.js              # Tracking séries
└── v2/
    ├── events.js                 # Système d'événements
    ├── questModel.js             # Modèles de données
    └── storage.js                # Persistance AsyncStorage
```

## Installation

### 1. Migration Supabase

Exécuter le script SQL pour ajouter les colonnes nécessaires :

```bash
supabase/migrations/ADD_QUESTS_COLUMN.sql
```

Ce script ajoute :
- Colonne `quests` (JSONB) pour stocker les quêtes
- Colonne `activity_data` (JSONB) pour le tracking d'activité
- Colonne `series_data` (JSONB) pour le tracking des séries
- Index GIN pour performances optimales
- Fonctions helper pour mise à jour/récupération

⚠️ **Après exécution :**
- Attendre 10-15 secondes (rafraîchissement cache PostgREST)
- Redémarrer PostgREST si nécessaire : Settings > API > Restart PostgREST

### 2. Initialisation dans l'app

Dans `App.js` :

```javascript
import { initializeQuests } from './src/lib/quests';

// Au démarrage de l'app (après authentification)
useEffect(() => {
  const init = async () => {
    await initializeQuests();
  };
  init();
}, []);
```

## Utilisation

### Écran de complétion de module

```javascript
import { 
  onModuleCompleted, 
  shouldShowRewardScreen 
} from './lib/quests';

// Après complétion d'un module
const handleModuleComplete = async () => {
  // 1. Enregistrer la complétion
  await onModuleCompleted(moduleId, score, starsEarned);
  
  // 2. Vérifier s'il faut afficher l'écran de récompense
  const hasRewards = await shouldShowRewardScreen();
  
  if (hasRewards) {
    navigation.navigate('QuestCompletion');
  } else {
    navigation.navigate('Main', { screen: 'Feed' });
  }
};
```

### Navigation simplifiée

```javascript
import { handleModuleCompletionNavigation } from './lib/quests';

// Tout-en-un : enregistre + navigue automatiquement
await handleModuleCompletionNavigation(navigation, {
  moduleId: 'module_1',
  score: 100,
  starsEarned: 15,
});
```

### Écran de quêtes

```javascript
import { 
  getQuestsByType, 
  QUEST_CYCLE_TYPES 
} from './lib/quests';

// Charger les quêtes par type
const dailyQuests = await getQuestsByType(QUEST_CYCLE_TYPES.DAILY);
const weeklyQuests = await getQuestsByType(QUEST_CYCLE_TYPES.WEEKLY);
const performanceQuests = await getQuestsByType(QUEST_CYCLE_TYPES.PERFORMANCE);
```

### Tracking d'activité

```javascript
import { useQuestActivityTracking } from './lib/quests';

// Dans un écran principal (Feed, Module, etc.)
const MyScreen = () => {
  const { startTracking, stopTracking } = useQuestActivityTracking();
  
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);
  
  // ...
};
```

### Événements manuels (avancé)

```javascript
import { 
  onStarsEarned, 
  onXPGained, 
  onSeriesCompleted, 
  onSeriesError 
} from './lib/quests';

// Étoiles gagnées
await onStarsEarned(10);

// XP gagné
await onXPGained(50);

// Série complétée
await onSeriesCompleted('serie_1', isPerfect);

// Erreur dans série
await onSeriesError();
```

## Configuration

### Adaptation au niveau

Les objectifs et récompenses s'ajustent automatiquement :

```javascript
// Dans questGenerator.js

// Multiplicateur de récompenses: +10% tous les 5 niveaux
function getRewardMultiplier(userLevel) {
  return 1 + Math.floor(userLevel / 5) * 0.1;
}

// Objectif adapté: +scalingFactor% tous les 10 niveaux
function getScaledTarget(baseTarget, userLevel, scalingFactor = 0.1) {
  const multiplier = 1 + Math.floor(userLevel / 10) * scalingFactor;
  return Math.ceil(baseTarget * multiplier);
}
```

### Personnalisation des quêtes

Modifier les valeurs dans `questGenerator.js` :

```javascript
// Quêtes quotidiennes
const timeTarget = getScaledTarget(10, userLevel, 0.2); // Base: 10 min
const moduleTarget = getScaledTarget(1, userLevel, 0.1); // Base: 1 module
const starsTarget = getScaledTarget(15, userLevel, 0.15); // Base: 15 étoiles

// Quêtes hebdomadaires
const perfectSeriesTarget = getScaledTarget(3, userLevel, 0.2); // Base: 3 séries
const modulesTarget = getScaledTarget(5, userLevel, 0.15); // Base: 5 modules
const weeklyTimeTarget = getScaledTarget(60, userLevel, 0.2); // Base: 60 min
```

### Seuil d'inactivité

Modifier dans `activityTracker.js` :

```javascript
const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes (défaut)
```

## Écrans

### QuestCompletion (Récompenses)

- S'affiche automatiquement si au moins une quête est complétée
- Affiche toutes les quêtes complétées dans la session
- Cumule les récompenses (XP + étoiles)
- Animation XPBar automatique
- Navigation vers Feed après validation

### Quêtes (Liste)

- Affiche les 3 types de quêtes
- Barres de progression en temps réel
- Récompenses visibles
- Auto-refresh au focus

## Données persistées

### AsyncStorage (par utilisateur)

```
@align_quests_unified_[userId]
├── dailyQuests[]
├── weeklyQuests[]
├── performanceQuests[]
├── lastDailyReset
├── lastWeeklyReset
├── dailyCycleId
├── weeklyCycleId
└── completedInSession[]
```

### Supabase (user_progress)

```sql
user_progress
├── quests (JSONB)
├── activity_data (JSONB)
└── series_data (JSONB)
```

## Tests

### Tester le renouvellement quotidien

```javascript
// Forcer le renouvellement (dev uniquement)
import { forceQuestRenewal } from './lib/quests';
await forceQuestRenewal();
```

### Simuler une complétion

```javascript
import { onModuleCompleted } from './lib/quests';

// Simuler plusieurs complétions pour tester
for (let i = 0; i < 3; i++) {
  await onModuleCompleted(`test_module_${i}`, 100, 15);
}

// Vérifier les récompenses
const hasRewards = await shouldShowRewardScreen();
console.log('Récompenses disponibles:', hasRewards);
```

## Debugging

### Logs activés

Le système log automatiquement dans la console :

```
[QuestEngine] ✅ Initialisé avec succès
[QuestEngine] 🔄 Renouvellement des quêtes quotidiennes
[QuestIntegration] ✅ Module complété: { moduleId, score, starsEarned }
[QuestIntegration] ✅ Série parfaite enregistrée
```

### Vérifier l'état

```javascript
import { unifiedQuestEngine } from './lib/quests/questEngineUnified';

// État du moteur
console.log('Initialisé:', unifiedQuestEngine.isInitialized);
console.log('User ID:', unifiedQuestEngine.currentUserId);

// Quêtes actives
const active = unifiedQuestEngine.getActiveQuests();
console.log('Quêtes actives:', active.length);

// Quêtes complétées
const completed = unifiedQuestEngine.getCompletedInSession();
console.log('Quêtes complétées:', completed.length);
```

## Performance

### Optimisations

- ✅ Cache en mémoire pour éviter lectures répétées
- ✅ Sauvegarde asynchrone (non-bloquante)
- ✅ Événements débounce pour tracking activité
- ✅ Index GIN Supabase pour requêtes JSONB rapides
- ✅ Batch updates pour réduire appels DB

### Benchmarks

- Initialisation : < 200ms
- Événement quest : < 50ms
- Renouvellement : < 300ms
- Sauvegarde : < 100ms (async)

## Roadmap

### Phase 2 (Futur)

- [ ] Quêtes sociales (défis entre amis)
- [ ] Quêtes événements (temporaires)
- [ ] Badges de complétion
- [ ] Statistiques détaillées
- [ ] Notifications push pour renouvellement

## Support

En cas de problème :

1. Vérifier les logs console
2. Vérifier que la migration SQL est bien exécutée
3. Vérifier que l'utilisateur est connecté
4. Forcer un renouvellement : `forceQuestRenewal()`
5. Vérifier le cache PostgREST (redémarrer si nécessaire)

## Licence

Propriétaire - Align App 2026
