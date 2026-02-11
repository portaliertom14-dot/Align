# Templates d'emails Align

## Reset password (réinitialisation mot de passe)

**L’email est envoyé par Align via Resend**, pas par Supabase. L’Edge Function `send-reset-password-email` :

1. Génère un lien de recovery avec l’Admin API Supabase (`generateLink` type `recovery`).
2. Envoie l’email via l’API Resend avec le HTML Align.

**Déploiement (obligatoire)** : la fonction doit être déployée pour que « Mot de passe oublié » fonctionne. Elle est appelée par des utilisateurs **non connectés**, donc il faut désactiver la vérification JWT sur la gateway :
```bash
supabase functions deploy send-reset-password-email --no-verify-jwt
```
Puis configurer les secrets listés ci‑dessous.

- **Fichier source du design** : `reset-password.html` (placeholder `{{CONFIRMATION_URL}}` remplacé dans la function par le lien généré).
- **Secrets requis** (Supabase Edge Function / Dashboard → Project Settings → Edge Functions → Secrets) :
  - `RESEND_API_KEY`
  - `FROM_EMAIL` (ex. `no-reply@alignapp.fr`)
  - `APP_URL` (ex. `http://localhost:5173` ou `https://ton-app.com`)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

**Redirect URLs** : dans **Auth** → **URL Configuration** → **Redirect URLs**, ajouter l’URL de l’app (ex. `https://ton-app.com/reset-password` ou l’origine + `/reset-password`).

**Important** : désactiver l’envoi d’email “Reset password” par Supabase si tu veux que seul Align envoie (pas d’email double). Tu peux laisser le template Supabase vide ou désactiver les emails de type “recovery” côté projet si l’option existe.

---

## Confirm signup (optionnel)

Pour harmoniser l’email de confirmation d’inscription avec Supabase :
- **Auth** → **Email Templates** → **Confirm signup**
- Utiliser le même style que `reset-password.html` (fond #1A1B23, card #2E3240, CTA orange) et le lien `{{ .ConfirmationURL }}`.
