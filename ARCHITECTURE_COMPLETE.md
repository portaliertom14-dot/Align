# Architecture Complète Align

## 🏗️ Vue d'ensemble de l'architecture

```
ALIGN APP
├── SYSTÈME DE QUÊTES V3
│   ├── Quotidiennes (reset quotidien)
│   ├── Hebdomadaires (reset quand complétées)
│   └── Performance (objectifs long-terme)
│
├── SYSTÈME DE MODULES V1
│   ├── Module 1 → Module 2 → Module 3
│   ├── Déblocage progressif
│   └── Cycle infini + bonus
│
└── SYSTÈME AUTH/REDIRECTION V1
    ├── Connexion intelligente
    ├── Protection des routes
    └── Gestion onboarding
```

## 📊 Diagramme de flux global

```
UTILISATEUR OUVRE L'APP
         |
         ▼
┌─────────────────┐
│ État Auth ?     │
└─────────────────┘
         |
    ┌────┴────┐
    │         │
    ▼         ▼
NON AUTH   AUTHENTIFIÉ
    │         |
    │    ┌────┴────┐
    │    │         │
    │    ▼         ▼
    │  OUI      NON
    │  Onb.    Onb.
    │    │       │
    ▼    ▼       ▼
  AUTH  FEED  ONBOARDING
    │    │       │
    │    │   ┌───┴───┐
    │    │   │       │
    │    │   ▼       ▼
    │    │ ÉTAPES  COMPLÉTION
    │    │   │       │
    │    │   │       ▼
    │    │   │   onboarding_completed = true
    │    │   │       │
    │    ◄───┴───────┘
    │    │
    ▼    ▼
  FEED (Modules + Quêtes)
    │
    ├── Module 1 (unlocked)
    ├── Module 2 (locked)
    └── Module 3 (locked)
    │
    ▼
  MODULE 1 COMPLÉTÉ
    │
    ├─ XP + Étoiles
    ├─ Quêtes mises à jour
    ├─ Module 2 déverrouillé
    │
    └─ Quête complétée ?
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  OUI       NON
    │         │
    ▼         │
 ÉCRAN      │
RÉCOMPENSE  │
    │         │
    └────┬────┘
         │
         ▼
      FEED
         │
    (continue...)
```

## 🗂️ Structure de données

```
USER
├── AUTH STATE
│   ├── isAuthenticated: boolean
│   ├── hasCompletedOnboarding: boolean
│   ├── accountCreatedAt: timestamp
│   ├── lastLoginAt: timestamp
│   └── onboardingStep: number
│
├── PROGRESSION
│   ├── XP total: number (BIGINT)
│   ├── Niveau: number (calculé)
│   ├── Étoiles: number
│   └── current_module_index: 1|2|3
│
├── MODULES STATE
│   ├── Module 1: { state, completionCount }
│   ├── Module 2: { state, completionCount }
│   ├── Module 3: { state, completionCount }
│   └── totalCyclesCompleted: number
│
├── QUÊTES STATE
│   ├── dailyQuests[]
│   ├── weeklyQuests[]
│   ├── performanceQuests[]
│   ├── lastDailyReset: timestamp
│   └── lastWeeklyReset: timestamp
│
└── TRACKING
    ├── Activity: { totalActiveTimeMs, isActive }
    └── Series: { totalSeries, perfectSeries }
```

## 🔄 Cycle de vie complet

### 1. Premier lancement

```
App Start
  ↓
setupAuthStateListener()        # Écoute changements auth
  ↓
Non authentifié → AUTH SCREEN
  ↓
Création compte
  ↓
signUpAndRedirect()
  ├─ Créer compte Supabase
  ├─ Créer profil (onboarding_completed = false)
  └─ Redirection → ONBOARDING
  ↓
completeOnboardingAndRedirect()
  ├─ onboarding_completed = true
  └─ Redirection → FEED
  ↓
initializeQuests()
initializeModules()
  ├─ Quêtes générées selon niveau
  └─ Module 1 unlocked
  ↓
UTILISATEUR DANS L'APP ✅
```

### 2. Session normale

```
FEED
  ↓
Sélection Module 1 (unlocked)
  ↓
JOUE MODULE 1
  ↓
handleModuleCompletion()
  ├─ +50 XP, +10 étoiles
  ├─ Module 1 → completed
  ├─ Module 2 → unlocked
  ├─ Quêtes mises à jour:
  │   ├─ "Compléter 1 module" : 1/1 ✅
  │   └─ "Gagner 15 étoiles" : 10/15
  └─ Vérifier quêtes complétées
  ↓
Quête complétée ?
  ├─ OUI → QUEST COMPLETION SCREEN
  │         ↓
  │     Afficher récompenses
  │         ↓
  │     FEED
  │
  └─ NON → FEED
  ↓
Module 2 maintenant jouable
```

### 3. Fin de cycle

