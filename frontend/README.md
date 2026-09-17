# MOLAR Frontend

The initial MOLAR frontend foundation is a React single-page workspace preview.
It uses Vite for local development and Tailwind CSS v4 for utility styling.

## Local Setup

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Checks

```bash
npm run lint
npm run build
```

No backend connection or environment variables are required for this frontend
foundation.

## Project Layout

```
frontend/
├── src/App.jsx         # MOLAR starting page
├── src/index.css       # Tailwind import and visual foundation
├── src/main.jsx        # React entry point
├── vite.config.js      # Vite and Tailwind plugin configuration
└── .env.example
```
