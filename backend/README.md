# MOLAR — Backend

Node.js + Express REST API with SQLite.

## Stack

- **Runtime:** Node.js ≥ 20
- **Framework:** Express 5
- **Database:** SQLite via `better-sqlite3` (zero-setup, file-based)
- **Auth:** JWT (jose) + bcryptjs
- **File uploads:** multer (oral images → `uploads/`)

## Local Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — set a strong JWT_SECRET (at least 32 chars)
npm start
```

Server starts on `http://localhost:8000` by default.

For development with auto-restart on file changes:

```bash
npm run dev
```

## Environment Variables

| Variable       | Description                             | Example                                |
|----------------|-----------------------------------------|----------------------------------------|
| `PORT`         | Port the server listens on              | `8000`                                 |
| `JWT_SECRET`   | Secret for signing JWTs (min 32 chars)  | `a-long-random-string-here`            |
| `FRONTEND_URL` | Frontend origin for CORS                | `http://localhost:5173`                |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## API Endpoints

### Auth
| Method | Path                  | Auth    | Description         |
|--------|-----------------------|---------|---------------------|
| POST   | `/api/auth/register`  | —       | Register new user   |
| POST   | `/api/auth/login`     | —       | Login               |
| GET    | `/api/auth/me`        | Bearer  | Current user info   |

### Screenings
| Method | Path                            | Role    | Description              |
|--------|---------------------------------|---------|--------------------------|
| POST   | `/api/screenings`               | patient | Submit new screening     |
| GET    | `/api/screenings`               | any     | List screenings          |
| GET    | `/api/screenings/:id`           | any     | Get single screening     |
| PATCH  | `/api/screenings/:id/status`    | dentist | Update screening status  |

### Treatment Plans
| Method | Path                              | Role    | Description           |
|--------|-----------------------------------|---------|-----------------------|
| POST   | `/api/treatment-plans`            | dentist | Create plan           |
| GET    | `/api/treatment-plans`            | any     | List plans            |
| GET    | `/api/treatment-plans/:id`        | any     | Get single plan       |
| PATCH  | `/api/treatment-plans/:id/status` | dentist | Update plan status    |

### Follow-ups
| Method | Path                           | Role    | Description              |
|--------|--------------------------------|---------|--------------------------|
| POST   | `/api/follow-ups`              | dentist | Create follow-up task    |
| GET    | `/api/follow-ups`              | any     | List follow-ups          |
| PATCH  | `/api/follow-ups/:id/status`   | any     | Mark complete/missed     |

### Static files
Uploaded oral images are served at `GET /uploads/<filename>`.

### Health check
```
GET /api/health
```

## Project Layout

```
backend/
├── server.js            # Express app entry point
├── db.js                # SQLite connection + schema migrations
├── middleware/
│   └── auth.js          # JWT sign/verify, requireAuth, requireRole
├── routes/
│   ├── auth.js          # Register, login, me
│   ├── screenings.js    # Screening CRUD + image upload
│   ├── treatmentPlans.js
│   └── followUps.js
├── uploads/             # Uploaded oral images (gitignored)
├── .env.example
└── package.json
```

## Notes

- The SQLite database file (`molar.sqlite`) is created automatically on first start.
- Images are stored in `uploads/` which is also gitignored.
- No paid external services required to run the backend.
