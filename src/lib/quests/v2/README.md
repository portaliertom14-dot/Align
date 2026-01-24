# Système de Quêtes V2 - Documentation

## Vue d'ensemble

Le système de quêtes V2 est une refonte complète basée sur une architecture orientée événements. Il garantit une comptabilisation fiable, déterministe et scalable.

## Architecture

### 1. Système d'événements (`events.js`)

Toute progression utilisateur émet un événement unique et standardisé :

- `STAR_EARNED` : Étoile gagnée (payload: `{ amount: number }`)
- `LESSON_COMPLETED` : Leçon complétée (payload: `{ moduleId: string }`)
- `MODULE_COMPLETED` : Module complété (payload: `{ moduleId: string, score: number }`)
- `LEVEL_REACHED` : Niveau atteint (payload: `{ level: number }`)
- `TIME_SPENT` : Temps passé (payload: `{ minutes: number }`)
- `PERFECT_SERIES` : Série parfaite (payload: `{ moduleId: string }`)

### 2. Modèle de données (`questModel.js`)

Chaque quête est définie par :
- `id` : Identifiant unique
- `type` : Type de quête (correspond aux types d'événements)
- `title` : Titre de la quête
- `description` : Description de la quête
- `target` : Objectif numérique
- `progress` : Progression actuelle
- `status` : Statut (`ACTIVE` ou `COMPLETED`)
- `sectionId` : ID de la section à laquelle appartient la quête
- `rewards` : Récompenses (`{ stars: number, xp: number }`)
- `createdAt` : Date de création
- `completedAt` : Date de complétion (nullable)

### 3. Moteur de quêtes (`questEngine.js`)

Le moteur de quêtes :
- Écoute les événements émis par l'application
- Met à jour automatiquement les quêtes concernées
- Gère les sections de quêtes
- Émet un événement `QUEST_COMPLETED` lorsqu'une quête est complétée

### 4. Système de sections (`questModel.js`)

Une section contient N quêtes actives. Lorsqu'une section est complétée à 100%, elle est automatiquement renouvelée avec de nouvelles quêtes adaptées au profil utilisateur.

### 5. Générateur de quêtes (`generator.js`)

Le générateur crée des quêtes adaptées au profil utilisateur :
- Vérifie que l'objectif n'est pas déjà dépassé
- S'adapte au niveau de l'utilisateur
- Évite les quêtes absurdes ou déjà complétées

## Utilisation

### Initialisation

Le système s'initialise automatiquement au démarrage de l'application (`App.js`).

### Émettre des événements

Dans les écrans (ex: `ModuleCompletion`), émettre des événements :

```javascript
import { QuestEvents } from '../../lib/quests/v2';

// Émettre un événement LESSON_COMPLETED
await QuestEvents.lessonCompleted(moduleId);

// Émettre un événement MODULE_COMPLETED
await QuestEvents.moduleCompleted(moduleId, score);

// Émettre un événement TIME_SPENT
await QuestEvents.timeSpent(minutes);

// Émettre un événement PERFECT_SERIES
await QuestEvents.perfectSeries(moduleId);
```

### Récupérer les quêtes

```javascript
import { getQuestSections } from '../../lib/quests/v2';

const sections = await getQuestSections();
sections.forEach(section => {
  const activeQuests = section.getActiveQuests();
  // Afficher les quêtes actives
});
```

### Écran de félicitations

L'écran `QuestCompletionV2` s'affiche automatiquement lorsqu'une quête est complétée. Il récupère les quêtes complétées dans cette session via `getCompletedQuestsInSession()`.

## Flux de données

```
Action utilisateur
    ↓
Émission d'événement (QuestEvents.xxx)
    ↓
Moteur de quêtes écoute l'événement
    ↓
Mise à jour des quêtes concernées
    ↓
Si quête complétée → Émission événement QUEST_COMPLETED
    ↓
Navigation automatique vers QuestCompletionV2
    ↓
Affichage des récompenses
```

## Règles de sécurité

1. Une quête ne peut être complétée qu'une seule fois
2. Aucun double comptage possible
3. Le backend est la source de vérité unique
4. Tous les cas limites sont couverts (latence, retry, multi-events)

## Migration depuis l'ancien système

L'ancien système (`src/lib/quests.js`) est toujours présent mais ne sera plus utilisé. Il sera supprimé dans une prochaine étape.

Le nouveau système utilise une clé de stockage différente (`@align_quests_v2`) pour éviter les conflits.
