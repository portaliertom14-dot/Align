# Checklist — Flow Reset Password (Supabase recovery)

## Où le redirect vers Onboarding est bloqué

- **RootGate** (`src/navigation/RootGate.js`) : si `isRecoveryFlow()` → on rend `AuthStack` (écran ResetPassword), on ne rend jamais `AppStack` avec Onboarding.
- **AuthContext** (`src/context/AuthContext.js`) : sur `SIGNED_IN`, si `isRecoveryFlow()` → on ne lance pas `fetchProfileForRouting` (donc pas de mise à jour onboarding → pas de décision vers Onboarding).
- **recoveryBootstrap** (`src/lib/recoveryBootstrap.js`) : exécuté au chargement du bundle (avant Supabase) ; pose le flag et redirige vers `/reset-password` si l’URL contient les tokens.

## Test en navigation privée

1. **Demander un nouveau lien** : depuis l’app, aller sur « Mot de passe oublié », saisir l’email, envoyer.
2. **Cliquer UNE fois** sur le lien reçu dans l’email.
3. **Vérifier** : l’écran affiché est `/reset-password` (formulaire « Nouveau mot de passe »), pas l’Onboarding.
4. **Définir un nouveau mot de passe** : remplir les deux champs, valider.
5. **Vérifier** : message de succès puis bouton « Se connecter » ; après connexion, l’app fonctionne normalement (pas de boucle vers Onboarding).

## Désactiver le log de debug après validation

Dans `src/navigation/RootGate.js`, passer `ENABLE_ROUTING_DEBUG` à `false` pour supprimer les logs `[ROUTING_DECISION]` en prod.
