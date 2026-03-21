# Configuration WAY - Intelligence Artificielle d'Align

## 🎯 Introduction

**WAY** est l'intelligence artificielle centrale d'Align. Elle remplace toutes les logiques fixes par une vraie intelligence qui :
- Analyse le profil cognitif de l'utilisateur
- Détermine UN secteur principal (pas plusieurs)
- Propose 1 à 3 métiers crédibles et réalistes
- Génère de vrais modules interactifs uniques
- Valide les réponses avec feedback intelligent

## ⚙️ Configuration rapide

### 1. Obtenir une clé API OpenAI

1. Aller sur https://platform.openai.com/api-keys
2. Créer une nouvelle clé API
3. Copier la clé (ne jamais la mettre dans le frontend)

### 2. Configurer la clé côté serveur uniquement

- Pour les **Supabase Edge Functions** : définir `OPENAI_API_KEY` dans les secrets Supabase (Dashboard → Edge Functions → Secrets).
- Pour les **scripts Node locaux** (comme `embed_esco.mjs`) : exporter `OPENAI_API_KEY` dans ton shell avant d'exécuter le script.

⚠️ **Ne jamais** mettre de clé OpenAI dans une variable `EXPO_PUBLIC_*` ni dans le code frontend.

## 📋 Vérification

Pour vérifier que way est configuré :

1. Compléter le quiz secteur → way détermine le secteur
2. Compléter le quiz métier → way propose 1-3 métiers
3. Commencer un module → way génère un module unique

Si la clé n'est pas configurée, vous verrez un avertissement dans la console et way utilisera des fallbacks basiques.

## 🔒 Sécurité (Production)

⚠️ **IMPORTANT** : Pour la production, la clé API ne doit PAS être dans le code client.

**Solution recommandée :**
1. Créer un backend API (Node.js/Express)
2. Le backend expose way comme endpoints
3. Le client appelle le backend, pas OpenAI directement
4. La clé API reste secrète côté serveur

Pour le MVP, la configuration actuelle est acceptable, mais migrez vers un backend avant la mise en production.

## 💰 Coûts

- Modèle utilisé : `gpt-4o-mini` (économique)
- Coût approximatif : ~$0.0001 par appel API
- 1000 appels = ~$0.10

Pour un MVP avec quelques dizaines d'utilisateurs, les coûts restent très faibles.

## 🐛 Dépannage

### Erreur "OPENAI_API_KEY non configurée"

Vérifier que :
- Les secrets Supabase contiennent bien `OPENAI_API_KEY`
- Pour les scripts Node, la variable d’environnement `OPENAI_API_KEY` est définie dans ton terminal

### Erreur "OpenAI API error: 401"

La clé API est invalide ou expirée. Générer une nouvelle clé sur platform.openai.com

### Erreur "OpenAI API error: 429"

Limite de taux atteinte (60 appels/minute en free tier). Attendre quelques secondes ou upgrader le compte OpenAI.

## 📚 Documentation complète

Voir `WAY_INTEGRATION.md` pour la documentation technique complète.






