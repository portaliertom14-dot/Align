# Align — Client Web (React + Vite)

Client web pour les écrans onboarding Align. Reproduction pixel-perfect des maquettes.

## Prérequis

- Node.js 18+

## Installation

```bash
cd client
npm install
```

## Lancer en dev

```bash
npm run dev
```

Puis ouvrir http://localhost:5173

## Routes

- `/` — Écran 1 « Tu te poses des questions sur ton avenir ? »
- `/pre-questions` — Écran 2 « Réponds à 6 petites questions avant de commencer ! »

## Build

```bash
npm run build
npm run preview
```

## Structure

- `src/assets/onboarding/` — Images PNG (star-question.png, star-laptop.png)
- `src/components/onboarding/` — Composants des 2 écrans + CSS modules
- Polices : Bowlby One SC, Nunito Black (Google Fonts dans `index.html`)
