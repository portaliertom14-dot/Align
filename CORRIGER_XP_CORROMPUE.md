# 🔧 Corriger les Valeurs XP Corrompues

## 🚨 Symptômes

Vous voyez :
- **XP astronomique** : 1,147,684,330,552,630 (1+ trillion)
- **Niveau 999** (plafonné)
- **Infinity XP** requise pour le prochain niveau

**Cause** : L'ancien système avec multiplicateurs exponentiels a généré des valeurs énormes.

---

## 🎯 Solution Rapide (Recommandée)

### Option 1 : Via SQL (Supabase)

**Étape 1** - Identifier votre compte :

```sql
-- Trouver votre user_id
SELECT user_id, niveau, "currentXP", etoiles
FROM public.user_progress
WHERE niveau >= 300
ORDER BY "currentXP" DESC
LIMIT 5;
```

**Étape 2** - Voir l'XP attendue pour votre niveau :

```sql
-- Créer la fonction de calcul
CREATE OR REPLACE FUNCTION calculate_xp_from_level(target_level INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  total_xp BIGINT := 0;
  level_iter INTEGER;
  xp_required NUMERIC;
BEGIN
  IF target_level > 1000 THEN
    target_level := 1000;
  END IF;
  
  FOR level_iter IN 1..target_level LOOP
    xp_required := 20 + 8 * POWER(level_iter, 1.5);
    total_xp := total_xp + FLOOR(xp_required);
  END LOOP;
  
  RETURN total_xp;
END;
$$;

-- Voir l'XP attendue pour niveau 300
SELECT calculate_xp_from_level(300) as xp_attendue;
-- Résultat : ~14,300,000 XP (14M au lieu de 1.1 trillion)
```

**Étape 3** - Appliquer la correction :

```sql
-- OPTION A : Conserver niveau 300, corriger l'XP
UPDATE public.user_progress
SET 
  "currentXP" = calculate_xp_from_level(300),
  updated_at = NOW()
WHERE user_id = 'VOTRE_USER_ID';  -- Remplacer par votre UUID

-- OPTION B : Ramener au niveau 100 (plus raisonnable)
UPDATE public.user_progress
SET 
  niveau = 100,
  "currentXP" = calculate_xp_from_level(100),
  updated_at = NOW()
WHERE user_id = 'VOTRE_USER_ID';  -- Remplacer par votre UUID
-- Résultat : Niveau 100 avec ~326,000 XP
```

**Étape 4** - Vérifier :

```sql
SELECT niveau, "currentXP", etoiles
FROM public.user_progress
WHERE user_id = 'VOTRE_USER_ID';
```

---

### Option 2 : Via JavaScript (dans l'App)

Utiliser le script de migration dans la console :

```javascript
import { 
  detectCorruptedXP, 
  fixCorruptedXP, 
  compareStrategies,
  FIX_STRATEGIES 
} from './src/lib/migrateCorruptedXP';

// 1. Détecter la corruption
const corruption = await detectCorruptedXP();
console.log(corruption);

// 2. Comparer les stratégies de correction
await compareStrategies();

// 3. Appliquer la correction (mode dry run d'abord)
await fixCorruptedXP({ 
  strategy: FIX_STRATEGIES.RECALCULATE,
  dryRun: true  // Voir les changements sans appliquer
});

// 4. Appliquer réellement
await fixCorruptedXP({ 
  strategy: FIX_STRATEGIES.RECALCULATE,
  dryRun: false  // Appliquer
});
```

---

## 📊 Stratégies de Correction

| Stratégie | Niveau Final | XP Finale | Avantage | Inconvénient |
|-----------|-------------|-----------|----------|--------------|
| **Recalculer** (recommandé) | 300 (conservé) | ~14M | Équitable, conserve progression | Niveau élevé |
| **Plafonner 200** | 200 (max) | ~2.3M | Plus raisonnable | Perte de ~100 niveaux |
| **Plafonner 100** | 100 (max) | ~326k | Conservateur | Perte de 200 niveaux |
| **Reset** | 1 | 0 | Recommencer | Perte totale |

---

## 🎯 Recommandation pour Niveau 300

### Option A : Conserver Niveau 300 ✅

```sql
UPDATE public.user_progress
SET "currentXP" = calculate_xp_from_level(300)
WHERE user_id = 'VOTRE_UUID';
```

