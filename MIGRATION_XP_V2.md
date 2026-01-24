# 🔄 Guide de Migration - Système XP V2

Ce guide vous accompagne dans la migration du système XP V1 (exponentiel) vers V2 (progressif).

---

## 📋 Checklist de migration

### ✅ Déjà fait

- [x] Nouveau système XP créé (`src/lib/xpSystem.js`)
- [x] `progression.js` migré (alias vers xpSystem)
- [x] `ModuleCompletion` migré (XP fixes)
- [x] `modules.js` migré (XP fixes)
- [x] Documentation complète (`SYSTEME_XP_V2.md`)
- [x] Tests unitaires (`src/lib/__tests__/xpSystem.test.js`)
- [x] Script de génération de table (`scripts/generateXPTable.js`)

### 🔄 À vérifier/migrer

- [ ] Composant `XPBar` (compatible mais peut être optimisé)
- [ ] Écrans de quiz (vérifier gains XP)
- [ ] Écrans de séries (vérifier gains XP)
- [ ] Écrans de quêtes (vérifier gains XP)
- [ ] Base de données Supabase (migration SQL)
- [ ] Tests E2E de progression

---

## 🗄️ Migration Base de Données

### 1. Changer le type de colonne `currentXP`

Si vous rencontrez l'erreur `"out of range for type integer"`, exécutez :

```sql
-- Script complet disponible dans MIGRATE_XP_TO_BIGINT.sql
ALTER TABLE public.user_progress 
  ALTER COLUMN "currentXP" TYPE BIGINT 
  USING "currentXP"::BIGINT;

-- Si vous utilisez la colonne 'xp' au lieu de 'currentXP'
ALTER TABLE public.user_progress 
  ALTER COLUMN xp TYPE BIGINT 
  USING xp::BIGINT;
```

### 2. Vérifier les triggers et fonctions

Assurez-vous que les triggers et fonctions Supabase n'utilisent pas l'ancien calcul XP :

```sql
-- Lister les fonctions qui mentionnent XP
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_definition LIKE '%xp%' 
  AND routine_schema = 'public';
```

### 3. Migration des données utilisateur (OPTIONNEL)

Si vous voulez remettre à zéro les valeurs XP (déconseillé en production) :

```sql
-- ⚠️ ATTENTION : Cela réinitialise toute la progression des utilisateurs
-- N'exécuter qu'en environnement de développement

-- Option 1 : Recalculer l'XP depuis le niveau (approximatif)
UPDATE public.user_progress
SET "currentXP" = (
  -- Formule approximative : moyenne des XP totales pour ce niveau
  SELECT SUM(20 + 8 * POWER(i, 1.5))
  FROM generate_series(1, niveau) i
)
WHERE "currentXP" > 2147483647; -- Seulement les valeurs corrompues

-- Option 2 : Reset complet (dev seulement)
UPDATE public.user_progress
SET "currentXP" = 0, niveau = 1
WHERE user_id = 'YOUR_TEST_USER_ID';
```

---

## 📝 Migration du Code

### Imports à changer

#### ❌ Ancien système

```javascript
import { 
  calculateXPForModule,
  calculateLevel,
  getTotalXPForLevel 
} from './lib/progression';

// Calcul avec multiplicateurs
const xp = calculateXPForModule(50, userLevel);
```

#### ✅ Nouveau système

```javascript
import { 
  calculateLevel,
  getTotalXPForLevel,
  XP_REWARDS 
} from './lib/xpSystem';

// XP fixe
const xp = XP_REWARDS.MODULE_COMPLETED; // 25 XP
```

### Patterns courants à migrer

#### 1. Gains d'XP après un événement

❌ **Ancien** :
```javascript
const userProgress = await getUserProgress();
const userLevel = userProgress.currentLevel;
const xpGained = calculateXPForModule(50, userLevel); // ×2, ×4, ×8...
await addXP(xpGained);
```

✅ **Nouveau** :
```javascript
import { XP_REWARDS } from './lib/xpSystem';

// Pas besoin de récupérer le niveau
await addXP(XP_REWARDS.MODULE_COMPLETED); // 25 XP fixe
```

#### 2. Affichage de l'XP à gagner

