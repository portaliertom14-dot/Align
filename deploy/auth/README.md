# Configuration Auth & déploiement (Supabase)

## URL Configuration (obligatoire pour reset password)

Pour que les emails « Mot de passe oublié » redirigent vers la bonne URL (prod vs dev), configurer Supabase comme suit.

### Supabase Dashboard → Authentication → URL Configuration

- **Site URL**  
  Mettre l’URL de production de l’app :
  ```text
  https://align-app.fr
  ```

- **Redirect URLs**  
  Ajouter **toutes** les URLs autorisées (une par ligne), par exemple :
  ```text
  https://align-app.fr/*
  https://www.align-app.fr/*
  http://localhost:5173/*
  http://localhost:19006/*
  ```
  - `https://align-app.fr/*` et `https://www.align-app.fr/*` : production.
  - `http://localhost:5173/*` : dev web (Vite / Expo web).
  - `http://localhost:19006/*` : optionnel (Expo web autre port).

Sans ces Redirect URLs, le lien reçu par email après « Mot de passe oublié » peut être rejeté par Supabase ou rediriger vers une URL non autorisée.

### Résultat attendu

- **En prod** : le lien dans l’email ouvre `https://align-app.fr/reset-password`.
- **En dev** : le lien ouvre `http://localhost:5173/reset-password` (ou le port utilisé).

- **Côté app (Vercel)** : définir **`EXPO_PUBLIC_WEB_URL_PROD`** = `https://align-app.fr` pour que le front envoie la bonne `redirectTo`.
- **Côté Supabase (Edge Function)** : définir **`APP_URL`** ou **`WEB_URL_PROD`** = `https://align-app.fr` dans *Project Settings → Edge Functions → Secrets*. L’email « Mot de passe oublié » utilise cette URL pour le lien de reset : si le client envoie localhost, l’Edge Function l’ignore et met l’URL prod dans le mail.
