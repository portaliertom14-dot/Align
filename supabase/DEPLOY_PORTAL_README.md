# Déployer stripe-create-portal (Annuler mon abonnement)

L’app appelle le projet Supabase **yuqybxhqhgmeqmcpgtvw**.  
Sans projet lié, `supabase functions deploy` peut déployer ailleurs → 404.

## Étapes (à faire une seule fois puis à chaque déploiement)

1. **Lier le bon projet** (obligatoire la première fois) :
   ```bash
   cd /Users/tom.portalier/Downloads/align-app/align-app
   supabase link --project-ref yuqybxhqhgmeqmcpgtvw
   ```
   Si demandé : connecte-toi (Supabase login) et choisis l’organisation du projet.

2. **Déployer la fonction** :
   ```bash
   supabase functions deploy stripe-create-portal
   ```

3. Vérifier : dans le Dashboard Supabase → projet **yuqybxhqhgmeqmcpgtvw** → Edge Functions → la fonction `stripe-create-portal` doit apparaître.

4. Dans l’app : Paramètres → « Annuler mon abonnement » doit ouvrir le portail Stripe (ou « Aucun abonnement actif »).
