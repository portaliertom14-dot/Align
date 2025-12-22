# Ajustements Design & UX

## Modifications apportées

### 1. Accueil — Ronds & Logos
- **Ronds agrandis** : Les cercles des modules passent de 100px à 140px pour une meilleure visibilité
- **Logos personnalisés** : Remplacement des emojis par des logos personnalisés (cerveau, éclair, boussole)
- **Structure** : Les logos sont chargés depuis `assets/images/modules/` pour faciliter le remplacement manuel

### 2. Barre de progression niveau (Accueil)
- Ajout d'une barre de progression sous le niveau utilisateur
- Dégradé obligatoire : #34C659 → #00AAFF
- Progression dynamique basée sur l'XP (modulo 100)

### 3. Quêtes hebdomadaires
- Barre de progression avec dimensions exactes :
  - Longueur : 285px
  - Hauteur : 20px
  - Rayon d'angle : 15px
- Couleurs :
  - Fond : #DADADA
  - Progression : #FF7B2B

### 4. Profil — Photo de profil
- Upload local de photo (pas de backend)
- Photo affichée en haut de la section Informations
- Photo affichée à côté de chaque champ (prénom, nom, pseudo) si disponible
- Avatar par défaut avec initiales si aucune photo

## Installation de expo-image-picker (optionnel)

Pour activer l'upload de photo de profil :

```bash
npx expo install expo-image-picker
```

Si le package n'est pas installé, un message s'affichera à l'utilisateur lors de la tentative d'upload.

## Fichiers modifiés

- `src/screens/Feed/index.js` - Accueil avec ronds agrandis et barre de progression niveau
- `src/screens/Quetes/index.js` - Barre de progression spécifique pour les quêtes
- `src/screens/Profil/index.js` - Upload et affichage de photo de profil

## Logos des modules

Les logos sont stockés dans `assets/images/modules/` :
- `brain.png` - Module 1 (Mini-Simulations Métier)
- `lightning.png` - Module 2 (Apprentissage & Mindset)
- `compass.png` - Module 3 (Test de Secteur)

Pour remplacer un logo, il suffit de remplacer le fichier correspondant dans ce dossier.