```
Module 3 complété
  ↓
handleModuleCompletion()
  ├─ +100 XP, +20 étoiles
  ├─ CYCLE TERMINÉ 🎉
  ├─ BONUS: +150 XP, +30 étoiles
  ├─ totalCyclesCompleted++
  └─ RESET:
      ├─ Module 1 → unlocked
      ├─ Module 2 → locked
      └─ Module 3 → locked
  ↓
NOUVEAU CYCLE COMMENCE
```

### 4. Reconnexion

```
Utilisateur se connecte
  ↓
signInAndRedirect()
  ↓
Vérifier onboarding_completed
  ├─ true → FEED (directement)
  └─ false → ONBOARDING (reprise)
  ↓
État rechargé:
  ├─ Modules: state restauré
  ├─ Quêtes: vérifier renouvellement
  └─ Tracking: continue
```

## 🎮 Interactions utilisateur

```
UTILISATEUR DANS L'APP
         |
    ┌────┴────┬────────┬────────┐
    │         │        │        │
    ▼         ▼        ▼        ▼
  FEED    QUÊTES   PROFIL   SETTINGS
    │
    ├─ Modules (1, 2, 3)
    │   └─ Clique Module
    │       ↓
    │   canStartModule() ?
    │       ├─ OUI → JOUER
    │       └─ NON → Bloqué (🔒)
    │
    └─ Tracking activité
        └─ +1 min toutes les 30s
            └─ Met à jour quête temps
```

## 🔐 Sécurité et validation

### Protection des routes

```
Tentative accès FEED
  ↓
useMainAppProtection()
  ↓
Vérifier:
  ├─ isAuthenticated ?
  │   └─ NON → Redirection AUTH
  │
  └─ hasCompletedOnboarding ?
      ├─ NON → Redirection ONBOARDING
      └─ OUI → ✅ Accès autorisé
```

### Validation des états

```
Module System
  ├─ 1 seul module unlocked ✅
  ├─ currentModuleIndex valide (1-3) ✅
  └─ État cohérent ✅

Quest System
  ├─ Progression ≤ target ✅
  ├─ Dates de reset valides ✅
  └─ Récompenses distribuées ✅

Auth System
  ├─ Utilisateur correspond aux données ✅
  ├─ État synchronisé ✅
  └─ Pas de fuites de données ✅
```

## 📱 Interface (logique uniquement)

### FeedScreen

```
┌─────────────────────────┐
│ ALIGN                   │ Header
│ ────────────────────    │ XPBar
│ Niveau 5 | 250/300 XP   │
└─────────────────────────┘

┌─────────────────────────┐
│ MODULES                 │
│                         │
│ ┌─────────────────────┐ │
│ │ Module 1      ▶️    │ │ unlocked = jouable
│ │ +50 XP | +10⭐      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Module 2      🔒    │ │ locked = bloqué
│ │ +75 XP | +15⭐      │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Module 3      🔒    │ │ locked = bloqué
│ │ +100 XP | +20⭐     │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

### QuêtesScreen

```
┌─────────────────────────┐
│ QUÊTES QUOTIDIENNES     │
│                         │
│ ┌─────────────────────┐ │
│ │ Être actif 10 min   │ │
│ │ ████████░░ 8/10     │ │
│ │ ⭐5  ⚡50 XP        │ │
│ └─────────────────────┘ │
└─────────────────────────┘

┌─────────────────────────┐
│ QUÊTES HEBDOMADAIRES    │
│                         │
│ ┌─────────────────────┐ │
│ │ 3 séries parfaites  │ │
│ │ ████░░░░░░ 1/3      │ │
│ │ ⭐30  ⚡300 XP      │ │
│ └─────────────────────┘ │
└─────────────────────────┘

┌─────────────────────────┐
│ OBJECTIFS PERFORMANCE   │
│                         │
│ ┌─────────────────────┐ │
│ │ Atteindre niveau 6  │ │
│ │ ██████████ 5/6      │ │
│ │ ⭐50  ⚡500 XP      │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

## 🎯 Objectifs atteints

### Système de Quêtes
✅ Renforce l'habitude  
✅ Augmente la motivation  
✅ S'adapte à la progression  
✅ Ne paraît pas artificiel  

### Système de Modules
✅ Progression claire et prévisible  
✅ Déblocage motivant  
✅ Sensation d'avancement  
✅ Cycle infini avec récompenses  

### Système Auth/Redirection
✅ Aucun utilisateur perdu  
✅ Aucun onboarding sauté  
✅ Parcours fluide et automatique  
✅ Protection totale  

## 🚀 Résultat final

**3 SYSTÈMES COMPLETS ET INTÉGRÉS**

- 20 fichiers de code production-ready
- 9 fichiers de documentation
- 1 migration SQL
- API simple et claire
- Tests validés
- Performance optimisée
- Scalable et maintenable

**PRÊT POUR PRODUCTION !** 🎉

---

**Développé**: 21 janvier 2026  
**Version**: 3.0.0  
**Statut**: ✅ PRODUCTION-READY  

**Pour commencer**: Lire `START_HERE.md`
