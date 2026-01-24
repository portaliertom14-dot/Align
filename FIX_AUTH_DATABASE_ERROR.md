# 🚨 FIX : Database error saving new user

## **Problème identifié**

Les logs runtime montrent que :
- ✅ L'email n'existe pas dans la base
- ❌ `supabase.auth.signUp()` échoue avec erreur 500 "Database error saving new user"
- ❌ Un trigger ou une RLS policy empêche la création de nouveaux utilisateurs

**Cause racine** : Un trigger sur `auth.users` (probablement `on_auth_user_created`) échoue et bloque toutes les créations de comptes.

---

## **✅ SOLUTION IMMÉDIATE**

### **Étape 1 : Exécuter le script SQL de nettoyage**

1. **Ouvrir le dashboard Supabase** : https://supabase.com/dashboard
2. **Aller dans** : `SQL Editor`
3. **Copier-coller** le contenu du fichier : `supabase/migrations/DISABLE_AUTH_TRIGGERS.sql`
4. **Cliquer sur** : `Run`
5. **Vérifier** qu'il n'y a pas d'erreur SQL

---

### **Étape 2 : Tester la création de compte**

1. Rafraîchir l'application web
2. Essayer de créer un compte avec un **nouvel email**
3. Le compte devrait se créer sans erreur

---

### **Étape 3 : Si ça ne fonctionne toujours pas**

#### **Vérifier les logs Supabase**

1. Dashboard Supabase → `Logs` → `Postgres Logs`
2. Chercher des erreurs autour du timestamp de votre tentative de création
3. Copier-coller l'erreur exacte

#### **Vérifier que les tables existent**

Exécuter dans SQL Editor :
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
);

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_progress'
);
```

Les deux requêtes doivent retourner `true`.

---

## **🔍 Ce que les logs ont révélé**

```json
// L'email n'existe PAS
{"location":"auth.js:26","data":{"emailExists":false}}

// Supabase échoue avec erreur 500
{"location":"auth.js:48","data":{
  "hasError":true,
  "errorMsg":"Database error saving new user",
  "errorCode":"unexpected_failure",
  "errorStatus":500
}}

// Ce n'est PAS un problème de duplication
{"location":"auth.js:62","data":{"isDuplicate":false}}
```

---

## **📌 Prochaines étapes**

1. **Exécuter** `DISABLE_AUTH_TRIGGERS.sql` dans Supabase
2. **Tester** la création d'un nouveau compte
3. **Rapporter** si ça fonctionne ou si l'erreur persiste
