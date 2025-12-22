# Migration vers wayMock - Mode Sans IA

## Vue d'ensemble

L'application fonctionne maintenant **100% localement sans IA et sans API**. Toute la logique est simulée par `wayMock.js` qui remplace temporairement l'IA "way" (OpenAI).

## Structure wayMock

### Fichier : `src/services/wayMock.js`

**Commentaire dans le code :** `// wayMock — remplacé plus tard par wayAI (OpenAI)`

### Fonctionnalités implémentées

1. **Secteurs autorisés** (limités volontairement) :
   - `tech` → Tech
   - `business` → Business
   - `creation` → Création
   - `droit` → Droit
   - `sante` → Santé

2. **Métiers par secteur** (1 seul métier par secteur) :
   - Tech → Développeur logiciel
   - Business → Entrepreneur
   - Création → Designer
   - Droit → Avocat
   - Santé → Médecin

3. **Scoring simple** :
   - Analyse les réponses utilisateur (A, B, C)
   - Calcule des points par dimension : scientifique, logique, créatif, business, social
   - Détermine UN SEUL secteur dominant
   - Détermine UN SEUL métier cohérent

4. **Modules générés** :
   - **Module 1** : Mini-Simulations Métier (10-12 items)
   - **Module 2** : Apprentissage & Mindset (10-12 items)
   - **Module 3** : Test de Secteur (10-12 items)

## Fichiers modifiés

### Remplacement des imports

- `src/lib/sectorAlgorithm.js` : utilise `wayMock.wayDetermineSecteur()`
- `src/lib/metierAlgorithm.js` : utilise `wayMock.wayProposeMetiers()`
- `src/screens/Feed/index.js` : utilise `wayMock.wayGenerateModule*()`
- `src/lib/modules/modules.js` : utilise `wayMock.wayValidateModuleAnswer()`

### Navigation

- Tous les écrans redirigent vers `Feed` (accueil) après complétion
- `PropositionMetier` : bouton "Retour à l'accueil" avec `navigation.replace('Feed')`
- `ModuleCompletion` : bouton "Retour à l'accueil" avec `navigation.replace('Feed')`

### Écrans désactivés

Les anciens écrans Series (Module1, Module2, Module3, Start, Complete) ne sont plus accessibles via la navigation mais les fichiers existent encore dans `src/screens/Series/`.

## Migration future vers way AI

Pour migrer vers l'IA réelle :

1. Remplacer `wayMock.js` par `way.js` (avec appels OpenAI)
2. Mettre à jour les imports :
   ```javascript
   // Remplacer
   import { wayDetermineSecteur } from '../services/wayMock';
   // Par
   import { wayDetermineSecteur } from '../services/way';
   ```
3. La structure des données reste identique, seule l'implémentation change

## Format des données

### Secteur retourné par wayMock
```javascript
{
  secteurId: 'tech',
  secteur: 'Tech',
  score: 85,
  resume: 'Ton profil correspond au secteur Tech...'
}
```

### Métier retourné par wayMock
```javascript
{
  id: 'developpeur',
  nom: 'Développeur logiciel',
  score: 80,
  resume: 'Développeur logiciel est le métier qui correspond le mieux...'
}
```

### Module généré par wayMock
```javascript
{
  type: 'mini_simulation_metier',
  titre: 'Mini-Simulation Développeur logiciel',
  objectif: 'Tester ta compatibilité...',
  consigne: '...',
  durée_estimée: '3-5 min',
  items: [/* 10-12 items */],
  feedback_final: {
    badge: 'Tu as les réflexes d\'un Développeur logiciel',
    message: 'Bravo : tu viens d\'agir comme un professionnel.',
    score: 0, // Calculé par l'UI
    recompense: {
      xp: 50,
      etoiles: 2
    }
  }
}
```

## Notes importantes

- **Aucun appel API** : wayMock fonctionne 100% localement
- **Scoring déterministe** : basé uniquement sur les réponses utilisateur
- **Structure identique** : les formats de données correspondent exactement à ceux de way AI
- **Navigation fluide** : aucun blocage, toujours possible de revenir à l'accueil






