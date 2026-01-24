# 📧 Configuration Email de Bienvenue - Align

## ✅ Système en place

Un système complet d'envoi d'email de bienvenue est maintenant configuré et fonctionnel.

### Fonctionnalités

- ✅ Envoi automatique après l'onboarding (après saisie prénom, nom, nom d'utilisateur)
- ✅ Email envoyé uniquement une fois par utilisateur (flag `welcome_email_sent`)
- ✅ Contenu personnalisé avec le prénom de l'utilisateur
- ✅ Mascotte Align (star.png) intégrée dans l'email
- ✅ Utilisation du SDK Resend officiel
- ✅ Gestion d'erreurs robuste

## 📋 Contenu de l'email

- **From**: `Align <onboarding@resend.dev>`
- **Subject**: `Bienvenue sur Align 🚀`
- **Contenu**:
  ```
  Salut {{prenom}}, bienvenue sur Align !
  
  Tu viens de faire le premier pas pour clarifier ton avenir.
  
  Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.
  
  On avance étape par étape.
  
  — L'équipe Align
  ```
- **Mascotte**: Image star.png affichée dans l'email (via Content-ID)

## 🔧 Configuration requise

### 1. Migration SQL

La migration `add_welcome_email_flag.sql` doit être appliquée pour ajouter la colonne `welcome_email_sent` à la table `profiles`:

```bash
# Via Supabase Dashboard
# SQL Editor → Exécuter le contenu de supabase/migrations/add_welcome_email_flag.sql

# OU via CLI
 push
```

### 2. Configuration Resend

1. **Créer un compte Resend** (si pas déjà fait)
   - Aller sur https://resend.com
   - Créer un compte gratuit (100 emails/jour)

2. **Obtenir la clé API**
   - Dashboard Resend → API Keys
   - Créer une nouvelle clé API
   - Copier la clé

3. **Configurer le secret dans Supabase**
   ```bash
   supabase secrets set RESEND_API_KEY=votre_cle_api_resend
   ```

