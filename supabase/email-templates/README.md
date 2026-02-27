# Templates d'emails Align

## Mot de passe oublié

Géré par **Supabase Auth** : l’app appelle `supabase.auth.resetPasswordForEmail`. Pour que l’expéditeur soit **Align** (au lieu de Supabase), configurer le **SMTP personnalisé Supabase** avec **Resend** : voir le guide **[RESEND_SMTP_SUPABASE.md](../../RESEND_SMTP_SUPABASE.md)** à la racine du projet (Option A — aucun changement de code). Config Site URL / Redirect URLs : voir `docs/SUPABASE_RESET_PASSWORD.md` si présent.

---

## Confirm signup (optionnel)

Pour harmoniser l’email de confirmation d’inscription avec Supabase :
- **Auth** → **Email Templates** → **Confirm signup**
- Utiliser le même style que les autres emails (fond #1A1B23, card #2E3240, CTA orange) et le lien `{{ .ConfirmationURL }}`.
