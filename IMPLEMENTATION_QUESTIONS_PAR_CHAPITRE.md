# IMPLÉMENTATION : Questions différentes par chapitre avec difficulté progressive

## Objectif
Générer 12 questions différentes par module et par chapitre (chapitres 1 à 12) avec une difficulté progressive.

## Structure actuelle

### Fichiers concernés
- `src/lib/questionGenerator.js` : Génère les questions pour chaque module
  - `generateApprentissageQuestions()` : Génère les 12 questions d'apprentissage (actuellement identiques pour tous les chapitres)
  - `generateTestSecteurQuestions()` : Génère les 12 questions de test secteur (actuellement identiques)
  - `generateMiniSimulationQuestions()` : Génère les 12 questions de mini-simulation (actuellement identiques)

### Problème actuel
Les 3 fonctions génèrent toujours les mêmes 12 questions, quel que soit le chapitre (1-12). Le `chapterId` est passé aux fonctions mais n'est pas utilisé pour varier les questions.

## Solution proposée

### Architecture
1. **Templates de base** : Créer des templates de questions par niveau de difficulté (simple, intermediate, advanced)
2. **Générateur par chapitre** : Utiliser `chapter.id` (1-12) pour sélectionner/varier les templates
3. **Adaptation progressive** : Augmenter la complexité des questions selon `chapter.id`

### Implémentation détaillée

#### 1. Créer des templates de questions par niveau

```javascript
// Templates simples (chapitres 1-2)
const SIMPLE_APPRENTISSAGE_TEMPLATES = [
  { question: "Quelle compétence est la plus demandée dans X ?", ... },
  // ... 12 questions basiques
];

// Templates intermédiaires (chapitres 3-5)
const INTERMEDIATE_APPRENTISSAGE_TEMPLATES = [
  { question: "Comment développer X tout en gérant Y ?", ... },
  // ... 12 questions avec analyse
];

// Templates avancés (chapitres 6-12)
const ADVANCED_APPRENTISSAGE_TEMPLATES = [
  { question: "Face à une situation complexe avec X, Y et Z, quelle approche prioriser ?", ... },
  // ... 12 questions complexes
];
```

#### 2. Modifier `generateApprentissageQuestions()`

```javascript
function generateApprentissageQuestions(chapter, sectorContext, metierContext, complexity) {
  const chapterId = chapter?.id || 1;
  const sectorName = sectorContext.name;
  
  // Sélectionner le template selon le chapitre
  let templates;
  if (chapterId <= 2) {
    templates = SIMPLE_APPRENTISSAGE_TEMPLATES;
  } else if (chapterId <= 5) {
    templates = INTERMEDIATE_APPRENTISSAGE_TEMPLATES;
  } else {
    templates = ADVANCED_APPRENTISSAGE_TEMPLATES;
  }
  
  // Adapter les templates avec le contexte secteur
  return templates.map(template => ({
    ...template,
    question: template.question.replace(/\{sector\}/g, sectorName),
    // ... autres remplacements
  }));
}
```

#### 3. Répéter pour `generateTestSecteurQuestions()` et `generateMiniSimulationQuestions()`

Même structure avec des templates adaptés au type de module.

### Indicateurs de difficulté

**Simple (chapitres 1-2)** :
- Questions : "Quelle compétence est demandée ?"
- Options : claires, réponse évidente
- Vocabulaire : basique

**Intermediate (chapitres 3-5)** :
- Questions : "Comment développer X tout en gérant Y ?"
- Options : nuancées, bonne réponse moins évidente
- Vocabulaire : technique

**Advanced (chapitres 6-12)** :
- Questions : "Face à une situation complexe avec X, Y, Z, quelle approche prioriser ?"
- Options : complexes, prise de décision
- Vocabulaire : avancé, cas réels

### Prochaines étapes

1. Créer les templates pour les 3 niveaux × 3 modules = 9 ensembles de templates
2. Modifier les 3 fonctions de génération pour utiliser `chapter.id`
3. Adapter les templates avec le contexte secteur/métier
4. Tester que chaque chapitre a 12 questions uniques

## Note importante

Cette implémentation nécessite de créer **108 questions** (12 questions × 3 niveaux × 3 modules). Pour une implémentation plus rapide, on peut :

**Option A** : Générer les questions dynamiquement selon le chapitre avec des variantes
**Option B** : Utiliser way (IA) pour générer les questions selon le chapitre (déjà en place)
**Option C** : Combinaison : utiliser way pour les chapitres avancés, templates pour les chapitres simples

L'option C semble la plus pragmatique : way génère déjà des questions personnalisées selon `chapterId`, donc il suffit de s'assurer que le fallback (templates) varie aussi selon le chapitre.
