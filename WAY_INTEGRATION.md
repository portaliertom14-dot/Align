# Intégration WAY - Intelligence Artificielle d'Align

## Vue d'ensemble

**WAY** est l'intelligence artificielle centrale d'Align. Elle remplace toutes les logiques fixes (mappings, templates, algorithmes pré-définis) par une vraie intelligence qui analyse, décide et personnalise.

## Configuration requise

### 1. Clé API OpenAI

Créer un fichier `.env` à la racine de `align-app/` :

```env
EXPO_PUBLIC_OPENAI_API_KEY=votre_clé_api_openai_ici
```

**Important :**
- La clé API doit commencer par `sk-`
- Ne JAMAIS committer le fichier `.env` dans Git
- En production, utiliser les secrets EAS ou un backend sécurisé

### 2. Installation

Aucune dépendance supplémentaire requise. way utilise l'API fetch native pour communiquer avec OpenAI.

## Architecture

### Flux de données

```
Quiz Secteur (40 questions)
  ↓
wayDetermineSecteur()
  ↓
UN secteur déterminé
  ↓
Quiz Métier (20 questions)
  ↓
wayProposeMetiers()
  ↓
1-3 métiers proposés
  ↓
Modules générés par wayGenerateModule()
  ↓
Validation par wayValidateModuleAnswer()
```

### Fichiers principaux

- **`src/services/way.js`** : Service principal way (IA OpenAI)
- **`src/lib/sectorAlgorithm.js`** : Délègue à way (déprécié, conservé pour compatibilité)
- **`src/lib/metierAlgorithm.js`** : Délègue à way (déprécié, conservé pour compatibilité)
- **`src/lib/modules/aline.js`** : Délègue à way pour générer les modules
- **`src/lib/modules/moduleValidation.js`** : Utilise way pour valider les réponses

## Fonctions way

### wayDetermineSecteur()

Détermine UN SEUL secteur dominant à partir des réponses du quiz secteur.

```javascript
import { wayDetermineSecteur } from '../services/way';

const result = await wayDetermineSecteur();
// {
//   secteur: "Tech",
//   secteurId: "tech",
//   justification: "Ton profil montre...",
//   confiance: 0.85
// }
```

### wayProposeMetiers(secteurId, secteurNom)

Propose 1 à 3 métiers crédibles dans un secteur.

```javascript
import { wayProposeMetiers } from '../services/way';

const result = await wayProposeMetiers('tech', 'Tech');
// {
//   secteur: "Tech",
//   secteurId: "tech",
//   métiers: [
//     { nom: "Développeur", id: "developpeur", justification: "..." },
//     { nom: "Data Scientist", id: "data_scientist", justification: "..." }
//   ],
//   avertissement: null
// }
```

### wayGenerateModule(secteurId, metierId, niveau)

Génère un module interactif unique et personnalisé.

```javascript
import { wayGenerateModule } from '../services/way';

const module = await wayGenerateModule('tech', 'developpeur', 1);
// {
//   id: "way_...",
//   titre: "Mini-simulation : Gestion de bug critique",
//   objectif: "Tester ta réactivité face à un problème technique",
//   type: "simulation",
//   consigne: "Tu es développeur. Un bug critique bloque la production...",
//   durée_estimée: 15,
//   méthode_validation: "L'IA analysera...",
//   reward: { xp: 75, étoiles: 3 },
//   difficulté: 1,
//   généré_par: "way"
// }
```

### wayValidateModuleAnswer(module, userAnswer, secteurId)

Valide une réponse utilisateur avec feedback intelligent.

```javascript
import { wayValidateModuleAnswer } from '../services/way';

const validation = await wayValidateModuleAnswer(module, "Ma réponse...", 'tech');
// {
//   valide: true,
//   score: 0.85,
//   feedback: "Excellente réflexion ! Tu as bien compris...",
//   points_forts: ["analyse structurée", "compréhension du contexte"],
//   points_à_améliorer: ["pourrait être plus approfondi"]
// }
```

### wayGenerateModulePool(secteurId, metierId, niveau, count)

Génère plusieurs modules d'avance pour éviter la répétition.

```javascript
import { wayGenerateModulePool } from '../services/way';

const modules = await wayGenerateModulePool('tech', 'developpeur', 1, 10);
// Array de 10 modules uniques
```

## Remplacé par way

### ❌ Anciennes logiques supprimées/dépréciées

- ❌ `sectorAlgorithm.js` - Mappings fixes option → secteur
- ❌ `metierAlgorithm.js` - Liste limitée de métiers par secteur
- ❌ `moduleTemplates.js` - Templates fixes de modules (conservés pour fallback)
- ❌ `aline.js` - Sélection de templates aléatoires (délègue maintenant à way)

### ✅ Nouvelles logiques way

- ✅ Analyse intelligente des réponses
- ✅ Secteurs illimités (pas limité à 5 secteurs)
- ✅ Métiers réels et crédibles (1-3 par secteur)
- ✅ Modules uniques générés dynamiquement
- ✅ Validation intelligente avec feedback personnalisé

## Profil utilisateur pour way

way reçoit systématiquement :

```javascript
{
  age: 17,
  niveau_scolaire: "lycée",
  réponses_quiz_secteur: [...],
  réponses_quiz_métier: [...],
  nombre_réponses_secteur: 40,
  nombre_réponses_métier: 20,
  historique_modules: [...],
  niveau_utilisateur: 1,
  étoiles: 0,
  xp: 0,
  secteur_actuel: "tech",
  métier_actuel: "developpeur",
  cognitiveProfile: "Structuré",
  prénom: "Tom",
  nom: "Dupont"
}
```

## Gestion des erreurs

Si way n'est pas disponible (clé API manquante, erreur réseau) :

1. **Secteur** : Retourne un secteur par défaut avec message d'erreur
2. **Métiers** : Retourne un métier par défaut avec avertissement
3. **Modules** : Génère un module de base avec message d'erreur
4. **Validation** : Utilise la validation basique (critères de longueur/mots-clés)

## Sécurité

⚠️ **IMPORTANT** : En production, la clé API OpenAI ne devrait PAS être dans le code client.

**Recommandations :**
1. Créer un backend qui expose way comme API
2. Le client appelle le backend, pas OpenAI directement
3. La clé API reste secrète côté serveur

Pour le MVP, la clé peut être en variable d'environnement, mais cela doit être migré vers un backend pour la production.

## Tests

Pour tester way :

1. Configurer `EXPO_PUBLIC_OPENAI_API_KEY` dans `.env`
2. Lancer l'app : `npm run web` ou `expo start`
3. Compléter le quiz secteur → way détermine le secteur
4. Compléter le quiz métier → way propose des métiers
5. Commencer un module → way génère un module unique
6. Soumettre une réponse → way valide avec feedback

## Limitations connues

- Rate limiting OpenAI : 60 appels/minute (free tier)
- Coût : ~$0.0001 par appel (très économique avec gpt-4o-mini)
- Latence : ~1-3 secondes par appel API

## Prochaines améliorations

- [ ] Cache des résultats way pour éviter les appels redondants
- [ ] Backend API pour way (sécurité de la clé)
- [ ] Batch processing pour générer plusieurs modules en un appel
- [ ] Fallback local si way indisponible (templates de secours)






