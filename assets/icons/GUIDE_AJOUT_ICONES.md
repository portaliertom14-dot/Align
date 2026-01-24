# 📋 Guide d'ajout des icônes de navigation

## ✅ État actuel

- ✅ Dossier `assets/icons/` existe
- ✅ Code configuré dans `src/components/BottomNavBar.js`
- ⏳ Fichiers PNG à ajouter

## 📍 Emplacement exact

**Chemin complet :**
```
/Users/admin/align-app/align-app/assets/icons/
```

## 📝 Fichiers à ajouter

Vous devez ajouter **3 fichiers PNG** avec ces noms exacts :

| Fichier | Description | Taille recommandée | Remplace |
|---------|-------------|-------------------|----------|
| `home.png` | Icône de maison 🏠 | 24x24px | Emoji 🏠 |
| `quests.png` | Icône de parchemin avec étoile 📜 | 24x24px | Emoji 📜 |
| `profile.png` | Icône d'étoile brillante 👤 | 28x28px | Emoji 👤 |

## 🎯 Comment ajouter les fichiers

### Méthode 1 : Glisser-déposer dans Cursor (Recommandé)

1. **Ouvrez l'explorateur de fichiers** dans Cursor (panneau gauche)
2. **Naviguez vers** : `assets/icons/`
3. **Glissez-déposez** vos 3 fichiers PNG directement dans ce dossier
4. **Vérifiez les noms** : ils doivent être exactement `home.png`, `quests.png`, `profile.png` (minuscules, sans espaces)

### Méthode 2 : Via le Finder (Mac)

1. Ouvrez le **Finder**
2. Appuyez sur `Cmd + Shift + G` (Aller au dossier)
3. Collez : `/Users/admin/align-app/align-app/assets/icons/`
4. Glissez-déposez vos fichiers
5. Renommez si nécessaire pour avoir les bons noms

## ✅ Vérification

Après avoir ajouté les fichiers, la structure devrait être :

```
assets/icons/
├── .gitkeep
├── README.md
├── GUIDE_AJOUT_ICONES.md
├── home.png      ← Votre icône de maison
├── quests.png    ← Votre icône de parchemin
└── profile.png   ← Votre icône d'étoile
```

## 🔄 Redémarrer le serveur

Après avoir ajouté les fichiers :
1. Arrêtez le serveur Expo (Ctrl+C)
2. Relancez avec : `npm run web` ou `npm start`
3. Les images remplaceront automatiquement les emojis

## ⚠️ Notes importantes

- Les noms de fichiers doivent être **exactement** : `home.png`, `quests.png`, `profile.png` (minuscules)
- Format : **PNG** uniquement
- Si les fichiers n'existent pas, les emojis seront affichés (fallback automatique)
- Le code détecte automatiquement les fichiers une fois ajoutés





















