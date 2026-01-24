## Guide d'intégration du système de modules

## 📋 Checklist d'intégration

### Étape 1: Initialisation dans App.js

```javascript
// src/App.js
import { initializeModules } from './src/lib/modules';
import { initializeQuests } from './src/lib/quests';

export default function App() {
  useEffect(() => {
    const init = async () => {
      try {
        // Initialiser les systèmes (ordre important)
        await initializeQuests();   // D'abord les quêtes
        await initializeModules();   // Puis les modules
        
        console.log('✅ Systèmes initialisés');
      } catch (error) {
        console.error('❌ Erreur init:', error);
      }
    };
    
    init();
  }, []);

  // ... reste du code
}
```

### Étape 2: Afficher les modules (Feed)

```javascript
// src/screens/Feed/index.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  getAllModules,
  canStartModule,
  getCycleInfo 
} from '../../lib/modules';

export default function FeedScreen() {
  const navigation = useNavigation();
  const [modules, setModules] = useState([]);
  const [cycleInfo, setCycleInfo] = useState(null);

  useEffect(() => {
    loadModules();
    
    // Recharger au focus
    const unsubscribe = navigation.addListener('focus', loadModules);
    return unsubscribe;
  }, [navigation]);

  const loadModules = () => {
    try {
      const allModules = getAllModules();
      const cycle = getCycleInfo();
      
      setModules(allModules);
      setCycleInfo(cycle);
      
      console.log('Modules chargés:', allModules.map(m => ({
        index: m.index,
        state: m.state,
        clickable: m.isClickable()
      })));
    } catch (error) {
      console.error('Erreur chargement modules:', error);
    }
  };

  const handleModulePress = (moduleIndex) => {
    if (!canStartModule(moduleIndex)) {
      console.log('Module verrouillé:', moduleIndex);
      return;
    }

    console.log('Démarrage module:', moduleIndex);
    navigation.navigate('Module', { moduleIndex });
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      {/* Info cycle */}
      {cycleInfo && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Cycle {cycleInfo.currentCycle}
          </Text>
          <Text>Progression: {cycleInfo.progressInCycle}</Text>
          <Text>Cycles complétés: {cycleInfo.totalCyclesCompleted}</Text>
        </View>
      )}

      {/* Liste des modules */}
      {modules.map(module => (
        <TouchableOpacity
          key={module.index}
          onPress={() => handleModulePress(module.index)}
          disabled={!canStartModule(module.index)}
          style={{
            padding: 20,
            marginBottom: 15,
            backgroundColor: canStartModule(module.index) ? '#4CAF50' : '#ccc',
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
            Module {module.index}
          </Text>
          
          {/* État */}
          {module.isLocked() && <Text>🔒 Verrouillé</Text>}
          {module.isUnlocked() && <Text>▶️ Jouer maintenant</Text>}
          {module.isCompleted() && <Text>✅ Complété</Text>}
          
          {/* Compteur */}
          {module.completionCount > 0 && (
            <Text style={{ fontSize: 12, marginTop: 5 }}>
              Complété {module.completionCount}× fois
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
```

### Étape 3: Complétion de module

```javascript
// src/screens/Module/index.js ou ModuleCompletion/index.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  handleModuleCompletion,
  navigateAfterModuleCompletion 
} from '../../lib/modules';

export default function ModuleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { moduleIndex } = route.params || {};
  
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [processing, setProcessing] = useState(false);

  // Votre logique de quiz ici...
  // À la fin du module:

  const handleFinishModule = async () => {
    if (processing) return;
    setProcessing(true);

    try {
      console.log('📝 Complétion module', moduleIndex);
      
      // 1. Compléter le module
      const result = await handleModuleCompletion({
        moduleId: `module_${moduleIndex}_${Date.now()}`,
        score: score,
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
      });

      console.log('Résultat:', result);

      // Afficher message si cycle complété
      if (result.cycleCompleted) {
        console.log('🎉 Cycle complété ! Bonus reçu');
        // Optionnel: Afficher un modal/écran de célébration
      }

      // 2. Navigation automatique
      navigateAfterModuleCompletion(navigation, result);
      
    } catch (error) {
      console.error('Erreur complétion:', error);
      navigation.navigate('Main', { screen: 'Feed' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Module {moduleIndex}
      </Text>

      {/* Votre contenu de module ici */}
      
      <TouchableOpacity
        onPress={handleFinishModule}
        disabled={processing}
        style={{
          backgroundColor: processing ? '#ccc' : '#4CAF50',
          padding: 15,
          borderRadius: 10,
          marginTop: 20,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontSize: 18 }}>
          {processing ? 'Traitement...' : 'TERMINER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Étape 4: Affichage conditionnel (optionnel)

Pour afficher dynamiquement selon l'état :

```javascript
// Component: ModuleCard.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { canStartModule } from '../../lib/modules';

