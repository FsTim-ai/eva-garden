# Rooftop Smart Farm

A dashboard for monitoring and controlling a rooftop aquaponics/smart-farm setup — live sensor readings and device controls backed by Firebase, built with React, Vite, TypeScript, and Tailwind CSS.

This repo has two independently-deployed parts:

- **[frontend/](frontend/)** — the dashboard (Vite + React + TypeScript).
- **[backend/](backend/)** — receives sensor readings from an ESP32 over HTTP and writes them to Firestore. See [backend/README.md](backend/README.md).

## Run Locally

**Prerequisites:** Node.js

```
cd frontend
npm install
npm run dev
```

## Scripts (run from frontend/)

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — type-check
- `npm run preview` — preview the production build

## Deploying the frontend

### Vercel

1. [vercel.com](https://vercel.com) -> Add New -> Project -> import the
   `eva-garden` GitHub repo.
2. **Root Directory**: `frontend` (must be set explicitly — Vercel defaults
   to the repo root, which no longer has a `package.json`).
3. Framework Preset: Vite (auto-detected). Build Command `npm run build`,
   Output Directory `dist` (both auto-filled).
4. Deploy.

### Netlify

Same idea: New site from Git -> pick the repo -> **Base directory**: `frontend`
-> Build command `npm run build` -> Publish directory `frontend/dist`.
