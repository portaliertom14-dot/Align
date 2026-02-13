# Pousser le code sur GitHub (une fois)

1. Ouvre **github.com** → ton dépôt **align-app**.
2. Clique sur le bouton vert **Code** → copie l’URL (ex: `https://github.com/TON_USERNAME/align-app.git`).
3. Ouvre le **Terminal** dans le dossier du projet, puis colle ces 2 commandes (remplace l’URL par la tienne) :

```bash
git remote set-url origin https://github.com/TON_USERNAME/align-app.git
git push
```

4. Si Git demande un **mot de passe** : GitHub n’accepte plus le mot de passe du compte. Utilise un **Personal Access Token** :
   - GitHub → ton profil (en haut à droite) → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.
   - Donne un nom, coche **repo**, génère, copie le token.
   - Quand Git demande le mot de passe, colle ce token.

Ensuite, pour les prochains push, tu n’auras qu’à taper : `git push`.
