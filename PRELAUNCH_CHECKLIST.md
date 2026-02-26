# Checklist pré-launch — Clean-up & sécurisation

## ✅ Réalisé dans cette passe

### Section 1 — Sécurité & secrets
- **Supabase client** : plus de clé anon en dur ; `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` obligatoires.
- **networkPreflight** : idem, plus de fallback URL.
- **Logs** : aucun email, userId complet, birthdate ou payload sensible en production. Logs sensibles limités à `__DEV__`.
- **Backdoor supprimée** : bloc spécifique `tomprt14@yahoo.com` retiré de `userProgressSupabase.js`.
- **.env.example** : commentaires sur clés (pas de secret en EXPO_PUBLIC_*), `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_CLARITY_PROJECT_ID`.

### Section 2 — RLS Supabase
- **Migration** `supabase/migrations/20250203120000_RLS_PRELAUNCH_ALL_TABLES.sql` : RLS activé sur `user_profiles`, `user_progress`, `user_modules`, `ai_modules`, `scores`, `quiz_responses`, `user_chapter_progress` (si les tables existent), policies strictes `auth.uid() = id` ou `user_id`.

### Section 3 — Données utilisateur
- **Export** : `downloadUserData()` corrigé (formats Promise.all, pas de log des données ; sur mobile utilisation de `Share` au lieu de la console).
- **Suppression de compte** : service `accountDeletion.js` + Edge Function `supabase/functions/delete-my-account/index.ts` (suppression données public + `auth.users`), puis déconnexion et nettoyage AsyncStorage.
- **Paramètres** : blocs « Télécharger mes données », « Contact support », « Supprimer mon compte » (avec double confirmation).
- **Config** : `src/config/appConfig.js` avec `SUPPORT_EMAIL` (configurable via `EXPO_PUBLIC_SUPPORT_EMAIL`).

### Section 7 — Microsoft Clarity
- **Intégration** : `src/lib/clarity.js` + chargement dans `App.js` uniquement si `Platform.OS === 'web'` et `NODE_ENV === 'production'` et `EXPO_PUBLIC_CLARITY_PROJECT_ID` défini. Aucun PII envoyé.

---

## À faire côté déploiement

1. **Edge Function delete-my-account**
   - Déployer : `supabase functions deploy delete-my-account`
   - Secrets Supabase : `SUPABASE_ANON_KEY` (disponible dans Dashboard → Settings → API → anon public) doit être défini en secret pour que la fonction puisse résoudre l’utilisateur depuis le JWT.

2. **Migration RLS**
   - Exécuter la migration `20250203120000_RLS_PRELAUNCH_ALL_TABLES.sql` (Supabase Dashboard → SQL Editor ou `supabase db push`).

3. **Variables d’environnement production**
   - `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY` (obligatoires).
   - `EXPO_PUBLIC_SUPPORT_EMAIL` (ex. `align.app.contact@gmail.com`).
   - Optionnel : `EXPO_PUBLIC_CLARITY_PROJECT_ID` pour Clarity en prod web.

---

## Sections 4, 5, 6, 8, 9 (recommandations)

- **Section 4 (routing)** : RootGate déjà déterministe ; vérifier manuellement qu’il n’y a pas de boucle (secteur incompatible → fallback déjà partiellement en place dans LoadingReveal).
- **Section 5 (progression)** : `ResultJob` et `LoadingReveal` ont déjà un fallback si `topJobsLength === 0` (métier générique). Vérifier qu’aucune UI n’affiche « Aucun métier déterminé ».
- **Section 6 (réseau)** : `withTimeout` existe ; appliquer timeout/retry sur les appels critiques si besoin.
- **Section 8 (build)** : `expo export --platform web` pour la prod ; pas de `__DEV__` en prod.
- **Section 9 (hygiène)** : suppression du code mort et factorisation à faire au fil de l’eau (audit ciblé recommandé).

---

## Fichiers modifiés / ajoutés

| Fichier | Action |
|--------|--------|
| `src/services/supabase.js` | Suppression clé/URL en dur |
| `src/services/networkPreflight.js` | Idem |
| `src/services/emailService.js` | Logs sensibles → `__DEV__` uniquement |
| `src/services/auth.js` | Idem |
| `src/services/welcomeEmailService.js` | Idem |
| `src/services/userProfileService.js` | Idem |
| `src/lib/userProgressSupabase.js` | Suppression backdoor + logs sensibles |
| `src/services/dataExport.js` | Correction export + pas de log données, Share sur mobile |
| `src/config/appConfig.js` | **Nouveau** — SUPPORT_EMAIL |
| `src/services/accountDeletion.js` | **Nouveau** — suppression compte |
| `supabase/functions/delete-my-account/index.ts` | **Nouveau** — Edge Function |
| `src/screens/Settings/index.js` | Export, Contact support, Supprimer compte |
| `supabase/migrations/20250203120000_RLS_PRELAUNCH_ALL_TABLES.sql` | **Nouveau** — RLS |
| `src/lib/clarity.js` | **Nouveau** — Clarity prod only |
| `App.js` | Init Clarity (web prod) |
| `.env.example` | SUPPORT_EMAIL, CLARITY, note sécurité |
