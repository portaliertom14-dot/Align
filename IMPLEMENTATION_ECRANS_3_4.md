# ÉCRANS 3 ET 4 — INTRODUCTION ET PRÉ-QUESTIONS

## 📋 Résumé

Création de deux écrans d'introduction strictement conformes aux maquettes fournies :
1. **Écran 3 (IntroQuestion)** - "Tu te poses des questions sur ton avenir ?"
2. **Écran 4 (PreQuestions)** - "Réponds à 6 petites questions avant de commencer !"

Ces écrans s'insèrent dans le flow après l'écran de choix (SE CONNECTER / COMMENCER).

---

## ✅ ÉCRAN 3 — INTRODUCTION (QUESTIONNEMENT)

**Fichier** : `src/screens/IntroQuestion/index.js`

### Design implémenté
- ✅ **Fond sombre** : `#1A1B23` (couleur exacte)

- ✅ **Titre principal** :
  - Texte : "TU TE POSES DES QUESTIONS SUR TON AVENIR ?"
  - Police : Bowlby One SC
  - Couleur : blanc (#FFFFFF)
  - Grande taille, centré

- ✅ **Sous-texte explicatif** :
  - Texte : "Align t'aide à y voir plus clair, étape par étape."
  - Police : Nunito Black
  - Couleur : **Dégradé linéaire horizontal** de `#FF7B2B` vers `#FFD93F`
  - Centré

- ✅ **Illustration centrale** :
  - Image : `assets/images/star-question.png` (personnage étoile avec point d'interrogation)
  - Taille moyenne (50% de la largeur d'écran, max 250px)
  - Centrée avec espacement du texte

- ✅ **Bouton COMMENCER** :
  - Police : Bowlby One SC
  - Texte blanc sur fond `#FF7B2B`
  - Forme pill (arrondis complets)
  - Effet hover via `activeOpacity`

### Navigation
```
COMMENCER → PreQuestions (écran 4)
```

---

## ✅ ÉCRAN 4 — PRÉ-QUESTIONS

**Fichier** : `src/screens/PreQuestions/index.js`

### Design implémenté
- ✅ **Fond sombre** : `#1A1B23` (couleur exacte)

- ✅ **Phrase principale** :
  - Texte : "RÉPONDS À 6 PETITES QUESTIONS AVANT DE COMMENCER !"
  - Police : Bowlby One SC
  - Couleur : blanc (#FFFFFF)
  - **EXCEPTION** : Le chiffre **"6"** est en dégradé linéaire horizontal de `#FF7B2B` vers `#FFD93F`
  - Centré, avec retour à la ligne après "6 PETITES QUESTIONS"

- ✅ **Illustration centrale** :
  - Image : `assets/images/star-laptop.png` (personnage étoile avec ordinateur)
  - Taille moyenne (50% de la largeur d'écran, max 250px)
  - Centrée avec espacement

- ✅ **Bouton C'EST PARTI !** :
  - Police : Bowlby One SC
  - Texte blanc sur fond `#FF7B2B`
  - Forme pill (arrondis complets)
  - Effet hover via `activeOpacity`

### Navigation
```
C'EST PARTI ! → Quiz (première question)
```

---

## 🔧 MODIFICATIONS DE LA NAVIGATION

**Fichier** : `src/app/navigation.js`

### Changements effectués
1. ✅ Ajout de l'import `IntroQuestionScreen`
2. ✅ Ajout de l'import `PreQuestionsScreen`
3. ✅ Ajout des routes dans le Stack Navigator :
   - `IntroQuestion` (écran 3)
   - `PreQuestions` (écran 4)

**Fichier** : `src/screens/Choice/index.js`

4. ✅ Modification du bouton "COMMENCER" pour naviguer vers `IntroQuestion` au lieu de `Onboarding`

### Flux de navigation complet
```
Welcome (écran 1)
   ↓ COMMENCER
Choice (écran 2)
   ├─ SE CONNECTER → Onboarding (flux d'authentification)
   └─ COMMENCER → IntroQuestion (écran 3)
                     ↓ COMMENCER
                  PreQuestions (écran 4)
                     ↓ C'EST PARTI !
                  Quiz (première question)
```

---

## 🎨 CONFORMITÉ AUX MAQUETTES

### Couleurs hexadécimales
Toutes les couleurs sont **exactement** celles spécifiées :
- `#1A1B23` - Fond sombre
- `#FFFFFF` - Blanc texte
- `#FF7B2B` - Orange principal (début du dégradé)
- `#FFD93F` - Jaune (fin du dégradé)

### Polices
- **Bowlby One SC** pour les titres et boutons
- **Nunito Black** pour le sous-texte de l'écran 3

### Dégradés
- **Écran 3** : Sous-texte en dégradé horizontal `#FF7B2B` → `#FFD93F`
- **Écran 4** : Chiffre "6" en dégradé horizontal `#FF7B2B` → `#FFD93F`

### Technique du dégradé
Utilisation de `MaskedView` de `@react-native-masked-view/masked-view` combiné avec `LinearGradient` pour appliquer un dégradé sur le texte :
```javascript
<MaskedView maskElement={<Text>...</Text>}>
  <LinearGradient colors={['#FF7B2B', '#FFD93F']}>
    <Text>...</Text>
  </LinearGradient>
</MaskedView>
```

### Hiérarchie visuelle
- Centrage vertical et horizontal strict
- Layout en colonne
- Espacements généreux et cohérents
- Pas d'éléments ajoutés
- Textes EXACTS (accents, ponctuation, majuscules)

### Responsive
- Utilisation de `Dimensions.get('window')`
- Tailles adaptatives avec `Math.min()`
- MaxWidth/MaxHeight pour les illustrations
- Padding horizontal pour les petits écrans

---

## 📱 RESSOURCES UTILISÉES

### Images des personnages étoile
1. **star-question.png** (écran 3)
   - Chemin : `assets/images/star-question.png`
   - Personnage étoile doré avec point d'interrogation orange
   - Expression questionnante

2. **star-laptop.png** (écran 4)
   - Chemin : `assets/images/star-laptop.png`
   - Personnage étoile doré tenant un ordinateur portable
   - Expression légèrement préoccupée

---

## 🚀 PRÊT POUR L'INTÉGRATION

Les deux écrans sont :
- ✅ Purement UI (aucune logique métier complexe)
- ✅ Visuellement identiques aux maquettes (pixel-perfect)
- ✅ Responsive (mobile first)
- ✅ Sans erreurs de lint
- ✅ Intégrés dans la navigation principale
- ✅ Textes EXACTS avec accents et ponctuation
- ✅ Dégradés implémentés correctement
- ✅ Prêts à être utilisés sans retouche

### Pour tester le flow complet
1. Lancer l'application : `npm start`
2. L'écran Welcome s'affiche → cliquer "COMMENCER"
3. L'écran Choice s'affiche → cliquer "COMMENCER" (nouvel utilisateur)
4. **L'écran IntroQuestion s'affiche** → cliquer "COMMENCER"
5. **L'écran PreQuestions s'affiche** → cliquer "C'EST PARTI !"
6. L'écran Quiz s'affiche (questions)

---

## 📝 NOTES TECHNIQUES

### Animations
- Effet hover sur les boutons via `activeOpacity={0.85}`
- Transitions fluides natives de React Native
- Pas d'animations complexes ajoutées

### Performance
- Pas de re-renders inutiles
- Images optimisées avec `resizeMode="contain"`
- Dimensions calculées une seule fois
- Dégradés optimisés avec MaskedView

### Accessibilité
- Textes lisibles avec contraste élevé (blanc sur fond sombre)
- Boutons suffisamment grands (touch targets)
- Structure sémantique claire
- Illustrations expressives pour renforcer le message

### Dépendances utilisées
- `@react-native-masked-view/masked-view` : Pour les dégradés sur le texte
- `expo-linear-gradient` : Pour créer les dégradés de couleur
- `@react-navigation/native` : Pour la navigation entre écrans
