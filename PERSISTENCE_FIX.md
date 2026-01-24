# 🔧 FIX PERSISTENCE PROGRESSION UTILISATEUR

## 🐛 PROBLÈMES IDENTIFIÉS

### 1. **Ordre d'initialisation incorrect**
- `initializeAutoSave()` appelé AVANT la connexion utilisateur
- `AutoSave` charge `getUserProgress(true)` qui peut retourner 0 si DB pas prête
- `AutoSave` démarre immédiatement et peut écraser avec 0

### 2. **Upsert partiel dangereux**
- `convertToDB` inclut `undefined` comme 0 dans certains cas
- `upsertUserProgress` peut écraser avec des valeurs par défaut
- Logique de fusion utilise `data.xp` qui peut être 0 (cache PostgREST)

### 3. **Cache PostgREST obsolète**
- `getUserProgress` utilise cache local si récent, mais cache peut avoir 0
- Si DB a 50 XP mais cache local a 0, on utilise 0

## ✅ SOLUTION COMPLÈTE

### ÉTAPE 1 : Déplacer AutoSave APRÈS la connexion

**Fichier : `src/services/authFlow.js`**

Ajouter l'initialisation d'AutoSave après la connexion réussie :

```javascript
import { initializeAutoSave } from '../lib/autoSave';

// Dans setupAuthStateListener ou après connexion réussie
export async function handleUserLogin(user) {
  // ... code existant ...
  
  // CRITICAL: Initialiser AutoSave APRÈS la connexion et APRÈS avoir chargé la progression
  // Attendre un délai pour que la DB soit prête
  setTimeout(async () => {
    try {
      // Forcer un refresh depuis DB avant d'initialiser AutoSave
      const { getUserProgress } = require('../lib/userProgressSupabase');
      const progress = await getUserProgress(true); // Force refresh
      
      // Initialiser AutoSave avec les vraies valeurs
      await initializeAutoSave();
      console.log('[AuthFlow] ✅ AutoSave initialisé après connexion');
    } catch (error) {
      console.error('[AuthFlow] ❌ Erreur lors de l\'initialisation d\'AutoSave:', error);
    }
  }, 1000); // Délai de 1s pour laisser la DB se synchroniser
}
```

### ÉTAPE 2 : Améliorer convertToDB pour filtrer undefined

**Fichier : `src/lib/userProgressSupabase.js`**

```javascript
function convertToDB(localProgress) {
  const dbProgress = {};
  
  // CRITICAL: Ne jamais inclure undefined ou null pour les champs critiques
  // Seulement inclure si la valeur est explicitement définie ET valide
  
  // current_module_index (toujours requis)
  if (typeof localProgress.currentModuleIndex === 'number') {
    dbProgress.current_module_index = localProgress.currentModuleIndex;
  } else {
    dbProgress.current_module_index = 0; // Valeur par défaut acceptable
  }
  
  // Colonnes critiques : SEULEMENT si explicitement définies ET > 0 ou valides
  if (localProgress.currentLevel !== undefined && typeof localProgress.currentLevel === 'number') {
    dbProgress.niveau = localProgress.currentLevel;
  }
  // NE PAS inclure si undefined - laisser Supabase utiliser la valeur existante
  
  if (localProgress.currentXP !== undefined && typeof localProgress.currentXP === 'number' && localProgress.currentXP >= 0) {
    dbProgress.xp = localProgress.currentXP;
  }
  // NE PAS inclure si undefined - laisser Supabase utiliser la valeur existante
  
  if (localProgress.totalStars !== undefined && typeof localProgress.totalStars === 'number' && localProgress.totalStars >= 0) {
    dbProgress.etoiles = localProgress.totalStars;
  }
  // NE PAS inclure si undefined - laisser Supabase utiliser la valeur existante
  
  // ... reste des champs optionnels ...
  
  return dbProgress;
}
```

### ÉTAPE 3 : Améliorer upsertUserProgress pour ne jamais écraser avec 0

**Fichier : `src/services/userService.js`**

```javascript
export async function upsertUserProgress(userId, progressData) {
  try {
    const baseProgressData = {
      id: userId,
      updated_at: new Date().toISOString(),
    };
    
    // CRITICAL: Ne jamais inclure xp/etoiles/niveau si undefined
    // Si undefined, Supabase utilisera la valeur existante (pas d'écrasement)
    if (progressData.niveau !== undefined && typeof progressData.niveau === 'number') {
      baseProgressData.niveau = progressData.niveau;
    }
    
    if (progressData.xp !== undefined && typeof progressData.xp === 'number' && progressData.xp >= 0) {
      baseProgressData.xp = progressData.xp;
    }
    // Si xp est undefined, NE PAS l'inclure - Supabase garde la valeur existante
    
    if (progressData.etoiles !== undefined && typeof progressData.etoiles === 'number' && progressData.etoiles >= 0) {
      baseProgressData.etoiles = progressData.etoiles;
    }
    // Si etoiles est undefined, NE PAS l'inclure - Supabase garde la valeur existante
    
    // ... reste du code ...
    
    const { data, error } = await supabase
      .from('user_progress')
      .upsert(baseProgressData, {
        onConflict: 'id',
      })
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('[upsertUserProgress] Erreur:', error);
    return { data: null, error };
  }
}
```

