# Guide d'intégration du système de quêtes

## 📋 Checklist d'intégration

### Étape 1: Migration Supabase

1. Ouvrir Supabase Dashboard
2. Aller dans "SQL Editor"
3. Exécuter le script: `supabase/migrations/ADD_QUESTS_COLUMN.sql`
4. Attendre 10-15 secondes pour le refresh du cache PostgREST
5. Si nécessaire: Settings > API > Restart PostgREST service

### Étape 2: Initialisation dans App.js

```javascript
// src/App.js

import { initializeQuests } from './src/lib/quests';

export default function App() {
  useEffect(() => {
    // Après authentification de l'utilisateur
    const init = async () => {
      try {
        await initializeQuests();
        console.log('✅ Système de quêtes initialisé');
      } catch (error) {
        console.error('❌ Erreur init quêtes:', error);
      }
    };
    
    init();
  }, []);

  // ... reste du code
}
```

### Étape 3: Intégration dans ModuleCompletion

```javascript
// src/screens/ModuleCompletion/index.js

import { 
  onModuleCompleted,
  shouldShowRewardScreen 
} from '../../lib/quests';

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const handleContinue = async () => {
    try {
      // 1. Enregistrer la complétion du module
      await onModuleCompleted(
        route.params.moduleId,
        route.params.score || 100,
        route.params.starsEarned || 0
      );
      
      // 2. Vérifier s'il faut afficher l'écran de récompense quêtes
      const hasRewards = await shouldShowRewardScreen();
      
      if (hasRewards) {
        // Naviguer vers l'écran de récompense quêtes
        navigation.navigate('QuestCompletion');
      } else {
        // Navigation normale
        navigation.navigate('Main', { screen: 'Feed' });
      }
    } catch (error) {
      console.error('Erreur navigation:', error);
      navigation.navigate('Main', { screen: 'Feed' });
    }
  };
  
  // ... reste du code
}
```

### Étape 4: Tracking dans les écrans principaux

```javascript
// src/screens/Feed/index.js
// src/screens/Module/index.js
// Tout écran où l'utilisateur passe du temps

import { useQuestActivityTracking } from '../../lib/quests';

export default function FeedScreen() {
  const { startTracking, stopTracking } = useQuestActivityTracking();
  
  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);
  
  // ... reste du code
}
```

### Étape 5: Intégration dans Quiz/Series

```javascript
// src/screens/Quiz/index.js

import { 
  onSeriesStart,
  onSeriesError,
  onSeriesCompleted 
} from '../../lib/quests';

export default function QuizScreen() {
  const [hasErrors, setHasErrors] = useState(false);
  
  useEffect(() => {
    // Démarrer le tracking de série
    onSeriesStart();
  }, []);
  
  const handleAnswer = (isCorrect) => {
    if (!isCorrect) {
      setHasErrors(true);
      onSeriesError(); // Enregistrer l'erreur
    }
    // ... reste du code
  };
  
  const handleSeriesComplete = async () => {
    const isPerfect = !hasErrors;
    await onSeriesCompleted('serie_id', isPerfect);
    // ... reste du code
  };
  
  // ... reste du code
}
```

### Étape 6: Navigation dans App.js

```javascript
// src/app/navigation.js ou App.js

// Ajouter l'écran QuestCompletion à la navigation
<Stack.Screen 
  name="QuestCompletion" 
  component={QuestCompletionScreen}
  options={{ headerShown: false }}
/>
```

## 🎯 Points d'intégration clés

### À chaque module complété

```javascript
import { onModuleCompleted } from './lib/quests';

await onModuleCompleted(moduleId, score, starsEarned);
```

### À chaque série complétée

```javascript
import { onSeriesCompleted } from './lib/quests';

await onSeriesCompleted(seriesId, isPerfect);
```

### À chaque gain d'étoiles

```javascript
import { onStarsEarned } from './lib/quests';

await onStarsEarned(amount);
```

### À chaque gain d'XP

```javascript
import { onXPGained } from './lib/quests';

await onXPGained(xpAmount);
```

### Tracking activité continue

```javascript
import { useQuestActivityTracking } from './lib/quests';

const { startTracking, stopTracking } = useQuestActivityTracking();

useEffect(() => {
  startTracking();
  return () => stopTracking();
}, []);
```

## 📊 Écrans existants à mettre à jour

### ✅ Quetes/index.js
- Déjà mis à jour pour afficher les 3 types
- Utilise le nouveau système unifié

### ✅ QuestCompletion/index.js
- Déjà mis à jour pour utiliser le nouveau système
- Affichage conditionnel automatique

### 🔧 À modifier:

#### ModuleCompletion/index.js
- Ajouter l'appel à `onModuleCompleted()`
- Ajouter la vérification `shouldShowRewardScreen()`
- Modifier la navigation pour inclure QuestCompletion

#### Quiz/index.js ou Series
- Ajouter `onSeriesStart()` au début
- Ajouter `onSeriesError()` lors d'erreurs
- Ajouter `onSeriesCompleted()` à la fin

#### Feed/index.js, Module/index.js
- Ajouter le hook `useQuestActivityTracking()`

## 🧪 Tests

### Test 1: Initialisation

```javascript
import { initializeQuests } from './lib/quests';

// Doit s'initialiser sans erreur
await initializeQuests();
console.log('✅ Init OK');
```

### Test 2: Complétion module

```javascript
import { 
  onModuleCompleted, 
  shouldShowRewardScreen 
} from './lib/quests';

// Compléter plusieurs modules
for (let i = 0; i < 3; i++) {
  await onModuleCompleted(`test_${i}`, 100, 15);
}

// Vérifier les récompenses
const hasRewards = await shouldShowRewardScreen();
console.log('Récompenses disponibles:', hasRewards);
```

### Test 3: Affichage quêtes

```javascript
import { 
  getQuestsByType, 
  QUEST_CYCLE_TYPES 
} from './lib/quests';

// Charger toutes les quêtes
const daily = await getQuestsByType(QUEST_CYCLE_TYPES.DAILY);
const weekly = await getQuestsByType(QUEST_CYCLE_TYPES.WEEKLY);
const performance = await getQuestsByType(QUEST_CYCLE_TYPES.PERFORMANCE);

console.log('Quotidiennes:', daily.length);
console.log('Hebdomadaires:', weekly.length);
console.log('Performance:', performance.length);
```

### Test 4: Tracking activité

```javascript
import { getActiveTimeMinutes } from './lib/quests';

// Attendre quelques secondes...
setTimeout(async () => {
  const minutes = await getActiveTimeMinutes();
  console.log('Temps actif:', minutes, 'minutes');
}, 30000); // 30 secondes
```

## 🐛 Troubleshooting

### Problème: "Quêtes non chargées"

**Cause**: Système pas initialisé

**Solution**:
```javascript
import { initializeQuestSystem } from './lib/quests';
await initializeQuestSystem();
```

### Problème: "Erreur PGRST204"

**Cause**: Colonnes Supabase manquantes

**Solution**:
1. Exécuter `ADD_QUESTS_COLUMN.sql`
2. Attendre refresh cache (10-15s)
3. Redémarrer PostgREST si nécessaire

### Problème: "Écran récompense ne s'affiche pas"

**Cause**: Navigation incorrecte ou quêtes non complétées

**Solution**:
```javascript
// Vérifier manuellement
const completed = getCompletedQuestsInSession();
console.log('Quêtes complétées:', completed);

// Forcer l'affichage pour tester
navigation.navigate('QuestCompletion');
```

### Problème: "Temps actif ne s'incrémente pas"

**Cause**: Tracking non démarré

**Solution**:
```javascript
import { useQuestActivityTracking } from './lib/quests';

// Dans useEffect
const { startTracking, stopTracking } = useQuestActivityTracking();
useEffect(() => {
  startTracking();
  return () => stopTracking();
}, []);
```

## 📝 Checklist finale

- [ ] Migration SQL exécutée
- [ ] PostgREST redémarré
- [ ] `initializeQuests()` dans App.js
- [ ] `onModuleCompleted()` dans ModuleCompletion
- [ ] `shouldShowRewardScreen()` pour navigation
- [ ] `useQuestActivityTracking()` dans écrans principaux
- [ ] `onSeriesCompleted()` dans Quiz/Series
- [ ] Screen QuestCompletion ajouté à la navigation
- [ ] Tests effectués
- [ ] Logs vérifiés

## ✅ Validation

Le système est correctement intégré si :

1. ✅ Au démarrage: `[QuestEngine] ✅ Initialisé avec succès`
2. ✅ Après module: `[QuestIntegration] ✅ Événements module déclenchés`
3. ✅ Écran quêtes: Affiche les 3 types avec progression
4. ✅ Écran récompense: S'affiche quand quête complétée
5. ✅ Temps actif: S'incrémente progressivement

## 🚀 Déploiement

1. Tester en local
2. Vérifier les logs
3. Tester avec plusieurs utilisateurs
4. Déployer sur environnement de test
5. Valider le renouvellement quotidien (attendre minuit)
6. Valider le renouvellement hebdomadaire
7. Déployer en production

---

**Support**: Consulter `QUESTS_SYSTEM_README.md` pour la documentation complète