❌ **Ancien** :
```javascript
const [displayXP, setDisplayXP] = useState(0);

useEffect(() => {
  getUserProgress().then(progress => {
    const calculated = calculateXPForModule(baseXP, progress.currentLevel);
    setDisplayXP(calculated);
  });
}, [baseXP]);

return <Text>{displayXP} XP</Text>;
```

✅ **Nouveau** :
```javascript
import { XP_REWARDS } from './lib/xpSystem';

// Directement
return <Text>{XP_REWARDS.MODULE_COMPLETED} XP</Text>;
```

#### 3. Calcul du niveau depuis l'XP

❌ **Ancien** :
```javascript
import { calculateLevel } from './lib/progression';

// Niveau 0-indexed (0, 1, 2...)
const level = calculateLevel(xp); // 0 pour début
```

✅ **Nouveau** :
```javascript
import { calculateLevel } from './lib/xpSystem';

// Niveau 1-indexed (1, 2, 3...)
const level = calculateLevel(xp); // 1 pour début
```

⚠️ **Attention** : Le niveau minimum change de 0 à 1 !

#### 4. Affichage de la progression

❌ **Ancien** :
```javascript
// Formule complexe avec overflow
const xpForNextLevel = getTotalXPForLevel(level + 1);
const xpInLevel = currentXP - getTotalXPForLevel(level);
const percent = (xpInLevel / (xpForNextLevel - getTotalXPForLevel(level))) * 100;
```

✅ **Nouveau** :
```javascript
import { getXPInCurrentLevel, getXPNeededForNextLevel } from './lib/xpSystem';

// Utilitaires dédiés
const xpInLevel = getXPInCurrentLevel(currentXP);
const xpNeeded = getXPNeededForNextLevel(currentXP);
const percent = (xpInLevel / xpNeeded) * 100;
```

---

## 🧪 Tests de Migration

### 1. Tests unitaires

```bash
# Lancer les tests du nouveau système
npm test -- xpSystem.test.js

# Vérifier la couverture
npm test -- --coverage xpSystem.test.js
```

### 2. Tests manuels

#### Scénario 1 : Nouveau joueur

1. Créer un nouveau compte test
2. Compléter un module
3. Vérifier :
   - XP gagnée = 25 (pas 50, 100, etc.)
   - Niveau = 1
   - Barre d'XP affiche 25/28 (~89%)

#### Scénario 2 : Joueur existant

1. Se connecter avec un compte existant
2. Noter : niveau actuel, XP totale
3. Compléter un module
4. Vérifier :
   - XP gagnée = 25 (fixe)
   - Niveau recalculé correctement depuis l'XP
   - Pas d'erreur de dépassement INTEGER

#### Scénario 3 : Passage de niveau

1. Se positionner proche d'un passage de niveau
   - Ex: 26/28 XP (niveau 1)
2. Compléter un module (+25 XP)
3. Vérifier :
   - Niveau passe de 1 à 2
   - Animation de confetti
   - XP overflow conservé (51 - 28 = 23 XP dans niveau 2)

### 3. Tests de charge

```javascript
// Tester avec des valeurs extrêmes
import { calculateLevel, getTotalXPForLevel } from './lib/xpSystem';

// Niveau 100
const xpLevel100 = getTotalXPForLevel(100);
console.log('XP niveau 100:', xpLevel100); // ~326k (raisonnable)

// Niveau 500
const xpLevel500 = getTotalXPForLevel(500);
console.log('XP niveau 500:', xpLevel500); // ~4.5M (raisonnable)

// Niveau 1000 (max)
const xpLevel1000 = getTotalXPForLevel(1000);
console.log('XP niveau 1000:', xpLevel1000); // ~31M (raisonnable)
```

---

## 🐛 Résolution de Problèmes

### Erreur : `"calculateXPForModule is not a function"`

**Cause** : Import de l'ancienne fonction supprimée

**Solution** :
```javascript
// ❌ Ne plus faire
import { calculateXPForModule } from './lib/progression';
const xp = calculateXPForModule(50, level);

// ✅ Faire
import { XP_REWARDS } from './lib/xpSystem';
const xp = XP_REWARDS.MODULE_COMPLETED;
```

