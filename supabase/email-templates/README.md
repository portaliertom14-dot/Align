# Templates d'emails Align

## Mot de passe oublié

Géré par **Supabase Auth** uniquement (emails envoyés par Supabase). L’app appelle `supabase.auth.resetPasswordForEmail` ; aucun Edge Function ni Resend. Voir `docs/SUPABASE_RESET_PASSWORD.md` pour la config (Site URL, Redirect URLs).

---

## Confirm signup (optionnel)

Pour harmoniser l’email de confirmation d’inscription avec Supabase :
- **Auth** → **Email Templates** → **Confirm signup**
- Utiliser le même style que les autres emails (fond #1A1B23, card #2E3240, CTA orange) et le lien `{{ .ConfirmationURL }}`.
