# 📱 Structure du Projet Align

## 🗂️ Arborescence Complète

```
align-app/
│
├── 📄 App.js                    # Point d'entrée principal (Hello Align)
├── 📄 app.json                  # Configuration Expo
├── 📄 babel.config.js           # Configuration Babel
├── 📄 package.json              # Dépendances et scripts
├── 📄 README.md                 # Documentation
├── 📄 .env.example              # Variables d'environnement (template)
├── 📄 .gitignore                # Fichiers ignorés par Git
│
├── 📁 src/
│   │
│   ├── 📁 app/
│   │   └── 📄 navigation.js     # Navigation React Navigation
│   │
│   ├── 📁 screens/              # Écrans de l'application
│   │   ├── 📁 Quiz/
│   │   │   └── 📄 index.js      # Écran du quiz
│   │   ├── 📁 Feed/
│   │   │   └── 📄 index.js      # Écran du feed
│   │   ├── 📁 Profile/
│   │   │   └── 📄 index.js      # Écran de profil
│   │   └── 📁 SeriesViewer/
│   │       └── 📄 index.js      # Écran de visualisation des séries
│   │
│   ├── 📁 components/           # Composants réutilisables
│   │   ├── 📁 Button/
│   │   │   └── 📄 index.js      # Bouton personnalisé
│   │   ├── 📁 ProgressBar/
│   │   │   └── 📄 index.js      # Barre de progression
│   │   └── 📁 Card/
│   │       └── 📄 index.js      # Carte/Container
│   │
│   ├── 📁 services/             # Services métier
│   │   ├── 📄 supabase.js       # Client Supabase (initSupabase)
│   │   ├── 📄 scoring.js        # Calcul des scores
│   │   └── 📄 aiFeedback.js     # Feedback IA
│   │
│   ├── 📁 data/                 # Données statiques
│   │   ├── 📄 quiz40.json       # Questions du quiz (vide)
│   │   └── 📁 templates/        # Templates
│   │
│   ├── 📁 hooks/                # Hooks React personnalisés
│   ├── 📁 utils/                # Utilitaires
│   │
│   └── 📁 styles/
│       └── 📄 theme.js          # Thème Align (bleu/orange)
│
├── 📁 supabase/
│   └── 📄 schema.sql            # Schéma de base de données
│
└── 📁 assets/
    ├── 📁 icons/                # Icônes de l'application
    └── 📁 images/               # Images de l'application
```

## 🎨 Palette de Couleurs (Thème)

- **Bleu Primaire** : `#0A84FF` → `#0055FF` (gradient)
- **Orange Secondaire** : `#FF7A00`
- **Background** : `#FFFFFF`
- **Surface** : `#F5F5F5`

## 📦 Dépendances Principales

- **expo** : ~51.0.0
- **react-native** : 0.74.0
- **@react-navigation/native** : ^6.1.9
- **@supabase/supabase-js** : ^2.39.0
- **expo-linear-gradient** : ~13.0.2
- **expo-haptics** : ~13.0.1

## 🚀 Scripts Disponibles

```bash
npm start      # Démarrer Expo
npm run ios    # Démarrer sur iOS
npm run android # Démarrer sur Android
npm run web    # Démarrer sur Web
```

## 📊 État Actuel

✅ Structure complète créée
✅ Thème Align configuré
✅ Services Supabase initialisés
✅ Écrans et composants (squelettes)
✅ Schéma Supabase prêt
⏳ Fonctionnalités à implémenter

## 🔄 Prochaines Étapes

1. Configurer les variables d'environnement (.env)
2. Implémenter l'authentification
3. Développer l'écran Quiz
4. Implémenter le système de scoring
5. Créer le feed
6. Ajouter le profil utilisateur















