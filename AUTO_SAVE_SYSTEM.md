# Système de Sauvegarde Automatique

## 📋 Vue d'ensemble

Le système de sauvegarde automatique garantit que la progression de l'utilisateur est constamment sauvegardée dans Supabase, même en cas de fermeture inattendue de l'application.

## 🚀 Fonctionnalités

### 1. Sauvegarde Périodique
- **Fréquence** : Toutes les 30 secondes
- **Comportement** : Sauvegarde uniquement si des changements significatifs sont détectés
- **Optimisation** : Évite les appels DB inutiles en comparant avec la dernière sauvegarde

### 2. Sauvegarde lors des Changements d'État de l'App
- **Background** : Sauvegarde automatique quand l'app passe en arrière-plan
- **Foreground** : Rafraîchit la progression de référence quand l'app revient au premier plan
- **Inactive** : Sauvegarde avant que l'app ne devienne inactive

### 3. Sauvegarde lors d'Événements Critiques
- **Gain d'XP** : Marque la progression comme "dirty" après chaque gain d'XP
- **Gain d'Étoiles** : Marque la progression comme "dirty" après chaque gain d'étoiles
- **Mise à jour de progression** : Marque la progression comme "dirty" après chaque `updateUserProgress`

### 4. Queue de Sauvegarde
- **Protection** : Évite les appels multiples simultanés
- **FIFO** : Traite les sauvegardes en file d'attente
- **Robustesse** : Gère les erreurs sans bloquer le système

## 🔧 Architecture

### Fichiers Principaux

- **`src/lib/autoSave.js`** : Module principal du système de sauvegarde automatique
- **`App.js`** : Initialise le système au démarrage de l'app
- **`src/lib/userProgressSupabase.js`** : Intègre les marqueurs "dirty" dans les fonctions critiques

### Fonctions Principales

#### `initializeAutoSave()`
Initialise le système de sauvegarde automatique :
- Charge la progression de référence
- Démarre la sauvegarde périodique
- Configure l'écouteur d'état de l'app
- Vérifie qu'un utilisateur est connecté

#### `stopAutoSave()`
Arrête le système de sauvegarde automatique :
- Arrête la sauvegarde périodique
- Retire l'écouteur d'état de l'app
- Effectue une dernière sauvegarde

#### `saveProgressIfNeeded()`
Sauvegarde la progression si des changements significatifs sont détectés :
- Compare avec la dernière sauvegarde
- Sauvegarde uniquement si nécessaire
- Retourne `true` si sauvegardé, `false` sinon

#### `saveProgressNow()`
Sauvegarde la progression immédiatement :
- Utilise une queue pour éviter les appels multiples
- Sauvegarde uniquement les champs modifiés
- Met à jour la référence de sauvegarde

#### `forceSave()`
Force une sauvegarde immédiate :
- Utilisé lors d'événements critiques
- Réinitialise la référence pour forcer la sauvegarde

#### `markProgressDirty()`
Marque la progression comme "dirty" :
- Force une sauvegarde au prochain cycle
- Utilisé après les gains d'XP/étoiles

## 📊 Détection des Changements

### Champs Surveillés
Le système surveille les champs suivants :
- `currentXP` : XP actuelle
- `totalStars` : Étoiles totales
- `currentLevel` : Niveau actuel
- `currentModuleIndex` : Index du module actuel
- `currentModuleInChapter` : Module actuel dans le chapitre
- `completedModulesInChapter` : Modules complétés
- `chapterHistory` : Historique des chapitres
- `activeDirection`, `activeSerie`, `activeMetier` : Métadonnées actives
- `activeModule`, `currentChapter`, `currentLesson` : Progression actuelle
- `completedLevels` : Niveaux complétés
- `quizAnswers`, `metierQuizAnswers` : Réponses aux quiz

### Comparaison
- **Superficielle** : Pour les valeurs primitives (nombres, strings)
- **Profonde** : Pour les objets/tableaux (JSON.stringify)

## ⚙️ Configuration

### Intervalle de Sauvegarde
```javascript
const AUTO_SAVE_INTERVAL = 30000; // 30 secondes
```

### Seuil de Changements
```javascript
const MIN_CHANGES_THRESHOLD = 0; // Sauvegarder même les changements minimes
```

## 🔄 Flux de Sauvegarde

1. **Initialisation** : Au démarrage de l'app, le système se initialise
2. **Chargement de référence** : La progression actuelle est chargée comme référence
3. **Sauvegarde périodique** : Toutes les 30 secondes, vérifie les changements
4. **Sauvegarde sur événement** : Marque comme "dirty" lors des événements critiques
5. **Sauvegarde sur changement d'état** : Sauvegarde quand l'app passe en arrière-plan
6. **Nettoyage** : Arrête le système lors du démontage de l'app

## 🛡️ Gestion des Erreurs

- **Erreurs silencieuses** : Les erreurs de sauvegarde n'interrompent pas l'application
- **Logs détaillés** : Toutes les erreurs sont loggées pour le débogage
- **Fallback** : Le système continue de fonctionner même en cas d'erreur

## 📝 Logs

Le système génère des logs détaillés :
- `[AutoSave] 🚀 Initialisation...` : Démarrage du système
- `[AutoSave] 💾 Sauvegarde en cours...` : Sauvegarde active
- `[AutoSave] ✅ Progression sauvegardée` : Sauvegarde réussie
- `[AutoSave] ❌ Erreur...` : Erreur lors de la sauvegarde

## 🎯 Utilisation

### Initialisation
Le système s'initialise automatiquement dans `App.js` :
```javascript
import { initializeAutoSave } from './src/lib/autoSave';

// Dans useEffect
initializeAutoSave();
```

### Arrêt
Le système s'arrête automatiquement lors du démontage :
```javascript
useEffect(() => {
  return () => {
    stopAutoSave();
  };
}, []);
```

### Sauvegarde Forcée
Pour forcer une sauvegarde immédiate :
```javascript
import { forceSave } from './src/lib/autoSave';

await forceSave();
```

## ✅ Avantages

1. **Persistance garantie** : La progression est toujours sauvegardée
2. **Performance optimisée** : Sauvegarde uniquement si nécessaire
3. **Robustesse** : Gère les erreurs sans bloquer l'app
4. **Transparence** : Fonctionne en arrière-plan sans intervention
5. **Efficacité** : Sauvegarde uniquement les champs modifiés

## 🔍 Dépannage

### La progression n'est pas sauvegardée
1. Vérifier que l'utilisateur est connecté
2. Vérifier les logs pour les erreurs
3. Vérifier la connexion réseau

### Sauvegarde trop fréquente
- Ajuster `AUTO_SAVE_INTERVAL` pour augmenter l'intervalle
- Ajuster `MIN_CHANGES_THRESHOLD` pour ignorer les changements mineurs

### Sauvegarde pas assez fréquente
- Réduire `AUTO_SAVE_INTERVAL`
- Utiliser `forceSave()` pour les événements critiques
