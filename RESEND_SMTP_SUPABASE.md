# Option A — Config SMTP Supabase avec Resend (expéditeur « Align »)

Ce guide permet d’envoyer **tous les emails Auth** (mot de passe oublié, confirmation d’inscription, etc.) via **Resend**, avec l’expéditeur **Align** au lieu de Supabase. **Aucun changement de code** : tout se fait dans les tableaux de bord Resend et Supabase.

---

## Ce que tu dois faire toi-même (≈ 2 min)

1. **Resend** : créer une clé API (si tu n’en as pas) et noter ton adresse d’envoi (ex. `noreply@align-app.fr`).
2. **Supabase** : ouvrir Auth → SMTP, activer le SMTP personnalisé, et coller les valeurs du tableau ci‑dessous (Host, Port, Username, Password = ta clé Resend, Sender email, Sender name = `Align`), puis **Save**.

**Ce que je ne peux pas faire** : je n’ai pas accès à tes comptes Resend ni Supabase. Je ne peux pas me connecter à ces sites ni cliquer à ta place. Il faut que tu ouvres les deux tableaux de bord et que tu colles les valeurs toi‑même. Une fois fait, les emails partiront en « Align » sans toucher au code.

---

## Prérequis

- Compte [Resend](https://resend.com) avec :
  - **Domaine vérifié** (ex. `align-app.fr`) pour l’adresse d’envoi
  - **Clé API** : [Resend → API Keys](https://resend.com/api-keys) → Create API Key
- Accès au **Supabase Dashboard** du projet (Auth / SMTP).

---

## 1. Valeurs à coller dans Supabase (SMTP)

À utiliser dans **Supabase** → **Authentication** → **SMTP Settings** :

| Champ Supabase | Valeur à mettre |
|----------------|-----------------|
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | Ta **clé API Resend** (copier depuis [Resend → API Keys](https://resend.com/api-keys)) |
| **Sender email** | Ton adresse sur domaine vérifié, ex. `noreply@align-app.fr` |
| **Sender name** | `Align` |

Liens utiles : [Resend – SMTP](https://resend.com/docs/send-with-smtp), [Resend – Supabase](https://resend.com/docs/send-with-supabase-smtp).

---

## 2. Étapes dans le Supabase Dashboard

1. Va sur [Supabase Dashboard](https://supabase.com/dashboard) → ton projet.
2. Menu gauche : **Authentication** → **SMTP** (ou **Project Settings** → **Auth** → bloc SMTP).
3. **Enable Custom SMTP** : activer.
4. Remplir chaque champ avec les valeurs du tableau ci‑dessus (Host, Port, Username, Password, Sender email, Sender name).
5. Cliquer **Save**.

Après sauvegarde, les emails Auth (reset password, confirm signup, etc.) partent via Resend et s’affichent comme **Align**.

---

## 3. (Optionnel) Template « Reset password »

Pour adapter le texte de l’email (sujet / corps) sans changer le lien :

1. **Authentication** → **Email Templates** → **Reset password**.
2. Modifier **Subject** et **Body** si besoin. **Ne pas supprimer** le lien : il doit rester `{{ .ConfirmationURL }}`.
3. Sauvegarder.

L’app ne change pas : `resetPasswordForEmail()` et la page `/reset-password` restent inchangés.

---

## 4. Vérification

- Dans l’app : **Mot de passe oublié** → entrer un email → « Regarde tes emails ».
- Dans la boîte de réception : l’expéditeur doit être **Align** (ou « Align &lt;noreply@…&gt; »), et le lien doit aller vers `/reset-password` comme avant.

---

## Dépannage rapide

- **Erreur d’envoi** : vérifier que le **Sender email** est bien une adresse sur un **domaine déjà vérifié** dans Resend (Domains).
- **Limite d’envoi** : après activation du SMTP custom, Supabase applique par défaut une limite (ex. 30 emails/heure). Tu peux l’ajuster dans **Authentication** → **Rate Limits** si besoin.

---

## Résumé

- **Option A** = config SMTP dans Supabase (Resend en relais, expéditeur Align). Aucun changement dans le code (auth.js, ForgotPasswordScreen, ResetPasswordScreen).
- Les emails de bienvenue envoyés par l’Edge Function Resend existante ne sont pas modifiés.
