# Système de Chapitres et Modules Personnalisés - Align

## Vue d'ensemble

Le système de chapitres permet une progression structurée à travers 10 chapitres, chacun contenant 3 modules (Apprentissage, Test de secteur, Mini-simulation). Les questions sont personnalisées selon :
- Le chapitre actuel (1-10)
- Le type de module (Apprentissage, Test de secteur, Mini-simulation)
- Le secteur de l'utilisateur (Tech, Santé, Business, etc.)
- Le métier de l'utilisateur (Développeur, Médecin, etc.)

## Structure des Chapitres

### 10 Chapitres

1. **Découverte de soi** (Complexité: simple)
   - Identifier ses centres d'intérêt
   - Comprendre ses forces et faiblesses
   - Explorer différentes options de carrière

2. **Orientation** (Complexité: simple)
   - Explorer les secteurs d'activité
   - Comprendre les tendances du marché
   - Identifier les métiers adaptés

3. **Compétences de base** (Complexité: intermediate)
   - Communication
   - Organisation
   - Résolution de problème

4. **Prise de décision** (Complexité: intermediate)
   - Prendre des décisions rationnelles
   - Gérer l'incertitude
   - Prioriser ses choix

5. **Développement pratique** (Complexité: intermediate)
   - Mettre en pratique les compétences
   - Apprentissage par projet
   - Suivi de ses progrès

6. **Exploration avancée** (Complexité: advanced)
   - Tester différents métiers
   - Comprendre les secteurs connexes
   - Analyser les parcours inspirants

7. **Professionnalisation** (Complexité: advanced)
   - Compétences avancées
   - Networking
   - Gestion de projets

8. **Spécialisation** (Complexité: advanced)
   - Choisir sa spécialité
   - Optimiser ses forces
   - Construire un plan d'évolution

9. **Préparation à la carrière** (Complexité: advanced)
   - Préparer son CV
   - Réseauter efficacement
   - Entretiens et mise en situation

10. **Excellence et autonomie** (Complexité: advanced)
    - Maîtriser son secteur
    - Créer sa trajectoire
    - Développer son autonomie

## Types de Modules

Chaque chapitre contient 3 modules dans l'ordre :

1. **Apprentissage** (`apprentissage`)
   - 12 questions simples sur les connaissances générales
   - Évolutives selon le chapitre
   - Adaptées au secteur et métier

2. **Test de secteur** (`test_secteur`)
   - 12 questions ciblées sur le secteur choisi
   - Teste la compréhension sectorielle
   - Vocabulaire et principes du secteur

3. **Mini-simulation** (`mini_simulation`)
   - 12 scénarios à choix multiple
   - Mise en situation professionnelle
   - Prise de décision rapide

## Progression

### Règle de progression

- **3 modules complétés** → Passage au chapitre suivant
- Les modules doivent être complétés dans l'ordre (0, 1, 2)
- Un module est débloqué si son index <= `currentModuleInChapter`
- Un module est cliquable SEULEMENT si son index === `currentModuleInChapter`

### Structure de données

```javascript
{
  currentChapter: 1,                    // Chapitre actuel (1-10)
  currentModuleInChapter: 0,            // Module actuel dans le chapitre (0, 1, 2)
  completedModulesInChapter: [],        // Modules complétés [0, 1, 2]
  chapterHistory: [],                   // Historique des chapitres complétés
}
```

## Génération de Questions

### Système hybride

Le système utilise **way (IA)** pour générer les questions personnalisées, avec fallback sur des templates si way n'est pas disponible.

### Personnalisation

Les questions sont générées selon :

1. **Chapitre** : Détermine la complexité et le thème
2. **Module** : Détermine le type de questions (apprentissage/test/simulation)
3. **Secteur** : Adapte le vocabulaire et les contextes
4. **Métier** : Personnalise les scénarios et situations

### Exemples de personnalisation

**Chapitre 1 - Tech - Développeur - Apprentissage :**
- "Quelle est ta compétence principale dans le secteur Tech ?"
- Options adaptées : Programmation, Logique, Résolution de problèmes techniques

**Chapitre 5 - Santé - Médecin - Mini-simulation :**
- "Un patient présente des symptômes rares. Que fais-tu ?"
- Options adaptées : Suivre le protocole, Consulter un spécialiste, etc.

## Fichiers clés

### Structure des données
- `src/data/chapters.js` : Définition des 10 chapitres et leurs leçons

### Gestion de progression
- `src/lib/chapterProgress.js` : Logique de progression par chapitres
- `src/lib/userProgressSupabase.js` : Stockage de la progression (mise à jour)

### Génération de questions
- `src/lib/questionGenerator.js` : Générateur de questions personnalisées (utilise way + templates)

### Intégration UI
- `src/screens/Feed/index.js` : Affichage des modules avec système de chapitres
- `src/screens/ModuleCompletion/index.js` : Marque les modules comme complétés

## Utilisation

### Pour générer un module

```javascript
import { generatePersonalizedModule } from '../lib/questionGenerator';

const module = await generatePersonalizedModule(
  chapterId,      // 1-10
  moduleIndex,    // 0, 1, ou 2
  secteurId,      // 'tech', 'sante', etc.
  metierId,       // 'developpeur', 'medecin', etc.
  true            // Utiliser way (IA)
);
```

### Pour marquer un module comme complété

```javascript
import { completeModuleInChapter } from '../lib/chapterProgress';

const result = await completeModuleInChapter(moduleIndex);
if (result.chapterCompleted) {
  // Chapitre complété ! Passage au suivant
  console.log('Nouveau chapitre:', result.nextChapter);
}
```

## Récompenses

Les récompenses augmentent avec le chapitre :

- **XP** : 50 + (chapitre × 10)
  - Chapitre 1 : 60 XP
  - Chapitre 5 : 100 XP
  - Chapitre 10 : 150 XP

- **Étoiles** : 2 + Math.floor(chapitre / 3)
  - Chapitres 1-2 : 2 étoiles
  - Chapitres 3-5 : 3 étoiles
  - Chapitres 6-8 : 4 étoiles
  - Chapitres 9-10 : 5 étoiles

## Évolution de la complexité

- **Chapitres 1-2** : Questions simples, vocabulaire de base
- **Chapitres 3-5** : Questions intermédiaires, situations plus complexes
- **Chapitres 6-10** : Questions avancées, scénarios réalistes et stratégiques

## Notes techniques

- Le système est rétrocompatible avec l'ancien système cyclique
- Si way (IA) n'est pas disponible, les templates sont utilisés
- La progression est sauvegardée dans Supabase et AsyncStorage
- Les questions sont générées à la demande (pas de pré-génération)
