# Étapes de reproduction — Tutoriel Home (1 seule fois)

Ce document permet de **vérifier** et **corriger** le bug du tutoriel qui ne s'affiche qu'une fois à la première arrivée sur Home après l'onboarding.

---

## Comportement attendu

| Scénario | Attendu |
|----------|--------|
| **A — Nouvel utilisateur** | Après fin d'onboarding, première arrivée sur Home → le tutoriel (flou + étapes + Suivant) s'affiche **une fois**. Puis lancer un module, finir, revenir sur Home → le tutoriel **ne se relance pas**. |
| **B — Utilisateur existant** | Relancer l'app ou se reconnecter → aller sur Home → le tutoriel **ne s'affiche pas**. |
| **Révoir le tutoriel** | Paramètres → « Révoir le tutoriel » → le tutoriel s'affiche (bypass). Ensuite retours normaux sur Home → pas de relance automatique. |

---

## Étapes de reproduction (à exécuter pour valider)

### Scénario A — Nouvel utilisateur

1. **Réinitialiser le flag** (pour simuler un nouveau compte) :
   - En dev : dans la console ou via une action temporaire, exécuter :
     ```js
     AsyncStorage.removeItem('@align_home_tutorial_seen_<USER_ID>');
     AsyncStorage.removeItem('guidedTourDone');
     ```
   - Ou créer un **nouveau compte** (email non utilisé).

2. **Finir l'onboarding** jusqu'à l'arrivée sur l'écran **Home** (Feed).

3. **Vérifier** : le tutoriel (overlay flouté + message + bouton Suivant) s'affiche automatiquement.

4. **Cliquer** « Suivant » jusqu'à la fin, puis « Lancer le premier module » (ou fermer le tutoriel si l’UI le permet).

5. **Finir le module** (ou revenir à l’accueil sans finir).

6. **Revenir sur Home**.

7. **Vérifier** : le tutoriel **ne se relance pas**.

### Scénario B — Utilisateur existant

1. **Fermer l’app** complètement (ou se déconnecter puis se reconnecter avec le même compte).

2. **Rouvrir l’app** et aller sur **Home**.

3. **Vérifier** : le tutoriel **ne s’affiche pas**.

---

## Diagnostic en console

Lors de l’arrivée sur Home, des logs préfixés `[HomeTutorial]` doivent apparaître :

- **`[HomeTutorial] gate check`** : `loading`, `progress`, `isAuthenticated`, `hasCompletedOnboarding`, `onboardingStep`, `homeTutorialSeen`, `showTutorial`, `alreadyTriggered`.
- **`[HomeTutorial] DECISION:`** : `show` ou `skip`.

Interprétation rapide :

- Si le tutoriel **ne s’affiche pas** alors qu’il devrait (nouveau user) :
  - `loading: true` ou `progress: false` → le gate s’exécute trop tôt ; attendre que le contenu Home soit prêt.
  - `hasCompletedOnboarding: false` → auth considère l’onboarding non complété ; vérifier la fin d’onboarding et le flux auth.
  - `homeTutorialSeen: true` → le flag a été mis à `true` trop tôt (ex. pendant l’onboarding) ; le flag ne doit être mis à `true` **que** quand le tutoriel démarre réellement sur Home (voir code : `useEffect` qui dépend de `tourVisible`).
  - `alreadyTriggered: true` → normal après un premier affichage dans la même session ; en relançant l’app, ce ref est remis à `false`.

- Si le tutoriel **s’affiche** alors qu’il ne devrait pas (user existant) :
  - `homeTutorialSeen: false` → la clé AsyncStorage `@align_home_tutorial_seen_<userId>` n’est pas lue ou pas écrite ; vérifier que le `userId` est le même et que la persistance se fait bien au premier affichage.

---

## Où est la logique dans le code

- **Fichier** : `src/screens/Feed/index.js`
- **Flag persistant** : `HOME_TUTORIAL_SEEN_KEY(userId)` → `@align_home_tutorial_seen_<userId>`
- **Décision d’affichage** : fonction locale `runTutorialGate()` (pas de `useCallback` pour éviter les closures figées).
- **Déclenchement** :
  - `useEffect([loading, progress])` : quand `loading === false` et `progress` existe, appelle `runTutorialGate()`.
  - `useFocusEffect(() => runTutorialGate())` : au focus de l’écran (ex. retour depuis Paramètres avec « Révoir le tutoriel »).
- **Mise à jour du flag** : dans un `useEffect` qui dépend de `tourVisible` : quand `tourVisible` passe à `true`, on écrit **une seule fois** `home_tutorial_seen` pour l’utilisateur (avec guard `hasMarkedSeenRef`). Ne jamais écrire ce flag pendant l’onboarding ni avant le premier affichage du tutoriel sur Home.

---

## Checklist de correction si le bug persiste

1. **Le gate ne s’exécute pas**  
   Vérifier que `useEffect([loading, progress])` appelle bien `runTutorialGate()` quand Home est affiché (loading false, progress non null). Vérifier les logs `[HomeTutorial] gate check` au moment de l’arrivée sur Home.

2. **Le flag est mis à `true` trop tôt**  
   S’assurer que `home_tutorial_seen` n’est écrit **que** dans le `useEffect([tourVisible])` quand le tutoriel est réellement affiché (pas dans le gate, pas pendant l’onboarding).

3. **Auth / onboarding**  
   Dans `runTutorialGate()`, `getAuthState()` est appelé à chaque passage ; vérifier que `hasCompletedOnboarding` est bien `true` après la fin de l’onboarding pour l’utilisateur courant.

4. **Double déclenchement en dev**  
   `alreadyTriggeredRef` est mis à `true` uniquement quand on décide d’afficher le tutoriel ; il évite les doubles appels dans la même session. Il est remis à `false` au démontage du composant (nouvelle session).

5. **Révoir le tutoriel**  
   Le bouton « Révoir le tutoriel » (Paramètres) navigue avec `forceTour: true` ; le gate affiche le tutoriel sans tenir compte de `home_tutorial_seen`. Ne pas effacer `home_tutorial_seen` pour ce cas : après « Révoir », les prochaines arrivées sur Home ne doivent pas réafficher le tutoriel automatiquement.

---

## Test rapide (résumé)

1. Nouveau compte → onboarding → Home → **tutoriel une fois**.
2. Module → fin → Home → **pas de tutoriel**.
3. Relance app → Home → **pas de tutoriel**.
4. Console : **`[HomeTutorial] gate check`** et **`[HomeTutorial] DECISION`** à chaque arrivée sur Home pour diagnostiquer.
