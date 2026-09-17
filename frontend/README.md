# MOLAR — Frontend

React 19 + Vite 8 + Tailwind CSS v4 single-page application.

## Stack

- **Framework:** React 19
- **Build tool:** Vite 8
- **Styling:** Tailwind CSS v4 + CSS custom properties (light/dark tokens)
- **Routing:** react-router-dom
- **Icons:** lucide-react
- **HTTP client:** native fetch (thin wrapper in `src/api.js`)
- **Linter:** oxlint

## Local Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend URL
npm run dev
```

Open `http://localhost:5173`.

The backend must be running at the URL set in `VITE_API_URL` (default: `http://localhost:8000`).

## Environment Variables

| Variable        | Description                        | Example                    |
|-----------------|------------------------------------|----------------------------|
| `VITE_API_URL`  | Backend API base URL               | `http://localhost:8000`    |

## Available Scripts

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build locally
npm run lint     # Run oxlint
```

## Project Layout

```
frontend/src/
├── App.jsx                    # Router shell (all routes defined here)
├── main.jsx                   # React entry point
├── index.css                  # Tailwind import + design tokens (CSS vars)
├── api.js                     # Fetch wrapper for all API calls
├── context/
│   ├── AuthContext.jsx        # Global auth state (user, token, login/logout)
│   └── ThemeContext.jsx       # Light/dark theme toggle
├── components/
│   ├── AppShell.jsx           # Persistent nav + layout wrapper
│   ├── ProtectedRoute.jsx     # Auth + role guard
│   └── ui.jsx                 # Shared UI primitives (Button, Input, Card, etc.)
└── pages/
    ├── LandingPage.jsx        # Public landing / marketing page
    ├── LoginPage.jsx
    ├── RegisterPage.jsx
    ├── PatientDashboard.jsx   # Patient home (screening status, plan, follow-ups)
    ├── ScreeningPage.jsx      # 7-step oral health screening questionnaire
    ├── JourneyPage.jsx        # Patient journey timeline + Dento assistant
    ├── DentistDashboard.jsx   # Dentist home (stats, recent cases)
    ├── DentistCases.jsx       # Full case list with search + filter
    ├── CaseDetail.jsx         # Case detail: symptoms, image, review, status
    └── CreatePlan.jsx         # Treatment plan creation (dentist)
```

## Design

Light and dark themes are managed via CSS custom properties on `:root` and `.dark`
(toggled on `<html>`). All UI components reference `var(--color-*)` tokens.

Theme preference is persisted in `localStorage` under `molar_theme`.