### ÉTAPE 4 : Ajouter délai de grâce dans AutoSave

**Fichier : `src/lib/autoSave.js`**

```javascript
let isAutoSaveEnabled = false;
let lastSavedProgress = null;
let autoSaveGracePeriod = false; // NOUVEAU: Délai de grâce après login

export async function initializeAutoSave() {
  // ... vérification utilisateur ...
  
  console.log('[AutoSave] 🚀 Initialisation du système de sauvegarde automatique...');

  // Charger la progression actuelle comme référence
  try {
    // CRITICAL: Forcer un refresh depuis DB pour avoir les vraies valeurs
    const progress = await getUserProgress(true);
    lastSavedProgress = progress;
    console.log('[AutoSave] ✅ Progression de référence chargée:', {
      xp: progress.currentXP,
      stars: progress.totalStars,
      level: progress.currentLevel
    });
    
    // NOUVEAU: Activer délai de grâce (2 secondes) pour éviter sauvegarde immédiate
    autoSaveGracePeriod = true;
    setTimeout(() => {
      autoSaveGracePeriod = false;
      console.log('[AutoSave] ✅ Délai de grâce terminé, sauvegarde automatique activée');
    }, 2000);
  } catch (err) {
    console.error('[AutoSave] Erreur lors du chargement de la progression de référence:', err);
  }

  // ... reste du code ...
}

export async function saveProgressIfNeeded() {
  try {
    // CRITICAL: Vérifier délai de grâce
    if (autoSaveGracePeriod) {
      console.log('[AutoSave] ⏳ Délai de grâce actif, sauvegarde différée');
      return false;
    }
    
    // ... reste du code ...
  } catch (error) {
    // ...
  }
}
```

### ÉTAPE 5 : Améliorer la logique de fusion dans updateUserProgress

**Fichier : `src/lib/userProgressSupabase.js`**

```javascript
// Dans updateUserProgress, après l'upsert Supabase
const mergedData = {
  ...existingCacheDB,
  ...data,
  // CRITICAL: Priorité absolue aux valeurs de Supabase si on vient de les mettre à jour
  // Sinon, préserver les valeurs du cache existant (qui viennent de la DB)
  xp: (updates.currentXP !== undefined || updates.xp !== undefined)
    ? (data.xp !== undefined ? data.xp : existingCacheDB.xp)
    : (existingCacheDB.xp !== undefined ? existingCacheDB.xp : (existingCache?.currentXP ?? 0)),
  
  etoiles: (updates.totalStars !== undefined || updates.etoiles !== undefined)
    ? (data.etoiles !== undefined ? data.etoiles : existingCacheDB.etoiles)
    : (existingCacheDB.etoiles !== undefined ? existingCacheDB.etoiles : (existingCache?.totalStars ?? 0)),
  
  niveau: (updates.currentLevel !== undefined || updates.niveau !== undefined)
    ? (data.niveau !== undefined ? data.niveau : existingCacheDB.niveau)
    : (existingCacheDB.niveau !== undefined ? existingCacheDB.niveau : (existingCache?.currentLevel ?? 0)),
};
```

## 📋 CHECKLIST D'IMPLÉMENTATION

- [ ] Déplacer `initializeAutoSave()` dans `handleUserLogin()` (authFlow.js)
- [ ] Ajouter délai de grâce dans `AutoSave` (2 secondes après login)
- [ ] Améliorer `convertToDB` pour ne jamais inclure undefined
- [ ] Améliorer `upsertUserProgress` pour ne jamais écraser avec 0
- [ ] Améliorer logique de fusion dans `updateUserProgress`
- [ ] Tester : Login → Vérifier progression DB → Vérifier pas d'écrasement

## 🎯 RÉSULTAT ATTENDU

1. **Login** → Fetch DB → Hydrate state → **PUIS** activer AutoSave
2. **Délai de grâce** → AutoSave ne sauvegarde pas immédiatement après login
3. **Filtrage undefined** → Jamais d'écrasement avec 0 ou undefined
4. **Protection régression** → AutoSave détecte et refuse les régressions