### Erreur : `"out of range for type integer"`

**Cause** : Colonne `currentXP` en INTEGER (limite 2.1 milliards)

**Solution** :
1. Exécuter `MIGRATE_XP_TO_BIGINT.sql` dans Supabase
2. Attendre 10-15s pour refresh du cache PostgREST
3. Si persistant : Settings > API > Restart PostgREST

### Erreur : Niveau retourne 0 au lieu de 1

**Cause** : Ancienne logique 0-indexed vs nouvelle 1-indexed

**Solution** :
```javascript
// ❌ Ancien (0-indexed)
if (level === 0) {
  console.log('Débutant');
}

// ✅ Nouveau (1-indexed)
if (level === 1) {
  console.log('Débutant');
}
```

### Avertissement : `"calculateXPForModule est SUPPRIMÉ"`

**Cause** : Utilisation de la fonction dépréciée

**Solution** : Voir messages d'erreur dans la console, remplacer par `XP_REWARDS`

---

## 📊 Suivi de Migration

### Métriques à surveiller

1. **Erreurs Sentry/logs** :
   - `"calculateXPForModule"`
   - `"out of range"`
   - `"NaN"` dans les calculs XP

2. **Métriques utilisateur** :
   - Temps moyen pour monter de niveau
   - Distribution des niveaux (doit être plus étalée)
   - Taux de complétion des modules

3. **Performance** :
   - Temps de calcul `calculateLevel()` (doit être < 1ms)
   - Nombre d'appels DB pour XP (doit diminuer)

### Dashboard de migration

```sql
-- Vérifier la distribution des niveaux après migration
SELECT 
  niveau,
  COUNT(*) as nb_users,
  AVG("currentXP") as xp_moyen,
  MAX("currentXP") as xp_max
FROM user_progress
GROUP BY niveau
ORDER BY niveau;

-- Identifier les valeurs problématiques
SELECT 
  user_id,
  niveau,
  "currentXP",
  etoiles
FROM user_progress
WHERE "currentXP" > 1000000  -- XP anormalement élevée
   OR niveau > 200;          -- Niveau suspect
```

---

## 🚀 Déploiement

### Étapes recommandées

1. **Phase 1 : Préparation (Dev)**
   - ✅ Créer le nouveau système
   - ✅ Tests unitaires
   - ✅ Migration de code

2. **Phase 2 : Migration DB (Staging)**
   - [ ] Backup de la table `user_progress`
   - [ ] Exécuter `MIGRATE_XP_TO_BIGINT.sql`
   - [ ] Tests manuels complets
   - [ ] Vérifier les métriques

3. **Phase 3 : Déploiement (Production)**
   - [ ] Fenêtre de maintenance (si possible)
   - [ ] Exécuter migration SQL
   - [ ] Deploy du nouveau code
   - [ ] Monitoring actif 24h
   - [ ] Rollback plan prêt

4. **Phase 4 : Cleanup**
   - [ ] Supprimer les anciens logs
   - [ ] Archiver l'ancien système
   - [ ] Mettre à jour la documentation

### Rollback Plan

En cas de problème critique :

```javascript
// 1. Réactiver l'ancien système temporairement
import { calculateXPForModule } from './lib/progression.backup';

// 2. Restaurer la DB depuis backup
-- psql : \i backup_user_progress.sql

// 3. Redéployer la version précédente
git revert <commit-hash>
git push
```

---

## ✅ Validation Finale

Avant de considérer la migration complète :

- [ ] Tous les tests unitaires passent
- [ ] Tous les tests E2E passent
- [ ] Pas d'erreur dans les logs (7 jours)
- [ ] Métriques utilisateur stables
- [ ] Performance acceptable (< 1ms par calcul)
- [ ] Documentation à jour
- [ ] Équipe formée au nouveau système

---

## 📞 Support

**Questions ou problèmes ?**

1. Consulter `SYSTEME_XP_V2.md` (documentation système)
2. Vérifier `src/lib/xpSystem.js` (code source commenté)
3. Tester avec `scripts/generateXPTable.js`
4. Utiliser `getProgressReport(xp)` pour debug

---

**Bonne migration ! 🚀**