**Résultat** :
- Niveau 300 (conservé)
- ~14,300,000 XP (14M)
- Progression équitable dans le nouveau système

**Avantages** :
- ✅ Conserve votre progression
- ✅ Équitable (XP = niveau réel)
- ✅ Pas de perte

**Inconvénients** :
- ⚠️ Niveau 300 est élevé
- ⚠️ Progression très lente (320+ modules par niveau)

### Option B : Ramener à Niveau 100 🔄

```sql
UPDATE public.user_progress
SET 
  niveau = 100,
  "currentXP" = calculate_xp_from_level(100)
WHERE user_id = 'VOTRE_UUID';
```

**Résultat** :
- Niveau 100
- ~326,000 XP (326k)
- Progression plus accessible

**Avantages** :
- ✅ Niveau plus raisonnable
- ✅ Progression visible (~32 modules/niveau)
- ✅ Toujours avancé

**Inconvénients** :
- ⚠️ Perte de 200 niveaux
- ⚠️ Peut frustrer

---

## 🔍 Valeurs de Référence

| Niveau | XP Totale (Nouveau Système) |
|--------|----------------------------|
| 1 | 28 |
| 10 | 1,342 |
| 50 | 58,993 |
| 100 | 326,013 |
| 150 | 899,030 |
| 200 | 2,293,087 |
| 300 | 14,365,670 |
| 500 | 24,000,000 |
| 1000 | 126,000,000 |

**Comparaison** :
- Ancien système niveau 300 : **1+ trillion XP** ❌
- Nouveau système niveau 300 : **~14M XP** ✅

---

## ⚠️ Précautions

1. **Backup** : Faire un backup de `user_progress` avant toute modification
2. **Test** : Tester d'abord sur un compte de dev
3. **Vérification** : Vérifier le résultat après correction
4. **Cache** : Attendre 10-15s ou redémarrer PostgREST si nécessaire

---

## 🚀 Script Complet (Copy-Paste)

Pour corriger **votre compte niveau 300** :

```sql
-- 1. Créer la fonction
CREATE OR REPLACE FUNCTION calculate_xp_from_level(target_level INTEGER)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  total_xp BIGINT := 0;
  level_iter INTEGER;
  xp_required NUMERIC;
BEGIN
  IF target_level > 1000 THEN
    target_level := 1000;
  END IF;
  FOR level_iter IN 1..target_level LOOP
    xp_required := 20 + 8 * POWER(level_iter, 1.5);
    total_xp := total_xp + FLOOR(xp_required);
  END LOOP;
  RETURN total_xp;
END;
$$;

-- 2. Trouver votre user_id
SELECT user_id, niveau, "currentXP"
FROM public.user_progress
WHERE niveau >= 300
ORDER BY "currentXP" DESC;

-- 3. CHOISIR UNE OPTION :

-- OPTION A : Conserver niveau 300
UPDATE public.user_progress
SET 
  "currentXP" = calculate_xp_from_level(300),
  updated_at = NOW()
WHERE user_id = 'REMPLACER_PAR_VOTRE_UUID';

-- OU

-- OPTION B : Ramener à niveau 100
UPDATE public.user_progress
SET 
  niveau = 100,
  "currentXP" = calculate_xp_from_level(100),
  updated_at = NOW()
WHERE user_id = 'REMPLACER_PAR_VOTRE_UUID';

-- 4. Vérifier le résultat
SELECT niveau, "currentXP", etoiles
FROM public.user_progress
WHERE user_id = 'REMPLACER_PAR_VOTRE_UUID';

-- 5. (Optionnel) Nettoyer la fonction
DROP FUNCTION IF EXISTS calculate_xp_from_level(INTEGER);
```

---

## 📞 Support

**Script SQL complet** : `FIX_CORRUPTED_XP_VALUES.sql`  
**Script JavaScript** : `src/lib/migrateCorruptedXP.js`  
**Documentation** : `SYSTEME_XP_V2.md`

---

## ✅ Résultat Attendu

Après correction, vous devriez voir :

**Avant** :
```
1147684330552630/Infinity XP
Niveau 999
```

**Après (Option A - Niveau 300)** :
```
42/736 XP  (exemple dans le niveau actuel)
Niveau 300
```

**Après (Option B - Niveau 100)** :
```
42/8020 XP  (exemple dans le niveau actuel)
Niveau 100
```

---

**Correction Facile et Rapide** 🚀

Choisissez l'option qui vous convient et exécutez le script SQL !
