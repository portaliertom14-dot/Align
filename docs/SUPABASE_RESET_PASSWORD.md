# Supabase Auth — Reset password (mot de passe oublié)

L’app utilise **uniquement Supabase Auth** pour l’envoi des emails de réinitialisation (pas d’Edge Function, pas de Resend).

## Config requise dans le Dashboard Supabase

1. **Authentication → URL Configuration**
   - **Site URL** : `https://www.align-app.fr`
   - **Redirect URLs** : doit inclure au minimum :
     - `https://www.align-app.fr/reset-password`
     - En dev : `http://localhost:XXXX/reset-password` (remplacer XXXX par le port utilisé)

2. Aucun secret ni Edge Function n’est nécessaire pour le reset password.
