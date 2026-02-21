# Audit Auth – Causes probables et correctifs

## A) Top 3 causes du blocage (preuves dans le code)

### 1. **getAuthState() bloquant dans le listener SIGNED_IN** (cause principale)
- **Fichier:** `src/services/authNavigation.js` (ligne ~386)
- **Preuve:** Sur `SIGNED_IN`, le callback fait `await getAuthState()`. Or `getAuthState()` (authState.js) enchaîne `getCurrentUser()` → `transferOnboardingDraftToProfile(user.id)` → `getUser(user.id)` sans aucun timeout. Si la DB ou le réseau est lent, la Promise ne se résout jamais.
- **Effet:** Le listener ne termine pas; tout code qui dépend de sa fin peut rester en attente. Surtout, aucun `redirectAfterLogin` n’est appelé tant que `getAuthState()` n’a pas répondu.

### 2. **AuthScreen : getSession() et updateOnboardingStep(0) sans timeout**
- **Fichier:** `src/screens/Onboarding/AuthScreen.js` (lignes 112–124)
- **Preuve:** Après `signUp()`, on fait `await supabase.auth.getSession()` puis `await updateOnboardingStep(0)`. `updateOnboardingStep` appelle `getAuthState()` (authState.js), qui peut pendre (voir cause 1). Tant que ces deux appels ne sont pas résolus, on n’appelle pas `onNext()` et le `finally` n’est pas atteint pour un autre flow possible.
- **Effet:** Le spinner de l’écran Auth reste affiché (loading infini) car on n’atteint jamais `onNext(result.user.id, email)` si l’un de ces appels pend.

### 3. **RPC check_email_exists lent / timeout 5s**
- **Fichier:** `src/services/auth.js` (lignes 19–35)
- **Preuve:** `Promise.race` avec 5000 ms. En cas de timeout on log et on continue, mais 5 s est long; si la RPC est lente, l’utilisateur attend avant même le `signUp()`. Pas de blocage direct du loading après SIGNED_IN, mais contribue à l’impression de lenteur et à des états intermédiaires longs.
- **Effet:** Délai perçu au début du signup; en cas d’erreur ailleurs, risque de confusion (attente RPC + attente getSession/updateOnboardingStep).

---

## B) Correctifs appliqués (patchs)

- **auth.js:** RPC timeout 2000 ms, log structuré `AUTH_WARN_RPC_TIMEOUT`.
- **authState.js:** `getAuthState()` avec timeout global 6 s (Promise.race); en cas de timeout, retour d’un état safe (signedIn, onboarding non complété) pour débloquer la navigation.
- **AuthScreen:** `getSession()` avec timeout 3 s; appel de `onNext()` dès qu’on a `result.user` et une session; `updateOnboardingStep(0)` en fire-and-forget (non bloquant).
- **authNavigation.js:** Dans le cas `SIGNED_IN`, `getAuthState()` avec timeout 5 s; si timeout, considérer onboarding incomplet et ne pas bloquer la redirection; logs structurés (phase, requestId, durationMs, authStatus, onboardingStatus).
- **Watchdog:** Dans AuthScreen, si loading reste true plus de 8 s après le début de la requête, log + force `setLoading(false)` et message d’erreur « Réessaie ».

---

## C) Plan de test manuel (5 cas + attendu)

| # | Cas | Étapes | Attendu |
|---|-----|--------|--------|
| 1 | Signup nouveau compte | Welcome → Choice → Onboarding → AuthScreen, remplir email/mdp, valider | Sous 5 s : loading s’arrête, passage à l’écran UserInfo (étape 2). Pas de loading infini. |
| 2 | Signup email déjà pris | Même parcours, email déjà enregistré | Message « Un compte existe déjà avec cet email. Connecte-toi. », loading s’arrête. |
| 3 | Connexion existant | Welcome → … → Login, email/mdp valides | Redirection vers Main/Feed ou Onboarding selon onboarding_completed. Pas de blocage. |
| 4 | Réseau lent (throttling) | Signup avec réseau lent | Soit succès dans 8–10 s, soit timeout avec message « Réessaie » et loading qui s’arrête (watchdog). |
| 5 | Rechargement app déjà connecté | Fermer/rouvrir l’app avec session valide | Affichage Welcome puis redirection vers Main ou Onboarding selon état, sans écran blanc prolongé. |

---

## D) Watchdog anti–loading infini

- **Où:** `src/screens/Onboarding/AuthScreen.js`
- **Comportement:** Au début de `handleSubmit`, on enregistre `const submitStartedAt = Date.now()`. Un `setTimeout` de 8000 ms appelle une fonction qui, si `loading` est encore true et `activeReqRef.current === requestId`, force `setLoading(false)`, log structuré `AUTH_WATCHDOG_LOADING_TIMEOUT`, et affiche un message « L’opération a pris trop de temps. Réessaie. »
- **Nettoyage:** Le timer est annulé dans le `finally` de la requête pour ne pas déclencher après une réponse normale.
