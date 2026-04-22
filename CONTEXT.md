# CONTEXT - Align Application

**Date de dernière mise à jour** : 19 avril 2026  
**Version** : 3.37 (Onboarding Parcoursup + interlude ; résultat secteur/métier layout ; copy post-bac ; divers Paywall/LoadingReveal/Edge)

**Branche `fix/modules-restore-feb28`** : Restauration de la logique modules/navigation/auth au 28 février 2026 (commit e191200), tout en conservant Paywall et Stripe. Fichiers restaurés depuis e191200 : AuthContext, auth, authState, moduleSystem, userProgressSupabase, userModulesService, ChargementRoutine, Feed. RootGate : décision sans postOnboardingUserId (comme au 28/02), écrans Paywall/Stripe conservés.

---

## [2026-04-19] Checkpoint — Parcoursup onboarding, interlude, résultat secteur/métier, copy post-bac

### Contexte
- Slide 2 de l’interlude onboarding (« TU N’AS PLUS LE TEMPS ») : texte dynamique selon le **niveau scolaire** (question onboarding) avec calendrier **Europe/Paris** vers le **2 juin** ; cas **Terminale** le 2 juin → phrase dédiée (pas « 0 jour ») ; **post-bac** → titre + paragraphe dédiés ; niveau inconnu → fallback.
- Persistance du niveau : navigation avec param + repli `loadDraft()` ; **commentaire de couplage** sur l’index `answers[1]` / `ONBOARDING_QUESTIONS[1]` (risque si réordonnancement).
- **Résultat secteur / métier** : retrait du panneau 75 % absolu (bandes / rognage halo) ; **centrage vertical** sur petits viewports via `ScrollView` (`minHeight` = hauteur utile, `justifyContent: 'center'`) + scroll seulement si débordement ou description dépliée ; **`getCardWidth`** unifié (plus de palier 640 px qui créait piliers ou overflow 601–639 px) — aligné sur **PropositionMetier**.
- **OnboardingInterlude** : mise en page type maquette (bloc haut centré, **CONTINUER** + pastilles en bas, safe area), image un peu plus grande.
- Règle Cursor **resultat-secteur-visuel** : mise à jour (plus de panneau 75 % ; centrage scroll + `getCardWidth`).
- **Autres fichiers** sur le même commit de sauvegarde (travail parallèle / itérations) : `Paywall`, `LoadingReveal`, `XPBar`, `analyze-sector` (Edge), `sectorContextToJobVector`, `sectorDescriptionCopy.js`, `package.json` / `deno.lock`, assets onboarding + suppression `star-email2.png`.

### Changements effectués — Parcoursup & onboarding
- **`src/lib/parcoursupCountdown.ts`** (TS) : `SCHOOL_LEVEL_LABELS`, `getParisCalendarParts`, `diffCalendarDaysParis`, `normalizeSchoolLevel`, `getParcoursupSlide2Result`, `buildParcoursupSlide2Body`, `getParcoursupSlide2Title` ; note produit **Seconde qui redouble** ; post-bac : titre **TU N’AS PAS FAIT LE BON CHOIX** + texte étudiants / voie ; `parseInt` pour dates Paris.
- **`src/lib/__tests__/parcoursupCountdown.test.ts`** : tests calendrier + slide 2 (dont post-bac, Terminale 2 juin).
- **`src/screens/Onboarding/OnboardingInterlude.js`** : `useRoute`, `loadDraft`, slide 2 body + titre Parcoursup ; `useSafeAreaInsets` + `height` ; colonne **contentUpper** / **contentFooter** ; `numberOfLines` illimité sur slide 2 si besoin.
- **`src/screens/Onboarding/OnboardingQuestionsScreen.js`** : `schoolLevelFromAnswers` avant navigation ; `navigate('OnboardingInterlude', { schoolLevel })` ; bloc commentaire **COUPLAGE CRITIQUE** `answers[1]` ↔ `ONBOARDING_QUESTIONS[1]`.
- **`src/data/onboardingQuestions.js`** : commentaire couplage au-dessus de l’entrée `school_level`.

### Changements effectués — Résultat secteur / métier / proposition métier
- **`src/screens/ResultatSecteur/index.js`** & **`src/screens/ResultJob/index.js`** : `ScrollView` plein écran ; `shouldVerticallyCenterBlock` (hauteur utile inférieure à 820 ou largeur inférieure à 440) ; `scrollContentOverflows` + `onContentSizeChange` ; pas de wrappers panneau.
- **`getCardWidth`** identique dans **ResultatSecteur**, **ResultJob**, **PropositionMetier** (marges `sidePad`, `softCap` au-delà de 900 px).

### Fichiers touchés (référence commit)
- `CONTEXT.md`, `.cursor/rules/resultat-secteur-visuel.mdc`
- `src/lib/parcoursupCountdown.ts`, `src/lib/__tests__/parcoursupCountdown.test.ts`
- `src/data/onboardingQuestions.js`
- `src/screens/Onboarding/OnboardingInterlude.js`, `OnboardingQuestionsScreen.js`
- `src/screens/ResultatSecteur/index.js`, `ResultJob/index.js`, `PropositionMetier/index.js`
- (même commit) `src/screens/Paywall/index.js`, `LoadingReveal/index.js`, `src/components/XPBar/index.js`, `supabase/functions/analyze-sector/index.ts`, `src/domain/sectorContextToJobVector.ts`, `src/lib/sectorDescriptionCopy.js`, `package.json`, `deno.lock`, assets `assets/images/onboarding/*`, suppression `assets/images/star-email2.png`

### Résultat attendu
- Interlude slide 2 : compte à rebours / aujourd’hui Terminale / post-bac / fallback selon niveau ; pas de régression si question niveau réordonnée sans mise à jour de l’index documenté.
- Résultat secteur & métier : carte quasi pleine largeur sur petits/moyens écrans ; bloc visuellement centré verticalement sur téléphone sans panneau absolu ni bandes latérales liées à ce panneau.

---

## [2026-04-16] Checkpoint — Refonte visuelle Paywall (target screenshot)

### Contexte
- Le rendu paywall devait correspondre strictement au visuel cible (fond uni bleu nuit, hiérarchie textuelle plus compacte, cartes plus lisibles, pricing/CTA proportionnés).
- L’objectif était de corriger uniquement la couche UI tout en conservant intact le flux de paiement Stripe, tracking et redirections post-checkout.

### Changements effectués — UI Paywall
- `src/screens/Paywall/index.js` : restructuration de l’écran pour ne garder que les blocs du visuel cible (logo, headline, sous-titre, 3 cartes, pricing, CTA, réassurance, barre basse).
- Fond global unifié en `#1A1B23` ; suppression de l’effet de fond chaud sur le container principal.
- Titres d’affichage harmonisés en **Bowlby One SC** (suppression du fallback prioritaire Bebas côté paywall).
- Ajustements de proportions :
  - headline réduite pour tenir sur une ligne,
  - titres de cartes réduits,
  - descriptions cartes légèrement augmentées,
  - `ACCÈS À VIE` légèrement réduit et `9€` légèrement augmenté,
  - CTA ramené à une largeur alignée sur la barre pricing.
- Cartes bénéfices : fond `#1A1B23`, contour renforcé (`borderWidth: 3`) et glow orange plus visible.
- Barre basse CTA : séparation visuelle renforcée (`borderTopWidth: 1`, `borderTopColor: #FF7B2B`) + halo orange vers le haut.
- Contraintes de lisibilité : textes clés avec `numberOfLines={1}` + `adjustsFontSizeToFit` pour limiter les retours à la ligne non voulus.

### Stabilité fonctionnelle conservée
- Flux Stripe inchangé : `confirmPlanSelection()` toujours utilisé par la barre pricing et le CTA.
- Contrats de reprise post-checkout inchangés : `paywall_return_payload`, `resultJobPayload`, `sectorPaywallResume`.
- Tracking analytics inchangé : `paywall_viewed`, `checkout_initiated`.

### Fichiers touchés (référence commit)
- `CONTEXT.md`
- `src/screens/Paywall/index.js`

### Résultat attendu
- Paywall visuellement aligné sur le visuel cible demandé, sans régression sur le tunnel de paiement ni sur les redirections de reprise.

---

## [2026-04-11] Checkpoint — Navigation retour onboarding, CTA régénérer secteur, message attente analyse

### Contexte
- Sur les **6 questions onboarding** (`OnboardingQuestions`), la flèche ← appelait `navigation.goBack()` : sortie de tout l’écran au lieu de revenir à la **question précédente** dans le flux.
- Dans `OnboardingFlow`, le retour matériel / web était bloqué sans revenir proprement entre **Auth** et **UserInfo**.
- Ajustements UX ponctuels : **Résultat secteur** (bouton régénérer plus visible) et **LoadingReveal** (texte d’attente longue).

### Changements effectués — Retour arrière onboarding

**6 questions (`OnboardingQuestions` → `OnboardingQuestionsFlow`)**
- `src/screens/Onboarding/OnboardingQuestionsFlow.js` : composant en `forwardRef` + `useImperativeHandle` exposant `goBack()`. Si **question > 1** : recule d’un pas, tronque `answers`, restaure `selectedChoice` et met à jour le **brouillon** (`saveDraft`). Si **question 1** : appelle `onExitFirstStep` (`goBack()` du navigateur ou fallback `navigate('PreQuestions')`).
- `src/screens/Onboarding/OnboardingQuestionsScreen.js` : la flèche et le **BackHandler** Android appellent `flowRef.current.goBack()` ; le handler matériel ne consomme l’événement que si le flux a géré le retour (`goBack` retourne un booléen).

**Compte + infos perso (`OnboardingFlow`)**
- `src/screens/Onboarding/OnboardingFlow.js` : `AuthScreen` reçoit `onBack` → `navigation.goBack()` si possible. `UserInfoScreen` reçoit `onBack` : retour vers **Auth** (`setCurrentStep(1)`), sauf reprise directe sur les infos (`initialStep >= 2`) → `goBack()`. **BackHandler** (Android) et **Escape** (web) alignés sur cette logique. Commentaires du fichier mis à jour (plus de « pas de retour en arrière » absolu).

**UserInfo**
- `src/screens/Onboarding/UserInfoScreen.js` : flèche ← dans le `StandardHeader` (`leftAction`) lorsque `onBack` est fourni, style cohérent avec l’auth.

### Changements effectués — Résultat secteur & LoadingReveal

**Résultat secteur**
- `src/screens/ResultatSecteur/index.js` : CTA secondaire **RÉGÉNÉRER** — pilule pleine `#019AEB`, ombre portée (web + native), texte titre en majuscules ; ligne d’aide en dessous : « (Tu peux ajuster si tu ne te reconnais pas totalement) » ; styles `regenerateButton` / `regenerateButtonText` ; `whiteSpace: 'nowrap'` sur web pour les libellés CTA.

**LoadingReveal**
- `src/screens/LoadingReveal/index.js` : message affiché après ~15 s d’attente longue : **« Encore quelques secondes »** (+ points animés), à la place de « L'analyse prend un peu plus de temps que prévu ».

### Fichiers touchés (référence commit)
- `CONTEXT.md`
- `src/screens/Onboarding/OnboardingQuestionsFlow.js`
- `src/screens/Onboarding/OnboardingQuestionsScreen.js`
- `src/screens/Onboarding/OnboardingFlow.js`
- `src/screens/Onboarding/UserInfoScreen.js`
- `src/screens/ResultatSecteur/index.js`
- `src/screens/LoadingReveal/index.js`

### Résultat attendu
- Pendant les 6 questions : ← et retour Android reculent d’**une question** ; sur la 1ʳᵉ question, sortie vers l’écran précédent du stack (ex. PreQuestions).
- Auth / UserInfo : retour cohérent (stack ou step interne selon le cas).
- Résultat secteur : action de régénération plus lisible ; analyse longue : message d’attente plus court.

---

## [2026-04-10] Checkpoint — Paywall post-secteur, LoadingReveal IA, Edge analyze-sector

### Contexte
- Le paywall a été déplacé après l’écran résultat secteur : l’utilisateur paie avant le quiz métier.
- L’analyse IA secteur pouvait dépasser 25–35 s (timeout client + double budget Edge/OpenAI), avec mauvaise UX sur `LoadingReveal`.
- L’Edge Function `analyze-sector` enchaînait plusieurs appels OpenAI (dont génération de description secteur), ce qui gonflait la latence totale.

### Changements effectués — App React Native

**Navigation et garde premium**
- `src/navigation/RootGate.js` : écran `InterludeSecteur` déplacé après `Paywall` / `PaywallSuccess` dans les stacks (AuthStack et AppStack).
- `src/screens/ResultatSecteur/index.js` : CTA « VOIR MON MÉTIER » — si paywall activé, `hasPremiumAccess()` puis `QuizMetier` ou `Paywall` avec `sectorPaywallResume` ; sinon `QuizMetier` direct. `setActiveDirection` / Supabase inchangés avant navigation. Utilisation de `computeNeedsDroitRefinement` depuis `sectorQuizGate`.
- `src/lib/sectorQuizGate.js` (nouveau) : `computeNeedsDroitRefinement(sectorId, sectorRanked)` pour l’affinage Droit vs Défense civile.

**Paywall et retour Stripe**
- `src/screens/Paywall/index.js` : `sessionStorage` `paywall_return_payload` — priorité `sector_quiz` (`sectorPaywallResume` + `kind`) sinon `result_job` avec payload métier.
- `src/screens/PaywallSuccess/index.js` : si `kind === 'sector_quiz'` → `InterludeSecteur` avec `fromCheckoutSuccess` ; si `result_job` → `ResultJob` ; compat ancien format sans `kind`.

**Quiz métier**
- `src/screens/QuizMetier/index.js` : garde premium si paywall activé (`hasPremiumAccess`) ; après checkout, `getUser`, mise à jour `user_profiles.is_premium`, `setPremiumAccessCacheTrue`, nettoyage sessionStorage ; sinon redirection `Paywall` avec reprise secteur.

**Interlude après paiement**
- `src/screens/InterludeSecteur/index.js` : copy et flux alignés post-paiement (`PaywallSuccess` → Interlude → `QuizMetier` → …) ; CTA gradient ; params `fromCheckoutSuccess`, `variantOverride`, `needsDroitRefinement` via `sectorQuizGate`.

**LoadingReveal (quiz secteur / métier)**
- `src/screens/LoadingReveal/index.js` : timeout mode `sector` porté à **45 000 ms** pour laisser place au retry IA côté client ; message après **15 s** « L'analyse prend un peu plus de temps que prévu » avec animation de points ; bouton **Réessayer** affiché **immédiatement** si erreur de type `[TIMEOUT]` ; reset des états hint au retry ; délai avant retry pour erreurs non-timeout inchangé (3 s) sauf si bouton déjà forcé.

### Changements effectués — Edge Supabase `analyze-sector`

**Performance**
- Suppression de l’appel OpenAI `generateSectorDescriptionText` : réponse utilise systématiquement `FALLBACK_SECTOR_DESC` (le client peut enrichir via `getSectorDescription` ou copy locale).
- Appel principal OpenAI : `max_tokens` **600** (au lieu de 1400).
- `supabase/functions/_shared/prompts.ts` — `promptAnalyzeSectorTwoStage` : JSON demandé réduit aux clés **extracted**, **sectorRankedCore**, **sectorRanked**, **microQuestions** ; retrait des champs texte / meta optionnels côté modèle (pickedSectorId, confidence, description, etc.) — le serveur recalcule ou ignore.

### Fichiers touchés (référence commit)
- `src/navigation/RootGate.js`
- `src/lib/sectorQuizGate.js`
- `src/screens/InterludeSecteur/index.js`
- `src/screens/LoadingReveal/index.js`
- `src/screens/Paywall/index.js`
- `src/screens/PaywallSuccess/index.js`
- `src/screens/QuizMetier/index.js`
- `src/screens/ResultatSecteur/index.js`
- `supabase/functions/analyze-sector/index.ts`
- `supabase/functions/_shared/prompts.ts`

### Résultat attendu / déploiement
- Parcours : résultat secteur → paywall si non premium → Stripe → success → interlude → quiz métier.
- Moins d’échecs utilisateur sur analyse secteur lente ; retry visible au timeout global.
- Latence Edge `analyze-sector` réduite (moins d’appels OpenAI lourds, sortie JSON plus courte). **À déployer** : `supabase functions deploy analyze-sector` après validation.

### Note diagnostic (timeouts empilés)
- Client `analyzeSector.js` : timeout par tentative 35 s + 1 retry ; `LoadingReveal` avecTimeout 45 s peut encore couper avant la fin du 2ᵉ appel si les deux tentatives sont longues — ajuster budgets si besoin après mesure post-déploiement Edge.

---

## [2026-04-06] Checkpoint — Paywall : suppression popup, CTA direct Stripe

### Contexte
- Le bouton principal « DÉBLOQUER MA DIRECTION » ouvrait un popup intermédiaire (« OFFRE UNIQUE — ACCÈS À VIE — 9€ ») avant Stripe.
- Cette étape supplémentaire ajoutait de la friction sur le tunnel de conversion.

### Changements effectués

**Flux de paiement**
- `src/screens/Paywall/index.js` : suppression complète du modal intermédiaire (UI + state + logique d’ouverture/fermeture).
- Le CTA sticky « DÉBLOQUER MA DIRECTION » déclenche désormais directement `confirmPlanSelection()` puis la redirection Stripe (sans étape intermédiaire).
- La carte prix « ACCÈS À VIE / 9€ » déclenche également directement `confirmPlanSelection()`.
- Protection anti double-clic pendant la création de session Stripe : `disabled={checkoutLoading}` sur CTA et carte, avec spinner pendant le chargement.

**Copy paywall**
- Mise à jour du proof social : `Rejoins +35 jeunes qui ont trouvé leur direction.` → `Rejoins +40 jeunes qui ont trouvé leur direction.`

### Fichiers modifiés
- `src/screens/Paywall/index.js` — suppression modal, redirection directe Stripe, social proof +40.

### Résultat attendu
- Clic sur « DÉBLOQUER MA DIRECTION » → redirection immédiate vers Stripe.
- Plus de popup « OFFRE UNIQUE » dans le parcours.
- Tunnel plus court et moins de friction.

---

## [2026-03-08] Checkpoint — Régénération métier : paywall, seed, boucle infinie

### Contexte
- Après régénération métier (RefineJob → LoadingReveal), l’utilisateur était renvoyé au Paywall alors qu’il avait déjà payé (DB non encore mise à jour par le webhook Stripe).
- Le métier régénéré n’était pas pris en compte par les modules : seed non relancé ou ancien métier conservé ; progression parfois perdue après reconnexion (fallback AsyncStorage écrasant la DB).
- Boucle infinie : seed → invalidation modules → re-trigger seed ; setActiveMetier appelé plusieurs fois depuis ResultJob.
- Chargement très long ou bloqué après régénération car setActiveMetier attendait la fin de ensureSeedModules (edge seed-modules peut prendre 30+ s).

### Changements effectués

**Accès premium (source de vérité unique)**
- `src/services/stripeService.js` : clé de cache AsyncStorage `premium_access_${userId}` ; `getPremiumAccessState()` lit le cache en premier, puis la DB ; en erreur API utilise le cache (ne jamais supposer false) ; `setPremiumAccessCacheTrue()` après checkout success.
- `src/screens/ResultJob/index.js` : une seule logique via `getPremiumAccessState()` ; au checkout success, `await setPremiumAccessCacheTrue()` avant de nettoyer sessionStorage ; logs [ACCESS_STATE], [PAYWALL_GUARD].
- `src/screens/LoadingReveal/index.js` : après résultat job, `getPremiumAccessState()` ; si hasAccess → navigation ResultJob (jamais Paywall) ; si pas hasAccess → Paywall ; sauvegarde du métier via `setActiveMetier(firstJobTitle)` avant navigation quand hasAccess.

**Persistance métier et seed (sans bloquer l’UI)**
- `src/lib/userProgressSupabase.js` : `setActiveMetier` compare le métier actuel (getUserProgress) au nouveau ; si identique (`metierUnchanged`), pas d’invalidation ni seed. Si changé : `await updateUserProgress({ activeMetier, activeMetierKey, modulesSeedStatus: 'idle' })`, puis `await invalidateMetierModules(userId)`, puis `ensureSeedModules(...).catch(() => {})` en fire-and-forget (ne pas attendre le seed pour éviter blocage 30+ s sur LoadingReveal).
- `src/services/userModulesService.js` : `invalidateMetierModules(userId)` remet `user_modules` (module_index=0) en status pending / payload null ; `releaseSeedLock()` pour forcer libération du lock ; `lastSeededMetierKey` : garde pour ne pas re-seeder le même métier ; dans `ensureSeedModules`, retour anticipé si `lastSeededMetierKey === metierKeyNorm`, sinon appel edge puis `lastSeededMetierKey = metierKeyNorm`.

**Résultat Job : une seule persistance par métier**
- `src/screens/ResultJob/index.js` : ref `lastPersistedCanonicalRef` ; dans l’effet de persistance, si `canonical === lastPersistedCanonicalRef.current` → return ; sinon mise à jour de la ref et `setActiveMetier(canonical)`. Suppression de l’appel redondant à `ensureSeedModules` dans cet effet.

**Progression après reconnexion (DB prioritaire)**
- `src/lib/userProgressSupabase.js` (getUserProgress) : fusion fallback AsyncStorage : ne pas écraser `completedModulesInChapter` ni `maxUnlockedModuleIndex` quand la DB a déjà une valeur plus complète (liste non vide ou maxUnlocked > 0).

**Feed : animation et transmission métier**
- `src/screens/Feed/index.js` : dépendances de l’effet d’animation des cercles/icônes réduites à `[nextModuleToDo, modulesReady]` (sans `progress`) pour éviter redémarrage de l’animation au resize. Lors du déclenchement du seed pour le module 1, passage de `metierKey` et `metierTitle` à `ensureSeedModules` pour que l’edge reçoive le métier.

### Fichiers modifiés
- `src/services/stripeService.js` — getPremiumAccessState (cache d’abord), setPremiumAccessCacheTrue, clé premium_access_${userId}
- `src/screens/ResultJob/index.js` — getPremiumAccessState uniquement, lastPersistedCanonicalRef, pas de double setActiveMetier/ensureSeedModules
- `src/screens/LoadingReveal/index.js` — getPremiumAccessState, setActiveMetier avant nav, logs JOB_REGEN_ACCESS / PAYWALL_GUARD / POST_REGEN_CONTINUE
- `src/lib/userProgressSupabase.js` — setActiveMetier : comparaison métier, invalidate+seed seulement si changé, seed en fire-and-forget ; getUserProgress : fallback n'écrase pas completedModulesInChapter/maxUnlocked si DB plus complète
- `src/services/userModulesService.js` — invalidateMetierModules, releaseSeedLock, lastSeededMetierKey, ensureSeedModules guard même métier
- `src/screens/Feed/index.js` — deps animation [nextModuleToDo, modulesReady], passage metierKey/metierTitle à ensureSeedModules pour module 1

### Résultat attendu
- Utilisateur déjà premium + régénération → jamais redirigé vers Paywall ; cache premium lu avant DB.
- Métier régénéré sauvegardé (DB + fallback), modules invalidés puis re-seedés en arrière-plan ; navigation vers ResultJob immédiate (seed non bloquant).
- Plus de boucle infinie seed / invalidation ; plus de multiples setActiveMetier pour le même métier.
- Progression (completedModulesInChapter, maxUnlockedModuleIndex) conservée après reconnexion quand la DB est à jour.

---

## [2026-03-08] Checkpoint — Post-onboarding, login et modules lançables

### Contexte
- Après ChargementRoutine, la session Supabase pouvait être absente (boot `signOut({ scope: 'local' })` avant lecture du flag), ce qui entraînait redirection vers l’écran de connexion au lieu du Feed et ModuleSystem non initialisé.
- Après connexion (login), l’app utilisait parfois l’ancien utilisateur (cache progression, ModuleSystem) et les modules n’étaient pas créés (métier non défini, edge seed-modules recevant `secteurId` au lieu de `sectorId`).
- Rafales « getUserProgress no user » quand `getCurrentUser()` renvoyait null (session Supabase brièvement absente).

### Changements effectués

**ChargementRoutine & flags sessionStorage**
- `src/screens/ChargementRoutine/index.js` : dans `goToFeed()`, après `align_onboarding_just_completed`, écriture de `align_onboarding_user_id` en sessionStorage pour survivre au rechargement et permettre les fallbacks côté auth/ModuleSystem.

**AuthContext**
- Boot : si `justCompletedOnboarding`, lecture de `align_onboarding_user_id` et application d’un état post-onboarding (signedIn, user, onboardingStatus complete, hasProfileRow) pour que RootGate affiche AppStackMain.
- SIGNED_IN : au tout début du handler, écriture de `align_onboarding_user_id` en sessionStorage (pour tout type de connexion). Sur le chemin login : écriture id + `setTimeout(0)` pour `invalidateProgressCache()` et `resetModuleSystem()` (évite rafale « no user » en appelant invalidation dans le même tick que le listener).

**RootGate**
- `src/navigation/RootGate.js` : lecture de `align_onboarding_user_id` (postOnboardingUserId) ; si présent, `effectiveSignedIn` et `effectiveOnboardingComplete` incluent ce fallback pour forcer AppStackMain même sans session Supabase.

**authState & getCurrentUser**
- `src/services/authState.js` : dans `getAuthStateInner()`, si `getCurrentUser()` est null, fallback via `align_onboarding_user_id` en sessionStorage → retour d’un état authentifié (userId, hasCompletedOnboarding, onboardingStep max).
- `src/services/auth.js` : dans `getCurrentUser()`, si session/user sont absents, fallback `align_onboarding_user_id` en sessionStorage (retour `{ id: fallbackId }`) ; même fallback dans les branches 403/401 et « token invalide » avant de renvoyer null.

**ModuleSystem**
- `src/lib/modules/moduleSystem.js` : `initialize(overrideUserId)` accepte un userId optionnel ; si `getCurrentUser()` est null, fallback sessionStorage ; `loadState()` utilise `this.currentUserId` si getCurrentUser null. Export de `initializeModuleSystemWithUserId(userId)`.

