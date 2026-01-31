# AUDIT - Système de Chapitres Align

## 📊 ÉTAT ACTUEL

### ✅ Système Partiellement Implémenté

**1. Structure des Chapitres (Hardcodée)**
- Fichier : `src/data/chapters.js`
- 10 chapitres définis avec :
  - `id` (1-10)
  - `title`
  - `lessons` (3 leçons par chapitre)
  - `complexity` (simple/intermediate/advanced)

**2. Progression Utilisateur (Supabase)**
- Table : `user_progress`
- Colonnes existantes :
  - `currentChapter` (INTEGER, default 1)
  - `current_module_in_chapter` (INTEGER, default 0)
  - `completed_modules_in_chapter` (JSONB array)
  - `chapter_history` (JSONB array)

**3. Logique de Déblocage**
- Fichier : `src/lib/chapterProgress.js`
- Fonctions :
  - `getChapterProgress()` - Récupère la progression
  - `completeModuleInChapter()` - Marque module complété
  - `getModuleUnlockStatus()` - Vérifie déblocage

**4. Génération de Questions**
- Fichier : `src/lib/questionGenerator.js`
- Génère 12 questions par module selon :
  - Chapitre (difficulté progressive)
  - Type de module (apprentissage/test/simulation)
  - Secteur et métier de l'utilisateur

### ⚠️ POINTS DE CONFLIT

1. **Pas de tables Supabase pour Chapters/Modules/Questions**
   - Tout est hardcodé dans le code
   - Pas de persistance structurée

2. **Deux systèmes de modules coexistent**
   - Ancien : `src/lib/modules/moduleModel.js` (cycle de 3 modules)
   - Nouveau : `src/lib/chapterProgress.js` (chapitres + modules)
   - Risque de confusion

3. **UI non adaptée**
   - `src/screens/Feed/index.js` affiche encore les 3 ronds (ancien système)
   - Pas de menu déroulant pour navigation entre chapitres

4. **Pas de sécurisation des routes**
   - Pas de vérification `isUnlocked` avant accès module

## 🎯 PLAN D'IMPLÉMENTATION

### ÉTAPE 1 : Créer Tables Supabase
- `chapters` (id, index, title, is_unlocked, created_at)
- `modules` (id, chapter_id, order, type, is_completed, created_at)
- `questions` (id, module_id, order, content, personalization, created_at)

### ÉTAPE 2 : Générer Données Initiales
- 10 chapitres (index 1-10)
- 30 modules (3 par chapitre)
- 360 questions (12 par module)

### ÉTAPE 3 : Améliorer Logique Déblocage
- Chapitre 1 → isUnlocked = true
- Module n accessible si module n-1 isCompleted
- Module 3 complété → déverrouiller chapitre suivant

### ÉTAPE 4 : Sécuriser Routes
- Vérifier `isUnlocked` avant accès
- Bloquer API si module verrouillé

### ÉTAPE 5 : Créer UI Navigation
- Rond central = chapitre actif
- Menu déroulant avec chapitres
- Chapitres verrouillés → 🔒

### ÉTAPE 6 : Migration Données
- Mapper `currentChapter` → `chapters.is_unlocked`
- Préserver progression existante

### ÉTAPE 7 : Tests
- Simuler progression complète
- Vérifier déblocage
- Corriger bugs
