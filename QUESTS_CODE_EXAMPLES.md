# Exemples de code - Système de Quêtes

## 🚀 Code prêt à copier-coller

### 1. App.js - Initialisation

```javascript
// src/App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initializeQuests } from './src/lib/quests';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Initialiser le système de quêtes après l'authentification
    const initQuests = async () => {
      try {
        await initializeQuests();
        console.log('✅ Système de quêtes initialisé');
      } catch (error) {
        console.error('❌ Erreur init quêtes:', error);
      }
    };

    initQuests();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {/* Vos écrans existants */}
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="ModuleCompletion" component={ModuleCompletionScreen} />
        
        {/* NOUVEAU: Écran de récompense quêtes */}
        <Stack.Screen 
          name="QuestCompletion" 
          component={QuestCompletionScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### 2. ModuleCompletion - Navigation conditionnelle

```javascript
// src/screens/ModuleCompletion/index.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  onModuleCompleted,
  shouldShowRewardScreen 
} from '../../lib/quests';

export default function ModuleCompletionScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const [processing, setProcessing] = useState(false);

  // Récupérer les paramètres du module
  const { 
    moduleId, 
    score = 100, 
    starsEarned = 0 
  } = route.params || {};

  const handleContinue = async () => {
    if (processing) return; // Éviter double-clic
    setProcessing(true);

    try {
      // 1. Enregistrer la complétion du module
      console.log('📝 Enregistrement module:', { moduleId, score, starsEarned });
      await onModuleCompleted(moduleId, score, starsEarned);

      // 2. Vérifier s'il y a des quêtes complétées
      const hasRewards = await shouldShowRewardScreen();
      console.log('🎁 Récompenses disponibles:', hasRewards);

      if (hasRewards) {
        // Naviguer vers l'écran de récompense quêtes
        console.log('➡️ Navigation vers QuestCompletion');
        navigation.navigate('QuestCompletion');
      } else {
        // Navigation normale vers le feed
        console.log('➡️ Navigation vers Feed');
        navigation.navigate('Main', { screen: 'Feed' });
      }
    } catch (error) {
      console.error('❌ Erreur lors de la navigation:', error);
      // En cas d'erreur, naviguer normalement
      navigation.navigate('Main', { screen: 'Feed' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        Module terminé !
      </Text>
      <Text style={{ fontSize: 18, marginBottom: 40 }}>
        Score: {score} | Étoiles: {starsEarned}
      </Text>
      <TouchableOpacity 
        onPress={handleContinue}
        disabled={processing}
        style={{
          backgroundColor: processing ? '#ccc' : '#FF7B2B',
          paddingHorizontal: 40,
          paddingVertical: 15,
          borderRadius: 25,
        }}
      >
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
          {processing ? 'Traitement...' : 'CONTINUER'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3. Feed - Tracking d'activité

```javascript
// src/screens/Feed/index.js
import React, { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useQuestActivityTracking } from '../../lib/quests';

export default function FeedScreen() {
  // Hook de tracking d'activité
  const { startTracking, stopTracking } = useQuestActivityTracking();

  useEffect(() => {
    console.log('🟢 Démarrage tracking activité');
    startTracking();

    return () => {
      console.log('🔴 Arrêt tracking activité');
      stopTracking();
    };
  }, []);

  return (
    <ScrollView>
      <Text style={{ fontSize: 24, padding: 20 }}>
        Écran Feed
      </Text>
      {/* Votre contenu existant */}
    </ScrollView>
  );
}
```

### 4. Quiz/Series - Tracking séries

```javascript
// src/screens/Quiz/index.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  onSeriesStart,
  onSeriesError,
  onSeriesCompleted 
} from '../../lib/quests';

export default function QuizScreen() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [hasErrors, setHasErrors] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    // Démarrer le tracking de série au début du quiz
    console.log('🎯 Démarrage série');
    onSeriesStart();
  }, []);

  const handleAnswer = (answerIndex, isCorrect) => {
    // Enregistrer la réponse
    setAnswers([...answers, { questionIndex: currentQuestion, answerIndex, isCorrect }]);

    // Si réponse incorrecte, enregistrer l'erreur
    if (!isCorrect) {
      console.log('❌ Erreur détectée dans la série');
      setHasErrors(true);
      onSeriesError();
    }

    // Passer à la question suivante
    setCurrentQuestion(currentQuestion + 1);
  };

  const handleSeriesComplete = async () => {
    const isPerfect = !hasErrors;
    const seriesId = 'serie_quiz_1'; // Remplacer par votre ID de série

    console.log('🏁 Série terminée:', { isPerfect, erreurs: hasErrors });
    
    // Enregistrer la complétion de série
    await onSeriesCompleted(seriesId, isPerfect);

    if (isPerfect) {
      console.log('🌟 Série parfaite !');
    }

    // Navigation suite...
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        Question {currentQuestion + 1}
      </Text>
      
      {/* Vos questions et réponses */}
      
      <TouchableOpacity onPress={() => handleAnswer(0, true)}>
        <Text>Réponse correcte</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => handleAnswer(1, false)}>
        <Text>Réponse incorrecte</Text>
      </TouchableOpacity>
      
      {currentQuestion >= 10 && (
        <TouchableOpacity onPress={handleSeriesComplete}>
          <Text>Terminer la série</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### 5. Utilisation directe (sans navigation automatique)

```javascript
// Exemple: Utilisation avancée dans n'importe quel écran

import { 
  onModuleCompleted,
  onStarsEarned,
  onXPGained,
  onUserActivity,
  getCompletedQuestsInSession,
  clearCompletedQuestsInSession
} from './lib/quests';

// Après avoir gagné des étoiles
const handleStarsEarned = async (amount) => {
  await onStarsEarned(amount);
  console.log(`✨ ${amount} étoiles enregistrées pour les quêtes`);
};

// Après avoir gagné de l'XP
const handleXPGained = async (xp) => {
  await onXPGained(xp);
  console.log(`⚡ ${xp} XP enregistré, vérification niveau...`);
};

// Enregistrer une activité manuelle
const handleUserInteraction = async () => {
  await onUserActivity();
  // Appelé lors d'interactions utilisateur importantes
};

// Récupérer les quêtes complétées
const checkCompletedQuests = () => {
  const completed = getCompletedQuestsInSession();
  console.log('Quêtes complétées:', completed.length);
  
  completed.forEach(quest => {
    console.log(`✅ ${quest.title} - Récompenses: ${quest.rewards.stars}⭐ + ${quest.rewards.xp}XP`);
  });
};

// Effacer les quêtes complétées (après affichage écran récompense)
const resetCompletedQuests = () => {
  clearCompletedQuestsInSession();
  console.log('Session de quêtes réinitialisée');
};
```

### 6. Écran Quêtes - Affichage avec refresh

```javascript
// src/screens/Quetes/index.js
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
  getQuestsByType, 
  QUEST_CYCLE_TYPES,
  initializeQuestSystem 
} from '../../lib/quests';
import { QUEST_STATUS } from '../../lib/quests/v2/questModel';

export default function QuetesScreen() {
  const navigation = useNavigation();
  const [dailyQuests, setDailyQuests] = useState([]);
  const [weeklyQuests, setWeeklyQuests] = useState([]);
  const [performanceQuests, setPerformanceQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadQuests();
    
    // Recharger quand l'écran reçoit le focus
    const unsubscribe = navigation.addListener('focus', loadQuests);
    return unsubscribe;
  }, [navigation]);

  const loadQuests = async () => {
    try {
      setLoading(true);
      
      // Initialiser le système si nécessaire
      await initializeQuestSystem();
      
      // Charger les quêtes par type
      const [daily, weekly, performance] = await Promise.all([
        getQuestsByType(QUEST_CYCLE_TYPES.DAILY),
        getQuestsByType(QUEST_CYCLE_TYPES.WEEKLY),
        getQuestsByType(QUEST_CYCLE_TYPES.PERFORMANCE),
      ]);
      
      setDailyQuests(daily);
      setWeeklyQuests(weekly);
      setPerformanceQuests(performance);
      
      console.log('📊 Quêtes chargées:', {
        quotidiennes: daily.length,
        hebdomadaires: weekly.length,
        performance: performance.length,
      });
    } catch (error) {
      console.error('❌ Erreur chargement quêtes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadQuests();
  };

  const renderQuest = (quest) => {
    const isCompleted = quest.status === QUEST_STATUS.COMPLETED;
    const progress = Math.min((quest.progress / quest.target) * 100, 100);

    return (
      <View 
        key={quest.id}
        style={{
          padding: 15,
          marginBottom: 10,
          backgroundColor: isCompleted ? '#e8f5e9' : '#f5f5f5',
          borderRadius: 10,
        }}
      >
        <Text style={{ 
          fontSize: 16, 
          fontWeight: 'bold',
          textDecorationLine: isCompleted ? 'line-through' : 'none' 
        }}>
          {quest.title}
        </Text>
        
        {!isCompleted && (
          <View style={{ marginTop: 10 }}>
            <View style={{
              height: 20,
              backgroundColor: '#e0e0e0',
              borderRadius: 10,
              overflow: 'hidden',
            }}>
              <View style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#FF7B2B',
              }} />
            </View>
            <Text style={{ marginTop: 5, fontSize: 12, textAlign: 'center' }}>
              {quest.progress} / {quest.target}
            </Text>
          </View>
        )}
        
        <View style={{ flexDirection: 'row', marginTop: 10, justifyContent: 'space-around' }}>
          <Text>⭐ {quest.rewards.stars}</Text>
          <Text>⚡ {quest.rewards.xp} XP</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement des quêtes...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, padding: 20 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Quêtes quotidiennes */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          QUÊTES QUOTIDIENNES
        </Text>
        {dailyQuests.map(renderQuest)}
      </View>

      {/* Quêtes hebdomadaires */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          QUÊTES HEBDOMADAIRES
        </Text>
        {weeklyQuests.map(renderQuest)}
      </View>

      {/* Objectifs performance */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>
          OBJECTIFS PERFORMANCE
        </Text>
        {performanceQuests.map(renderQuest)}
      </View>
    </ScrollView>
  );
}
```

### 7. Debug et tests

```javascript
// Fichier de test: tests/quests.test.js
import { 
  initializeQuests,
  onModuleCompleted,
  onSeriesCompleted,
  shouldShowRewardScreen,
  getQuestsByType,
  QUEST_CYCLE_TYPES,
  getCompletedQuestsInSession,
  clearCompletedQuestsInSession,
} from '../src/lib/quests';

// Test 1: Initialisation
async function testInit() {
  console.log('🧪 Test 1: Initialisation');
  await initializeQuests();
  console.log('✅ Initialisé');
}

// Test 2: Complétion modules
async function testModuleCompletion() {
  console.log('🧪 Test 2: Complétion modules');
  
  // Compléter 3 modules
  for (let i = 0; i < 3; i++) {
    await onModuleCompleted(`module_test_${i}`, 100, 15);
    console.log(`✅ Module ${i+1} complété`);
  }
  
  // Vérifier les récompenses
  const hasRewards = await shouldShowRewardScreen();
  console.log(`🎁 Récompenses: ${hasRewards ? 'OUI' : 'NON'}`);
  
  // Afficher les quêtes complétées
  const completed = getCompletedQuestsInSession();
  console.log(`📊 ${completed.length} quête(s) complétée(s)`);
  
  completed.forEach(q => {
    console.log(`  - ${q.title}: ${q.rewards.stars}⭐ + ${q.rewards.xp}XP`);
  });
  
  // Nettoyer
  clearCompletedQuestsInSession();
}

// Test 3: Affichage quêtes
async function testQuestDisplay() {
  console.log('🧪 Test 3: Affichage quêtes');
  
  const daily = await getQuestsByType(QUEST_CYCLE_TYPES.DAILY);
  const weekly = await getQuestsByType(QUEST_CYCLE_TYPES.WEEKLY);
  const performance = await getQuestsByType(QUEST_CYCLE_TYPES.PERFORMANCE);
  
  console.log(`📊 Quotidiennes: ${daily.length}`);
  console.log(`📊 Hebdomadaires: ${weekly.length}`);
  console.log(`📊 Performance: ${performance.length}`);
  
  daily.forEach(q => {
    console.log(`  - ${q.title}: ${q.progress}/${q.target}`);
  });
}

// Test 4: Séries parfaites
async function testPerfectSeries() {
  console.log('🧪 Test 4: Séries parfaites');
  
  // Série parfaite (sans erreur)
  await onSeriesCompleted('serie_1', true);
  console.log('✅ Série parfaite enregistrée');
  
  // Série normale (avec erreurs)
  await onSeriesCompleted('serie_2', false);
  console.log('✅ Série normale enregistrée');
}

// Exécuter tous les tests
async function runAllTests() {
  try {
    await testInit();
    await testModuleCompletion();
    await testQuestDisplay();
    await testPerfectSeries();
    console.log('✅ Tous les tests passés !');
  } catch (error) {
    console.error('❌ Erreur dans les tests:', error);
  }
}

// Lancer les tests
runAllTests();
```

## 🔍 Vérification logs

Logs attendus lors du fonctionnement normal :

```
[QuestEngine] ✅ Initialisé avec succès
[QuestIntegration] ✅ Système de quêtes initialisé
[QuestIntegration] Module complété: { moduleId, score, starsEarned }
[QuestIntegration] ✅ Événements module déclenchés
[QuestEngine] ✅ Données sauvegardées
[QuestEngine] ✅ Données synchronisées avec Supabase
```

---

**Ces exemples sont prêts à l'emploi. Copiez-collez et adaptez selon vos besoins !**
