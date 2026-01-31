# Fix EMFILE: too many open files, watch

Cette erreur survient quand Metro (le bundler Expo) dépasse la limite de descripteurs de fichiers de macOS. Le serveur plante et le navigateur affiche « Connexion au serveur impossible ».

## Solutions (par ordre de priorité)

### 1. Augmenter la limite (déjà dans `npm start`)

Le script `start` exécute automatiquement `ulimit -n 10240` avant de lancer Expo.

Si l’erreur persiste, exécuter manuellement dans le terminal :

```bash
ulimit -n 10240
npm start
```

### 2. Installer Watchman (recommandé)

Watchman gère le file watching de façon plus efficace et réduit les risques d’EMFILE :

```bash
brew install watchman
```

Puis relancer `npm start`.

### 3. Fix permanent dans le shell

Pour éviter de le refaire à chaque nouvelle session, ajouter dans `~/.zshrc` :

```bash
ulimit -n 10240
```

### 4. Réinstaller node_modules (si le problème continue)

Un état corrompu peut parfois provoquer des comportements bizarres :

```bash
rm -rf node_modules
npm install
npm start
```