export default function ModuleCard({ module, onPress }) {
  const isClickable = canStartModule(module.index);

  // Déterminer le style selon l'état
  const getBackgroundColor = () => {
    if (module.isCompleted()) return '#E8F5E9'; // Vert clair
    if (module.isUnlocked()) return '#4CAF50';  // Vert
    return '#E0E0E0'; // Gris
  };

  const getIcon = () => {
    if (module.isLocked()) return '🔒';
    if (module.isUnlocked()) return '▶️';
    return '✅';
  };

  const getStatusText = () => {
    if (module.isLocked()) return 'Verrouillé';
    if (module.isUnlocked()) return 'Jouer';
    return 'Complété';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!isClickable}
      style={{
        padding: 20,
        backgroundColor: getBackgroundColor(),
        borderRadius: 10,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ fontSize: 30, marginRight: 15 }}>
          {getIcon()}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            Module {module.index}
          </Text>
          <Text style={{ fontSize: 14, marginTop: 5 }}>
            {getStatusText()}
          </Text>
          {module.completionCount > 0 && (
            <Text style={{ fontSize: 12, color: '#666', marginTop: 3 }}>
              Complété {module.completionCount}× fois
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
```

## 🧪 Tests

### Test rapide dans l'app

```javascript
// Ajouter temporairement dans Feed ou un écran de debug

import { 
  getModulesSummary,
  resetModuleSystem,
  handleModuleCompletion 
} from './lib/modules';

// Bouton de debug
<TouchableOpacity onPress={async () => {
  const summary = getModulesSummary();
  console.log('État actuel:', summary);
}}>
  <Text>Debug: Voir état</Text>
</TouchableOpacity>

// Bouton reset
<TouchableOpacity onPress={async () => {
  await resetModuleSystem();
  console.log('✅ Système réinitialisé');
  loadModules(); // Recharger l'affichage
}}>
  <Text>Reset modules</Text>
</TouchableOpacity>

// Test complétion rapide
<TouchableOpacity onPress={async () => {
  const result = await handleModuleCompletion({
    moduleId: 'test_module',
    score: 100,
    correctAnswers: 10,
    totalQuestions: 10,
  });
  console.log('Test complétion:', result);
  loadModules(); // Recharger l'affichage
}}>
  <Text>Test: Compléter module actuel</Text>
</TouchableOpacity>
```

## 🐛 Troubleshooting

### Problème: "Système non initialisé"

**Cause**: `initializeModules()` pas appelé

**Solution**:
```javascript
// Dans App.js
import { initializeModules } from './lib/modules';
await initializeModules();
```

### Problème: "Module ne se déverrouille pas"

**Cause**: Module précédent pas complété correctement

**Solution**:
```javascript
// Vérifier l'état
import { getModulesSummary } from './lib/modules';
console.log(getModulesSummary());

// Vérifier que handleModuleCompletion a été appelé
```

### Problème: "État incohérent"

**Cause**: Données corrompues ou user change

**Solution**:
```javascript
// Reset complet
import { resetModuleSystem } from './lib/modules';
await resetModuleSystem();
```

### Problème: "Modules tous verrouillés"

**Cause**: Initialisation échouée ou état invalide

**Solution**:
```javascript
// Forcer réinitialisation
import { resetModuleSystem, initializeModules } from './lib/modules';
await resetModuleSystem();
await initializeModules();
```

## 📊 Vérification de l'intégration

Liste de contrôle :

- [ ] `initializeModules()` appelé au démarrage
- [ ] Modules affichés avec états corrects
- [ ] Module 1 unlocked au départ
- [ ] Modules locked non cliquables
- [ ] `handleModuleCompletion()` appelé après chaque module
- [ ] Navigation vers QuestCompletion si quêtes complétées
- [ ] Module suivant déverrouillé après complétion
- [ ] Cycle se réinitialise après Module 3
- [ ] Récompenses distribuées correctement
- [ ] État persisté (survit au redémarrage)

## ✅ Validation

Le système est correctement intégré si :

1. ✅ Au démarrage: `[ModuleSystem] ✅ Initialisé avec succès`
2. ✅ Module 1 est jouable
3. ✅ Modules 2 et 3 affichent un cadenas
4. ✅ Après Module 1: Module 2 se déverrouille
5. ✅ Après Module 2: Module 3 se déverrouille
6. ✅ Après Module 3: Retour au Module 1 + Bonus
7. ✅ État persiste après fermeture/réouverture

## 📝 Checklist finale

- [ ] Code copié-collé dans les bons fichiers
- [ ] `initializeModules()` dans App.js
- [ ] Feed affiche les modules avec états
- [ ] `handleModuleCompletion()` dans écran module
- [ ] `navigateAfterModuleCompletion()` pour navigation
- [ ] Tests effectués
- [ ] Logs vérifiés
- [ ] Déploiement

---

**Le système est prêt à être intégré !** 🚀

Consultez `MODULES_SYSTEM_README.md` pour la documentation complète.
