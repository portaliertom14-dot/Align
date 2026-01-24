# Configuration de l'Email de Bienvenue

Ce document explique comment configurer l'envoi d'emails de bienvenue dans l'application Align.

## 📋 Vue d'ensemble

Le système d'email de bienvenue est activé automatiquement après que l'utilisateur ait terminé l'onboarding et renseigné :
- Prénom (firstName)
- Nom (lastName)
- Nom d'utilisateur (username)

L'email est envoyé **une seule fois** grâce à un flag `welcome_email_sent` dans la table `profiles`.

## 🔧 Configuration

### 1. Migration de la base de données

Exécutez la migration SQL pour ajouter la colonne `welcome_email_sent` :

```bash
# Via Supabase Dashboard
# 1. Allez dans SQL Editor
# 2. Exécutez le fichier: supabase/migrations/add_welcome_email_flag.sql
```

Ou via la ligne de commande :

```bash
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/add_welcome_email_flag.sql
```

### 2. Configuration du service d'email

Vous avez deux options :

#### Option A: Supabase Edge Functions (Recommandé)

1. **Créer un compte Resend** (ou un autre service d'email)
   - Inscrivez-vous sur https://resend.com
   - Obtenez votre clé API

2. **Configurer les secrets dans Supabase**
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   supabase secrets set RESEND_FROM_EMAIL="Align <noreply@votre-domaine.com>"
   ```

3. **Déployer la Edge Function**
   ```bash
   # Installer Supabase CLI si pas déjà fait
   npm install -g supabase

   # Se connecter
   supabase login

   # Lier votre projet
   supabase link --project-ref votre-project-ref

   # Déployer la fonction
   supabase functions deploy send-welcome-email
   ```

4. **Télécharger l'image de la mascotte**
   - Uploader `assets/icons/star.png` dans Supabase Storage
   - Ou héberger l'image sur un CDN
   - Mettre à jour l'URL dans `supabase/functions/send-welcome-email/index.ts`

#### Option B: Service d'email externe (Alternative)

Si vous préférez utiliser un autre service (SendGrid, Mailgun, etc.), modifiez `src/services/emailService.js` :

1. Remplacez l'appel à `supabase.functions.invoke` par un appel direct à l'API de votre service
2. Mettez à jour le template HTML si nécessaire

### 3. Utiliser l'image de la mascotte

L'email inclut une image de mascotte (l'étoile Align). Pour que l'image s'affiche :

1. **Option 1: Pièce jointe (Content-ID)**
   - L'image est attachée à l'email avec `Content-ID: mascot-align`
   - Le HTML référence l'image via `src="cid:mascot-align"`
   - ✅ Fonctionne dans la plupart des clients email

2. **Option 2: URL publique**
   - Héberger l'image sur un CDN ou Supabase Storage
   - Utiliser une URL directe dans le HTML
   - ⚠️ Certains clients email bloquent les images externes

## 🎨 Personnalisation du template

Le template HTML se trouve dans `src/services/emailService.js` dans la fonction `generateWelcomeEmailTemplate()`.

Pour modifier le contenu :
1. Modifiez le HTML dans `generateWelcomeEmailTemplate()`
2. Modifiez le texte brut dans `generateWelcomeEmailText()`
3. Les styles CSS sont inline pour une meilleure compatibilité

## 🧪 Test en développement

En mode développement (`__DEV__ === true`), les emails ne sont pas réellement envoyés, mais loggés dans la console :

```
[EMAIL] 📝 [DÉVELOPPEMENT] Email qui serait envoyé:
[EMAIL] À: user@example.com
[EMAIL] Sujet: Bienvenue sur Align, John 👋
[EMAIL] Contenu texte: ...
```

Pour tester l'envoi réel :
1. Configurez la Edge Function Supabase
2. Définissez `NODE_ENV=production` (ou supprimez le check `__DEV__`)
3. Testez avec un compte réel

## ✅ Vérification

Pour vérifier que l'email a été envoyé :

1. **Vérifier le flag dans la base de données** :
   ```sql
   SELECT id, welcome_email_sent, first_name 
   FROM profiles 
   WHERE welcome_email_sent = true;
   ```

2. **Vérifier les logs** :
   - Console de l'app : `[EMAIL] ✅ Email de bienvenue envoyé avec succès`
   - Logs Supabase Edge Functions (si utilisées)

3. **Vérifier la boîte de réception** de l'utilisateur

## 🔍 Dépannage

### L'email n'est pas envoyé

1. **Vérifier que le prénom est présent** :
   ```sql
   SELECT id, first_name FROM profiles WHERE id = 'user-id';
   ```

2. **Vérifier que l'email n'a pas déjà été envoyé** :
   ```sql
   SELECT welcome_email_sent FROM profiles WHERE id = 'user-id';
   ```

3. **Vérifier les logs de l'app** :
   - Chercher les messages `[EMAIL]` dans la console
   - Vérifier les erreurs éventuelles

### L'image ne s'affiche pas

1. **Vérifier que l'image est bien attachée** (Option 1)
2. **Vérifier que l'URL de l'image est accessible** (Option 2)
3. **Tester avec différents clients email** (Gmail, Outlook, etc.)

### Erreur Edge Function

1. **Vérifier que les secrets sont configurés** :
   ```bash
   supabase secrets list
   ```

2. **Vérifier les logs de la fonction** :
   ```bash
   supabase functions logs send-welcome-email
   ```

3. **Tester la fonction manuellement** :
   ```bash
   supabase functions invoke send-welcome-email --body '{"email":"test@example.com","firstName":"Test","subject":"Test","html":"<p>Test</p>","text":"Test"}'
   ```

## 📚 Ressources

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend API Documentation](https://resend.com/docs)
- [Email HTML Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)

## 🔐 Sécurité

- ⚠️ Ne commitez jamais les clés API dans le code
- ✅ Utilisez les secrets Supabase pour stocker les clés API
- ✅ Validez toujours les emails et prénoms avant l'envoi
- ✅ Limitez le taux d'envoi pour éviter le spam