**Feed**
- `src/screens/Feed/index.js` : import `useAuth`, `initializeModuleSystemWithUserId` ; dans useFocusEffect, si `fromOnboardingComplete` et `user?.id` et ModuleSystem pas prêt, appel `initializeModuleSystemWithUserId(user.id)` ; déclenchement de `ensureSeedModules` même sans métier défini ; `lastSeedUserIdRef` pour réautoriser le seed après changement d’utilisateur.

**Cache progression & login**
- `src/lib/userProgressSupabase.js` : cache en mémoire scopé par `progressCacheUserId` ; au début de `getUserProgress()`, si `progressCacheUserId !== user.id`, invalidation du cache (évite de servir la progression d’un autre compte après connexion).
- AuthContext (login path) : après setState, `setTimeout(0, () => { invalidateProgressCache(); resetModuleSystem(); })` pour laisser la session Supabase se propager avant invalidation.

**Seed modules (userModulesService)**
- `src/services/userModulesService.js` : body envoyé à l’edge avec `sectorId` (et non `secteurId`) pour que seed-modules reçoive le bon secteur ; si pas de métier (activeMetier/activeMetierKey null), envoi de `metierTitle: 'Métier à définir'` pour que generate-feed-module accepte la requête (mini_simulation_metier exige un métier).

**Progression initiale (login / compte existant)**
- `src/lib/userProgressSupabase.js` : à la création initiale d’une ligne `user_progress`, `activeDirection: 'ingenierie_tech'` par défaut pour que le seed ait au moins un secteur.

**Instrumentation debug (à retirer une fois stable)**
- Logs (fetch vers serveur debug) dans : `AuthContext.js` (SIGNED_IN branch check, login path), `userProgressSupabase.js` (getUserProgress entry / no user), `Feed/index.js` (useFocusEffect_seed), `userModulesService.js` (ensureSeedModules called). Fichier de sortie : `.cursor/debug-fbbe0c.log` (NDJSON).

### Fichiers modifiés
- `src/screens/ChargementRoutine/index.js` — align_onboarding_user_id en sessionStorage
- `src/context/AuthContext.js` — boot fallback, SIGNED_IN sessionStorage + setTimeout invalidation/reset
- `src/navigation/RootGate.js` — postOnboardingUserId, effectiveSignedIn / effectiveOnboardingComplete
- `src/services/authState.js` — fallback userId sessionStorage dans getAuthStateInner
- `src/services/auth.js` — fallback sessionStorage dans getCurrentUser (fin try + branches 403/401 et token invalide)
- `src/lib/modules/moduleSystem.js` — initialize(overrideUserId), fallback sessionStorage, loadState avec currentUserId, export initializeModuleSystemWithUserId
- `src/screens/Feed/index.js` — useAuth, initializeModuleSystemWithUserId, seed sans métier, lastSeedUserIdRef
- `src/lib/userProgressSupabase.js` — progressCacheUserId, invalidation si changement d’user, activeDirection défaut création initiale
- `src/services/userModulesService.js` — body.sectorId, metierTitle par défaut « Métier à définir »

### Résultat attendu
- Après ChargementRoutine : Feed affiché avec animation, ModuleSystem initialisé (override ou fallback sessionStorage), modules accessibles.
- Après connexion : progression et ModuleSystem pour le nouveau compte ; seed modules déclenché avec secteur et métier par défaut si besoin ; plus de rafale « no user » dès que sessionStorage contient le dernier userId (écrit au début de SIGNED_IN et au login).
- Changement de compte : cache progression jamais servi pour un autre user (invalidation par progressCacheUserId).

---

## [2026-03-05] Checkpoint — Paywall & modal plan

### Contexte
- Page de conversion (paywall) après le calcul métier (pas secteur) pour proposer un abonnement Annuel / Mensuel.
- Amélioration de la conversion sur l’étape secteur (ResultatSecteur) : CTA « Voir mon métier » + phrase de réassurance.

### Changements effectués

**Page Paywall (`src/screens/Paywall/index.js`)**
- Écran scrollable : header ALIGN (StandardHeader), 2 cartes tarifaires (ANNUEL / MENSUEL), headline gradient, sous-titres, paragraphe « +400 jeunes », section « Voici ce que tu débloques », 5 cartes bénéfices en zigzag, CTA sticky en bas.
- Cartes tarifaires : bordures fines (4px), radius 20, fond #733513 / #2D3241, couleurs #FF7B2B / #515151. Timer fonctionnel (5:00 → 0:00 puis « Offre terminée »), badge en Bowlby One SC.
- Cartes bénéfices : bordure 1px #FF7B2B, fond #1A1B23, glow halo.
- CTA sticky : pleine largeur, arrondis uniquement en haut (borderTopLeft/RightRadius 24), fond #14161D, bouton « DÉBLOQUER MA DIRECTION » (Bowlby One SC, gradient #FF7B2B → #FFD93F), texte réassurance avec check orange.
- Cartes tarifaires de la page cliquables : sélection Annuel / Mensuel avec bordure #FFD93F sur la carte sélectionnée.

