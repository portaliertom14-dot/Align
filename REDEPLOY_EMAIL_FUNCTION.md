# Redéploiement de la fonction send-welcome-email

## Étapes pour redéployer la fonction avec les logs de debug

1. **Installer Supabase CLI** (si pas déjà fait):
   ```bash
   npm install -g supabase
   ```

2. **Se connecter à Supabase**:
   ```bash
   supabase login
   ```

3. **Lier le projet** (si pas déjà fait):
   ```bash
   supabase link --project-ref yuqybxhqhgmeqmcpgtvw
   ```

4. **Déployer la fonction**:
   ```bash
   supabase functions deploy send-welcome-email
   ```

5. **Vérifier les logs après reproduction**:
   ```bash
   supabase functions logs send-welcome-email --tail
   ```

## Vérification des variables d'environnement

Assurez-vous que les secrets suivants sont configurés dans Supabase Dashboard:
- **RESEND_API_KEY**: Votre clé API Resend
- **RESEND_FROM_EMAIL** (optionnel): Email d'expéditeur (par défaut: onboarding@resend.dev)

Pour vérifier/configurer:
1. Allez dans Supabase Dashboard
2. Project Settings > Edge Functions > Secrets
3. Vérifiez que `RESEND_API_KEY` est configuré

## Après le redéploiement

1. Reproduisez le problème (créer un nouveau compte)
2. Consultez les logs dans Supabase Dashboard > Edge Functions > send-welcome-email > Logs
3. Les nouveaux logs détaillés devraient indiquer la cause exacte de l'erreur 500
