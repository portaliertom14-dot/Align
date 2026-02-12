# Templates d'emails Align

## Reset password (réinitialisation mot de passe)

**L’email est envoyé par Align via Resend**, pas par Supabase. L’Edge Function **`send-password-recovery-email`** :

1. Génère un lien de recovery avec l’Admin API Supabase (`generateLink` type `recovery`).
2. Envoie l’email via l’API Resend avec le HTML Align (même design que `reset-password-align.html`).

**Template HTML final** : `reset-password-align.html`  
- Design : fond #1A1B23, bloc #2E3240, max 600px, padding 40px, CTA dégradé #FF7B2B → #FFD93F. Texte exact selon spec (Salut {{ firstName }}, Mot de passe oublié ?, signature Align).  
- **Supabase** : Auth → Email Templates → Reset password → coller le corps du fichier ; sujet : **Reprends l'accès à ton parcours Align**. Remplacer `{{ firstName }}` par `{{ .Data.first_name }}` si tu utilises le prénom en user metadata.  
- **Resend (emails reçus)** : le même HTML est généré par l’Edge Function. Pour que les modifications soient visibles sur les emails reçus, redéployer : `supabase functions deploy send-password-recovery-email`.

**Déploiement (obligatoire)** : la fonction doit être déployée pour que « Mot de passe oublié » fonctionne. Elle est appelée par des utilisateurs **non connectés** (`verify_jwt = false` dans `supabase/config.toml`). Redéploiement après modification :
```bash
supabase functions deploy send-password-recovery-email
```
Puis configurer les secrets listés ci‑dessous.

- **Secrets requis** (Dashboard → Project Settings → Edge Functions → Secrets) :
  - `RESEND_API_KEY`
  - `FROM_EMAIL` (optionnel ; défaut : `Align <hello@align-app.fr>`)
  - `APP_URL` ou `WEB_URL_PROD` (pour `redirectTo` vers `/reset-password`)
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

**Redirect URLs (obligatoire)** : **Authentication** → **URL Configuration** → **Redirect URLs** :
- En dev : `http://localhost:XXXX/reset-password`
- En prod : `https://TON_DOMAINE/reset-password`

**Important** : l’app n’utilise plus `resetPasswordForEmail()` ; tout passe par l’Edge Function. Le template Supabase “Reset password” n’est plus utilisé pour l’envoi (Option B : tu peux y coller `reset-password-align.html` au cas où).

---

## Aucun email reçu (troubleshooting)

1. **Edge Function (Resend)**  
   - Fonction déployée : `supabase functions deploy send-password-recovery-email`  
   - Secrets : `RESEND_API_KEY`, `APP_URL` (ou `WEB_URL_PROD`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`  
   - L’utilisateur doit exister dans **Auth → Users** (sinon pas de lien généré ; l’app affiche quand même « email envoyé » pour ne pas fuiter l’info).

2. **Supabase Auth (non utilisé pour l’envoi)**  
   L’app n’appelle plus `resetPasswordForEmail`. Si tu veux un fallback manuel, **Auth → Email Templates → Reset password** peut contenir le corps de `reset-password-align.html` et **Redirect URLs** doit inclure ton domaine + `/reset-password`.

3. **Logs**  
   En dev, en cas d’erreur : `[ForgotPassword] Edge Function error`, `[ForgotPassword] resetPasswordForEmail error` dans la console.

---

## Confirm signup (optionnel)

Pour harmoniser l’email de confirmation d’inscription avec Supabase :
- **Auth** → **Email Templates** → **Confirm signup**
- Utiliser le même style que `reset-password.html` (fond #1A1B23, card #2E3240, CTA orange) et le lien `{{ .ConfirmationURL }}`.