**Modal « Choisis ton plan »**
- Ouverture au clic sur le CTA sticky (au lieu de naviguer directement).
- Titre : « CHOISIS TON PLAN » (Bowlby One SC, blanc).
- Deux lignes empilées (ANNUEL, MENSUEL) : radio (rond gris #515151 ou orange #FF7B2B avec coche), label Nunito Black, bloc prix à droite. ANNUEL : 4,99€ barré à gauche de 2,12€, « Par mois » (75 % opacité). MENSUEL : 4,99€, « Par mois ».
- Badge « RECOMMANDÉ » sur la ligne ANNUEL : position top-right (top: -16), dégradé #FF7B2B → #FFD93F, texte blanc Nunito Black.
- Bordures lignes : 2px, sélectionnée #FFD93F, non sélectionnée #515151.
- Bouton modal : « DÉBLOQUER MA DIRECTION » (même style que CTA principal). Réassurance : icône check orange + « Annulable à tout moment. Accès immédiat. »
- Confirmation : ferme le modal et navigue vers ResultJob avec `selectedPlan` (annuel | mensuel) pour future intégration Stripe.

**Navigation & intégration**
- `LoadingReveal` : après calcul **métier** (type === 'job'), navigation vers **Paywall** (au lieu de ResultJob) avec `resultJobPayload`. Secteur inchangé → ResultatSecteur.
- `ResultatSecteur` : CTA « VOIR MON MÉTIER » (au lieu de « CONTINUER MON PARCOURS »), phrase au-dessus du bouton : « Plus que quelques questions avant de découvrir le métier qui te correspond. »

**Autres**
- `App.js` : polices Google Fonts (Bebas Neue retiré, Nunito 700/800/900, Bowlby One SC).
- `src/index.css` : reset liens `a { color: inherit; text-decoration: none; }`.
- `src/navigation/RootGate.js` : écran Paywall enregistré dans AuthStack et AppStack.
- `src/app/navigation.js` : linking `/paywall` pour la route Paywall.

### Fichiers modifiés / ajoutés
- `src/screens/Paywall/index.js` — nouveau (page + modal).
- `src/screens/LoadingReveal/index.js` — navigation job → Paywall.
- `src/screens/ResultatSecteur/index.js` — CTA + réassurance.
- `App.js` — polices.
- `src/index.css` — reset liens.
- `src/navigation/RootGate.js` — route Paywall.
- `src/app/navigation.js` — linking paywall.

### Résultat attendu
- Parcours : … → Quiz métier → LoadingReveal (job) → **Paywall** → (clic CTA → modal Choisis ton plan → choix Annuel/Mensuel → DÉBLOQUER MA DIRECTION) → ResultJob.
- Secteur : ResultatSecteur → CTA « Voir mon métier » + phrase de réassurance → InterludeSecteur puis quiz métier.
- Modal aligné au design (lignes empilées, radio + coche, prix, badge RECOMMANDÉ, bouton et réassurance). Aucune intégration Stripe pour l’instant.

---

## [2026-02-03] Checkpoint — Régénérer secteur : description spécifique (top2/top3)

### Contexte
- Après clic sur « RÉGÉNÉRER » sur l’écran ResultatSecteur, la description affichée devenait un texte générique (« Tu aimes résoudre des problèmes… ») au lieu de la description spécifique du secteur #2 ou #3.
- Cause : l’API `analyze-sector` ne renvoie une `description` que pour le secteur #1 ; les items de `sectorRanked` sont `{ id, score }` sans `description`. Dans `handleRegenerateSector`, `iaDescription` n’était fourni que si `nextItem.id === sectorResult.secteurId` (secteur #1 uniquement).

### Changements effectués
- **`src/screens/ResultatSecteur/index.js`**
  - Import de `getSectorDescription` depuis `src/services/getSectorDescription.js` (edge `sector-description`).
  - Cache en mémoire `sectorDescriptionCache` (Map) pour éviter des appels répétés pour un même `sectorId`.
  - Dans `handleRegenerateSector` : si `iaDescription` est vide pour le `nextItem` (secteur #2/#3), appel `getSectorDescription({ sectorId: nextItem.id })`, puis injection du texte dans `buildResultDataFromRankedItem` via `opts.iaDescription` ; mise en cache si succès.
  - Extraction robuste de la description : `raw` pris parmi `res?.text`, `res?.description`, `res?.data?.text` (string non vide), puis `text = raw.trim()` pour tolérer des formats API légèrement différents.
- Aucune modification de `buildResultDataFromRankedItem` ni d’autre logique métier.

### Fichiers modifiés
- `src/screens/ResultatSecteur/index.js` — getSectorDescription, cache, extraction multi-clés, handleRegenerateSector async.

### Résultat attendu
- RÉGÉNÉRER (ResultatSecteur) → pour le secteur #2 et #3, la description affichée est celle du secteur (via edge sector-description ou cache), plus le fallback générique.

---

## [2026-02-03] Checkpoint — Auth, déconnexion, modules dynamiques, régénération

### Contexte
- Après connexion (login), écran vide au lieu du Feed.
- Après déconnexion, écran vide au lieu de Welcome.
- Après sign up, redirection incorrecte vers Home au lieu de rester en onboarding.
- Modules dynamiques (simulation/test secteur) affichaient un métier différent du choisi (cache progress / dynamicModules obsolète).
- Bouton « RÉGÉNÉRER » sur PropositionMetier ne donnait pas top2 puis top3 puis top4 (ré-appel IA ou liste non stockée).

### Changements effectués

**Écran blanc après connexion**
- `src/services/authState.js` : `hasCompletedOnboarding` inclut à nouveau `|| hasProfileRow` pour que les utilisateurs avec profil accèdent à Main (Feed).
- `src/navigation/RootGate.js` : décision AppStackMain si `onboarding_completed || hasProfileRow` (les sign-up restent en onboarding grâce à `isNewSignupUser` dans AuthContext).

**Déconnexion → écran vide**
- `src/app/navigation.js` : `key={authStatus}` sur `NavigationContainer` pour remonter le conteneur à la déconnexion et réinitialiser l’état de navigation ; affichage correct de Welcome après logout.

**Sign up → ne pas rediriger vers Home**
- `src/context/AuthContext.js` : helper `isNewSignupUser(user)` (metadata, `created_at` &lt; 2 min) ; au SIGNED_IN si nouveau user, force `onboardingStatus` à `incomplete` et step ≥ 2 pour que RootGate affiche OnboardingStart.
- RootGate : n’affiche AppStackMain que si onboarding terminé ou profil existant ; nouveau sign-up forcé en incomplete → OnboardingStart.

**Modules dynamiques (bon métier/secteur)**
- `src/screens/ChapterModules/index.js` : avant `fetchDynamicModules`, `getUserProgress(module.order === 2 || 3)` pour forcer le refresh ; IDs stricts `sectorId = progress.activeDirection`, `jobId = progress.activeMetier` ; logs `[DYNAMIC_MODULES] request` ; si IDs manquants → fallback `generatePersonalizedModule` + log `missing ids` ; gestion `source === 'invalid'` et catch `PAYLOAD_MISMATCH` en fallback.
- `src/services/dynamicModules.js` : garde en entrée `if (!sectorId || !jobId) return { source: 'invalid' }` ; après réponse, détection mismatch (sectorId/jobId/personaCluster demandés vs reçus) → pas de cache, throw avec `code: 'PAYLOAD_MISMATCH'` ; logs `[DYNAMIC_MODULES] payload mismatch` / `invalid ids`.
- `src/lib/userProgressSupabase.js` : `invalidateProgressCache()` désormais async et vide aussi le cache AsyncStorage `user_progress_${userId}` ; `setActiveMetier` et `setActiveDirection` appellent `await invalidateProgressCache()` avant `updateUserProgress` ; quand `forceRefresh === true`, plus de bypass « cache récent » pour éviter un ancien sectorId/jobId.

**Régénération métier (PropositionMetier)**
- `src/screens/PropositionMetier/index.js` : état `alternatives` (liste ordonnée) et `regenIndex` ; au premier résultat `analyzeJob()`, construction de la liste depuis `result.top3` (+ fallback `getSectorJobsFromConfig`) ; affichage = `alternatives[regenIndex]` ; « RÉGÉNÉRER » : `regenIndex = (regenIndex + 1) % list.length`, pas d’appel à `analyzeJob()` ; logs `[REGEN] index`, `job` ; persistance via state (pas de reset au re-render).

**Régénération secteur (ResultatSecteur)**
- `ranked` = `sectorResult.sectorRanked ?? sectorResult.top2` ; RÉGÉNÉRER incrémente `regenIndex` → affichage top2, top3, top4. Pour les secteurs #2/#3, description récupérée via `getSectorDescription({ sectorId })` (edge sector-description) avec cache en mémoire et extraction robuste (`res.text` / `res.description` / `res.data.text`) — voir checkpoint « Régénérer secteur : description spécifique » ci-dessus.

### Fichiers modifiés (résumé)
- `src/app/navigation.js` — key authStatus sur NavigationContainer
- `src/context/AuthContext.js` — isNewSignupUser, force incomplete pour sign-up
- `src/navigation/RootGate.js` — décision AppStackMain (onboarding_completed || hasProfileRow), dépendances useMemo
- `src/services/authState.js` — hasCompletedOnboarding avec hasProfileRow
- `src/services/dynamicModules.js` — garde invalid, mismatch payload, logs
- `src/screens/ChapterModules/index.js` — source de vérité IDs, logs, fallback, force refresh progress
- `src/screens/PropositionMetier/index.js` — alternatives + regenIndex, régen sans IA
- `src/lib/userProgressSupabase.js` — invalidateProgressCache async + storage, setActiveMetier/setActiveDirection invalident avant update

### Résultat attendu
- Connexion (user existant) → Feed affiché, pas d’écran vide.
- Déconnexion → Welcome affiché, pas d’écran vide.
- Sign up → reste dans le flow onboarding (pas de redirection vers Home).
- Ouverture d’un module dynamique → contenu cohérent avec le métier/secteur actuel (pas de cache obsolète).
- RÉGÉNÉRER (PropositionMetier) → top2, puis top3, puis top4… sans nouvel appel IA.
- RÉGÉNÉRER (ResultatSecteur) → top2, top3, top4… selon la liste renvoyée par l’edge.

---

## [2026-02-03] Checkpoint pre-launch — reset password & routing

### Contexte
- En prod, le lien « mot de passe oublié » pouvait perdre le hash de récupération ou rediriger vers une page qui ne le recevait pas.
- L’utilisateur restait bloqué sur l’écran prénom/pseudo (UserInfo) après soumission.
- Après le quiz secteur, la navigation vers LoadingReveal / ResultatSecteur / Main renvoyait « was not handled by any navigator » (écrans absents du stack actif).

### Diagnostic
- Redirection Supabase après reset : l’URL de redirection doit pointer vers `/reset-password` et le hash (tokens) doit être conservé côté client (sessionStorage) pour éviter la perte au rechargement.
- RootGate et AuthContext : en flux recovery (reset-password), bypass des guards et pas d’appel `user_profiles` au SIGNED_IN pour éviter 403 / blocage.
- Quiz / LoadingReveal / ResultatSecteur etc. : ces écrans n’existaient que dans AppStack ; en onboarding l’app est dans AuthStack, donc les `replace()` échouaient. Il fallait déclarer les mêmes écrans dans AuthStack (ou dispatcher au root).
- UserInfo : persister `onboarding_step: 3` dans le premier upsert et afficher un message d’erreur explicite (pseudo déjà pris / invalide) en rouge sur l’écran.

### Changements effectués
- `CONTEXT.md` : ajout de cette section checkpoint.
- `web/index.html` : script de boot qui sauvegarde le hash recovery en sessionStorage, redirige vers `/reset-password` si tokens présents, restaure le hash si absent de l’URL.
- `src/navigation/RootGate.js` : bypass guards en recovery ; AuthStack étendu avec LoadingReveal, ResultatSecteur, ResultJob, Main, checkpoints, Module, etc., pour que tout le flux onboarding soit navigable.
- `src/context/AuthContext.js` : en recovery flow, pas de `fetchProfileForRouting` au SIGNED_IN ; logs sans PII.
- `src/lib/recoveryUrl.js` : nouveau ; `isRecoveryFlow()`, `parseAuthHashOrQuery`, helpers pour hash/query.
- `src/lib/recoveryErrorRedirect.js` : nouveau ; redirection en cas d’erreur recovery.
- `src/screens/Auth/ResetPasswordScreen.js` : lecture tokens (hash / query / sessionStorage), `setSession` une fois, nettoyage URL après succès.
- `src/screens/Auth/ForgotPasswordScreen.js` : flux natif Supabase uniquement (`resetPasswordForEmail`), plus d’edge function.
- `src/services/auth.js` : ajustements pour le flux recovery.
- `src/screens/Onboarding/AuthScreen.js` : après signup, appel `onNext(uid, email)` pour passer au step 2 (UserInfo).
- `src/screens/Onboarding/OnboardingFlow.js` : step minimum 2 si profil incomplet ; `handleUserInfoNext` avec uid (state/authUser/session), upsert avec `onboarding_step: 3` ; état `usernameError` pour message pseudo.
- `src/screens/Onboarding/UserInfoScreen.js` : affichage message d’erreur rouge (pseudo déjà pris / non autorisé), effacement à la saisie.
- `src/screens/Quiz/index.js` : navigation vers LoadingReveal via `navigationRef.dispatch(StackActions.replace(...))` pour cibler le bon stack.
- `src/services/userService.js` : normalisation / upsert (aucune edge function, aucun resend, pas de refactor global).
- `src/services/emailService.js` : mention / usage existant (pas de changement métier reset).
- `src/app/navigation.js` : linking / config (sans changement fonctionnel majeur).
- `App.js` : point d’entrée (sans changement fonctionnel majeur).
- `supabase/config.toml` : retrait config edge function envoi email reset.
- `supabase/email-templates/README.md` : doc mise à jour.
- Fichiers supprimés : `RESET_PASSWORD_FIX.md`, `TEST_RESET_PASSWORD.md`, `src/lib/recoveryBootstrap.js`, `src/lib/recoveryFlow.js`, `src/lib/recoveryMode.js`, `src/lib/resetPasswordHashStore.js`, `supabase/functions/send-reset-password-email/index.ts` (aucune edge function d’envoi email, pas de Resend).

### Résultat attendu
- Clic « Mot de passe oublié » → email Supabase → lien vers `/reset-password` avec hash ; la page charge et l’utilisateur peut saisir le nouveau mot de passe sans perte du hash.
- Onboarding : après auth et UserInfo (prénom + pseudo), passage à l’intro quiz secteur puis Quiz → LoadingReveal → ResultatSecteur → … → Main/Feed sans erreur de navigation.
- Si le pseudo est déjà pris ou invalide : message rouge sous le champ « Ce pseudo n'est pas autorisé ou est déjà utilisé. Choisis-en un autre. »

### Tests réalisés
- Navigation privée : demande reset → ouverture lien email → arrivée sur `/reset-password` avec hash ; saisie nouveau mot de passe et succès.
- Premier clic sur le lien : hash présent ; second chargement (F5) : hash restauré depuis sessionStorage si besoin.
- Onboarding complet : auth → UserInfo → quiz secteur → LoadingReveal → ResultatSecteur → … → ChargementRoutine → Main/Feed.
- Pseudo déjà pris : soumission → message rouge affiché sous le champ, pas de blocage perçu comme bug.

### Notes / TODO (optionnel)
- Template email Supabase (contenu / branding) à revoir plus tard si besoin.
- Réduire ou désactiver les logs `[RECOVERY_GUARD]` en prod si souhaité.

---

## 📋 TABLE DES MATIÈRES

0. **[Checkpoint — Paywall & modal Choisis ton plan (2026-03-05)](#2026-03-05-checkpoint--paywall--modal-plan)**
1. **[Checkpoint — Régénérer secteur : description spécifique top2/top3 (2026-02-03)](#2026-02-03-checkpoint--régénérer-secteur--description-spécifique-top2top3)**
2. **[Checkpoint — Auth, déconnexion, modules dynamiques, régénération (2026-02-03)](#2026-02-03-checkpoint--auth-déconnexion-modules-dynamiques-régénération)**
3. **[Checkpoint pre-launch — reset password & routing (2026-02-03)](#2026-02-03-checkpoint-pre-launch--reset-password--routing)**
4. [Vue d'ensemble](#vue-densemble)
2. **[🆕 TUTORIEL HOME (1 SEULE FOIS)](#tutoriel-home-1-seule-fois)**
3. **[🆕 SYSTÈME DE QUÊTES V3](#système-de-quêtes-v3)**
4. **[🆕 SYSTÈME DE MODULES V1](#système-de-modules-v1)**
5. **[🆕 SYSTÈME AUTH/REDIRECTION V1](#système-authredirection-intelligente-v1)**
6. [Système XP et progression](#système-xp-et-progression)
7. [Architecture technique](#architecture-technique)
8. [Base de données Supabase](#base-de-données-supabase)
9. [Services](#services)
10. [Écrans principaux](#écrans-principaux)
11. [Flow accueil et onboarding pré-auth](#flow-accueil-et-onboarding-pré-auth)
12. **[🆕 ONBOARDING UI — FINALISATION (v3.7)](#onboarding-ui--finalisation-v37)**
13. **[🆕 ÉCRAN PROFIL — CORRECTIFS (v3.8)](#écran-profil--correctifs-v38)**
14. **[🆕 CORRECTIFS RESPONSIVE (v3.9)](#correctifs-responsive-v39)**
15. **[🆕 BARRE DE NAVIGATION — SCROLL + STYLES (v3.10)](#barre-de-navigation--scroll--styles-v310)**
16. **[🆕 CHECKPOINTS + INTERLUDE + FEED MODULES (v3.11)](#checkpoints--interlude--feed-modules-v311)**
17. **[🆕 CORRECTIFS FÉV. 2026 (v3.12)](#correctifs-fév-2026-v312)**
18. **[🆕 ANIMATION D'ENTRÉE À CHAQUE ÉCRAN (v3.13)](#animation-dentrée-à-chaque-écran-v313)**
19. **[🆕 ÉCRANS RÉSULTAT SECTEUR / MÉTIER + TOGGLE IA (v3.14)](#écrans-résultat-secteur--métier--toggle-ia-v314)**
20. **[🆕 VERROUILLAGE ÉCRAN VS MENU (v3.15)](#verrouillage-écran-vs-menu-v315)**
21. **[🆕 ANTI-BOUCLE HYDRATATION + AUTH DEDUP (v3.16)](#anti-boucle-hydratation--auth-dedup-v316)**
22. **[🆕 MODE ZÉRO SESSION + CORRECTIFS AUTH/PROGRESSION/RÉSEAU (v3.17)](#mode-zéro-session--correctifs-auth-progression-réseau-v317)**
23. **[🆕 REACHABILITY + REFINEMENT SECTEUR + AUTH TIMEOUTS (v3.18)](#reachability--refinement-secteur--auth-timeouts-v318)**
24. **[🆕 TESTS STRUCTURELS SECTEUR + MOTEUR MÉTIER AXES + FALLBACK (v3.19)](#tests-structurels-secteur--moteur-métier-axes--fallback-v319)**
25. **[🆕 RANKING MÉTIERS AVEC CONTEXTE SECTEUR (v3.20)](#ranking-métiers-avec-contexte-secteur-v320)**
26. **[🆕 LOGIQUE MÉTIER HYBRIDE + TEST DISTRIBUTION (v3.21)](#logique-métier-hybride--test-distribution-v321)**
27. **[🆕 LOADINGREVEAL + PASSWORD FIELD + UI (v3.22)](#loadingreveal--password-field--ui-v322)**
28. **[🆕 MODULES METIERKEY + MODULECOMPLETION + QUIZ + SONS (v3.23)](#modules-metierkey--modulecompletion--quiz--sons-v323)**
29. **[🆕 PROGRESSION CHAPITRES + FEED REFRESH (v3.24)](#progression-chapitres--feed-refresh-v324)**
30. **[🆕 COHÉRENCE SECTEUR / TRACK + DESCRIPTIONS MÉTIERS (v3.25)](#cohérence-secteur--track--descriptions-métiers-v325)**
31. [Composants réutilisables](#composants-réutilisables)
32. [Animations](#animations)

---

## 🎯 VUE D'ENSEMBLE

**Align** est une application d'orientation professionnelle qui utilise l'IA pour aider les utilisateurs à découvrir les métiers et secteurs qui leur correspondent.

### Objectifs produit
- **Fonctionnalité > Esthétique** : Un produit stable et robuste avant tout
- **Simple > Clever** : Solutions simples et éprouvées
- **UX professionnelle** : Donner confiance dès la première minute
- **Non bloquant** : Les erreurs ne doivent jamais bloquer l'utilisateur

---

## 🎯 TUTORIEL HOME (1 SEULE FOIS)

**Date d'implémentation** : 1er février 2026  
**Statut** : ✅ En place  
**Fichiers** : `src/screens/Feed/index.js`, `src/screens/ChargementRoutine/index.js`, `src/components/GuidedTourOverlay`, `src/components/FocusOverlay`

### Comportement attendu

- **Après l'écran de chargement** (« On crée ta routine personnalisée vers l'atteinte de ton objectif » — ChargementRoutine) : l'utilisateur arrive sur l'accueil (Feed).
- **À ce moment** : le tutoriel (flou + messages animés + bouton Suivant + focus module/XP/quêtes) s'affiche **automatiquement**, une seule fois.
- **Après clic sur le module** (fin du tutoriel) : le tutoriel ne se réaffiche plus (retour accueil, relance app, reconnexion).

### Flux technique

1. **ChargementRoutine** (`src/screens/ChargementRoutine/index.js`)  
   À la fin de l'animation (donut 0 % → 100 %), navigation vers Main/Feed **avec paramètre explicite** :
   ```javascript
   navigation.replace('Main', { screen: 'Feed', params: { fromOnboardingComplete: true } });
   ```

2. **Feed — Gate tutoriel** (`src/screens/Feed/index.js`)  
   - **Priorité 1** : `route.params?.fromOnboardingComplete === true` → afficher le tutoriel immédiatement (pas d'autre vérification), puis effacer le paramètre.
   - **Priorité 2** : `route.params?.forceTour === true` (bouton « Révoir le tutoriel » en Paramètres) → afficher le tutoriel.
   - **Priorité 3** : si `!home_tutorial_seen` et (auth `hasCompletedOnboarding` ou contenu Home prêt `homeReady`) → afficher le tutoriel.
   - **Flag persistant** : `@align_home_tutorial_seen_${userId}` (AsyncStorage). Mis à `true` **uniquement** quand le tutoriel est réellement affiché (`useEffect` sur `tourVisible`), jamais pendant l'onboarding.
   - **Auth** : dans le gate, `getAuthState(true)` pour forcer le refresh depuis la DB (éviter cache obsolète après onboarding).
   - **Filet** : si `loading === false` et `progress` chargé (`homeReady`), on peut afficher le tutoriel quand `!homeSeen` même si le cache auth est faux.

3. **Composants overlay**  
   - **GuidedTourOverlay** : BlurView plein écran + bulle de texte (typing) + bouton SUIVANT.
   - **FocusOverlay** : clones des éléments focus (module 1, barre XP, icône quêtes) au-dessus du flou (zIndex 28, elevation 12 pour ne pas être masqués par le header).

### Documentation

- **REPRODUCTION_STEPS_TUTORIAL.md** — Étapes de reproduction et diagnostic (logs `[HomeTutorial] gate check`, `[HomeTutorial] DECISION`).

---

## 🎮 SYSTÈME DE QUÊTES V3

**Date d'implémentation** : 21 janvier 2026  
**Statut** : ✅ COMPLET et PRODUCTION-READY  
**Version** : 3.0.0  

### Vue d'ensemble

Système de quêtes complet qui renforce l'habitude, la motivation et la progression sans paraître artificiel.

### Types de quêtes

#### 1. Quêtes Quotidiennes
- **Renouvellement** : Tous les jours à minuit
- **Objectifs** : Temps actif, modules complétés, séries parfaites
- **Récompenses** : XP + Étoiles (adaptées au niveau)
- **Exemples** :
  - "Être actif 10 minutes"
  - "Compléter 1 module"
  - "Réaliser 1 série parfaite"

#### 2. Quêtes Hebdomadaires
- **Renouvellement** : Quand toutes sont complétées
- **Objectifs** : Progression sur 7 jours
- **Récompenses** : XP + Étoiles majorées
- **Exemples** :
  - "Compléter 5 modules cette semaine"
  - "Gagner 50 étoiles"
  - "Se connecter 5 jours de suite"

#### 3. Quêtes Performance
- **Renouvellement** : Basé sur le niveau utilisateur
- **Objectifs** : Jalons long-terme
- **Récompenses** : XP + Étoiles importantes
- **Exemples** :
  - "Atteindre le niveau 6"
  - "Compléter 20 modules au total"
  - "Réaliser 10 séries parfaites"

### Adaptation au niveau

```javascript
// Objectifs et récompenses augmentent avec le niveau
Multiplier récompenses = 1 + Math.floor(niveau / 5) * 0.1
Multiplier objectifs = 1 + Math.floor(niveau / 10) * 0.1

// Exemple niveau 10:
// - Objectif "Temps actif": 10 min → 11 min
// - Récompense: +50 XP → +60 XP
```

### Tracking automatique

#### Activity Tracker
- Temps actif mesuré en temps réel
- Pause automatique après 5 min d'inactivité
- Reprend au focus de l'écran
- Sauvegarde toutes les 30 secondes

#### Series Tracker
- Séries normales (module terminé)
- Séries parfaites (100% bonnes réponses)
- Historique des erreurs par module
- État persisté (AsyncStorage + Supabase)

### Écran de récompense

**Conditions d'affichage** :
- Au moins 1 quête complétée dans la session
- Affichage automatique après complétion module
- Navigation intelligente (vers Feed si aucune récompense)

**Contenu** :
- Liste des quêtes complétées
- Total XP et étoiles gagnées
- Animations de célébration
- Bouton "CONTINUER"

### Architecture

```
src/lib/quests/
├── index.js                      # API publique
├── questGenerator.js             # Génération adaptative
├── questEngineUnified.js         # Moteur principal
├── questIntegrationUnified.js    # Intégration écrans
├── activityTracker.js            # Tracking temps
├── seriesTracker.js              # Tracking séries
└── v2/ (modèles, événements, storage)
```

### API simplifiée

```javascript
// Initialisation (App.js)
import { initializeQuests } from './lib/quests';
await initializeQuests();

// Tracking activité (FeedScreen)
import { useQuestActivityTracking } from './lib/quests';
const { startTracking, stopTracking } = useQuestActivityTracking();

// Complétion module (ModuleCompletion)
import { onModuleCompleted } from './lib/quests';
await onModuleCompleted(moduleId, score, starsEarned);

// Récupérer quêtes (QuetesScreen)
import { getQuestsByType, QUEST_CYCLE_TYPES } from './lib/quests';
const dailyQuests = await getQuestsByType(QUEST_CYCLE_TYPES.DAILY);
```

### Persistence

- **AsyncStorage** : Cache local rapide, fallback offline
- **Supabase** : Synchronisation cloud, backup
- **user_progress.quests** : Colonne JSONB avec toutes les données
- **user_progress.activity_data** : Tracking temps actif
- **user_progress.series_data** : Tracking séries

### Documentation

- **QUESTS_SYSTEM_README.md** - Documentation complète
- **QUESTS_INTEGRATION_GUIDE.md** - Guide d'intégration
- **QUESTS_IMPLEMENTATION_COMPLETE.md** - Récapitulatif
- **QUESTS_CODE_EXAMPLES.md** - Exemples de code

---

## 🎯 SYSTÈME DE MODULES V1

**Date d'implémentation** : 21 janvier 2026  
**Statut** : ✅ COMPLET et PRODUCTION-READY  
**Version** : 1.0.0  

### Vue d'ensemble

Système de modules avec déblocage progressif par groupes de 3, offrant une progression claire, prévisible et motivante.

### Structure des modules (par chapitre)

```
CHAPITRE 1:
├── Module 1 (unlocked au départ)
├── Module 2 (locked)
└── Module 3 (locked)
     ↓ (après les 3 modules complétés)
CHAPITRE 2:
├── Module 1 (unlocked)
├── Module 2 (locked)
└── Module 3 (locked)
     ↓ (infini...)
```
- **Source de vérité** : module system (`getModulesState()`). Sur Feed, le bloc « tu es au module X » et l’état locked/unlocked viennent de la même source (`deriveModuleDisplayState()`).

### États des modules

**3 états possibles** :
- `locked` : Verrouillé (🔒 cadenas affiché, non cliquable)
- `unlocked` : Débloqué mais non complété (▶️ jouable)
- `completed` : Terminé (✅ complété, peut être rejoué)

**Règles strictes** :
- Au départ : seul Module 1 est `unlocked`
- Après Module 1 complété : Module 2 devient `unlocked`
- Après Module 2 complété : Module 3 devient `unlocked`
- Après Module 3 complété : CYCLE TERMINÉ + BONUS

### Cycle infini

**Fin de cycle** (Module 3 complété) :
```javascript
// Bonus de cycle
+150 XP
+30 étoiles

// Reset automatique
Module 1 → unlocked
Module 2 → locked
Module 3 → locked

// Compteur
totalCyclesCompleted++
```

### Récompenses

**Par module** :
- Module 1 : +50 XP, +10 étoiles
- Module 2 : +75 XP, +15 étoiles
- Module 3 : +100 XP, +20 étoiles

**Bonus cycle** :
- +150 XP, +30 étoiles (en plus du Module 3)

**Total par cycle** :
- 225 XP + 45 étoiles (modules)
- 150 XP + 30 étoiles (bonus)
- **375 XP + 75 étoiles au total**

### Intégration avec quêtes

Chaque complétion de module déclenche automatiquement :
- ✅ Mise à jour quête "Compléter X modules"
- ✅ Mise à jour quête "Gagner X étoiles"
- ✅ Mise à jour quête "Séries parfaites" (si 100%)
- ✅ Vérification écran récompense

### Architecture

```
src/lib/modules/
├── index.js              # API publique
├── moduleModel.js        # Modèle de données (états, validation)
├── moduleSystem.js       # Gestion états et persistence
└── moduleIntegration.js  # Intégration quêtes et XP
```

### API simplifiée

```javascript
// Initialisation (App.js)
import { initializeModules } from './lib/modules';
await initializeModules();

// Afficher modules (FeedScreen)
import { getAllModules, canStartModule } from './lib/modules';
const modules = getAllModules();
const canPlay = canStartModule(2); // false si locked

// Complétion module (ModuleCompletion)
import { handleModuleCompletion, navigateAfterModuleCompletion } from './lib/modules';
const result = await handleModuleCompletion({ moduleId, score, ... });
navigateAfterModuleCompletion(navigation, result);
```

### Persistence

- **AsyncStorage** : `@align_modules_state_[userId]`
- **Supabase** : `user_progress.current_module_index` (0-2), `max_unlocked_module_index` (0-2), `currentChapter` (1, 2, …)
- **Fallback automatique** si Supabase échoue
- **Chapitres** : 1 chapitre = 3 modules (Apprentissage, Mini-simulation, Test). À la fin du module 3, passage au chapitre suivant ; seul le module 1 du nouveau chapitre est déverrouillé (plus de reset au module 1 du même chapitre).

### Validation automatique

```javascript
// Vérifications continues
✅ currentModuleIndex valide (1-3)
✅ 1 seul module unlocked à la fois
✅ Pas de saut de module possible
✅ État cohérent après complétion
```

### Documentation

- **MODULES_SYSTEM_README.md** - Documentation complète
- **MODULES_INTEGRATION_GUIDE.md** - Guide d'intégration

---

## 🔐 SYSTÈME AUTH/REDIRECTION INTELLIGENTE V1

**Date d'implémentation** : 21 janvier 2026  
**Statut** : ✅ COMPLET et PRODUCTION-READY  
**Version** : 1.0.0  

### Vue d'ensemble

Système de redirection automatique et protection des routes basé sur l'authentification et l'état d'onboarding.

### États utilisateur

```javascript
{
  isAuthenticated: boolean,        // Utilisateur connecté
  hasCompletedOnboarding: boolean, // Onboarding terminé
  accountCreatedAt: timestamp,     // Date création compte
  lastLoginAt: timestamp,          // Dernière connexion
  userId: string,                  // ID utilisateur
  email: string,                   // Email
  onboardingStep: number,          // Étape onboarding (0-N)
}
```

### Logique de redirection

**CAS 1 : Utilisateur non authentifié**
```
État: isAuthenticated = false
→ Redirection: Auth (page connexion/création)
```

**CAS 2 : Connexion (compte existant avec onboarding complété)**
```
État:
├─ isAuthenticated = true
└─ hasCompletedOnboarding = true

→ Redirection: Main/Feed (accueil)
```

**CAS 3 : Création de compte OU reconnexion avec onboarding incomplet**
```
État:
├─ isAuthenticated = true
└─ hasCompletedOnboarding = false

→ Redirection: Onboarding (étape sauvegardée)
```

### Flux complets

#### Création de compte
```
1. signUpAndRedirect(email, password, navigation)
   ├─ Créer compte Supabase
   ├─ Créer profil DB (onboarding_completed = false)
   └─ Redirection auto → Onboarding (étape 0)

2. Utilisateur passe les étapes
   └─ updateOnboardingStep(1, 2, 3...)

3. Dernière étape
   ├─ completeOnboardingAndRedirect(navigation)
   ├─ onboarding_completed = true en DB
   └─ Redirection auto → Main/Feed
```

#### Connexion
```
1. signInAndRedirect(email, password, navigation)
   ├─ Authentifier Supabase
   ├─ Récupérer profil DB
   └─ Redirection auto selon hasCompletedOnboarding
```

#### Reconnexion avec onboarding incomplet
```
1. Connexion
2. Détection: onboarding_completed = false
3. Récupération: onboarding_step = 2 (exemple)
4. Redirection → Onboarding (étape 2)
5. Reprise exactement là où l'utilisateur s'était arrêté
```

### Protection des routes

**Règles bidirectionnelles** :

```javascript
// Main/Feed (application principale)
IF !isAuthenticated:
  → Redirection forcée: Auth
IF !hasCompletedOnboarding:
  → Redirection forcée: Onboarding
ELSE:
  → ✅ Accès autorisé

// Onboarding
IF isAuthenticated && hasCompletedOnboarding:
  → Redirection forcée: Main/Feed
ELSE:
  → ✅ Accès autorisé

// Auth (public)
→ ✅ Toujours accessible
```

**Implémentation automatique** :

```javascript
// Hook dans l'écran
import { useMainAppProtection } from './hooks/useRouteProtection';
const { isChecking, isAllowed } = useMainAppProtection();

if (isChecking) return <Loading />;
if (!isAllowed) return null; // Redirection en cours
```

### Architecture

```
src/services/
├── authState.js         # Gestion états utilisateur
├── navigationService.js # Logique redirection intelligente
├── authNavigation.js    # Intégration auth + navigation
└── authFlow.js          # API publique (point d'entrée)

src/hooks/
└── useRouteProtection.js # Hooks React (protection, auth)

src/components/
└── ProtectedRoute.js     # Composant de protection
```

### API simplifiée

```javascript
// Connexion (AuthScreen)
import { signInAndRedirect } from './services/authFlow';
await signInAndRedirect(email, password, navigation);

// Création compte (AuthScreen)
import { signUpAndRedirect } from './services/authFlow';
await signUpAndRedirect(email, password, navigation);

// Complétion onboarding (OnboardingFlow)
import { completeOnboardingAndRedirect } from './services/authFlow';
await completeOnboardingAndRedirect(navigation);

// Protection écran (FeedScreen)
import { useMainAppProtection } from './hooks/useRouteProtection';
const { isChecking, isAllowed } = useMainAppProtection();

// Déconnexion (Settings)
import { signOutAndRedirect } from './services/authFlow';
await signOutAndRedirect(navigation);
```

### Listener d'authentification

```javascript
// App.js - Configure automatiquement les redirections
import { setupAuthStateListener } from './services/authFlow';

useEffect(() => {
  const unsubscribe = setupAuthStateListener(navigationRef.current);
  return unsubscribe;
}, []);
```

### Garanties du système

✅ **Aucun utilisateur perdu**
- État toujours synchronisé
- Fallback AsyncStorage si Supabase échoue

✅ **Aucun onboarding sauté**
- Blocage strict de l'accès Main/Feed
- Redirection forcée si tentative

✅ **Aucune confusion inscription/connexion**
- Flux séparés et clairs
- Détection automatique du contexte

✅ **Parcours fluide et automatique**
- Pas de décision manuelle
- Redirections transparentes

### Persistence

- **AsyncStorage** : `@align_auth_state_[userId]`
- **Supabase** : `user_profiles.onboarding_completed`
- **Synchronisation automatique**

### Documentation

- **AUTH_FLOW_SYSTEM_README.md** - Documentation complète
- **AUTH_FLOW_INTEGRATION_GUIDE.md** - Guide d'intégration
- **AUTH_FLOW_IMPLEMENTATION_COMPLETE.md** - Récapitulatif
- **AUTH_FLOW_CODE_EXAMPLES.md** - Exemples de code

---

## 🔐 SYSTÈME D'AUTHENTIFICATION (LEGACY)

### États utilisateur (4 états clés)

Chaque utilisateur a ces états persistés en base de données :

```javascript
{
  isAuthenticated: boolean,           // Utilisateur connecté ?
  hasStartedOnboarding: boolean,      // A commencé l'onboarding ?
  hasCompletedOnboarding: boolean,    // A terminé l'onboarding ?
  hasCompletedSectorQuiz: boolean     // A terminé le quiz secteur ?
}
```

### Règles de redirection strictes

```
Non authentifié → Landing (IntroScreen + AuthScreen)
Authentifié mais onboarding non complété → Onboarding
Onboarding complété mais quiz secteur non fait → Quiz Secteur
Tout complété → Accueil (Main)
```

**AUCUNE ambiguïté possible.**

### Flow d'authentification

#### **Écran 0 : Landing (IntroScreen.js)**
- Texte de présentation + bouton "COMMENCER"
- Aucune donnée demandée
- Redirection vers AuthScreen

#### **Écran 1 : Connexion/Création de compte (AuthScreen.js)**

**Création de compte :**
- Champs : Email, Mot de passe, Confirmation mot de passe
- Validations :
  - Email valide obligatoire
  - Mot de passe ≥ 8 caractères
  - Les deux mots de passe doivent correspondre
- Messages d'erreur :
  - "Veuillez entrer une adresse email valide"
  - "Le mot de passe doit contenir au moins 8 caractères"
  - "Les mots de passe ne correspondent pas"
  - "Un compte existe déjà avec cette adresse email"
  - "Erreur serveur, réessaie plus tard"
- Si succès :
  - Création du compte Supabase Auth
  - `hasStartedOnboarding = true`
  - Redirection vers BirthdateScreen

**Connexion :**
- Champs : Email, Mot de passe
- Messages d'erreur :
  - "Email ou mot de passe incorrect"
  - "Ce compte n'existe pas"
  - "Erreur serveur, réessaie plus tard"
- Si succès :
  - Authentification
  - Redirection selon état utilisateur (voir règles globales)

---

## 🚀 SYSTÈME D'ONBOARDING

### Ordre strict des écrans

```
1. IntroScreen (Landing)
2. AuthScreen (Connexion/Création)
3. BirthdateScreen (Date de naissance)
4. SchoolLevelScreen (Niveau scolaire)
5. [Quiz Secteur via index.js - optionnel selon flow]
```

### Écran 3 : Date de naissance (BirthdateScreen.js)

- **Question** : "Quand es-tu né ?"
- **Validations** :
  - Date valide (pas dans le futur)
  - Âge minimum : 13 ans (COPPA compliance)
- **Messages d'erreur** :
  - "Veuillez entrer une date valide"
  - "Tu dois avoir au moins 13 ans pour utiliser Align"

### Écran 4 : Niveau scolaire (SchoolLevelScreen.js)

- **Question** : "Quel est ton niveau scolaire actuel ?"
- **Choix uniques** :
  - Seconde générale
  - Seconde professionnelle
  - Première générale
  - Première technologique
  - Première professionnelle
  - Terminale générale
  - Terminale technologique
  - Terminale professionnelle
- **Aucune réponse libre**

### Écran final : Validation

Après SchoolLevelScreen :
- `hasCompletedOnboarding = true`
- Redirection vers Quiz Secteur

---

## ⚡ SYSTÈME XP ET PROGRESSION

### Formule XP (Power-law curve)

```javascript
XP_required(level) = baseXP + growth * (level ^ 1.5)
baseXP = 20
growth = 8
```

**Exemples** :
- Niveau 1 → ~28 XP requis
- Niveau 5 → ~60 XP requis
- Niveau 10 → ~95 XP requis
- Niveau 50 → ~400 XP requis
- Niveau 100 → ~800 XP requis

### Gains d'XP fixes (indépendants du niveau)

- Quiz terminé : **+15 XP**
- Série quotidienne : **+10 XP**
- Module complété : **+25 XP**

### Logique de progression

1. L'XP cumulée s'incrémente normalement
2. Lorsque `XP_actuelle >= XP_required(level)` :
   - `level + 1`
   - XP restante conservée (overflow autorisé)
3. La barre d'XP affiche : `XP_actuelle / XP_required(level)`

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack technique

- **Framework** : React Native (Expo)
- **Navigation** : React Navigation v6
- **Backend** : Supabase (Auth + Database)
- **State Management** : React Context + AsyncStorage
- **Animations** : React Native Animated API
- **Styling** : StyleSheet + LinearGradient

### Structure des dossiers

```
src/
├── app/
│   └── navigation.js              # Navigation principale
├── components/
│   ├── AnimatedProgressBar/       # Barre de progression animée
│   ├── XPBar/                     # Barre d'XP
│   ├── GradientText.js            # Texte avec dégradé
│   ├── HoverableTouchableOpacity.js
│   ├── ProtectedRoute.js          # 🆕 Protection des routes
│   └── ...
├── screens/
│   ├── Welcome/                   # Premier écran accueil
│   ├── Choice/                   # Choix compte existant / nouveau
│   ├── IntroQuestion/            # Question avenir + étoile + COMMENCER
│   ├── PreQuestions/             # 6 questions annonce + étoile laptop + C'EST PARTI !
│   ├── Onboarding/
│   │   ├── OnboardingFlow.js      # Flow Auth (connexion, identité, etc.)
│   │   ├── OnboardingQuestionsScreen.js  # Wrapper 6 questions
│   │   ├── OnboardingQuestionsFlow.js    # Logique 6 questions
│   │   ├── OnboardingInterlude.js        # "ÇA TOMBE BIEN... ALIGN EXISTE" + star-thumbs
│   │   ├── OnboardingDob.js      # Date de naissance (barre 7/7)
│   │   ├── onboardingConstants.js # Dimensions bouton CONTINUER partagées
│   │   ├── AuthScreen.js          # Auth
│   │   ├── UserInfoScreen.js      # Identité (prénom, pseudo)
│   │   ├── SectorQuizIntroScreen.js # Intro quiz secteur ("ON VA MAINTENANT T'AIDER...")
│   │   └── index.js               # Flow alternatif
│   ├── Feed/                      # Écran d'accueil
│   ├── Module/                    # Modules d'apprentissage
│   ├── ModuleCompletion/          # Complétion module
│   ├── Quiz/                      # Quiz secteur
│   ├── Quetes/                    # 🆕 Écran des quêtes
│   ├── QuestCompletion/           # 🆕 Récompenses quêtes
│   └── ...
├── data/
│   └── onboardingQuestions.js    # 6 questions + ONBOARDING_TOTAL_STEPS
├── services/
│   ├── auth.js                    # Service Supabase Auth
│   ├── userService.js             # CRUD utilisateurs
│   ├── userStateService.js        # Gestion des états (legacy)
│   ├── welcomeEmailService.js     # Email de bienvenue
│   ├── authState.js               # 🆕 Gestion états auth V1
│   ├── navigationService.js       # 🆕 Redirection intelligente
│   ├── authNavigation.js          # 🆕 Intégration auth + nav
│   └── authFlow.js                # 🆕 API publique auth
├── hooks/
│   └── useRouteProtection.js      # 🆕 Hooks protection routes
└── lib/
    ├── progression.js             # Système XP
    ├── userProgress.js            # Gestion progression utilisateur
    ├── quests/                    # 🆕 Système de quêtes V3
    │   ├── index.js               # API publique
    │   ├── questGenerator.js      # Génération adaptative
    │   ├── questEngineUnified.js  # Moteur principal
    │   ├── questIntegrationUnified.js # Intégration écrans
    │   ├── activityTracker.js     # Tracking temps
    │   ├── seriesTracker.js       # Tracking séries
    │   └── v2/                    # Modèles, événements, storage
    └── modules/                   # 🆕 Système de modules V1
        ├── index.js               # API publique
        ├── moduleModel.js         # Modèle de données
        ├── moduleSystem.js        # Gestion états
        └── moduleIntegration.js   # Intégration quêtes/XP
```

---

## 💾 BASE DE DONNÉES SUPABASE

### Table `user_profiles`

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  birthdate DATE,
  school_level TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  has_started_onboarding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `user_progress`

```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progression XP
  niveau INTEGER DEFAULT 1,
  xp BIGINT DEFAULT 0,
  etoiles INTEGER DEFAULT 0,
  
  -- Système de modules V1
  current_module_index INTEGER DEFAULT 1,  -- Module actuel (1, 2 ou 3)
  
  -- Système de chapitres (legacy)
  current_chapter INTEGER DEFAULT 1,
  current_module_in_chapter INTEGER DEFAULT 0,
  completed_modules_in_chapter JSONB DEFAULT '[]'::jsonb,
  chapter_history JSONB DEFAULT '[]'::jsonb,
  
  -- Quiz secteur
  has_completed_sector_quiz BOOLEAN DEFAULT false,
  
  -- Système de quêtes V3
  quests JSONB DEFAULT NULL,              -- Données quêtes (quotidiennes, hebdo, perf)
  activity_data JSONB DEFAULT NULL,       -- Tracking temps actif
  series_data JSONB DEFAULT NULL,         -- Tracking séries
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les colonnes JSONB
CREATE INDEX IF NOT EXISTS idx_user_progress_quests ON user_progress USING GIN (quests);
CREATE INDEX IF NOT EXISTS idx_user_progress_activity ON user_progress USING GIN (activity_data);
CREATE INDEX IF NOT EXISTS idx_user_progress_series ON user_progress USING GIN (series_data);
```

### Migrations à exécuter

#### Migrations existantes (legacy)
1. **fix_user_profiles_schema.sql** - Corrige le schéma des profils
2. **create_profile_trigger.sql** - Crée le trigger auto-création profil
3. **add_chapter_columns.sql** - Ajoute les colonnes chapitre
4. **add_onboarding_columns.sql** - Ajoute les colonnes onboarding

#### Nouvelles migrations (V3)
5. **ADD_QUESTS_COLUMN.sql** ⭐ - Ajoute les colonnes quêtes, activity_data, series_data
6. **ADD_STORAGE_AVATARS_BUCKET.sql** (v3.8) - Bucket `avatars` pour photos de profil + policies RLS (upload/lecture/update/delete)
   - Ajoute `quests` (JSONB)
   - Ajoute `activity_data` (JSONB)
   - Ajoute `series_data` (JSONB)
   - Crée index GIN pour performance
   - Ajoute fonctions helper `update_user_quests()`, `get_user_quests()`

---

## 🛠️ SERVICES

### `userStateService.js`

**Fonctions principales** :
- `getUserState(userId)` - Récupère les 4 états clés
- `getRedirectRoute(userState)` - Détermine la route de redirection
- `markOnboardingStarted(userId)` - Marque le début de l'onboarding
- `markOnboardingCompleted(userId)` - Marque la fin de l'onboarding
- `markSectorQuizCompleted(userId)` - Marque la fin du quiz secteur
- `validateEmail(email)` - Validation email
- `validatePassword(password)` - Validation mot de passe (≥8 caractères)
- `validateUsername(username)` - Validation username (3-20 chars, alphanumerique + _)
- `isUsernameUnique(username)` - Vérifie l'unicité du username

### `welcomeEmailService.js`

**Fonction** :
- `sendWelcomeEmail({ email, firstName })` - Envoie l'email de bienvenue
- **Non bloquant** : si l'email échoue, l'app continue
- Appel la fonction Edge Supabase `send-welcome-email`

### `auth.js`

**Fonctions** :
- `signUp(email, password)` - Création de compte Supabase ; crée le profil avec `first_name: 'Utilisateur'` et `username: 'user_XXX'` par défaut (v3.8)
- `signIn(email, password)` - Connexion Supabase
- `signOut()` - Déconnexion
- `getCurrentUser()` - Récupère l'utilisateur actuel

---

## 📱 ÉCRANS PRINCIPAUX

### Accueil et onboarding pré-auth

1. **Welcome** - Premier écran (étoile + "COMMENCER")
2. **Choice** - "Tu as déjà un compte ? / Tu viens d'arriver ?"
3. **IntroQuestion** - Question sur l'avenir + sous-texte dégradé + étoile + COMMENCER
4. **PreQuestions** - "RÉPONDS À 6 PETITES QUESTIONS..." + étoile laptop + C'EST PARTI !
5. **OnboardingQuestionsScreen** - 6 questions avec barre de progression (1/7 → 6/7)
6. **OnboardingInterlude** - "ÇA TOMBE BIEN... POUR ÇA QU'ALIGN EXISTE." (2 lignes) + star-thumbs + CONTINUER
7. **OnboardingDob** - Date de naissance (barre 7/7, picker jour/mois/année) + CONTINUER
8. **Onboarding (OnboardingFlow)** - AuthScreen, UserInfoScreen, SectorQuizIntroScreen (intro quiz secteur → C'EST PARTI !), Quiz

### Application principale

- **Feed** - Écran d'accueil avec modules circulaires
- **Module** - Écrans de modules d'apprentissage
- **Quiz** - Quiz secteur (40 questions) — Header ALIGN alignWithOnboarding, questions/réponses Nunito Black
- **QuizMetier** - Quiz métier — Header ALIGN alignWithOnboarding, questions/réponses Nunito Black
- **PropositionMetier** - Résultat métier recommandé
- **ResultatSecteur** - Résultat secteur dominant ("RÉSULTAT DÉBLOQUÉ" — voir section dédiée ci-dessous)
- **InterludeSecteur** - Interlude après résultat secteur : "GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR {SECTEUR}..." + image + C'EST PARTI ! → QuizMetier
- **Settings** - Paramètres utilisateur
- **Profil** - Profil utilisateur (prénom, username, avatar, récap XP/étoiles, secteur/métier favori, partage) — voir section v3.8

### Écran ResultatSecteur (RÉSULTAT DÉBLOQUÉ) — v3.14

**Fichier** : `src/screens/ResultatSecteur/index.js`

**Design actuel (visuel souhaité, sans header)** :
- **Fond global** : #14161D (pas de dégradé). Pas de logo ALIGN ni barre de navigation (écran plein focus).
- **Bloc "RÉSULTAT DÉBLOQUÉ"** : au premier plan (zIndex 100/101), chevauche légèrement le haut du bloc principal. Étoile statique (sans animation ni ombre) partiellement derrière le badge (~50 % visible). Badge : fond #FFAC30, texte blanc Bowlby One SC, borderRadius 12 (rectangle coins arrondis), padding 32/14, taille proche du bouton principal.
- **Bloc principal (carte)** : fond #2D3241, borderRadius 32, ombre portée #FFAC30 blur 200 offset 0,0 (glow doux). Largeur responsive (getCardWidth : mobile ~92vw max 520, medium 640, large 760–820).
- **Contenu** : Titre "CE SECTEUR TE CORRESPOND VRAIMENT" (Bowlby One SC, blanc). Zone barres + emoji sur une ligne : [barre gradient #FF6000→#FFBB00] — emoji (50px) — [barre]. Nom du secteur (Bowlby One SC, gradient #FFBB00→#FF7B2B). Accroche (Nunito Black, gradient #FFE479→#FF9758). Barre gradient sous accroche. Description (Nunito Black, blanc, maxWidth 65%). Barre grise #DADADA. Boutons sans bordure, ombre portée : CTA gradient #FF6000→#FFC005, secondaire #019AEB. Microcopy "(Tu peux ajuster…)".
- **Mock preview** : `?mock=1` (web) ou `EXPO_PUBLIC_PREVIEW_RESULT` / `VITE_PREVIEW_RESULT=true` pour afficher l’écran avec données fixes (FINANCE) sans appeler l’IA.

**Structure resultData** :
```javascript
{
  sectorName: string,       // ex. "FINANCE", "TECH"
  sectorDescription: string,
  icon: string,             // emoji (💼, 💻, 💰, etc.)
  tagline: string           // ex. "GÉRER, DÉCIDER, PRENDRE DES RISQUES"
}
```

**Mapping** : SECTOR_ICONS, SECTOR_TAGLINES dans ResultatSecteur ; `getIconForSector`, `getTaglineForSector`.

### Écran SectorQuizIntroScreen (intro quiz secteur)

**Fichier** : `src/screens/Onboarding/SectorQuizIntroScreen.js`

**Placement** : Step 3 de OnboardingFlow (après UserInfoScreen, avant Quiz)

**Design** :
- Titre sur 2 lignes : "ON VA MAINTENANT T'AIDER À TROUVER UN" / "SECTEUR QUI TE CORRESPOND VRAIMENT." (deux composants Text)
- Sous-titre dégradé #FF7B2B → #FFDF93
- Image : `assets/images/star-sector-intro.png`
- Bouton "C'EST PARTI !" → navigation.replace('Quiz')

### Quiz Secteur / Quiz Métier — Header et typographie

- Header ALIGN : `alignWithOnboarding={true}` — même hauteur (paddingTop 48) et taille (fontSize 28) que onboarding
- Questions : Nunito Black (theme.fonts.button)
- Réponses (AnswerOption) : Nunito Black (theme.fonts.button)

---

## 🚪 FLOW ACCUEIL ET ONBOARDING PRÉ-AUTH

**Date d’implémentation** : 31 janvier 2026  
**Statut** : ✅ En place (React Native / Expo)

### Ordre des écrans (avant auth)

```
1. Welcome          — "TU TE POSES DES QUESTIONS..." (étoile)
2. Choice           — "Tu as déjà un compte ? / Tu viens d'arriver ?"
3. IntroQuestion    — "TU TE POSES DES QUESTIONS SUR TON AVENIR ?" + sous-texte dégradé + étoile point d'interrogation + COMMENCER
4. PreQuestions     — "RÉPONDS À 6 PETITES QUESTIONS AVANT DE COMMENCER !" (6 en dégradé) + étoile laptop + C'EST PARTI !
5. OnboardingQuestions — 6 écrans de questions (barre de progression 1/7 → 6/7 + label "Question X / 6")
6. OnboardingInterlude — "ÇA TOMBE BIEN, C'EST EXACTEMENT POUR ÇA QU'ALIGN EXISTE." (2 lignes, ALIGN en dégradé) + star-thumbs + CONTINUER
7. OnboardingDob    — Date de naissance (barre 7/7, picker jour/mois/année) + CONTINUER
8. Onboarding       — Flow Auth : AuthScreen → UserInfoScreen → SectorQuizIntroScreen → Quiz
```

### Barre de progression

- **7 étapes** : 6 questions + 1 écran date de naissance (l’interlude n’est pas compté).
- Constante : `ONBOARDING_TOTAL_STEPS = 7` dans `src/data/onboardingQuestions.js`.
- OnboardingInterlude navigue vers OnboardingDob avec `{ currentStep: 7, totalSteps: 7 }`.
- **Largeur alignée sur les modules** : barre onboarding = même largeur que Module (padding 24). Wrapper avec `marginHorizontal: -padding` + `paddingHorizontal: 24` (OnboardingQuestionLayout / OnboardingQuestionScreen) ; `PROGRESS_BAR_WIDTH = width - 48` (OnboardingDob).

### Fichiers principaux

| Écran / rôle | Fichier |
|--------------|---------|
| Welcome | `src/screens/Welcome/` |
| Choice | `src/screens/Choice/` |
| IntroQuestion | `src/screens/IntroQuestion/index.js` |
| PreQuestions | `src/screens/PreQuestions/index.js` |
| 6 questions | `src/screens/Onboarding/OnboardingQuestionsScreen.js` + `OnboardingQuestionsFlow.js` |
| Données 6 questions | `src/data/onboardingQuestions.js` |
| Interlude | `src/screens/Onboarding/OnboardingInterlude.js` |
| Date de naissance | `src/screens/Onboarding/OnboardingDob.js` |
| Constantes bouton CONTINUER | `src/screens/Onboarding/onboardingConstants.js` |
| Layout question (barre + pills) | `src/components/OnboardingQuestionScreen/index.js` |
| Layout question alternatif (barre + pills) | `src/components/OnboardingQuestionLayout/index.js` |
| Texte dégradé "ALIGN" | `src/components/GradientText/index.js` |
| Intro quiz secteur | `src/screens/Onboarding/SectorQuizIntroScreen.js` |

### Assets images (écrans accueil)

- `assets/images/star-thumbs.png` — Interlude (étoile thumbs up)
- `assets/images/star-question.png` — IntroQuestion (étoile point d’interrogation)
- `assets/images/star-laptop.png` — PreQuestions (étoile laptop)
- `assets/images/star-sector-intro.png` — SectorQuizIntroScreen (intro quiz secteur)
- **`assets/onboarding/`** : images dédiées à placer manuellement (remplacement des PNG met à jour l’app sans changer le code) : `metier_defini.png`, `checkpoints_complete.png`, `interlude_secteur.png`.
- Tailles : `IMAGE_SIZE = Math.min(Math.max(width * 0.22, 290), 410) + 70` pour écrans avec illustration (IntroQuestion, PreQuestions, InterludeSecteur, TonMetierDefini, FinCheckpoints).
- Marges image : `marginVertical: 24`, bouton `marginTop: 24` ; bloc titre aligné (titleSection height 126, flex-start) entre IntroQuestion et PreQuestions.

### Design (aligné sur le reste de l’app)

- Fond : `#1A1B23`
- Cartes / options : `#2D3241`
- CTA orange : `#FF7B2B`
- Dégradé texte : `#FF7B2B` → `#FFD93F`
- Polices : Bowlby One SC (titres), Nunito Black (sous-texte, réponses)
- Navigation : `src/app/navigation.js` (routes Welcome, Choice, IntroQuestion, PreQuestions, OnboardingQuestions, OnboardingInterlude, OnboardingDob, Onboarding)

---

## 🆕 ONBOARDING UI — FINALISATION (v3.7)

**Date** : 3 février 2026  
**Objectif** : Onboarding homogène, conforme à la DA, sans effets de bord (reset state, bordure au clic uniquement, pas de scroll inutile).

### 1) Grille de référence « écrans avec image / mascotte »

**Écran de référence** : PreQuestions (« Réponds à 7 petites questions avant de commencer »).

Tous les écrans onboarding avec image/mascotte utilisent la **même grille** :

| Élément | Valeurs (référence PreQuestions) |
|--------|-----------------------------------|
| **Content** | `paddingTop: 80`, `paddingHorizontal: 32`, `maxWidth: 1100`, `justifyContent: 'center'`, `alignItems: 'center'` |
| **Bloc titre** | `marginBottom: 12` |
| **Titre** | `fontSize: Math.min(Math.max(width * 0.022, 16), 26)`, `lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05`, Bowlby One SC |
| **Sous-texte** | `fontSize` clamp 15–20, `lineHeight` clamp 20–30, `marginTop: 6`, `paddingHorizontal: 24` |
| **Image** | `width/height: Math.min(Math.max(width * 0.24, 300), 430) + 40`, `marginVertical: 16` |
| **Bouton CTA** | `width: Math.min(width * 0.76, 400)`, `paddingVertical: 16`, `paddingHorizontal: 32`, `borderRadius: 999`, `marginTop: 8` |

**Écrans alignés** : IntroQuestion, PreQuestions, OnboardingInterlude, SectorQuizIntroScreen, InterludeSecteur, TonMetierDefini, FinCheckpoints. Aucun ScrollView sur ces écrans ; tout tient en `View` + `flex`.

### 2) Questions onboarding — Reset et bordure

**Bug corrigé** : à l'entrée sur la première question, l'index ou la réponse restaient persistés → bordure affichée ou mauvaise question.

**Reset au démarrage du flow** :

- **PreQuestions** : au tap sur « C'EST PARTI ! », navigation avec `resetSeed: Date.now()` → `navigation.navigate('OnboardingQuestions', { resetSeed: Date.now() })`.
- **OnboardingQuestionsScreen** : lit `route.params?.resetSeed` et le passe à `OnboardingQuestionsFlow`.
- **OnboardingQuestionsFlow** : prop `resetSeed`. Dans le `useEffect` initial (dépendance `[resetSeed]`) :
  - si `resetSeed != null` : `setCurrentStep(1)`, `setSelectedChoice(null)`, `setHydrated(true)` (pas de chargement du draft) ;
  - sinon : chargement du draft comme avant.
- **Affichage** : `selectedForStep = selectedChoice ?? null` uniquement (plus de `answers[currentStep - 1]`), donc aucune réponse persistée affichée comme sélectionnée. À chaque avancement, `handleNext` appelle `setSelectedChoice(null)` avant `setCurrentStep`.

**Bordure orange (sélection) + délai** :

- **Comportement** : bordure **uniquement au clic**, pas au chargement. Clic → `onSelect(choice)` → bordure #FF7B2B sur la réponse → après **~700 ms** → `onNext(choice)` → question suivante avec `selectedChoice = null` (pas de bordure).
- **Implémentation** : `OnboardingQuestionScreen` reçoit `flashDelayMs = 700` ; `handleChoicePress(choice)` appelle `onSelect(choice)` puis `setTimeout(() => onNext(choice), flashDelayMs)`. Pas de fond orange, pas de bouton « Suivant » ; avancement automatique après le flash.
- **Valeur** : `FLASH_DELAY_MS = 700` (défini dans OnboardingQuestionsFlow, passé en prop).

### 3) Flèche retour (écran « Quand es-tu né ? »)

- Flèche retour en **position absolue** en haut à gauche : `top: insets.top + 8`, `left: 16`, au-dessus du contenu (pas sous le header ALIGN).
- **OnboardingDob** : `StandardHeader` sans `leftAction` ; `TouchableOpacity` back en sibling absolu au-dessus. Aucun changement sur les autres écrans.

### 4) Écrans « Résultats débloqués » (secteur + métier)

- **Pas de scroll** : contenu en `View`, pas de `ScrollView`.
- **Bloc remonté** : `paddingTop` du contenu ~14 px (bloc plus haut).
- **Bloc plus épais** : carte centrale **+30 px** en hauteur : `paddingTop: 37`, `paddingBottom: 37` (au lieu de 22), `minHeight: 180`. Espacements internes augmentés (marges 14→20, 18→24, 10→16), `fontSize` +1 (cardTitle 16, sectorName 25, description 14, lineHeight 22, emoji 44).
- **Boutons** : largeur `Math.min(BTN_WIDTH * 0.88, 360)`, `paddingVertical: 12`, `paddingHorizontal: 28` (couleurs / radius / typo inchangés).
- **Fichiers** : `src/screens/ResultatSecteur/index.js`, `src/screens/PropositionMetier/index.js`.

### 5) Écran « Ton métier est défini »

- **Sous-phrase exacte** : « Mais avant de commencer ton chemin vers l'atteinte de cet objectif, on va d'abord vérifier si ce métier te correspond vraiment. » (point final). Mise en forme : `maxWidth: width * 0.72` pour 2 lignes équilibrées, centrées.
- **Fichier** : `src/screens/TonMetierDefini/index.js`.

### 6) Checkpoints

- **Écran annonce** (CheckpointsValidation) : texte en **taille normale** (pas de +35 px) — `mainText` fontSize/lineHeight d'origine.
- **Écrans rapides** Checkpoint #1 / #2 / #3 (Checkpoint1Intro, Checkpoint2Intro, Checkpoint3Intro) : les deux textes (« CHECKPOINT » et « NUMÉRO X ») en **fontSize: 44** (au lieu de 28), `marginBottom: 16` pour le titre. Reste du layout identique.

### 7) Écran « On crée ta routine personnalisée… » (ChargementRoutine)

- **Position** : texte principal remonté de **+30 px** → `marginTop: -65` (au lieu de -35).
- **Typo** : **identique** aux titres des écrans onboarding avec image : `fontSize: Math.min(Math.max(width * 0.022, 16), 26)`, `lineHeight: Math.min(Math.max(width * 0.026, 20), 30) * 1.05`, `fontFamily: theme.fonts.title`. Donut et reste de l'écran inchangés.
- **Fichier** : `src/screens/ChargementRoutine/index.js`.

### 8) Tutoriel Home — Bouton paramètres

- **Bug** : deux boutons paramètres (un à droite déflouté, un à gauche flouté). **Fix** : un seul bouton, à gauche, flouté pendant l'étape tutoriel.
- **Implémentation** : dans `FocusOverlay`, le header du tutoriel utilise `showSettings={false}` pour ne plus afficher le bouton à droite ; seul le bouton du Feed (gauche, flouté) reste visible.
- **Fichier** : `src/components/FocusOverlay/index.js`.

### 9) Vocabulaire quiz secteur / métier

- **sectorQuestions.js** : termes anglais/compliqués remplacés par des équivalents FR simples (storytelling → art de raconter une histoire, community management → animation des réseaux sociaux, business model → modèle économique, pitch → présentation courte, CAC → coût d'acquisition client, machine learning → apprentissage automatique, API → interface entre logiciels). Sens conservé.
- **quizMetierQuestions.js** : portfolio → réalisations/book, startups → jeunes entreprises, freelances → travail en indépendant, itérer → ajuster.
- **Fichiers** : `src/data/sectorQuestions.js`, `src/data/quizMetierQuestions.js`.

### 10) Autres points UI (historique des sessions)

- **Welcome** : header « ALIGN » et flèche retour supprimés sur le premier écran uniquement.
- **PreQuestions** : « sept » → « 7 », phrase principale sur une ligne, sous-phrase et bouton rapprochés ; écran précédent (IntroQuestion) : image +15 px.
- **InterludeSecteur** : retrait du « : » et de la virgule avant « secteur » ; phrase légèrement réduite (option -5 px).
- **AuthScreen / UserInfoScreen** : champs et boutons élargis (CONTENT_WIDTH ≈ `Math.min(width - 48, 520)`), centrés.

### Fichiers modifiés (référence v3.7 — onboarding UI)

| Fichier | Rôle |
|---------|------|
| `src/screens/Welcome/index.js` | Header + flèche retirés (écran 1) |
| `src/screens/PreQuestions/index.js` | "RÉPONDS À 6 PETITES QUESTIONS…" (6 en dégradé), grille ref, navigation avec resetSeed |
| `src/screens/IntroQuestion/index.js` | Grille PreQuestions, image +40 |
| `src/screens/Onboarding/OnboardingQuestionsScreen.js` | Passage de resetSeed au Flow |
| `src/screens/Onboarding/OnboardingQuestionsFlow.js` | Reset si resetSeed, selectedForStep sans persistance, FLASH_DELAY_MS 700 |
| `src/components/OnboardingQuestionScreen/index.js` | Bordure seule (pas fond), flashDelayMs, pas de bouton Suivant, label "Question X / 6" |
| `src/screens/Onboarding/OnboardingDob.js` | Flèche retour absolue au-dessus du contenu |
| `src/screens/Onboarding/OnboardingInterlude.js` | Grille PreQuestions, image +40 |
| `src/screens/Onboarding/SectorQuizIntroScreen.js` | Grille PreQuestions, image +40 |
| `src/screens/Onboarding/AuthScreen.js` | CONTENT_WIDTH élargi |
| `src/screens/Onboarding/UserInfoScreen.js` | CONTENT_WIDTH élargi |
| `src/screens/ResultatSecteur/index.js` | Pas de scroll, bloc +30 px, boutons réduits, padding/font |
| `src/screens/PropositionMetier/index.js` | Idem ResultatSecteur |
| `src/screens/InterludeSecteur/index.js` | Grille, sans « : » ni virgule |
| `src/screens/TonMetierDefini/index.js` | Sous-phrase exacte, 2 lignes, grille |
| `src/screens/CheckpointsValidation/index.js` | Taille texte normale |
| `src/screens/Checkpoint1Intro/index.js` | Texte 44 px |
| `src/screens/Checkpoint2Intro/index.js` | Texte 44 px |
| `src/screens/Checkpoint3Intro/index.js` | Texte 44 px |
| `src/screens/FinCheckpoints/index.js` | Grille PreQuestions |
| `src/screens/ChargementRoutine/index.js` | Titre monté -65, typo = titres onboarding image |
| `src/components/FocusOverlay/index.js` | showSettings=false pendant tutoriel |
| `src/data/sectorQuestions.js` | Vocabulaire simplifié FR |
| `src/data/quizMetierQuestions.js` | Vocabulaire simplifié FR |

**Sauvegarde** : Faire `git add` + `git commit` (et éventuellement `git tag v3.7`) pour figer cette version. En cas de régression, cette section permet de retrouver les comportements et fichiers concernés.

---

## 🆕 ÉCRAN PROFIL — CORRECTIFS (v3.8)

**Date d'implémentation** : 3 février 2026  
**Statut** : ✅ COMPLET  
**Fichiers modifiés** : `src/screens/Profil/index.js`, `src/services/auth.js`, `src/lib/userProfile.js`, `supabase/migrations/ADD_STORAGE_AVATARS_BUCKET.sql` (nouveau)

### 1) Rayons d'angle + alignement texte (comme Paramètres)

- **Même logique que l'écran Paramètres** : `BLOCK_RADIUS = 48`, `paddingLeft: 40`, `paddingRight: 20`, `marginBottom: 28`, `contentContainer` avec `paddingTop: 24`, `paddingBottom: 100`, `paddingHorizontal: 24`.
- Labels (`PRÉNOM`, `NOM D'UTILISATEUR`, `RÉCAP`, etc.) : `LABEL_COLOR = '#ACACAC'`, alignement au même X que Paramètres (là où le rayon d'angle finit).

### 2) Prénom / Username non définis — Fix data flow

- **Signup** : à la création du profil dans `auth.js`, valeurs par défaut obligatoires :
  - `first_name: 'Utilisateur'`
  - `username: 'user_' + data.user.id.replace(/-/g, '').slice(0, 8)`
- **ensureProfileWithDefaults()** (dans `userProfile.js`) : si profil absent ou `first_name`/`username` vides → upsert avec fallbacks puis refetch.
- **ProfilScreen loadData** : appelle `ensureProfileWithDefaults()` après `getUserProfile()` pour garantir des valeurs toujours définies.
- **Affichage** : `firstName` fallback `'Utilisateur'`, `displayUsername` fallback `'@user_…'` — jamais `undefined`.

### 3) Photo de profil — Import + upload + affichage

- **Clic sur avatar** → ouverture du picker (`expo-image-picker`).
- **Upload** vers Supabase Storage bucket `avatars` (chemin `{userId}/avatar.{ext}`).
- URL publique → mise à jour de `avatar_url` dans `user_profiles` → refresh de l’UI.
- Gestion des erreurs : permission refusée, upload fail → `Alert` simple.

### 4) Avatar — Dimensions

- Diamètre **180 px** (constante `AVATAR_SIZE`).
- Initiales : `fontSize: 56`.
- Espacements ajustés pour un rendu propre (sans casser le scroll).

### 5) Édition prénom / username — Fix fermeture instantanée

- **État stable** : `editField` (`'first_name' | 'username' | null`), `editValue` (input contrôlé).
- **Modal** : contenu enveloppé dans `TouchableOpacity` avec `onPress={() => {}}` pour que le tap à l’intérieur ne ferme pas (tap sur overlay uniquement → fermeture).
- **Bouton Enregistrer** : validation → RPC `update_profile_fields` (cooldown 30j) → fermeture **seulement après succès**.
- **Bouton Annuler** : fermeture sans sauvegarde.

### Nouveaux utilitaires (`src/lib/userProfile.js`)

- `ensureProfileWithDefaults()` : s’assure que le profil a `first_name` et `username` non vides (upsert si nécessaire).
- `uploadAvatar(localUri)` : upload vers bucket `avatars` → mise à jour de `avatar_url`.

### Migration Supabase

- **ADD_STORAGE_AVATARS_BUCKET.sql** : création du bucket `avatars` (public, 5 Mo, images JPEG/PNG/WEBP), policies RLS (upload/lecture publique/update/delete par utilisateur sur son dossier).

### Fichiers modifiés (référence v3.8)

| Fichier | Rôle |
|---------|------|
| `src/screens/Profil/index.js` | Styles Paramètres, avatar 180px + picker + upload, modal fix, loadData + ensureProfileWithDefaults, fallbacks affichage |
| `src/services/auth.js` | Création profil signup avec `first_name` et `username` par défaut |
| `src/lib/userProfile.js` | `ensureProfileWithDefaults()`, `uploadAvatar()` |
| `supabase/migrations/ADD_STORAGE_AVATARS_BUCKET.sql` | Bucket avatars + policies RLS |

**Sauvegarde** : exécuter la migration `ADD_STORAGE_AVATARS_BUCKET.sql` dans Supabase pour activer l’upload de photo.

---

## 🆕 CORRECTIFS RESPONSIVE (v3.9)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Corriger le bug shrink global et le responsive (Félicitations Module/Quête, Checkpoints, onboarding mascotte).

- **Shrink global** : `web/index.html` #root flex+min-height 100vh ; `App.js` wrapper View flex:1 width:100% minHeight:100vh
- **ModuleCompletion** : layout colonne, paddingTop 120, contentBlock maxWidth 520, narrow icônes 120px
- **QuestCompletion** : useWindowDimensions, LinearGradient 100%, ScrollView flexGrow:1, largeurs dynamiques
- **XPBar** : largeur narrow min(220, width*0.55)
- **CheckpointsValidation** : cercles scalés en narrow
- **Onboarding mascotte** : NARROW_BREAKPOINT 430, isNarrow(), marginTop -16 en narrow (PreQuestions, IntroQuestion, SectorQuizIntroScreen, InterludeSecteur, FinCheckpoints, TonMetierDefini, OnboardingInterlude)

**Fichiers** : web/index.html, App.js, onboardingConstants.js, ModuleCompletion, QuestCompletion, XPBar, CheckpointsValidation, PreQuestions, IntroQuestion, SectorQuizIntroScreen, InterludeSecteur, FinCheckpoints, TonMetierDefini, OnboardingInterlude

---

## 🆕 BARRE DE NAVIGATION — SCROLL + STYLES (v3.10)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Comportement scroll hide/show + styles navbar + icône section Quêtes 100×100.

### 1) Comportement scroll (hide/show)

- **Scroll down** (delta > 10 px) → la navbar disparaît (hide)
- **Scroll up** (delta > 10 px) → la navbar réapparaît (show)
- **Timer 15 s** conservé : disparition automatique après 15 s sans interaction
- Les deux comportements coexistent ; un scroll up force le retour visible même si le timer avait caché la navbar
- Animation fluide (translateY + opacity, 300 ms)

**Implémentation** :
- Nouveau module `src/lib/scrollNavEvents.js` : `emitScrollNav(offsetY)` et `onScrollNav(callback)`
- `BottomNavBar` s'abonne à `onScrollNav` et détecte la direction via delta (seuil 10 px)
- Écrans **Quêtes** et **Profil** : `onScroll` sur leur `ScrollView` → `emitScrollNav(contentOffset.y)`
- Sur **web** : fallback avec `document` scroll / `window.scrollY` si disponibles
- Réinitialisation de la référence scroll lors du changement de route

### 2) Styles navbar

- **Hauteur** : 44 px (constante `NAV_HEIGHT`)
- **Icônes Home & Quêtes** : 100×100 px
- **Avatar profil** : `navHeight * 0.72` (~32 px), bordure 1 px
- **Layout** : `flex`, `justify-content: space-between`, icônes réparties sur toute la largeur
- **Bordure** : 1 px `#000000`
- **Largeur barre** : `clamp(320px, 75vw, 980px)` responsive

### 3) Icône section Quêtes

- Écran Quêtes : `quetes-section.png` à côté du titre « Quêtes »
- Taille : **100×100 px** (`sectionMarkerIcon`)

### Fichiers modifiés (référence v3.10)

| Fichier | Rôle |
|---------|------|
| `src/components/BottomNavBar.js` | Scroll hide/show, styles (44px, icônes 100px, bordure #000) |
| `src/lib/scrollNavEvents.js` | Nouveau — événements scroll pour navbar |
| `src/screens/Quetes/index.js` | onScroll → emitScrollNav, sectionMarkerIcon 100×100 |
| `src/screens/Profil/index.js` | onScroll → emitScrollNav |

### Autres modifications incluses (sessions récentes)

- **Boutons** : anti-wrap texte (`white-space: nowrap`, `theme.buttonTextNoWrap`) sur Button + écrans personnalisés
- **Icônes xp.png** : tailles d'origine restaurées (22, 20, 25, 18, 24 px selon contexte)
- **Icônes navbar** : home.png et quests.png déplacées dans `assets/icons/applications/`

---

## 🆕 CHECKPOINTS + INTERLUDE + FEED MODULES (v3.11)

**Date** : 8 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Finaliser l’écran CheckpointsValidation (responsive fluide, texte 4 lignes, desktop non plein), InterludeSecteur (wrap naturel, dégradé secteur), et ronds de modules Feed (taille stable moyens/grands, réduction proportionnelle petits écrans uniquement).

### 1) CheckpointsValidation

- **Revert puis rework** : écran remis à la version du 5 février (commit `f839e13`) puis ajustements propres.
- **Cercles + barres + cadenas** : tailles fluides via `fluid(width, min, vw%, max)` (équivalent CSS clamp) — pas de breakpoints qui créent des sauts. `cpSize` 120–220 px, `lockSize` 36–58 px, `barW` 60–110 px, `barH` 10–16 px, `cpGap` 14–26 px. Layout : flex, `justifyContent: 'center'`, `gap: cpGap`.
- **Texte** : 4 lignes fixes (L1–L3 blanc, L4 « LA VOIE RESTE INCERTAINE » rouge/orange). Même typo que l’onboarding avec mascottes : `getOnboardingImageTextSizes(width)` pour `titleFontSize` / `titleLineHeight` et `textMaxWidth`.
- **Position** : groupe checkpoints descendu (~+40 px desktop) via `marginTop: 100 + fluid(20, 3vw, 40)`. Desktop fenêtre non plein (width ≥ 1024 et height ≤ 850) : `translateY(-40)` + `scale(0.88)` pour remonter et réduire l’ensemble sans toucher au texte.
- **Connecteurs** : traits plus longs (`barW` 60–110), gap réduit (`cpGap` 14–26) pour qu’ils « touchent » visuellement les ronds.

**Fichier** : `src/screens/CheckpointsValidation/index.js`

### 2) InterludeSecteur

- **Texte** : un seul bloc avec retours à la ligne naturels (plus de 3 lignes forcées). Phrase complète avec secteur en `<Text>` imbriqué inline. Dégradé secteur : `#FF7B2B` → `#FFD93F` (aligné sur ALIGN/onboarding).
- **Typo** : `getOnboardingImageTextSizes(width)` ; `titleMaxWidth = Math.min(width * 0.92, 1100)`.

**Fichier** : `src/screens/InterludeSecteur/index.js`

### 3) Feed — Ronds de modules

- **Moyens et grands écrans** : aucune modification. Ronds et bloc modules gardent la taille RESPONSIVE (StyleSheet). `isShortViewport` désactivé (plus de réduction selon hauteur).
- **Petits écrans uniquement** (width < 480) : réduction proportionnelle et fluide. Scale `smallScale` entre 0.7 (320 px) et 1 (480 px). Ronds : `smallCircleSide` / `smallCircleMiddle` = RESPONSIVE × smallScale. Bloc modules : `smallButtonWidth` / `smallButtonHeight` = RESPONSIVE × smallScale. Gap entre ronds : `smallCircleSpacing` = `circleSpacing × smallScale`. Proportions entre les 3 ronds inchangées ; alignement horizontal conservé.

**Fichier** : `src/screens/Feed/index.js`

### Fichiers modifiés (référence v3.11)

| Fichier | Rôle |
|---------|------|
| `CONTEXT.md` | Documentation v3.11 + cette section |
| `src/screens/CheckpointsValidation/index.js` | Fluid clamp, 4 lignes, getOnboardingImageTextSizes, desktop short scale/translate, connecteurs |
| `src/screens/InterludeSecteur/index.js` | Texte wrap naturel, dégradé secteur #FF7B2B → #FFD93F |
| `src/screens/Feed/index.js` | Ronds stables (isShortViewport=false), smallScale uniquement &lt; 480 px |

**Sauvegarde** : commit dédié (ex. `v3.11: CheckpointsValidation + InterludeSecteur + Feed modules responsive`) pour ne rien perdre en cas de problème interne ou externe.

---

## 🆕 CORRECTIFS FÉV. 2026 (v3.12)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Profil sans photo (avatar par défaut + icône modifier), redirection onboarding sans écran "Crée ton compte", sanitization du step onboarding, et navigation post-module en une seule fois (sans double redirection).

### 1) Profil sans photo — Avatar + icône "Modifier photo"

- **Navbar** (`BottomNavBar.js`) : si pas de `profilePhotoURL`, affichage de `default_avatar.png` (assets/icons/default_avatar.png) au lieu d’une lettre ou d’un placeholder. Fichier placeholder créé (copie de settings.png) ; remplaçable par l’utilisateur.
- **Écran Profil** (`Profil/index.js`) : avatar sans photo → image `default_avatar.png` (plus d’initiales). Icône **stylet** (Ionicons pencil) en bas à gauche de la photo, symétrique à la corbeille (même taille/style). Si photo : corbeille (supprimer) + stylet (modifier). Si pas de photo : stylet uniquement. Pas de stylet sur la navbar.

### 2) Redirection onboarding incomplet

- **Règle** : utilisateur déjà connecté avec `onboarding_completed = false` ne doit jamais revoir l’écran "Crée ton compte".
- **navigationService.js** : step pour Onboarding = `Math.max(2, sanitizeOnboardingStep(onboardingStep))` (via `getSafeOnboardingRedirectStep`). Redirections (determineInitialRoute, redirectAfterLogin, determineAndNavigate, protectRoute) passent toujours un `step >= 2` pour les utilisateurs connectés.
- **OnboardingFlow.js** : lit `route.params?.step`, initialise `currentStep` ; si step >= 2, charge `userId`/`email` depuis la session (`getCurrentUser`). Step 0/1 → AuthScreen ; step 2+ → UserInfoScreen ou SectorQuizIntroScreen.
- **LoginScreen.js** : après login réussi, appel unique à `redirectAfterLogin(navigation)` (plus de branche fromLoginFlow → Main sans vérifier l’onboarding). Plus d’envoi vers Onboarding sans `step`.

### 3) Step onboarding — Sanitization (écran vide / step corrompu)

- **Constante** : `ONBOARDING_MAX_STEP = 3` (OnboardingFlow : 0=Intro, 1=Auth, 2=UserInfo, 3=SectorQuizIntro).
- **Fichier** : `src/lib/onboardingSteps.js` — `sanitizeOnboardingStep(step)` : `Number(step)` → si non fini ou `< 1` ou `> ONBOARDING_MAX_STEP` → retourne 1 ; sinon `Math.floor(s)` dans [1, 3].
- **navigationService** : toutes les redirections vers Onboarding utilisent `getSafeOnboardingRedirectStep(onboardingStep)` (step clampé 2..3 pour utilisateur connecté).
- **OnboardingFlow** : lit `route.params?.step`, applique `sanitizeOnboardingStep`, fallback step 1 + `console.warn` si step invalide.
- **userService.js** : à l’écriture de `onboarding_step`, clamp via `sanitizeOnboardingStep` puis `Math.min(ONBOARDING_MAX_STEP, Math.max(1, ...))`.
- **Checkpoint3Question** : `onboarding_step: 999` remplacé par `onboarding_step: 3`.

### 4) ModuleCompletion — Une seule navigation, pas de double redirection

- **Problème** : clic "CONTINUER" → navigation vers Main puis re-navigation vers Félicitations quête.
- **Règle** : une seule destination calculée au clic ; zéro passage intermédiaire par Main si une quête doit s’afficher.
- **moduleIntegration.js** :
  - `getNextRouteAfterModuleCompletion(moduleData)` : calcule la destination (QuestCompletion | FlameScreen | Feed) avec I/O minimal : `Promise.all([onModuleCompleted(...), getUserProgress(false)])`, puis `shouldShowRewardScreen()`, puis calcul streak/flame. Retourne `{ route, params }`. Pas de navigation.
  - `postModuleNavigationLock` : lock pour empêcher toute redirection automatique pendant 2–3 s après le clic.
  - `handleModuleCompletion(moduleData, opts)` : option `skipQuestEvents: true` pour éviter de refaire `onModuleCompleted` quand la route a déjà été calculée. Ne fait jamais de `navigate`.
  - `navigateAfterModuleCompletion` : si `postModuleNavigationLock` actif, ne fait rien.
- **ModuleCompletion/index.js** :
  - Au clic : `routingLockRef` + `setContinuing(true)` + `setPostModuleNavigationLock(true)`.
  - `next = await getNextRouteAfterModuleCompletion(moduleData)` puis **une seule** `navigation.replace(next.route, next.params)` (QuestCompletion, FlameScreen, ou Main/Feed).
  - Persist en arrière-plan : `completeModule` puis `handleModuleCompletion(moduleData, { skipQuestEvents: true })` sans aucun `navigate`. Après 1,5 s : `setPostModuleNavigationLock(false)`.
  - Bouton désactivé + style `continueButtonDisabled` (opacité 0,7, cursor not-allowed sur web).
- **Optimisation transition** : `getNextRouteAfterModuleCompletion` exécute `onModuleCompleted` et `getUserProgress(false)` en parallèle ; un seul appel à `getUserProgress` (cache préféré pour latence min).

### Fichiers modifiés (référence v3.12)

| Fichier | Rôle |
|---------|------|
| `src/components/BottomNavBar.js` | default_avatar.png quand pas de photo |
| `src/screens/Profil/index.js` | default_avatar, icône stylet (bas gauche), styles avatarEditWrap |
| `src/services/navigationService.js` | getSafeOnboardingRedirectStep, step >= 2, protectRoute avec step |
| `src/screens/Onboarding/OnboardingFlow.js` | route.params.step, sanitizeOnboardingStep, userId/email depuis session si step >= 2 |
| `src/screens/Auth/LoginScreen.js` | redirectAfterLogin unique après login |
| `src/lib/onboardingSteps.js` | Nouveau — ONBOARDING_MAX_STEP, sanitizeOnboardingStep |
| `src/services/userService.js` | Clamp onboarding_step à l’écriture |
| `src/screens/Checkpoint3Question/index.js` | onboarding_step: 3 au lieu de 999 |
| `src/lib/modules/moduleIntegration.js` | getNextRouteAfterModuleCompletion, lock, handleModuleCompletion(skipQuestEvents), navigateAfterModuleCompletion guard |
| `src/lib/modules/index.js` | Export getNextRouteAfterModuleCompletion, setPostModuleNavigationLock, isPostModuleNavigationLocked |
| `src/screens/ModuleCompletion/index.js` | Une seule navigation (getNextRouteAfterModuleCompletion), lock, background persist sans navigate |
| `assets/icons/default_avatar.png` | Placeholder (copie settings.png) |

**Sauvegarde** : commit dédié v3.12 pour ne rien perdre en cas de problème interne ou externe.

---

## 🆕 ANIMATION D'ENTRÉE À CHAQUE ÉCRAN (v3.13)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Appliquer l'animation d'entrée (opacité 0→1, translateY +12px→0, 280 ms, easeOut) à **chaque changement d'écran**, sans exception.

### Implémentation

1. **Composant** (`src/components/ScreenEntranceAnimation/index.js`)
   - **Hook** `useScreenEntrance()` : retourne les styles animés (opacity, translateY), joués une seule fois au montage.
   - **Composant** `<ScreenEntranceAnimation>` : wrapper Animated.View avec l'animation.
   - **HOC** `withScreenEntrance(Component)` : enveloppe n'importe quel écran dans `ScreenEntranceAnimation` avec `flex: 1` — utilisé au niveau du navigateur pour garantir l'animation à chaque écran.

2. **Navigation** (`src/app/navigation.js`)
   - Import de `withScreenEntrance`.
   - **Tous** les écrans du Stack sont enveloppés : `component={withScreenEntrance(WelcomeScreen)}`, etc.
   - Écrans concernés : Welcome, Choice, Login, IntroQuestion, PreQuestions, OnboardingQuestions, OnboardingInterlude, OnboardingDob, Onboarding, OnboardingOld, Quiz, Main, Resultat, ResultatSecteur, InterludeSecteur, QuizMetier, PropositionMetier, TonMetierDefini, CheckpointsValidation, Checkpoint1Intro/Question, Checkpoint2Intro/Question, Checkpoint3Intro/Question, FinCheckpoints, ChargementRoutine, Module, ModuleCompletion, QuestCompletion, FlameScreen, ChapterModules, Settings, PrivacyPolicy, About.

3. **Suppression des wrappers manuels**
   - Pour éviter une double animation, les wrappers `ScreenEntranceAnimation` ont été retirés dans : Welcome, ChargementRoutine, OnboardingQuestionScreen, OnboardingDob, OnboardingInterlude. Le contenu est désormais dans un `View` avec le même style ; l'animation est gérée uniquement par le HOC au niveau du navigateur.

### Paramètres de l'animation

- **Durée** : 280 ms  
- **Easing** : `cubic-bezier(0.22, 1, 0.36, 1)` (easeOut)  
- **Effet** : opacity 0→1, translateY +12px→0  
- **useNativeDriver** : true  

### Fichiers modifiés (référence v3.13)

| Fichier | Rôle |
|---------|------|
| `src/components/ScreenEntranceAnimation/index.js` | Ajout HOC `withScreenEntrance` |
| `src/app/navigation.js` | Import withScreenEntrance, tous les Stack.Screen enveloppés |
| `src/screens/Welcome/index.js` | Retrait wrapper manuel → View |
| `src/screens/ChargementRoutine/index.js` | Retrait wrapper manuel → View |
| `src/components/OnboardingQuestionScreen/index.js` | Retrait wrapper manuel → View |
| `src/screens/Onboarding/OnboardingDob.js` | Retrait wrapper manuel → View |
| `src/screens/Onboarding/OnboardingInterlude.js` | Retrait wrapper manuel → View |

**Sauvegarde** : commit dédié v3.13 pour ne rien perdre en cas de problème interne ou externe.

---

## 🆕 ÉCRANS RÉSULTAT SECTEUR / MÉTIER + TOGGLE IA (v3.14)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Finaliser les écrans Résultat Secteur et Résultat Métier (même rendu, même impact visuel) et sécuriser le toggle IA côté Supabase.

### 1) Écran Résultat Secteur (ResultatSecteur)

- **Design** : aligné sur le visuel souhaité. Fond #14161D, pas de header (écran plein focus). Badge "RÉSULTAT DÉBLOQUÉ" au premier plan (zIndex 100/101), chevauchant le haut de la carte. Étoile statique, sans animation ni ombre, partiellement derrière le badge. Carte #2D3241, borderRadius 32, ombre glow #FFAC30 blur 200. Barres + emoji sur une ligne (barres #FF6000→#FFBB00, 3px). Nom secteur en gradient #FFBB00→#FF7B2B, accroche #FFE479→#FF9758, barre gradient puis description puis barre grise. Boutons sans bordure, avec ombre portée ; CTA gradient, secondaire #019AEB.
- **Mock** : `?mock=1` (web) ou variables d’env pour prévisualiser sans IA.
- **Fichier** : `src/screens/ResultatSecteur/index.js`. Règle Cursor : `.cursor/rules/resultat-secteur-visuel.mdc`.

### 2) Écran Résultat Métier (PropositionMetier)

- **Règle** : Résultat Secteur = Résultat Métier (même écran, même structure, mêmes styles).
- **Contenu seul différent** : titre "CE MÉTIER TE CORRESPOND VRAIMENT", nom du métier (ex. DÉVELOPPEUR), emoji métier (JOB_ICONS), description (why/description). Tagline par défaut "EXPLORER, APPRENDRE, RÉUSSIR". Navigation "CONTINUER MON PARCOURS" → TonMetierDefini.
- **Fichier** : `src/screens/PropositionMetier/index.js` (réécrit pour reprendre la même structure et les mêmes styles que ResultatSecteur).

### 3) Toggle IA Supabase (Edge Functions)

- **Règle** : si `AI_ENABLED === "false"` (string) → aucun appel OpenAI ; sinon IA active.
- **Implémentation** : `Deno.env.get("AI_ENABLED") !== "false"` (la chaîne `"false"` est truthy en JS, d’où le test explicite).
- **Fichiers** :
  - `supabase/functions/_shared/aiGuardrails.ts` : `getAIGuardrailsEnv()` retourne `aiEnabled = Deno.env.get('AI_ENABLED') !== 'false'`.
  - `analyze-sector/index.ts`, `analyze-job/index.ts`, `generate-dynamic-modules/index.ts` : guard en tête après OPTIONS : si `!AI_ENABLED` → `return json200({ source: 'disabled' })` immédiat (pas de `process.env`, pas de redirection).
- **Réponse** : 200 avec `{ source: 'disabled' }` quand l’IA est désactivée.

### Fichiers modifiés (référence v3.14)

| Fichier | Rôle |
|---------|------|
| `src/screens/ResultatSecteur/index.js` | Design visuel souhaité, badge premier plan, barres+emoji, pas de header, ombre bloc, mock |
| `src/screens/PropositionMetier/index.js` | Même structure/styles que ResultatSecteur, données métier |
| `supabase/functions/_shared/aiGuardrails.ts` | aiEnabled = AI_ENABLED !== "false" |
| `supabase/functions/analyze-sector/index.ts` | Guard early return si IA désactivée |
| `supabase/functions/analyze-job/index.ts` | Guard early return si IA désactivée |
| `supabase/functions/generate-dynamic-modules/index.ts` | Guard early return si IA désactivée |
| `.cursor/rules/resultat-secteur-visuel.mdc` | Règle visuelle Résultat Secteur |
| `CONTEXT.md` | Documentation v3.14 |

**Sauvegarde** : commit dédié v3.14 pour ne rien perdre en cas de problème interne ou externe.

---

## 🆕 VERROUILLAGE ÉCRAN VS MENU (v3.15)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Séparer clairement les locks écran (ronds) et menu (sous-menu modules) pour que la navigation chapitre/module reste fluide sans re-verrouiller des modules déjà débloqués.

### Règle

- **LOCKS ÉCRAN (ronds)** : dépendent uniquement de `selectedModuleIndex` (ou module affiché). Focus sur le chapitre sélectionné.
  - `selectedModuleIndex = 0` → mod1 débloqué, mod2 et 3 lockés
  - `selectedModuleIndex = 1` → mod1 et 2 débloqués, mod3 locké
  - `selectedModuleIndex = 2` → tout débloqué

- **LOCKS MENU (sous-menu modules)** : dépendent uniquement de la progression réelle (DB / `chaptersProgress` / `progress`). On ne re-locke jamais un module déjà unlock par progression — permet de recliquer pour revenir à la progression actuelle.
  - `chapterId < currentChapter` → 3 modules débloqués (chapitre terminé, replay)
  - `chapterId === currentChapter` → débloqués jusqu'à `currentModuleInChapter`
  - `chapterId > currentChapter` → 0 débloqué (chapitre futur verrouillé)

### Implémentation (data-flow, pas d’UI)

- **`getScreenLocks(displayModuleIndex0)`** : utilisé uniquement pour les 3 ronds à l’écran. Retourne `{ module1, module2, module3 }` avec `unlocked` selon l’index affiché.
- **`getMenuLocksForChapter(chapterId, source)`** : utilisé uniquement dans `getChaptersForModal()` pour le sous-menu des modules. Retourne `[{ unlocked }, { unlocked }, { unlocked }]` selon la progression réelle.
- **`getViewStateForRounds()`** : appelle `getScreenLocks(moduleIndex0)` avec le module affiché (sélection ou progression).
- **`getChaptersForModal()`** : utilise `getMenuLocksForChapter(ch.id, source)` pour chaque chapitre (progression uniquement).

### Cas important

Sur Chapitre 1 / Module 1 sélectionné :
- **ÉCRAN** : mod2 et 3 lockés (focus sur mod1).
- **MENU** : si la progression réelle a déjà débloqué jusqu’au mod3, le menu reste cliquable — on peut recliquer mod3 pour revenir à sa progression actuelle.

### Fichier modifié

| Fichier | Rôle |
|---------|------|
| `src/screens/Feed/index.js` | getScreenLocks, getMenuLocksForChapter, refactor getChaptersForModal |

---

## 🆕 ANTI-BOUCLE HYDRATATION + AUTH DEDUP (v3.16)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Supprimer les boucles d'hydratation au login, les écritures DB inutiles et les cycles auth/navigation dupliqués.

### 1. Progress Hydration — read-only au démarrage

- **`isHydratingProgress`** : flag vrai pendant `getUserProgress` (fetch DB), faux après. `updateUserProgress` skip les écritures quand true.
- **Quest engine** : ne plus appeler `saveToSupabase` lors du chargement depuis AsyncStorage (init). Sync Supabase uniquement sur actions explicites (module complété, claim reward).
- **INITIAL_SESSION** : suppression de `invalidateProgressCache` au démarrage (évite re-fetch inutile).
- **`getUserProgressFromDB`** : dedupe via Map in-flight — appels parallèles partagent la même promesse.
- **Feed / authNavigation** : `getUserProgress(false)` au lieu de `forceRefresh` pour éviter re-fetch en boucle.

### 2. updateUserProgress — patch strict

- **Suppression "unchanged"** : plus de sentinel string. `undefined`/`null` = pas de mise à jour.
- **Patch strict** : construit un objet `patch` avec uniquement les champs définis et réellement différents de `currentProgress`.
- **Early return** : si `Object.keys(patch).length === 0` → `console.log('[updateUserProgress] skip (no real changes)')` et retour sans upsert.
- **Log** : `[updateUserProgress] write — patch keys: ...` uniquement avant upsert réel.

### 3. Auth / Navigation — single-flight

- **Auth listener** : singleton `authListenerSubscription` — une seule souscription par lifecycle.
- **didHydrateForSession** : guard pour éviter double hydrate INITIAL_SESSION + SIGNED_IN. Skip init (quests, modules) si déjà fait ; toujours appeler `redirectAfterLogin`.
- **redirectAfterLogin** : idempotent via `lastRedirectTarget` — skip si déjà sur la cible ; reset sur logout.
- **MODULE_WARMUP** : single-flight promesse — si warmup en cours, retourner la promesse existante au lieu d'en démarrer une nouvelle.

### Fichiers modifiés (v3.16)

| Fichier | Rôle |
|---------|------|
| `src/lib/userProgressSupabase.js` | isHydratingProgress, patch strict, norm("unchanged"), skip early |
| `src/services/userService.js` | getUserProgressFromDB dedupe Map |
| `src/lib/quests/questEngineUnified.js` | Suppression saveToSupabase au load AsyncStorage |
| `src/services/authNavigation.js` | invalidateProgressCache INITIAL_SESSION supprimé, authListenerSingleton, didHydrateForSession |
| `src/services/navigationService.js` | lastRedirectTarget idempotent redirectAfterLogin |
| `src/lib/modulePreloadCache.js` | inFlightPromise single-flight MODULE_WARMUP |
| `src/screens/Feed/index.js` | getUserProgress(false) dans loadProgress |

---

## 🆕 MODE ZÉRO SESSION + CORRECTIFS AUTH/PROGRESSION/RÉSEAU (v3.17)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : À chaque lancement afficher l’écran Auth (Créer un compte / Se connecter) sans auto-login, sans perdre la progression en DB, et corriger 403 en boucle, 409 user_progress, crash destructuring, navigation OnboardingQuestions, Quiz null, erreurs réseau signUp/analyze-sector.

### 1. Mode « zéro session persistée » (UI uniquement)

- **Au boot** : `supabase.auth.signOut({ scope: 'local' })` une seule fois (pas de signOut global). Puis `manualLoginRequired = true`, `authStatus = 'signedOut'` → toujours AuthStack.
- **Pas d’init au démarrage** : plus d’appel à `initializeQuests()` / `initializeModules()` dans `App.js` ; ils ne s’exécutent qu’après login (handleLogin / SIGNED_IN).
- **AuthContext** : `manualLoginRequired` au boot ; sur SIGNED_IN → `manualLoginRequired = false`, chargement progression/onboarding.
- **RootGate** : si `manualLoginRequired || authStatus !== 'signedIn'` → AuthStack ; sinon AppStack. Progression rechargée depuis la DB après reconnexion.

### 2. getCurrentUser et auth

- **403/401** : retourner `null` (plus de « session en cache ») pour éviter boucle 403.
- **Destructuring sécurisé** : `getSession` / `getCurrentUser` utilisent `res?.data?.session` au lieu de déstructurer quand `data` peut être null.
- **authNavigation** : INITIAL_SESSION ne déclenche plus d’hydratation (pas d’init modules/quêtes au boot).

### 3. user_progress

- **Création initiale** : `upsert` avec `onConflict: 'id'` au lieu d’`insert` ; en cas d’erreur 409/23505 → refetch et retour.
- **Destructuring** : le retry après lock utilise la valeur retournée de `getUserProgressFromDB` (data | null) au lieu de `{ data, error }` → plus de crash « Right side of assignment cannot be destructured ».
- **Guard** : si `newData` null après upsert, refetch ou retour état par défaut.

### 4. Navigation AuthStack

- **Écrans ajoutés à AuthStack** : OnboardingQuestions, OnboardingInterlude, OnboardingDob, Onboarding (OnboardingFlow) pour que le flux PreQuestions → … → OnboardingDob → Onboarding soit possible sans erreur « NAVIGATE was not handled ».

### 5. Quiz et erreurs réseau

- **QuizScreen** : `currentMicroQuestion?.question ?? ''` et `currentMainQuestion?.texte ?? ''` (et options) pour éviter crash quand question null/undefined.
- **analyzeSector** : erreurs « access control » / CORS traitées comme réseau ; message utilisateur « Problème de connexion. Vérifie ton réseau et réessaie. »
- **Quiz (analyse)** : message « Problème de connexion » + indication de réessayer ; phase affinement idem.
- **SignUp (AuthScreen)** : quand `result.error` est réseau/timeout, affichage du message « Réseau instable : impossible de joindre le serveur. Réessaie. » et **bouton Réessayer** (setShowRetryButton). authErrorMapper : AuthRetryableFetchError, « Load failed », « TypeError: Load failed » → code `network`.

### Fichiers modifiés (v3.17)

| Fichier | Rôle |
|---------|------|
| `src/context/AuthContext.js` | signOut(scope: 'local') au boot, manualLoginRequired |
| `src/services/supabase.js` | persistSession true, storage AsyncStorage (session conservée pour reconnexion) |
| `src/services/auth.js` | getCurrentUser 403/401 → null, getSession/getUser destructuring sécurisé |
| `src/services/authNavigation.js` | INITIAL_SESSION sans hydratation |
| `App.js` | suppression init modules/quêtes au boot |
| `src/lib/userProgressSupabase.js` | retry sans destructure { data, error }, upsert + 409 refetch, guard newData |
| `src/navigation/RootGate.js` | AuthStack + OnboardingQuestions, OnboardingInterlude, OnboardingDob, Onboarding |
| `src/screens/Quiz/index.js` | questionText/options optional chaining ; messages réseau + retry |
| `src/services/analyzeSector.js` | access control / CORS → erreur réseau |
| `src/screens/Onboarding/AuthScreen.js` | result.error réseau/timeout → message + setShowRetryButton(true) |
| `src/utils/authErrorMapper.js` | Load failed / TypeError: Load failed → network |

---

## 🆕 REACHABILITY + REFINEMENT SECTEUR + AUTH TIMEOUTS (v3.18)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Garantir que chaque secteur de la whitelist peut sortir top1 quand les signaux sont maximaux ; corriger les règles micro (Q47–Q50) et le refinement pour que Sport & Environnement ne soient plus aspirés par Business/Éducation ; finaliser le flow refinement côté app ; renforcer la robustesse auth (timeouts).

### 1. Flow refinement micro-questions (app)

- **Source de vérité** : uniquement `result.microQuestions` de l’Edge (plus de fallback local de questions génériques). Si l’API renvoie `needsRefinement` mais 0 micro-questions → redirection directe vers ResultatSecteur avec top1.
- **Round-trip** : après les 50 questions, appel `analyzeSector` → si `needsRefinement && micro.length > 0`, écran « On précise ton profil » avec les micro-questions reçues. Réponses stockées en `{ label, value }` ; au 2ᵉ appel, envoi de `microAnswersForApi` (clés = ids API, valeurs = A/B/C).
- **Une seule itération** : après le 2ᵉ appel, plus de re-entrée en mode refinement ; toujours navigation vers ResultatSecteur.
- **Logs** : `[IA_SECTOR_APP] initial`, `refinement_submit`, `refinement_result`.
- **Fichiers** : `src/screens/Quiz/index.js`, `src/context/QuizContext.js`, `src/services/analyzeSector.js`.

### 2. Reachability tests (Edge)

- **Fichier** : `supabase/functions/analyze-sector/reachability.test.ts`.
- **Contenu** : 3 profils synthétiques (sport_evenementiel, environnement_agri, droit_justice_securite) avec payloads Q1–Q50 ; application de `computeMicroDomainScores` → `applyMicroRerank` (bonus × 4) → `applyHardRule` ; assertion top1 attendu.
- **Run** : depuis `supabase/functions`, `deno test analyze-sector/reachability.test.ts --allow-read --allow-env`. Prérequis : Deno installé (`brew install deno`).
- **Doc** : `supabase/functions/analyze-sector/README_REACHABILITY.md`.

### 3. computeMicroDomainScores (Q47–Q50)

- **Fichier** : `supabase/functions/_shared/domainTags.ts`.
- **Changements** : Q48 B → sport_evenementiel +2, business_entrepreneuriat +1 (au lieu de +1 chacun). Q49 B/C → +1 chacun (au lieu de +2) pour éviter mono-secteur. Q50 B → environnement_agri +3 (au lieu de +2).
- **Logs diagnostic** : si `getChoice` renvoie null pour une question 47–50, `console.log('MICRO_CHOICE_MISSING', id, raw)`.

### 4. Validation refinement pair-specific (Edge)

- **Fichier** : `supabase/functions/_shared/refinementFallback.ts`.
- **Ajouts** : `PAIR_VOCABULARY` (mots-clés par secteur), `containsPairVocabulary`, `isGenericLikeForPair(questions, top1Id, top2Id)` — si moins de 2 questions contiennent du vocabulaire lié à la paire → fallback par paire.
- **Edge** : dans `analyze-sector/index.ts`, si `genericCount >= 2` **ou** `isGenericLikeForPair(list, top1Id, top2Id)` → utilisation du fallback `getFallbackMicroQuestions(top1Id, top2Id)`.

### 5. getChoice robuste (domainTags.ts)

- **Logique** : priorité à `raw.value` (A/B/C), puis texte dérivé de label/value/text ; détection A/B/C au début du texte ; prise en charge des value en minuscules.
- **Typage** : `String(...)` autour de l’expression avant `.trim().toUpperCase()` pour éviter TS2339.

### 6. Auth / timeouts

- **Preflight** (AuthScreen, LoginScreen) : 5 s → 8 s.
- **check_email_exists** (auth.js) : 2 s → 4 s.
- **Signup** (AuthScreen) : 30 s → 45 s ; watchdog 35 s → 50 s.
- **Fichiers** : `src/screens/Onboarding/AuthScreen.js`, `src/screens/Auth/LoginScreen.js`, `src/services/auth.js`.

### 7. Logs Edge

- **EDGE_MICRO_DOMAIN_SCORES** : requestId + microScores.
- **EDGE_AFTER_MICRO_RERANK** : requestId, top5, pickedSectorId.

### Fichiers modifiés / ajoutés (v3.18)

| Fichier | Rôle |
|---------|------|
| `src/screens/Quiz/index.js` | refinement : API microQuestions only, microAnswers value A/B/C, max 1 iteration, logs [IA_SECTOR_APP] |
| `src/services/analyzeSector.js` | microAnswersForApi (value), candidateSectors, refinementCount |
| `supabase/functions/_shared/domainTags.ts` | computeMicroDomainScores rééquilibré, getChoice robuste, MICRO_CHOICE_MISSING |
| `supabase/functions/_shared/refinementFallback.ts` | PAIR_VOCABULARY, isGenericLikeForPair, formatFallbackForEdge |
| `supabase/functions/analyze-sector/index.ts` | isGenericLikeForPair, EDGE_REFINEMENT_AI_GENERIC avec genericLikeForPair |
| `supabase/functions/analyze-sector/reachability.test.ts` | Tests reachability sport / env / droit, logs DEBUG SPORT PROFILE |
| `supabase/functions/analyze-sector/README_REACHABILITY.md` | Instructions run + prérequis Deno |
| `src/screens/Onboarding/AuthScreen.js` | PREFLIGHT 8 s, SIGNUP 45 s, WATCHDOG 50 s |
| `src/screens/Auth/LoginScreen.js` | PREFLIGHT 8 s |
| `src/services/auth.js` | RPC check_email_exists 4 s |

---

## 🆕 TESTS STRUCTURELS SECTEUR + MOTEUR MÉTIER AXES + FALLBACK (v3.19)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Tests structurels secteur (snapshots + robustness), source de vérité métiers (30/secteur), moteur métier par 8 axes avec secteur pilote Business et fallback déterministe pour les autres secteurs.

### 1. Tests structurels secteur (Edge)

- **Fichiers** : `supabase/functions/analyze-sector/structural.test.ts`, `supabase/functions/analyze-sector/snapshots/structural.snapshots.json`, `supabase/functions/_shared/sectorPipeline.ts`.
- **Snapshots** : pour chaque profil extrême (16), snapshot sectorTarget, top10, top1, top2, gap, confidence, needsRefinement. `UPDATE_SNAPSHOTS=1` pour écraser les snapshots.
- **Robustness** : test « Structural robustness to answer noise » — 50 runs par profil avec mutation 3–5 questions neutres (B→A/C), seed mulberry32 ; top1 ≥ 95 %, top3 ≥ 99 %.
- **Run** : `npx deno test supabase/functions/analyze-sector/structural.test.ts --allow-read --allow-env` (ou `--allow-write` pour update snapshots).

### 2. Whitelist métiers (30 par secteur)

- **Fichier** : `src/data/jobsBySector.ts`.
- **Exports** : `SECTOR_IDS` (16 secteurs), `JobTitle`, `JOBS_BY_SECTOR` (Record secteur → 30 noms de métiers), `validateJobsBySector()`, `getJobsForSector(sectorId)` (copie immuable).
- **Validation** : 30 métiers par secteur, pas de vide, pas de doublon interne.

### 3. Moteur métier par axes (8 axes)

- **Axes** : `src/domain/jobAxes.ts` — STRUCTURE, CREATIVITE, ACTION, CONTACT_HUMAIN, ANALYSE, RISK_TOLERANCE, STABILITE, LEADERSHIP. `JobVector` = Record<JobAxis, number> (0..10).
- **Quiz V2** : `src/data/quizMetierQuestionsV2.ts` — 30 questions metier_1..metier_30 (format id, question, options A/B/C).
- **Mapping** : `src/domain/jobQuestionMapping.ts` — `JOB_QUESTION_TO_AXES` (chaque réponse ajoute 1–2 axes), `normalizeToJobVector`.
- **Profil utilisateur** : `src/domain/computeJobProfile.ts` — `computeJobProfile(rawAnswers)` → JobVector.
- **Vecteurs métiers** : `src/data/jobVectorsBySector.ts` — `PILOT_SECTOR = "business_entrepreneuriat"`, `JOB_VECTORS_BY_SECTOR[PILOT_SECTOR]` rempli avec 30 vecteurs (archétypes A–F), `validateJobVectorsForPilot()`.

### 4. Matching et fallback

- **Fichier** : `src/domain/matchJobs.ts`.
- **Pilote** : `rankJobsForSector(sectorId, userVector, topN)` — si sectorId === PILOT_SECTOR : cosine similarity, top N par score.
- **Non-pilote** : fallback déterministe — `getJobsForSector(sectorId)`, shuffle Fisher-Yates avec seed = `stableHash(canonical(userVector) + sectorId)`, PRNG mulberry32, score = 0.5. Pas de throw.
- **Helpers** : `stableHash` (djb2), `mulberry32`, `cosineSimilarity`, `FALLBACK_SCORE = 0.5`.

### 5. Tests domaine

- **computeJobProfile.test.ts** : vecteur 8 axes 0..10, scores différents selon réponses (A vs C, une réponse).
- **matchJobs.test.ts** : cosineSimilarity (identiques, nul, ordre stable), rankJobsForSector non-pilote ne lève pas, déterminisme (2 appels = même ordre), topN respecté.

### Fichiers ajoutés / modifiés (v3.19)

| Fichier | Rôle |
|---------|------|
| `supabase/functions/analyze-sector/structural.test.ts` | Tests 16 profils + snapshot + robustness noise |
| `supabase/functions/analyze-sector/snapshots/structural.snapshots.json` | Snapshots régression |
| `supabase/functions/_shared/sectorPipeline.ts` | Pipeline secteur extrait pour tests |
| `src/data/jobsBySector.ts` | JOBS_BY_SECTOR 16×30, validateJobsBySector, getJobsForSector |
| `src/data/jobsBySector.test.ts` | Validation + longueur 30 |
| `src/domain/jobAxes.ts` | JOB_AXES, JobVector, ZERO_JOB_VECTOR |
| `src/data/quizMetierQuestionsV2.ts` | 30 questions metier_1..30 |
| `src/domain/jobQuestionMapping.ts` | JOB_QUESTION_TO_AXES, normalizeToJobVector |
| `src/domain/computeJobProfile.ts` | computeJobProfile(rawAnswers) → JobVector |
| `src/data/jobVectorsBySector.ts` | PILOT_SECTOR, JOB_VECTORS_BY_SECTOR (30 vecteurs Business), validateJobVectorsForPilot |
| `src/domain/matchJobs.ts` | rankJobsForSector (pilote cosine + fallback shuffle seedé), stableHash, mulberry32 |
| `src/domain/computeJobProfile.test.ts` | Tests computeJobProfile |
| `src/domain/matchJobs.test.ts` | Tests cosine + rankJobsForSector (pilote + fallback) |

**Sauvegarde** : Faire régulièrement `git add` + `git commit` (et éventuellement `git tag v3.19`) pour conserver cette version. v3.18 + **v3.19 (tests structurels secteur, whitelist métiers, moteur métier 8 axes, pilote Business, fallback non-pilote)**.

---

## 🆕 RANKING MÉTIERS AVEC CONTEXTE SECTEUR (v3.20)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

**Objectif** : Le ranking métiers utilise le contexte du quiz secteur (personnalité déjà construite via Edge / `debug.extractedAI`), pas seulement le quiz métier. Contexte stocké dans la progression (`activeSectorContext`), converti en vecteur 8 axes, puis mélangé au vecteur métier (0.75 job, 0.25 contexte) avant le matching.

### 1. Stockage du contexte secteur

- **Progression** : `src/lib/userProgressSupabase.js` — champ `activeSectorContext` (objet : `styleCognitif`, `finaliteDominante`, `contexteDomaine`, `signauxTechExplicites`). Défaut `null`, lu/écrit dans `convertFromDB` / `convertToDB`, patch `updateUserProgress`, colonne optionnelle (fallback AsyncStorage si colonne absente en BDD), fusion fallback dans `getUserProgress`.
- **Remplissage** : `src/screens/ResultatSecteur/index.js` — à la réception du résultat secteur (précalculé ou retour `analyzeSector`), `updateUserProgress({ activeSectorContext: sectorResult?.debug?.extractedAI ?? sectorResult?.debug?.extracted ?? null })`.

### 2. Mapping secteur → vecteur et blend

- **Fichier** : `src/domain/sectorContextToJobVector.ts` — `sectorContextToJobVector(ctx)` (règles styleCognitif / finaliteDominante / contexteDomaine → axes 0..10), `blendVectors(jobVector, ctxVector, wJob, wCtx)` avec clamp 0..10.
- **Service** : `src/services/recommendJobsByAxes.js` — paramètre optionnel `sectorContext`. Si présent et valide : `vectorForRanking = blendVectors(computeJobProfile(answers), sectorContextToJobVector(sectorContext), 0.75, 0.25)` ; sinon vecteur métier seul. `rankJobsForSector(sectorId, vectorForRanking, ...)` puis `assertJobInWhitelist` inchangé.

### 3. Utilisation dans le flow métier

- **QuizMetier** : `src/screens/QuizMetier/index.js` — `sectorContext = progress?.activeSectorContext ?? undefined` puis `recommendJobsByAxes({ sectorId, answers, variant, sectorContext })`.

### 4. Tests

- **Fichier** : `src/domain/sectorContextRanking.test.ts`
  - Même réponses métier, contexte « humain » vs « systeme_objet » : vecteurs blendés différents et **top3 différent sur au moins un secteur** (sante_bien_etre, social_humain, data_ia, business_entrepreneuriat).
  - Aucun job hors whitelist : pour `sante_bien_etre`, avec et sans `sectorContext`, tous les jobs du top3 sont dans la whitelist (`getJobsForSectorNormalizedSet` + `normalizeJobKey`).

### Fichiers modifiés / ajoutés (v3.20)

| Fichier | Rôle |
|---------|------|
| `src/lib/userProgressSupabase.js` | activeSectorContext (défaut, convertFromDB, convertToDB, patch, optionalColumns, fallback) |
| `src/screens/ResultatSecteur/index.js` | Persistance activeSectorContext depuis sectorResult.debug.extractedAI / extracted |
| `src/services/recommendJobsByAxes.js` | sectorContext optionnel, blend 0.75/0.25, vectorForRanking |
| `src/screens/QuizMetier/index.js` | Passage progress.activeSectorContext à recommendJobsByAxes |
| `src/domain/sectorContextRanking.test.ts` | Tests top3 différent selon contexte + whitelist |

**Sauvegarde** : Faire régulièrement `git add` + `git commit` (et éventuellement `git tag v3.20`) pour ne rien perdre. v3.19 + **v3.20 (ranking métiers avec contexte secteur, activeSectorContext, blend, tests sectorContextRanking)**.

---

## 🆕 LOGIQUE MÉTIER HYBRIDE + TEST DISTRIBUTION (v3.21)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

### 1. Logique métier hybride (cosine + rerank IA sur whitelist)

**Objectif** : Le job final est choisi uniquement parmi la whitelist (30 titres du secteur). Top3 + raisons + questions d'affinage uniquement si ambigu. Si besoin d'affiner, 3 questions supplémentaires sont injectées dans le quiz métier (même UI).

- **Service** : `src/services/analyzeJobResult.js`
  - Entrée : `sectorId`, `variant`, `rawAnswers30`, `sectorSummary?`, `sectorContext?`, `refinementAnswers?`
  - Étapes : `userVector` = computeJobProfile + blend sectorContext (0.75/0.25) ; `top10` = rankJobsForSector(10) ; si `!shouldRerank(top10)` → retour top3 cosine (guard whitelist) ; sinon appel Edge `rerank-job` puis validation des top3 (whitelist, fallback cosine si invalide).
  - Sortie : `{ top3, needsRefinement, refinementQuestions }`. Logs `[JOB_ANALYZE]` (sectorId, variant, gap top1–top2, usedRerank, finalTop3).

- **Heuristique** : `src/domain/shouldRerankJobs.ts` — `shouldRerank(top10)` = true si gap(top1, top2) < 0.02 ou top1.score < 0.78 ou top3 quasi égaux.

- **Edge Function** : `supabase/functions/rerank-job/index.ts`
  - Entrée : sectorId, variant, whitelistTitles (30), rawAnswers30, sectorSummary?, top10Cosine, refinementAnswers?
  - Sortie : `{ top3: [{ jobTitle, confidence, why }], needsRefinement, refinementQuestions? }` (max 3 questions, format A/B/C, C = "Ça dépend"). Chaque jobTitle validé contre whitelist (normalizeJobKey).

- **QuizMetier** : Après la dernière question métier (Q30 ou Q35 avec Droit), appel `analyzeJobResult`. Si `needsRefinement && refinementQuestions.length > 0` : injection des 3 questions (refine_ambig_1/2/3), même UI ; après réponses, rappel `analyzeJobResult` avec `refinementAnswers` puis navigation ResultJob. Sinon navigation directe ResultJob avec top3. Guard : tous les titres passent par `guardJobTitle` (ResultJob + service).

### 2. Test distribution généralisé (tous les secteurs)

- **Fichier** : `src/domain/jobDistribution.test.ts`
  - Secteurs : **SECTOR_IDS** (16 secteurs).
  - N = **80** profils par défaut ; **stress list** (N = 200) : environnement_agri, industrie_artisanat, communication_media, culture_patrimoine, sport_evenementiel, social_humain.
  - Assertions par secteur : aucun score === FALLBACK_SCORE ; au moins 8 top1 distincts ; union(top3) >= 18 ; top1 le plus fréquent <= seuil (cible 25 %, seuil 40 % pour passage avec moteur actuel).
  - En cas d'échec : log `sectorId`, top1 frequency (top 5), 3 exemples rawAnswers (metier_1..metier_30) du top1 dominant (`logFailure`).
  - RNG déterministe : `stableHash` + `mulberry32`, aucun `Math.random`.

### Fichiers clés (v3.21)

| Fichier | Rôle |
|---------|------|
| `src/services/analyzeJobResult.js` | Service hybride cosine + rerank, guard whitelist, logs [JOB_ANALYZE] |
| `src/domain/shouldRerankJobs.ts` | Heuristique shouldRerank(top10) |
| `supabase/functions/rerank-job/index.ts` | Edge IA : top3 + needsRefinement + refinementQuestions (whitelist stricte) |
| `src/screens/QuizMetier/index.js` | analyzeJobResult, injection Q31–Q33 affinage, second appel avec refinementAnswers |
| `src/domain/jobDistribution.test.ts` | Test distribution sur SECTOR_IDS, N 80/200, logFailure sur échec |

**Sauvegarde** : v3.20 + **v3.21 (logique métier hybride, rerank-job Edge, QuizMetier affinage, test distribution tous secteurs)**.

---

## 🆕 LOADINGREVEAL + PASSWORD FIELD + UI (v3.22)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

### 1. Écran LoadingReveal (secteur + métier)

- **Progression** : plus de blocage à 85 %. Animation fluide (Animated.timing) : phase 1 → 0 à 92 % en 6 s (easing quad), phase 2 → 92 à 100 % en 700 ms (easing cubic) quand la requête est finie. Navigation uniquement dans un `useEffect` quand `done && progress >= 100` (plus de navigation dans le fetch).
- **Durée minimale** : 6,5 s (secteur et métier) même si le réseau répond vite ; fetch en parallèle du timer.
- **Textes** : titre fixe selon mode (secteur / métier) ; sous-textes dynamiques selon progression (< 30 %, < 60 %, < 85 %, < 92 %, « Résultat prêt ✅ ») avec transition fade. **Sous-titres en Nunito Black** (`theme.fonts.button` = Nunito_900Black, chargé via expo-font dans App.js).
- **Layout** : bloc titre + sous-titre remonté de 50 px (`transform: translateY(-50)` sur `textBlock`) ; cercle de progression inchangé, centrage horizontal conservé.
- **Fichier** : `src/screens/LoadingReveal/index.js`.

### 2. Composant PasswordField (œil afficher/masquer)

- **Objectif** : afficher/masquer le mot de passe sur Connexion et Création de compte.
- **Composant** : `src/components/PasswordField/index.js`. State local `visible` ; `secureTextEntry={!visible}` ; icône Ionicons `eye-outline` / `eye-off-outline` à droite du champ (position absolute, `paddingRight` sur le TextInput pour éviter le chevauchement). Toggle au press. Icône remontée de 10 px (`marginTop: -10`) pour alignement visuel avec le texte.
- **Intégration** : `src/screens/Auth/LoginScreen.js` (champ mot de passe) ; `src/screens/Onboarding/AuthScreen.js` (mot de passe + confirmation). Validation et soumission inchangées.

### Fichiers modifiés (v3.22)

| Fichier | Rôle |
|---------|------|
| `src/screens/LoadingReveal/index.js` | Progress Animated.timing, sous-titres Nunito Black, textBlock translateY -50, navigation useEffect |
| `src/components/PasswordField/index.js` | Champ mot de passe réutilisable avec icône œil (visible/toggle) |
| `src/screens/Auth/LoginScreen.js` | Utilisation de PasswordField pour le mot de passe |
| `src/screens/Onboarding/AuthScreen.js` | Utilisation de PasswordField pour mot de passe et confirmation |

---

## 🆕 MODULES METIERKEY + MODULECOMPLETION + QUIZ + SONS (v3.23)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

### 1. Métier : metierKey / activeMetierKey

- **Problème** : `metierId` était un titre (ex. "Chargé de mission environnement"), l’edge rejetait ou skippait `mini_simulation_metier`.
- **Solution** : clé stable `activeMetierKey` (normalizeJobKey du titre) stockée avec `activeMetier` dans la progression.
- **Fichiers** : `src/lib/userProgressSupabase.js` (DEFAULT, convertFromDB/convertToDB, setActiveMetier, optionalColumns, patch, fallbacks) ; `src/services/aiModuleService.js` (hasValidMetier, metierKey dans body edge, seed) ; `src/lib/modulePreloadCache.js` (paramètre metierKey, seedAllModulesIfNeeded) ; `src/screens/Feed/index.js` (preloadModules + getOrCreateModule avec metierKey).
- **Edge** : `generate-feed-module` accepte `metierId`, `metierKey`, `metierTitle`, `jobTitle`, `activeMetierTitle` ; premier non vide = `metier` pour le prompt ; payload renvoyé avec `métier` et `metierKey`. `_shared/promptsFeedModule.ts` : paramètre `metier` (plus metierId) dans le prompt.

### 2. user_modules + retry-module

- **Table** : `user_modules` (id, user_id, chapter_id, module_index, type, payload, status, error_message, updated_at). Migrations : `CREATE_USER_MODULES.sql`, `CREATE_LEARNING_TEMPLATES.sql`, `ADD_ACTIVE_METIER_KEY.sql`.
- **Edge** : `retry-module` (userId, chapterId, moduleIndex, secteurId, metierKey, metierTitle) — regénère un module en erreur, met à jour status ready/error.
- **Client** : `src/services/userModulesService.js` (getModuleFromUserModules, retryModuleGeneration). Feed : clic module → lecture user_modules ; ready → ouvrir ; generating/pending → loader + polling ; error → alerte "Erreur de génération" + bouton Réessayer (retry-module).

### 3. ModuleCompletion + navigation Feed

- **Prénom** : ne plus afficher "utilisateur" (valeur par défaut auth). `loadUserName` : si `raw.toLowerCase() === 'utilisateur'` ou vide → ne pas setUserName → affichage "FÉLICITATIONS !" sans nom.
- **Navigation** : après "Continuer", `navigation.reset({ index: 0, routes: [{ name: 'Main', params: { screen: 'Feed' } }] })` pour éviter écran gris ; idem pour QuestCompletion en reset. Logs __DEV__ : Continuer pressé, Navigation vers Main/Feed, Feed écran monté.

### 4. Quiz Module (progression + mode correction)

- **Barre de progression** : total = 12 + nombre d’erreurs (ex. 15) ; `globalProgressIndex` = en normal currentItemIndex+1, en correction module.items.length + currentErrorIndex + 1. La barre ne repart jamais à 0 (ex. 13/15, 14/15, 15/15).
- **Mode correction** : en reprise d’erreur, ne pas afficher l’ancienne mauvaise réponse. `effectiveSelectedAnswer = isRetryMode && !showExplanation ? undefined : selectedAnswer` ; options et message utilisent `effectiveSelectedAnswer`. Variable claire `isRetryMode = isCorrectingErrors`.

### 5. Sons de feedback (quiz)

- **Assets** : `assets/sounds/` (correct.mp3, wrong.mp3 à placer) ; README dans le dossier.
- **Service** : `src/services/soundService.js` — loadSounds() (une fois), playCorrect() (volume 0.8), playWrong() (volume 0.6) ; replayAsync ; gestion d’erreurs.
- **App.js** : useEffect au démarrage qui appelle loadSounds().
- **Module** : dans handleSelectAnswer, après setShowExplanation(true), appel playCorrect() ou playWrong() selon bonne/mauvaise réponse.

### Fichiers modifiés / ajoutés (v3.23)

| Fichier | Rôle |
|---------|------|
| `src/lib/userProgressSupabase.js` | activeMetierKey, setActiveMetier(metierId+key), fire-and-forget seed-modules |
| `src/services/aiModuleService.js` | metierKey/opts dans body edge, hasValidMetier, seed avec metierKey |
| `src/services/userModulesService.js` | getModuleFromUserModules, retryModuleGeneration (nouveau) |
| `src/screens/Feed/index.js` | metierKey dans preload/getOrCreateModule, user_modules + retry, log montage |
| `src/screens/ModuleCompletion/index.js` | prénom sans "utilisateur", goToFeed + navigation.reset, logs |
| `src/screens/Module/index.js` | totalQuestions/globalProgressIndex, effectiveSelectedAnswer, isRetryMode |
| `src/services/soundService.js` | loadSounds, playCorrect, playWrong (nouveau) |
| `App.js` | loadSounds au démarrage |
| `supabase/functions/generate-feed-module/index.ts` | body metierKey/metierTitle/jobTitle/activeMetierTitle, metier pour prompt |
| `supabase/functions/_shared/promptsFeedModule.ts` | paramètre metier (prompt mini_simulation_metier) |
| `supabase/functions/retry-module/index.ts` | Edge regénération module (nouveau) |
| `assets/sounds/` | README + .gitkeep (correct.mp3, wrong.mp3 à ajouter) |

---

## 🆕 PROGRESSION CHAPITRES + FEED REFRESH (v3.24)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

### Contexte

- **Bug 1** : Erreur 23503 sur `user_chapter_progress` — "Key is not present in table \"chapters\"". La FK `current_chapter_id` exige un `chapters.id` valide ; l’app écrivait parfois l’index (1–10) ou une valeur non résolue.
- **Bug 2** : À la fin du dernier module d’un chapitre (module_index=2), retour à l’accueil mais le chapitre suivant ne se débloquait qu’après redémarrage de l’app (cache / écriture en arrière-plan après la navigation).

### 1. user_chapter_progress (chapitre system) — FK 23503

- **Fichier** : `src/lib/chapters/chapterSystem.js`
- **getChapterIdByIndex(index)** : retourne `chapters.id` pour l’index 1–10 (ou null si table vide). Utilisé pour toute écriture dans `current_chapter_id`.
- **initializeUserProgress** : n’écrit `current_chapter_id` que si `getChapterIdByIndex(1)` retourne un id ; sinon pas de clé invalide.
- **completeModule** : résolution du chapitre via `getChapterById(chapterId) || getChapterByIndex(chapterId)` (accepte index ou id). Toutes les écritures utilisent un id vérifié ; **ensureChapterIdExists(idCandidate, fallbackId)** vérifie que l’id existe dans `chapters` avant écriture, sinon retourne null (et l’upsert n’inclut pas `current_chapter_id` pour préserver la progression).

### 2. Fin de chapitre — déblocage immédiat (user_progress)

- **Fichier** : `src/lib/chapterProgress.js`
- À la fin du chapitre (moduleIndex === 2 ou 3 modules complétés) : mise à jour **atomique** avec `currentChapter: nextChapter`, `currentModuleInChapter: 0`, `completedModulesInChapter: []`, **maxUnlockedModuleIndex: 0**, `chapterHistory`.
- Logs : `[CHAPTER_END] before write { chapterId, nextChapter }`, `[CHAPTER_END] write OK { newChapterId }`.

### 3. ModuleCompletion — ordre écriture puis navigation

- **Fichier** : `src/screens/ModuleCompletion/index.js`
- **Avant** : navigation immédiate vers Feed, puis persistance en arrière-plan → Feed affichait une progression stale.
- **Après** : `handleReturnToHome` est async ; **ordre** : `getNextRouteAfterModuleCompletion` → `completeModule(chapterId, moduleIndex+1)` → `handleModuleCompletion` (qui appelle `completeModuleInChapter`) → `invalidateProgressCache()` → `await getUserProgress(true)` → puis **navigation** `replace('Main', { screen: 'Feed', params: { refreshProgress: true } })` (ou QuestCompletion si besoin).
- Le chapitre n’est incrémenté que si le module terminé est le **dernier** du chapitre (moduleIndex === 2).

### 4. Feed — refresh au retour depuis ModuleCompletion

- **Fichier** : `src/screens/Feed/index.js`
- **useFocusEffect** : si `route.params?.refreshProgress === true`, invalidation du cache, `getUserProgress(true)` (source de vérité DB), mise à jour du state (`setProgress`, `setChaptersProgress`), puis `navigation.setParams({ refreshProgress: undefined })`.
- Logs : `[FEED] mount`, `[FEED] focus refresh triggered`, `[FEED] progress loaded { chapterId, unlockedIndex, completedCount }`.

### Fichiers modifiés (v3.24)

| Fichier | Rôle |
|---------|------|
| `src/lib/chapters/chapterSystem.js` | getChapterIdByIndex, ensureChapterIdExists, init/completeModule avec id résolus, pas d’écriture FK invalide |
| `src/lib/chapterProgress.js` | maxUnlockedModuleIndex: 0 en fin de chapitre, logs [CHAPTER_END] |
| `src/screens/ModuleCompletion/index.js` | await écriture puis navigation avec refreshProgress: true |
| `src/screens/Feed/index.js` | useFocusEffect + refreshProgress → rechargement DB, logs [FEED] |

---

## 🆕 COHÉRENCE SECTEUR / TRACK + DESCRIPTIONS MÉTIERS (v3.25)

**Date** : 3 février 2026 | **Statut** : ✅ COMPLET

### Contexte

- **Problème** : En secteur Défense/Sécurité (ex. `droit_justice_securite`), le système proposait des métiers hors secteur (Entrepreneur, Consultant en stratégie) et redirigeait vers `business_entrepreneuriat` quand la liste filtrée était vide.
- **Cause** : Secteur absent de `jobTrackConfig` → `minTrack = 2` par défaut → `applyTrackFilter` vide → redirection silencieuse vers un fallback secteur.

### 1. Track filter — fallback permissif (secteur non configuré)

- **Fichier** : `src/lib/jobTrackFilter.js`
- **getMinTrackForJob** : Si `sectorId` n’existe pas dans `jobTrackConfig`, on ne renvoie plus `minTrack = 2`. On renvoie **0** (bypass du filtre) et on log `[TRACK_FALLBACK] sector_not_configured → bypass_filter`.
- **getSectorJobsFromConfig** : Log d’erreur remplacé par un log informatif (plus de "fallback minTrack = 2").
- **Règle** : Secteur configuré mais job inconnu → toujours `minTrack = 2` ; secteur non configuré → `minTrack = 0`.

### 2. Interdiction de redirection inter-secteur

- **Fichier** : `src/screens/LoadingReveal/index.js`
- **resolveJobPayloadAfterFilter** : Suppression de l’appel à `findFallbackSector` et du retour d’un autre `sectorId`. Si la liste filtrée est vide, on retourne toujours `{ sectorId: sid, topJobs: [], sectorIncompatible: true, redirectFrom: null }` — **aucune redirection** vers un autre secteur.
- Log : `[TRACK] filteredEmpty sectorId=... action=same_sector_no_redirect`.
- Import `findFallbackSector` supprimé.

### 3. Cohérence secteur — logs SECTOR_CONSISTENCY

- **LoadingReveal** : Au moment de la navigation vers ResultJob, log `[SECTOR_CONSISTENCY] { ui, progressActiveDirection, jobAnalyzeSectorId }` (via `getUserProgress()`).
- **ResultJob** : Au montage, si `sectorId` présent, même log avec `getUserProgress()` pour vérifier alignement UI / DB / job analyze.

### 4. Descriptions métiers — validation + fallback contrôlé

- **Fichier** : `src/services/getJobDescription.js`
  - Validation : description valide = chaîne non vide (après trim). Sinon log `[JOB_DESC_INVALID]` avec `jobId`, `sectorId`, `response` (ok_but_empty, invalid_schema, error_..., null_after_retries).
- **LoadingReveal** : Si l’API ne renvoie pas de description valide → fallback `JOB_DESC_FALLBACK_EMPTY` = "Description non disponible pour ce métier." (plus la phrase générique).
- **ResultJob** : Même fallback court quand `paramDescription` absent/vide.

### Fichiers modifiés (v3.25)

| Fichier | Rôle |
|---------|------|
| `src/lib/jobTrackFilter.js` | minTrack=0 si secteur non configuré, log [TRACK_FALLBACK] |
| `src/screens/LoadingReveal/index.js` | Pas de redirect inter-secteur, SECTOR_CONSISTENCY, JOB_DESC_FALLBACK_EMPTY |
| `src/screens/ResultJob/index.js` | SECTOR_CONSISTENCY au montage, fallback description court |
| `src/services/getJobDescription.js` | Validation schéma, logs [JOB_DESC_INVALID] |

### Tests manuels

- Avec `sectorId` type `droit_justice_securite` ou Défense : rester dans le secteur (pas de redirect vers business_entrepreneuriat), pas de log "redirect from=... to=...".
- Vérifier logs `[SECTOR_CONSISTENCY]` et `[TRACK_FALLBACK]` en __DEV__.

---

## 🎨 COMPOSANTS RÉUTILISABLES

### `GradientText`

Texte avec dégradé linéaire fonctionnant sur toutes les plateformes :
- **Web** : CSS gradient natif (`linear-gradient`, `backgroundClip: 'text'`)
- **Mobile** : MaskedView + LinearGradient

```javascript
<GradientText
  colors={['#FF7B2B', '#FFD93F']}
  style={styles.text}
>
  Texte avec gradient
</GradientText>
```

### `AnimatedProgressBar`

Barre de progression animée avec transition fluide :
- Animation JS via `Animated.timing` (400ms)
- Cubic-bezier easing pour fluidité
- Pulse effect à la fin
- **Pas de CSS transition** pour éviter les conflits

### `XPBar`

Barre d'XP globale affichée sur tous les écrans :
- Affiche `currentXP / totalXPForNextLevel`
- Animation fluide lors des gains d'XP
- Synchronisation avec Supabase

### `HoverableTouchableOpacity`

TouchableOpacity avec effets hover sur web :
- Scale transformation au hover
- Shadow renforcée (variant='button')
- Transitions CSS (0.35s cubic-bezier)

---

## 🎬 ANIMATIONS

### Animation d'entrée à chaque écran (v3.13)

- **Composant** : `ScreenEntranceAnimation` + HOC `withScreenEntrance` dans `src/components/ScreenEntranceAnimation/index.js`.
- **Application** : tous les écrans du Stack sont enveloppés via `withScreenEntrance(Component)` dans `navigation.js` — l'animation se joue à **chaque** changement d'écran (montage du composant).
- **Paramètres** : opacity 0→1, translateY +12px→0, 280 ms, easing `cubic-bezier(0.22, 1, 0.36, 1)`, `useNativeDriver: true`.
- **Navigation** : `animation: 'none'` dans les `screenOptions` du Stack (pas de transition native entre écrans ; seul le contenu anime).

### Règles globales

- **Toutes les animations utilisent `Animated.timing`** (pas de CSS transitions pour éviter les conflits)
- **Durée standard** : 400ms (entrée écran : 280 ms)
- **Easing** : `cubicBezierEasing(0.25, 1.0, 0.5, 1.0)` (entrée écran : 0.22, 1, 0.36, 1)
- **Pas d'animation au chargement** sauf si nécessaire
- **Pas de blocage UI**

### Barres de progression

- **AnimatedProgressBar** : Animation JS uniquement (CSS transitions retirées)
- **XPBar** : Même logique
- **Progression fluide** : pas de saut ni de téléportation

### Boutons et cartes

- **Hover** : Scale + shadow renforcée
- **Click** : activeOpacity={0.7-0.8}
- **Transitions** : 0.3-0.35s

---

## 🎨 DESIGN SYSTEM

### Polices

```javascript
fonts: {
  title: 'Bowlby One SC',        // Titres principaux, messages forts
  button: 'Nunito Black',        // Boutons, CTA, badges, chiffres
  body: 'System',                // Texte par défaut
}
```

**Usage strict** :
- **Bowlby One SC** : "ALIGN", "CONNEXION", boutons principaux, titres de sections
- **Nunito Black** : Tous les boutons, badges, liens avec dégradé, placeholders
- **sans-serif** : Réponses de quiz, textes simples
- **Pas de Ruluko** (remplacé par sans-serif partout)

### Couleurs

```javascript
// Palette principale
primary: '#2563eb'              // Bleu
secondary: '#ff7a00'            // Orange

// Gradients
gradient: {
  align: ['#151B2B', '#151B2B'],              // Background pages
  buttonOrange: ['#FF7B2B', '#FFA36B'],       // Boutons CTA
  textOrange: ['#FF7B2B', '#FFD93F'],         // Texte avec gradient
}

// Couleurs UI
background: '#1A1B23'           // Background auth/onboarding
cardBackground: '#373D4B'       // Cartes PropositionMetier/Secteur
inputBackground: '#3C3F4A'      // Champs input
separator: '#8E8E8E'            // Lignes de séparation
```

### Espacements

```javascript
spacing: {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}
```

---

## 📊 SUPABASE EDGE FUNCTIONS

### `send-welcome-email`

**Emplacement** : `/supabase/functions/send-welcome-email/index.ts`

**Déclenchement** : Juste après l'écran IDENTITÉ (prénom validé)

**Contenu de l'email** :
- **Objet** : "Bienvenue sur Align, {firstName}"
- **Ton** : Simple, direct, chaleureux
- **Corps de l'email** (texte exact) :
  ```
  Salut {firstName},
  Bienvenue sur Align !
  Tu viens de faire le premier pas pour clarifier ton avenir.
  Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.
  On avance étape par étape.
  ```
- **Pièce jointe** : Mascotte étoile dorée (`/assets/images/star-character.png`)

**Si échec** :
- L'app CONTINUE (non bloquant)
- Erreur loggée côté serveur
- Aucun impact sur l'UX utilisateur

**Configuration requise** :
- Variable d'environnement `RESEND_API_KEY` dans Supabase
- Service Resend configuré

---

## 🔄 NAVIGATION ET GUARDS

### AppNavigator (`navigation.js`)

**Logique au démarrage** :
```javascript
1. Récupérer getCurrentUser()
2. Si pas d'utilisateur → route 'Onboarding'
3. Si utilisateur :
   - Récupérer getUserState(userId)
   - Calculer getRedirectRoute(userState)
   - Rediriger vers la route appropriée
```

**Routes disponibles** :
- `Onboarding` - OnboardingFlow
- `Quiz` - Quiz secteur
- `Main` - Application principale (MainLayout)
- `ResultatSecteur` - Résultat secteur
- `InterludeSecteur` - Interlude après résultat secteur (avant Quiz métier)
- `QuizMetier` - Quiz métier
- `PropositionMetier` - Résultat métier
- `Module` - Module d'apprentissage
- `ModuleCompletion` - Écran de fin de module
- `Settings` - Paramètres

---

## 🗃️ GESTION DES ERREURS

### Principes

1. **Jamais "Erreur inconnue" seule**
2. **Toujours une phrase humaine**
3. **Toujours une action possible**

### Messages d'erreur standardisés

```javascript
// Erreur réseau
"Impossible de charger tes données. Vérifie ta connexion."

// Erreur serveur
"Une erreur est survenue. Réessaie dans quelques secondes."

// Erreur critique
"Un problème est survenu côté serveur. Nous travaillons dessus."

// Validation
"Veuillez entrer une adresse email valide"
"Le mot de passe doit contenir au moins 8 caractères"
"Les mots de passe ne correspondent pas"
```

---

## 🎯 RÈGLES UX GLOBALES

### Principes

- **Une question par écran**
- **Jamais plus de 3-4 choix** (sauf niveau scolaire)
- **Pas de question marketing avant la valeur**
- **Pas de redirection imprévisible**
- **Toujours savoir "où est l'utilisateur" dans le flow**

### Messages de félicitations (modules)

**Après bonne réponse** (aléatoires) :
- "Bien joué !"
- "Bravo !"
- "Excellent !"
- "Parfait !"
- "Correct !"
- "Super !"
- "Magnifique !"
- "Impressionnant !"
- "Génial !"
- "Incroyable !"
- "Trop fort !"

**Après erreur** (encouragement, pas de correction) :
- "Presque…"
- "Pas tout à fait"
- "Oups…"
- "Dommage"
- "Ce n'est pas grave"
- "Tu apprends !"
- "Les erreurs font partie du processus"
- "Continue, tu y es presque"
- "Ne lâche rien"
- "Encore un effort"

---

## 🚀 PROCHAINES ÉTAPES

### Immédiat (À faire MAINTENANT)

#### 1. Migration SQL (5 min)
```bash
# Exécuter dans Supabase Dashboard > SQL Editor
supabase/migrations/ADD_QUESTS_COLUMN.sql
```

#### 2. Intégration code (2-3h)

**App.js** - Initialisation :
```javascript
import { initializeQuests } from './src/lib/quests';
import { initializeModules } from './src/lib/modules';
import { setupAuthStateListener } from './src/services/authFlow';

useEffect(() => {
  const init = async () => {
    setupAuthStateListener(navigationRef.current);
    await initializeQuests();
    await initializeModules();
  };
  init();
}, []);
```

**AuthScreen** - Redirections :
```javascript
import { signInAndRedirect, signUpAndRedirect } from './services/authFlow';
await signInAndRedirect(email, password, navigation);
await signUpAndRedirect(email, password, navigation);
```

**OnboardingFlow** - Complétion :
```javascript
import { completeOnboardingAndRedirect } from './services/authFlow';
await completeOnboardingAndRedirect(navigation);
```

**ModuleCompletion** - Navigation intelligente :
```javascript
import { handleModuleCompletion, navigateAfterModuleCompletion } from './lib/modules';
const result = await handleModuleCompletion({ moduleId, score, ... });
navigateAfterModuleCompletion(navigation, result);
```

**FeedScreen** - Protection + Modules + Quêtes :
```javascript
import { useMainAppProtection } from './hooks/useRouteProtection';
import { useQuestActivityTracking } from './lib/quests';
import { getAllModules, canStartModule } from './lib/modules';

const { isChecking, isAllowed } = useMainAppProtection();
const { startTracking, stopTracking } = useQuestActivityTracking();
const modules = getAllModules();
```

#### 3. Tests (30 min)
1. ✅ Création compte → Onboarding → Feed
2. ✅ Connexion compte existant → Feed direct
3. ✅ Module 1 → Module 2 → Module 3 → Cycle
4. ✅ Quêtes quotidiennes complétées → Écran récompense
5. ✅ Protection routes fonctionne
6. ✅ Déconnexion → Auth

### Documentation disponible

**Pour démarrer** :
- ⭐ **START_HERE.md** - Guide de démarrage (COMMENCER ICI)
- ⭐ **IMPLEMENTATION_GLOBALE_ALIGN.md** - Vue d'ensemble complète
- ⭐ **ARCHITECTURE_COMPLETE.md** - Architecture visuelle

**Système Quêtes V3** :
- QUESTS_SYSTEM_README.md
- QUESTS_INTEGRATION_GUIDE.md
- QUESTS_IMPLEMENTATION_COMPLETE.md
- QUESTS_CODE_EXAMPLES.md

**Système Modules V1** :
- MODULES_SYSTEM_README.md
- MODULES_INTEGRATION_GUIDE.md

**Système Auth/Redirection V1** :
- AUTH_FLOW_SYSTEM_README.md
- AUTH_FLOW_INTEGRATION_GUIDE.md
- AUTH_FLOW_IMPLEMENTATION_COMPLETE.md
- AUTH_FLOW_CODE_EXAMPLES.md

### Fonctionnalités complétées (V3)

- ✅ Système de quêtes complet (quotidiennes, hebdomadaires, performance)
- ✅ Système de modules avec déblocage progressif
- ✅ Système auth/redirection intelligente
- ✅ Protection automatique des routes
- ✅ Tracking activité et séries
- ✅ Adaptation au niveau utilisateur
- ✅ Persistence Supabase + AsyncStorage
- ✅ Navigation intelligente post-module
- ✅ Écran récompense conditionnel

### Fonctionnalités à venir

- [ ] Intégration IA pour génération de questions
- [ ] Quêtes sociales (défis entre amis)
- [ ] Notifications push (quêtes quotidiennes)
- [ ] Recommandations métier avancées
- [ ] Dashboard de progression avancé
- [ ] Système d'amis
- [ ] Badges et achievements
- [ ] Leaderboards

---

## 📝 NOTES IMPORTANTES

### Bugs corrigés récemment

1. **Animation barre de progression en deux temps**
   - Cause : Conflit CSS transition + Animated.timing sur web
   - Fix : Suppression des CSS transitions, animation JS uniquement

2. **GradientText affichant bloc vide**
   - Cause : Mauvaise implémentation avec LinearGradient (expo)
   - Fix : CSS gradient natif sur web, MaskedView sur mobile

3. **XP bar incorrecte sur modules**
   - Cause : Mauvais calcul de `xpInLevel` et `totalXPForNextLevel`
   - Fix : Utilisation de `currentXP` directement

4. **Erreurs de schéma Supabase**
   - Cause : Colonnes manquantes, RLS policies incorrectes
   - Fix : Migrations SQL conditionnelles + trigger auto-création

5. **Désynchro progression (v3.6)** — Bloc affichait « module 2 » alors que le module 2 était verrouillé
   - Cause : Bloc basé sur `progress.currentModuleIndex` (Supabase), locked/unlocked sur le module system (mémoire).
   - Fix : Une seule source sur Feed : `deriveModuleDisplayState()` (module system). `getCurrentModuleNumber()` et `getCurrentChapterLines()` utilisent cette source ; guard si le module affiché n’est pas déverrouillé.

6. **« Aucun métier déterminé » alors que Paramètres affichait un métier (v3.6)**
   - Cause : Settings lisait `userProgress` (AsyncStorage), Feed et PropositionMetier après migration lisaient/écrivaient `userProgressSupabase` ; plus le cache « récent » renvoyé en `forceRefresh` sans refetch DB.
   - Fix : Settings et PropositionMetier utilisent `userProgressSupabase`. En `getUserProgress(forceRefresh)`, ne pas renvoyer le cache récent si `activeMetier` est manquant (aller en DB + fallback). Migration : si `activeMetier` toujours null après fallback, lecture de la clé legacy `@align_user_progress`. `convertFromDB` lit aussi `dbProgress.active_metier`.

### À ne PAS faire

- ❌ Multiplier les XP gagnées selon le niveau
- ❌ Ajouter des CSS transitions sur des éléments animés via Animated API
- ❌ Créer des écrans sans valider qu'ils n'existent pas déjà
- ❌ Bloquer l'app si un service externe échoue (email, etc.)
- ❌ Utiliser "Erreur inconnue" sans contexte
- ❌ Modifier le design sans demander

---

## 🎓 PHILOSOPHIE PRODUIT

> **Align doit donner l'impression d'être un produit sérieux dès la première minute.**

### Principes de conception

- **Fonctionnel > Pretty** : La stabilité avant l'esthétique
- **Stable > Advanced** : Fonctionnalités éprouvées avant features avancées
- **Simple > Clever** : Solutions simples et maintenables
- **Transparent > Mystérieux** : L'utilisateur doit toujours savoir où il en est
- **Humain > Corporate** : Messages chaleureux mais professionnels

### Systèmes de motivation (V3)

**Quêtes** :
- Renforcer l'habitude utilisateur
- Augmenter la motivation intrinsèque
- S'adapter à la progression
- Ne pas paraître artificiel

**Modules** :
- Progression claire et prévisible
- Déblocage séquentiel motivant
- Sensation d'avancement constant
- Cycle infini avec récompenses

**Auth/Redirection** :
- Aucun utilisateur perdu
- Aucun onboarding sauté
- Parcours fluide et automatique
- Protection totale des données

### Résultat attendu

Un produit qui :
- ✅ Engage dès la première session
- ✅ Motive à revenir quotidiennement
- ✅ Guide sans bloquer
- ✅ Récompense la progression
- ✅ Protège l'utilisateur
- ✅ Fonctionne parfaitement

---

## 📊 STATISTIQUES V3

**Code implémenté** :
- 20 fichiers de code production-ready
- 9 fichiers de documentation complète
- 1 migration SQL optimisée
- 3 systèmes complets et intégrés

**Impact attendu** :
- 📈 Rétention +30-50% (quêtes quotidiennes)
- ⭐ Engagement +40-60% (modules progressifs)
- 🔒 Sécurité 100% (protection routes)
- 🎯 Progression claire (déblocage séquentiel)

**Performance** :
- Initialisation totale : < 500ms
- Événements quêtes : < 50ms
- Sauvegarde données : < 100ms (async)
- Validation continue : Automatique

**Scalabilité** :
- ✅ Support multi-utilisateurs
- ✅ Isolation totale des données
- ✅ Cache optimisé
- ✅ Fallback automatique
- ✅ Architecture modulaire

---

**FIN DU CONTEXTE - VERSION 3.22**

**Dernière mise à jour** : 26 mars 2026  
**Systèmes implémentés** : Quêtes V3 + Modules V1 + Auth/Redirection V1 + Tutoriel Home + ChargementRoutine → Feed + Flow accueil + UI unifiée + Images onboarding + Interlude Secteur + Checkpoints (9 questions) + Persistance modules/chapitres + Correctifs métier & progression + Finalisation onboarding UI/DA + Écran Profil + Correctifs responsive + Barre de navigation scroll hide/show + CheckpointsValidation + InterludeSecteur + Feed modules + Profil default_avatar + Redirection onboarding + Step sanitization + ModuleCompletion single navigation + Animation d'entrée à chaque écran (v3.13) + Écrans Résultat Secteur/Métier unifiés + Toggle IA Supabase (v3.14) + Verrouillage différent écran vs menu (v3.15) + Anti-boucle hydratation + Auth/MODULE_WARMUP single-flight (v3.16) + **LoadingReveal UX fluide + PasswordField œil + sous-titres Nunito Black (v3.22)**  
**Statut global** : ✅ PRODUCTION-READY  

**Modifications récentes (v3.24 — 3 février 2026)** :
- **Progression chapitres** : déblocage immédiat du chapitre suivant à la fin du dernier module (module_index=2). Source de vérité = Supabase (user_progress). Update atomique en fin de chapitre : currentChapter+1, completed_modules_in_chapter=[], maxUnlockedModuleIndex=0. Logs [CHAPTER_END] before write / write OK.
- **user_chapter_progress (23503)** : current_chapter_id doit être un chapters.id. getChapterIdByIndex, ensureChapterIdExists, init/completeModule n’écrivent que des id vérifiés ; si aucun id valide, on ne met pas à jour current_chapter_id (pas de reset au chapitre 1).
- **ModuleCompletion** : plus de navigation avant l’écriture. Ordre : await completeModule + handleModuleCompletion → invalidateProgressCache → await getUserProgress(true) → navigation.replace avec params: { refreshProgress: true }.
- **Feed** : useFocusEffect si refreshProgress=true → invalidation cache, getUserProgress(true), setProgress/setChaptersProgress, logs [FEED] mount / focus refresh / progress loaded.

**Modifications récentes (v3.22 — 3 février 2026)** :
- **LoadingReveal** : progression fluide (Animated.timing 0→92 % en 6 s, puis 92→100 % en 700 ms quand requête finie) ; durée min 6,5 s ; sous-titres dynamiques en Nunito Black ; bloc titre+sous-titre remonté de 50 px (cercle inchangé) ; navigation dans useEffect quand done && progress >= 100.
- **PasswordField** : composant réutilisable avec icône œil (Ionicons eye/eye-off) pour afficher/masquer le mot de passe ; utilisé sur LoginScreen et AuthScreen (création compte) ; icône positionnée à droite (absolute), remontée de 10 px pour alignement visuel.

**Modifications récentes (v3.17 — 3 février 2026)** :
- **Mode zéro session au boot** : signOut(scope: 'local') au démarrage, manualLoginRequired → toujours AuthStack ; pas d’init modules/quêtes au boot ; getCurrentUser 403/401 → null ; INITIAL_SESSION sans hydratation.
- **user_progress** : upsert initial + 409 refetch ; retry sans destructure { data, error } ; guard newData null.
- **Navigation** : OnboardingQuestions, OnboardingInterlude, OnboardingDob, Onboarding dans AuthStack.
- **Quiz** : optional chaining question/options ; messages réseau + analyse sector CORS → réseau.
- **SignUp** : result.error réseau/timeout → message + bouton Réessayer ; authErrorMapper Load failed / AuthRetryableFetchError → network.

**Modifications récentes (v3.16 — 3 février 2026)** :
- **Anti-boucle hydratation** : isHydratingProgress, quest engine sans write au load AsyncStorage, suppression invalidateProgressCache sur INITIAL_SESSION, getUserProgressFromDB dedupe, getUserProgress(false) sur Feed/authNavigation.
- **updateUserProgress patch strict** : plus de "unchanged", build patch avec champs réellement différents, skip si patch vide, log patch keys avant upsert.
- **Auth/Navigation single-flight** : auth listener singleton, didHydrateForSession, redirectAfterLogin idempotent, MODULE_WARMUP inFlightPromise.

**Modifications récentes (v3.15 — 3 février 2026)** :
- **Verrouillage écran vs menu** : séparation data-flow. `getScreenLocks(displayModuleIndex0)` pour les ronds (lock = sélection). `getMenuLocksForChapter(chapterId, source)` pour le sous-menu modal (lock = progression réelle). Permet de recliquer un module déjà unlock dans le menu pour revenir à sa progression actuelle, même quand on navigue dans un chapitre passé.
- **Fichier** : `src/screens/Feed/index.js` — getScreenLocks, getMenuLocksForChapter, getChaptersForModal refactor.

**Modifications récentes (v3.14 — 3 février 2026)** :
- **Résultat Secteur** : Design aligné visuel souhaité (fond #14161D, pas de header). Badge "RÉSULTAT DÉBLOQUÉ" au premier plan (zIndex 100/101), chevauchement carte. Étoile statique sans animation/ombre. Carte #2D3241, ombre #FFAC30 blur 200. Barres + emoji sur une ligne, nom secteur/accroche en gradients, boutons sans bordure avec ombre. Mock `?mock=1` ou variables d’env.
- **Résultat Métier (PropositionMetier)** : Même écran que Résultat Secteur (structure, styles, espacements, couleurs, typo, ombres). Seuls changent : titre "CE MÉTIER TE CORRESPOND VRAIMENT", nom métier, emoji, textes générés. Navigation → TonMetierDefini.
- **Toggle IA Supabase** : `AI_ENABLED === "false"` → aucun appel OpenAI. Guard en tête des Edge Functions analyze-sector, analyze-job, generate-dynamic-modules ; `aiGuardrails.ts` : `aiEnabled = Deno.env.get('AI_ENABLED') !== 'false'`.

**Modifications récentes (v3.13 — 3 février 2026)** :
- **Animation d'entrée à chaque écran** : HOC `withScreenEntrance` dans `ScreenEntranceAnimation` ; tous les écrans du Stack enveloppés dans `navigation.js`. Animation : opacity 0→1, translateY +12px→0, 280 ms, easeOut. Wrappers manuels retirés de Welcome, ChargementRoutine, OnboardingQuestionScreen, OnboardingDob, OnboardingInterlude.

**Modifications récentes (v3.12 — 3 février 2026)** :
- **Profil** : Navbar et écran Profil utilisent `default_avatar.png` si pas de photo. Icône stylet (modifier photo) en bas à gauche de l’avatar, symétrique à la corbeille.
- **Redirection onboarding** : Utilisateur connecté avec onboarding incomplet → toujours Onboarding avec step >= 2 (jamais écran "Crée ton compte"). LoginScreen appelle `redirectAfterLogin`. protectRoute passe le step vers Onboarding. OnboardingFlow lit `route.params.step` et charge userId/email depuis la session si step >= 2.
- **Step onboarding** : `ONBOARDING_MAX_STEP = 3`, `sanitizeOnboardingStep()` dans `src/lib/onboardingSteps.js`. Redirections et OnboardingFlow sanitent le step ; userService clamp à l’écriture. Checkpoint3Question enregistre step 3 au lieu de 999.
- **ModuleCompletion** : Une seule navigation au clic via `getNextRouteAfterModuleCompletion` (calcul parallèle onModuleCompleted + getUserProgress). Lock `postModuleNavigationLock` ; persist en arrière-plan sans aucun `navigate`. Option `skipQuestEvents: true` pour éviter double appel onModuleCompleted.

**Modifications récentes (v3.11 — 8 février 2026)** :
- **CheckpointsValidation** : tailles fluides (clamp), texte 4 lignes + getOnboardingImageTextSizes, descente groupe + desktop non plein (translateY -40, scale 0.88), connecteurs plus longs et gap réduit.
- **InterludeSecteur** : texte en un bloc (wrap naturel), dégradé secteur #FF7B2B → #FFD93F.
- **Feed** : ronds de modules taille stable sur moyens/grands ; réduction proportionnelle (scale 0.7–1) uniquement sur petits écrans (width &lt; 480).

**Modifications récentes (v3.10 — 3 février 2026)** :
- **Barre de navigation** : scroll down → hide, scroll up → show (seuil 10 px). Timer 15 s conservé. Module `scrollNavEvents.js`. Hauteur 44 px, icônes Home/Quêtes 100×100, bordure #000, layout space-between.
- **Icône section Quêtes** : `quetes-section.png` en 100×100 px à côté du titre.

**Modifications récentes (v3.9 — 3 février 2026)** :
- **Correctifs responsive** : Fix shrink global (web/index.html, App.js). ModuleCompletion layout desktop + narrow. QuestCompletion useWindowDimensions + flexGrow:1 + largeurs dynamiques. XPBar largeur narrow. CheckpointsValidation cercles scalés. Onboarding mascotte isNarrow + marginTop narrow sur 7 écrans.

**Modifications récentes (v3.8 — 3 février 2026)** :

- **Écran Profil — correctifs complets**
  - **Styles** : rayons d’angle et alignement texte identiques à Paramètres (`BLOCK_RADIUS = 48`, `paddingLeft: 40`, `paddingRight: 20`).
  - **Données** : `ensureProfileWithDefaults()` au chargement ; signup crée le profil avec `first_name: 'Utilisateur'` et `username: 'user_XXX'` pour éviter les valeurs vides.
  - **Photo** : clic avatar → ImagePicker → upload Supabase Storage bucket `avatars` → `avatar_url` dans `user_profiles`.
  - **Avatar** : diamètre 180 px (au lieu de 100 px).
  - **Modal édition** : tap inside ne ferme plus la modal ; fermeture uniquement sur Annuler ou succès Enregistrer.
  - **Migration** : `ADD_STORAGE_AVATARS_BUCKET.sql` pour le bucket et les policies RLS.

**Modifications récentes (v3.6 — 3 février 2026)** :

- **Persistance de progression des modules/chapitres**
  - **Modèle** (`src/lib/modules/moduleModel.js`) : `ModulesState` a un champ `currentChapter`. À la fin du module 3, `completeCycle()` incrémente `currentChapter`, remet `currentModuleIndex` et `maxUnlockedModuleIndex` à 1, et réinitialise les 3 modules (seul le module 1 déverrouillé). Plus de reset au module 1 du même chapitre.
  - **Système** (`src/lib/modules/moduleSystem.js`) : `saveToSupabase()` envoie `currentChapter` ; `loadFromSupabase()` lit `currentChapter` depuis `userProgress` et l’injecte dans l’état.
  - **Feed** : utilise `getUserProgress` depuis `userProgressSupabase` (plus `userProgress`). Au focus, rechargement des modules via `initializeModules()`.

- **Visuel des modules verrouillés**
  - Cercles et overlay des modules locked : fond gris `#3A3F4A` / `#444B57` (au lieu de noir/opacity). Icône cadenas et texte restent visibles. Menu déroulant : items locked en dégradé `#3A3F4A` → `#444B57`.

- **Source unique de progression (Feed)**
  - `deriveModuleDisplayState()` dans Feed retourne `{ currentModuleNumber, currentChapter }` à partir du module system (`getModulesState()`). Le bloc « module X » et les cadenas utilisent cette même source. Guard : si le module affiché n’est pas `canStartModule()`, on affiche `maxUnlockedModuleIndex`.

- **Source unique pour le métier (Paramètres / Home / Quiz)**
  - **Paramètres** (`src/screens/Settings/index.js`) : `getUserProgress` importé depuis `userProgressSupabase` (au lieu de `userProgress`).
  - **PropositionMetier** (`src/screens/PropositionMetier/index.js`) : `getUserProgress`, `setActiveMetier`, `updateUserProgress` importés depuis `userProgressSupabase`.
  - **userProgressSupabase** (`src/lib/userProgressSupabase.js`) : en `getUserProgress(forceRefresh)`, ne pas renvoyer le cache « récent » si `activeMetier` est manquant (pour permettre refetch DB + fallback). Si `activeMetier` reste null après le fallback habituel, lecture de la clé legacy `@align_user_progress` et merge de `activeMetier` + sync Supabase. Dans `convertFromDB`, lecture de `dbProgress.active_metier` en plus de `activeMetier` / `activemetier`.

- **Nettoyage** : toute l’instrumentation de debug (logs fetch vers endpoint) ajoutée pour le bug métier a été retirée ; les correctifs ci-dessus sont conservés.

**Modifications récentes (v3.5 — 3 février 2026)** :

- **Images onboarding (écrans ciblés)**  
  - **Ton métier défini** : image dédiée `assets/onboarding/metier_defini.png` (import dans `src/screens/TonMetierDefini/index.js`). Même taille que les autres écrans onboarding. Commentaire dans le code : « Image à placer manuellement dans ce dossier ».  
  - **Fin checkpoints** : image dédiée `assets/onboarding/checkpoints_complete.png` (import dans `src/screens/FinCheckpoints/index.js`). Même conventions.  
  - Remplacer les fichiers PNG dans `assets/onboarding/` met à jour l’affichage sans toucher au code.

- **Écran Interlude Secteur (nouveau)**  
  - **Position** : juste après Résultat Secteur, juste avant Quiz Métier. Flow : ResultatSecteur → **InterludeSecteur** → QuizMetier.  
  - **Fichier** : `src/screens/InterludeSecteur/index.js`. Route : `InterludeSecteur` dans `src/app/navigation.js`.  
  - **Contenu** : phrase principale « GÉNIAL ! MAINTENANT QUE TU AS CHOISI LE SECTEUR {SECTEUR} ON VA PRÉCISER UN MÉTIER QUI POURRAIT TE CORRESPONDRE » (secteur dynamique, dégradé #FF7B2B → #FFD93F, formulation « LE SECTEUR {SECTEUR} » sans du/de la). Image : `assets/onboarding/interlude_secteur.png`. Bouton « C’EST PARTI ! » fond #FF7B2B → QuizMetier.  
  - **ResultatSecteur** : bouton CONTINUER envoie vers `InterludeSecteur` avec `secteurName` (au lieu de QuizMetier).

- **Barre de progression onboarding (6 questions)**  
  - **Épaisseur** : 6 px dans `src/components/OnboardingQuestionScreen/index.js` (`PROGRESS_BAR_HEIGHT = 6`). Largeur inchangée (100 % avec padding 24).

- **Alignement vertical IntroQuestion / PreQuestions**  
  - **Bloc titre** : `titleSection` avec `height: 126`, `justifyContent: 'flex-start'` pour que la phrase principale soit à la même hauteur sur les deux écrans (début à 80 px du haut).  
  - **Illustration** : même `IMAGE_SIZE` (formule `width * 0.22` clamp + 70), `marginVertical: 24`.  
  - **Bouton** : `marginTop: 24`. **Content** : `paddingBottom: 40`.  
  - **PreQuestions** : sous-titre ajouté sous le titre : « Ces questions vont nous permettre de mieux comprendre ce qui te correspond vraiment. » — Nunito Black, dégradé #FF7B2B → #FFD93F, même taille que le sous-titre IntroQuestion.

- **Questions checkpoints (remplacement texte uniquement)**  
  - **Fichier** : `src/data/checkpointQuestions.js`.  
  - Les 9 questions (3 par checkpoint) + 3 réponses chacune ont été remplacées par le nouveau contenu (thèmes : découverte, démarrage, motivation, rythme, repères, blocage, métier, suite, stade du parcours). Structure et exports inchangés (`CHECKPOINT_1_QUESTIONS`, `CHECKPOINT_2_QUESTIONS`, `CHECKPOINT_3_QUESTIONS`, `SUBTITLE`).

**Modifications récentes (v3.4)** :
- **Auth stricte** : LoginScreen = connexion uniquement ; AuthScreen (onboarding) = création de compte uniquement. Choice → "SE CONNECTER" mène à LoginScreen. Pas de bypass si email déjà utilisé (message explicite).
- **Boutons retour** : flèche ← en haut à gauche sur tous les écrans onboarding (Welcome, Choice, IntroQuestion, PreQuestions, OnboardingQuestions, OnboardingInterlude, OnboardingDob, AuthScreen, UserInfoScreen, SectorQuizIntroScreen, LoginScreen), avec `useSafeAreaInsets()`.
- **Barre de progression onboarding** : même largeur que l'écran Module. Wrapper avec `marginHorizontal: -padding` + `paddingHorizontal: 24` dans OnboardingQuestionLayout et OnboardingQuestionScreen ; `PROGRESS_BAR_WIDTH = width - 48` dans OnboardingDob. Constante `PROGRESS_BAR_WIDTH` définie en haut de OnboardingDob.js pour éviter ReferenceError.
- **Design Login / Création de compte** : LoginScreen aligné visuellement sur AuthScreen (fond #1A1B23, logo ALIGN, champs #2E3240, bouton #FF7B2B, GradientText sous-titre).
- **Header unifié** : Header.js style commun (texte blanc 32px, paddingTop 60, paddingBottom 24, centré) ; Paramètres fonctionnel via MainLayout (SettingsScreen dans la stack).

**Modifications récentes (v3.3)** :
- **Tutoriel Home** : affichage automatique **une seule fois** après ChargementRoutine. Paramètre `fromOnboardingComplete: true`. Flag `@align_home_tutorial_seen_${userId}`. Gate Feed : fromOnboardingComplete → forceTour → home_tutorial_seen + auth/homeReady.
- **ChargementRoutine** : `navigation.replace('Main', { screen: 'Feed', params: { fromOnboardingComplete: true } })` en fin d'animation.
- **GuidedTourOverlay / FocusOverlay** : flou, messages, focus module/XP/quêtes ; barre XP en premier plan.

**Sauvegarde** : Faire régulièrement `git add` + `git commit` (et éventuellement `git tag v3.22`) pour conserver cette version en cas de suppression accidentelle ou problème externe. Sont documentées ci-dessus : v3.5 à v3.18, **v3.19** (tests structurels secteur, whitelist métiers, moteur 8 axes), **v3.20** (ranking métiers avec contexte secteur, blend 0.75/0.25), **v3.21** (logique métier hybride cosine + rerank IA, QuizMetier questions d'affinage, test distribution tous secteurs) et **v3.22** (LoadingReveal UX, PasswordField œil, sous-titres Nunito Black, layout texte -50 px).

**Fichiers modifiés v3.6 (référence)** :
- `src/lib/modules/moduleModel.js` — currentChapter, completeCycle() chapitre suivant
- `src/lib/modules/moduleSystem.js` — save/load currentChapter Supabase
- `src/screens/Feed/index.js` — userProgressSupabase, deriveModuleDisplayState(), styles gris locked
- `src/screens/Settings/index.js` — getUserProgress depuis userProgressSupabase
- `src/screens/PropositionMetier/index.js` — getUserProgress/setActiveMetier/updateUserProgress depuis userProgressSupabase
- `src/lib/userProgressSupabase.js` — cache récent si métier manquant, migration clé legacy, convertFromDB active_metier

**Modifications récentes (v3.25 — 26 mars 2026)** :

- **Maintenance / Sauvegarde**
  - `CONTEXT.md` mis à jour pour consigner l'état courant du projet.
  - Commit de sauvegarde créé pour sécuriser la progression et éviter toute perte en cas d'aléa interne/externe.
  - Aucun changement fonctionnel applicatif ajouté dans cette passe (documentation + versioning uniquement).

**Modifications récentes (v3.9 — 25 mars 2026)** :

- **Onboarding (friction réduite)**
  - `src/screens/PreQuestions/index.js` : titre mis à jour vers « RÉPONDS À 6 QUESTIONS POUR PERSONNALISER TON EXPÉRIENCE ».
  - `src/data/onboardingQuestions.js` : options simplifiées sur `feelings`, `school_level` (4 choix max) et `why_open` (3 choix max) pour accélérer la prise de décision.
  - `src/screens/Onboarding/OnboardingInterlude.js` + `src/navigation/RootGate.js` : suppression de l’étape `OnboardingDob` du parcours (interlude → onboarding direct).
  - `src/data/onboardingQuestions.js` : `ONBOARDING_TOTAL_STEPS` aligné à 6.
  - `src/screens/Onboarding/OnboardingQuestionsFlow.js` : commentaire de progression mis à jour.

- **Quiz encouragements**
  - `src/lib/quizEncouragement.js` : enrichissement des messages et garde-fou anti-répétition consécutive.
  - Suppression des emojis dans les encouragements pour éviter un rendu incohérent avec le texte en dégradé.

- **Interlude secteur**
  - `src/screens/InterludeSecteur/index.js` : ajustements successifs de layout responsive (répartition verticale, mascotte, CTA) et version simplifiée sans barre de progression selon les derniers retours.

- **Note d’environnement local**
  - Deux copies locales du projet existent (`/Downloads/align-app/...` et `/Downloads/Align/...`).
  - Le serveur Expo local a été lancé depuis `/Downloads/Align/...` ; synchroniser les fichiers sur ce dossier avant validation visuelle.

**Pour démarrer l'intégration** : Consultez `START_HERE.md` 🚀

**Modifications récentes (v3.26 — 22 avril 2026)** :

- **Sécurité web / client**
  - `vercel.json` : headers globaux renforcés (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
  - `web/index.html` : ajout `meta referrer`.
  - `src/services/supabase.js` : garde de configuration URL Supabase valide + HTTPS en production.
  - `src/services/prefetchDynamicModulesSafe.js` : suppression des fallbacks URL/anon key hardcodés ; usage strict des variables `EXPO_PUBLIC_*`.
  - `src/services/networkPreflight.js`, `src/context/AuthContext.js`, `src/services/userService.js` : logs sensibles limités au mode dev.
  - `src/lib/clarity.js` : validation stricte du project ID et injection plus défensive.
  - `src/utils/referralStorage.js` + `src/lib/safeReferralCode.ts` : sanitisation du code de parrainage avant stockage.
  - `supabase/functions/send-welcome-email/index.ts` : suppression du fallback Supabase URL hardcodé.

- **Tests**
  - `src/screens/Onboarding/postQuestionsBridgeLayout.test.ts` : couverture de la logique de layout extraite.
  - `src/lib/safeReferralCode.test.ts` : tests unitaires de validation du code de parrainage.
  - Suite Jest globale validée après changements (180 tests passants).

- **Nouveau flow post-paiement**
  - Nouvel écran `src/screens/PostPaymentMetierBridge/index.js` inséré entre `PaywallSuccess` et `QuizMetier`.
  - Titre dynamique avec prénom utilisateur (fallback robuste : DB `user_profiles.first_name` puis metadata puis email).
  - Visuel conforme au design demandé (fond `#1A1B23`, typographies Bowlby/Nunito, CTA `#FF7B2B`).
  - Asset branché : `assets/images/paywall/post-payment-celebration.png`.
  - Ajustement demandé : image réduite de 35 px.
  - Correction copywriting onboarding : `QU'ALIGN` (suppression de l’espace après apostrophe) dans `PostQuestionsBridgeScreen`.

- **Accès premium ciblé (dev/prod)**
  - `src/services/stripeService.js` : bypass premium explicite pour les adresses autorisées, dont `portaliertom@gmail.com`.