4. **⚠️ IMPORTANT : Limitation de l'email de test**
   - L'email de test `onboarding@resend.dev` ne peut envoyer qu'à l'adresse email de votre compte Resend
   - **Pour envoyer à d'autres destinataires**, vous devez :
     1. Vérifier un domaine dans Resend (https://resend.com/domains)
     2. Configurer `RESEND_FROM_EMAIL` avec un email de ce domaine :
        ```bash
        supabase secrets set RESEND_FROM_EMAIL="Align <noreply@votre-domaine.com>"
        ```
   - **Pour les tests** : Utilisez votre email de compte Resend comme destinataire

### 3. Héberger la mascotte (star.png)

L'image de la mascotte doit être accessible publiquement dans Supabase Storage:

1. **Créer un bucket public** (si pas déjà fait)
   - Supabase Dashboard → Storage
   - Créer un bucket nommé `email-assets`
   - Rendre le bucket public

2. **Uploader star.png**
   - Uploader `assets/icons/star.png` dans le bucket `email-assets`
   - S'assurer que le fichier est nommé `star.png`

3. **Vérifier l'URL**
   - L'URL doit être: `https://[votre-project-ref].supabase.co/storage/v1/object/public/email-assets/star.png`
   - Cette URL est déjà configurée dans `supabase/functions/send-welcome-email/index.ts` (ligne 68)

### 4. Déployer l'Edge Function

```bash
# Se connecter à Supabase
supabase login

# Lier le projet (si pas déjà fait)
supabase link --project-ref votre-project-ref

# Déployer la fonction
supabase functions deploy send-welcome-email
```

## 🔄 Flux d'envoi

1. **Utilisateur complète l'onboarding**
   - Saisit prénom, nom, nom d'utilisateur
   - Clique sur "Continuer" sur l'écran 5

2. **Sauvegarde du profil**
   - Le profil est sauvegardé dans Supabase

3. **Vérification du flag**
   - Le système vérifie si `welcome_email_sent = true` pour cet utilisateur
   - Si `true` → Email déjà envoyé, on skip
   - Si `false` ou `null` → On continue

4. **Envoi de l'email**
   - Appel à l'Edge Function `send-welcome-email`
   - L'Edge Function utilise le SDK Resend pour envoyer l'email
   - La mascotte est attachée avec Content-ID `mascot-align`

5. **Marquage comme envoyé**
   - Si l'envoi réussit, `welcome_email_sent = true` est mis à jour
   - L'utilisateur ne recevra plus cet email

## 📁 Fichiers modifiés

### Backend (Edge Function)
- `supabase/functions/send-welcome-email/index.ts`
  - Utilise le SDK Resend officiel (`resend@2.0.0`)
  - From: `Align <onboarding@resend.dev>`
  - URL mascotte: `star.png`
  - Logs propres et clairs

### Frontend (Service)
- `src/services/emailService.js`
  - Template HTML mis à jour selon spécifications
  - Subject: `Bienvenue sur Align 🚀`
  - Contenu exact demandé
  - Gestion du flag `welcome_email_sent`

### Intégration
- `src/screens/Onboarding/index.js`
  - Appel à `sendWelcomeEmailIfNeeded()` après sauvegarde du profil
  - Gestion d'erreurs non-bloquante

### Migration
- `supabase/migrations/add_welcome_email_flag.sql`
  - Ajoute la colonne `welcome_email_sent` à la table `profiles`
  - Index pour performance

## 🧪 Test

1. **Compléter l'onboarding** avec un utilisateur ayant:
   - Email valide
   - Prénom non vide

2. **Vérifier les logs**
   - Console frontend: `[EMAIL] ✅ Email de bienvenue envoyé avec succès`
   - Supabase Dashboard → Functions → send-welcome-email → Logs

3. **Vérifier la réception**
   - Vérifier la boîte email (Gmail, Outlook, etc.)
   - L'email doit contenir:
     - Subject: "Bienvenue sur Align 🚀"
     - Mascotte visible
     - Contenu personnalisé avec le prénom

4. **Vérifier le flag**
   ```sql
   SELECT id, welcome_email_sent 
   FROM profiles 
   WHERE id = 'user-id';
   ```
   - `welcome_email_sent` doit être `true`

5. **Test de non-duplication**
   - Compléter l'onboarding à nouveau avec le même utilisateur
   - L'email ne doit PAS être envoyé une deuxième fois
   - Logs: `[EMAIL] ℹ️ Email de bienvenue déjà envoyé pour cet utilisateur`

## ⚠️ Dépannage

### Erreur: "RESEND_API_KEY non configurée"
- **Solution**: Configurer le secret: `supabase secrets set RESEND_API_KEY=votre_cle`

### Erreur: "You can only send testing emails to your own email address"
- **Cause**: L'email de test `onboarding@resend.dev` ne peut envoyer qu'à l'email de votre compte Resend
- **Solution pour PRODUCTION**:
  1. Vérifier un domaine dans Resend (https://resend.com/domains)
  2. Configurer `RESEND_FROM_EMAIL` avec un email de ce domaine :
     ```bash
     supabase secrets set RESEND_FROM_EMAIL="Align <noreply@votre-domaine.com>"
     ```
  3. Redéployer la fonction: `supabase functions deploy send-welcome-email`
- **Solution pour TESTS**: Utiliser votre email de compte Resend comme destinataire

### Erreur: "domain is not verified"
- **Solution**: Utiliser `onboarding@resend.dev` (déjà configuré par défaut) OU vérifier votre domaine dans Resend
- Ne pas configurer `RESEND_FROM_EMAIL` avec un domaine non vérifié

### Erreur: "Invalid `from` field"
- **Solution**: Vérifier que `RESEND_FROM_EMAIL` suit le format `email@example.com` ou `Name <email@example.com>`
- **Solution alternative**: Supprimer `RESEND_FROM_EMAIL` pour utiliser le format par défaut :
  ```bash
  supabase secrets unset RESEND_FROM_EMAIL
  ```

### Mascotte non visible dans l'email
- **Vérifier**: L'image `star.png` est bien dans le bucket `email-assets`
- **Vérifier**: Le bucket est public
- **Vérifier**: L'URL dans l'Edge Function correspond à votre project-ref

### Email non envoyé
- **Vérifier**: Les logs dans Supabase Dashboard → Functions → send-welcome-email
- **Vérifier**: Le prénom n'est pas vide
- **Vérifier**: L'email utilisateur est valide
- **Vérifier**: Le flag `welcome_email_sent` n'est pas déjà `true`

## 📝 Notes importantes

- L'email est envoyé **uniquement depuis le backend** (Edge Function)
- L'email n'est envoyé qu'**une seule fois** par utilisateur
- L'envoi d'email ne bloque **pas** l'onboarding en cas d'erreur
- Le système utilise `onboarding@resend.dev` par défaut (pas besoin de domaine personnalisé)
- Pour la production avec volume important, envisager de vérifier un domaine dans Resend
