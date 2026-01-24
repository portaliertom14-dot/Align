# Mascotte Align - Étoile Dorée

## Description

La mascotte officielle d'Align est une **étoile dorée brillante et joyeuse** avec :
- Corps en forme d'étoile à 5 branches arrondies
- Couleur or/jaune éclatant avec reflets orangés
- Texture brillante et glossy (aspect "jelly")
- Visage kawaii avec grands yeux ronds et sourire chaleureux
- Aura lumineuse orange-jaune autour du corps
- Bras et jambes courts et arrondis
- Pose accueillante et ouverte

## Fichier

**Nom** : `star-character.png`  
**Emplacement** : `/assets/images/star-character.png`

## Utilisation

### Email de bienvenue

La mascotte est attachée en pièce jointe à l'email de bienvenue envoyé après l'écran IDENTITÉ de l'onboarding.

**Contenu de l'email** :
```
Salut {firstName},
Bienvenue sur Align !
Tu viens de faire le premier pas pour clarifier ton avenir.
Ici, tout est pensé pour t'aider à trouver une voie qui t'intéresse vraiment.
On avance étape par étape.
```

**Pièce jointe** : `star-character.png`

### Fonction Edge Supabase

La mascotte doit être convertie en base64 et attachée via la fonction Edge :

```typescript
// Dans /supabase/functions/send-welcome-email/index.ts
attachments: [{
  filename: 'align_mascot.png',
  content: base64ImageData, // Données base64 de star-character.png
}]
```

## Caractéristiques visuelles

- **Style** : Cartoon kawaii, amical, accueillant
- **Couleurs dominantes** : Or (#FFD700), Orange (#FF7B2B), Jaune (#FFD93F)
- **Émotion** : Joie, positivité, encouragement
- **Effet lumineux** : Aura brillante, sparkles

## Notes de branding

Cette mascotte représente :
- L'**étoile qui guide** vers l'avenir professionnel
- La **lumière** qui éclaire le chemin
- La **positivité** et l'encouragement
- L'**accessibilité** et la bienveillance d'Align

La mascotte incarne les valeurs d'Align : **chaleur, guidance, simplicité, positivité**.
