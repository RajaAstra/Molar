# MOLAR

### **DSOLVE 2026** · DRISHTI · College of Engineering Trivandrum (CET)

**BUILD. SOLVE. DEMONSTRATE.**

|                   |                                           |
| ----------------- | ----------------------------------------- |
| **Problem:**      | Problem 1 — Oral Health Screening Widget  |
| **Team Name:**    | [Your Team Name]                          |
| **Team Members:** | [Name 1] · [Name 2] · [Name 3] · [Name 4] |
| **Institution:**  | [College / University]                    |
| **Live Demo:**    | [Demo link goes here]                     |
| **Pitch Video:**  | [Social media pitch video link]           |

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage / Demo Script](#usage--demo-script)
- [Limitations & Future Scope](#limitations--future-scope)
- [Team](#team)
- [Submission Checklist](#submission-checklist)

---

## Problem Statement

> ## Problem 1: Oral Health Screening Widget
>
> Develop a free, two-minute oral health screening widget for web or smartphones
> that guides patients through a simple set of prompts and captures quick images
> of their teeth. The solution should analyse these images and generate an instant
> visual report highlighting potential oral health concerns such as crooked teeth,
> tooth wear, or discoloration. The goal is to provide patients with an easy,
> accessible way to get an initial visual assessment of their oral health and
> understand whether they may need to consult a dentist.

### Why this matters

Early detection of oral health issues — from gum disease to persistent ulcers —
can dramatically improve outcomes and reduce treatment costs. Most people don't
visit a dentist until a problem becomes severe. A simple, accessible screening
tool bridges the gap between "noticing something" and getting professional care,
especially for underserved populations without easy access to dental practices.

---

## Our Solution

MOLAR is a patient-centered dental intelligence platform that connects patients
and dentists through a streamlined screening, review, and treatment journey.

Patients complete a short oral health questionnaire and optionally upload an oral
image. The screening is instantly shared with a dentist for review. The dentist
creates a treatment plan in plain language, which the patient can read, understand,
and track through their personal journey timeline. Dento — a contextual assistant
built into the patient view — answers questions about the treatment plan and
general dental care without diagnosing or overriding the clinician.

---

## Key Features

- **Oral Health Screening** — calm multi-step questionnaire covering risk factors (tobacco, alcohol, areca nut) and symptoms (ulcers, patches, lumps, bleeding), plus optional oral image upload
- **Dentist Workspace** — case list with search/filter, full case detail with symptom summary, risk factors, image viewer, and one-click status updates
- **Treatment Plans** — dentist creates patient-friendly treatment plans with structured steps and next appointment scheduling
- **Patient Journey Timeline** — visual 5-stage journey (Screening → Evaluation → Treatment → Follow-up → Maintenance) with real-time stage tracking
- **Dento Assistant** — contextual patient support using stored treatment data, with strict safety guardrails (no diagnosis, no prescriptions)
- **Light/Dark Theme** — polished healthcare-grade UI with full dark mode support

---

## Tech Stack

| Layer     | Technology                        | Why we chose it                                              |
|-----------|-----------------------------------|--------------------------------------------------------------|
| Frontend  | React 19 + Vite 8 + Tailwind v4   | Fast, modern, lightweight — no unnecessary abstraction       |
| Backend   | Node.js + Express 5               | Simple, fast to build, easy to explain at judging Q&A        |
| Database  | SQLite via better-sqlite3         | Zero setup, embedded, perfect for hackathon demo             |
| Auth      | JWT (jose) + bcryptjs             | Stateless auth, industry-standard password hashing           |
| AI/Assist | Deterministic keyword logic       | No paid API required; fully explainable at Q&A               |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20 (`node --version`)
- npm ≥ 9

### Installation

**1. Clone and set up the backend:**

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
node server.js
```

The backend starts on `http://localhost:8000`. The SQLite database is created
automatically on first run.

**2. Set up the frontend (new terminal):**

```bash
cd frontend
npm install
cp .env.example .env
# .env already points to http://localhost:8000 — no changes needed for local dev
npm run dev
```

Open `http://localhost:5173`.

### Environment Variables

**Backend (`backend/.env`):**

| Variable       | Description                       | Example                                  |
|----------------|-----------------------------------|------------------------------------------|
| `PORT`         | Backend port                      | `8000`                                   |
| `JWT_SECRET`   | JWT signing secret (≥32 chars)    | `a-long-random-secret`                   |
| `FRONTEND_URL` | Frontend CORS origin              | `http://localhost:5173`                  |

**Frontend (`frontend/.env`):**

| Variable        | Description          | Example                     |
|-----------------|----------------------|-----------------------------|
| `VITE_API_URL`  | Backend base URL     | `http://localhost:8000`     |

---

## Usage / Demo Script

*3–5 minute live demo runbook.*

1. **Boot** — start backend (`cd backend && node server.js`) + frontend (`cd frontend && npm run dev`)
2. **Register as patient** — go to `/register`, select "Patient", create account
3. **Complete screening** — walk through the 7-step oral health questionnaire, select symptoms and risk factors, optionally upload an image, submit
4. **Register as dentist** (open new incognito window) — same `/register` flow, select "Dentist"
5. **Dentist reviews case** — see the patient's screening in the case list, open it, view symptoms and image, add a review note, change status to "Reviewed"
6. **Create treatment plan** — click "Create Treatment Plan", fill in title, explanation, and steps
7. **Patient journey** — switch back to patient view, open "My Journey" — see the timeline advance to Treatment stage, see the plan
8. **Ask Dento** — type "explain my plan" or "what are my follow-ups" in the Dento chat
9. **Wow moment** — show light/dark theme toggle, the premium design, and the full end-to-end flow from screening to treatment plan in minutes

---

## Limitations & Future Scope

### Known Limitations

- Oral image analysis is screening-support only — no automated clinical image analysis is performed
- Dento uses deterministic keyword matching, not a live LLM
- No real-time notifications; patients must refresh to see dentist updates
- Single-device demo; no mobile app

### Future Scope

- Voice-based periodontal chart entry (Web Speech API integration)
- Real-time push notifications (WebSockets or SSE)
- LLM-powered Dento with GPT/Gemini backend (opt-in, privacy-respecting)
- Digital smile design simulation overlay
- Full HIPAA/GDPR-compliant deployment configuration
- Mobile app (React Native)

---

## Team

| Name     | Role(s)                         | GitHub    | Email   |
| -------- | ------------------------------- | --------- | ------- |
| [Name 1] | Full-stack / Architecture       | [@handle] | [email] |
| [Name 2] | Frontend / Design               |           |         |
| [Name 3] | Backend / Database              |           |         |
| [Name 4] | Product / Demo                  |           |         |

---

## Submission Checklist

**Before 6:00 AM (Code Freeze) – Sat, Sept 19th:**

- [ ] Clean, runnable source code committed to this **public** repo
- [ ] `README.md` fully filled in (all sections above)
- [ ] Pitch video (>30s, English) posted on team member's social profile
      tagging **@DrishtiCET** & **@CareStack** and link added above
- [ ] All secrets/API keys removed from the repo
- [ ] Quick-start verified from a fresh clone (`git clone` → run)

---

**[Problem Statements](./docs/problem-statements.md)** ·
**[Submission Checklist](./SUBMISSION_CHECKLIST.md)** ·
**DSOLVE 2026 Guidelines**
