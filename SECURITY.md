# MOLAR Security Architecture

This document describes the security measures implemented in MOLAR and the known
limitations of this prototype. MOLAR is a hackathon demonstration product and
**does not claim HIPAA or GDPR compliance**.

---

## Authentication

- **Algorithm:** JWT HS256 (signed with `jose`)
- **Secret:** Minimum 32-character random string, loaded from `JWT_SECRET` environment variable. Never hardcoded.
- **Token lifetime:** 24 hours
- **Storage:** Client-side localStorage (acceptable for demo; HttpOnly cookies recommended for production)
- **Password hashing:** bcryptjs, cost factor 12
- **Timing-safe comparison:** `bcrypt.compare()` used on login to prevent timing attacks

## Authorization

- All protected routes require a valid Bearer JWT (`requireAuth` middleware)
- Role-based access enforced server-side on every route (`requireRole`)
- Patient data isolation: patients can only retrieve their own screenings, plans, and follow-ups
- Dentist isolation: dentists can only access treatment plans and follow-ups they created
- Clinical measurements: only the creating dentist can confirm or correct measurements; patients have read-only access to their own
- Authorization is **never** derived from frontend-only role checks

## Input Validation

- Request bodies validated on all write endpoints (type, length, allowlist)
- Role must be `patient` or `dentist` (enforced server-side)
- Email validated with regex; passwords require minimum 8 characters

## File Uploads (Oral Images)

- Accepted types: JPEG, PNG, WebP only (extension + MIME filter)
- Maximum file size: 10 MB
- Filenames: server-generated random name (`oral-{timestamp}-{random}.{ext}`); original filename is discarded
- Stored in `backend/uploads/` (gitignored)
- Images are served through an **authenticated API route** (`GET /api/uploads/:filename`) — not a public static directory
- Path traversal protection: only the basename is used; path separators in the filename parameter return 400
- Filename pattern validation: must match `oral-[safe-chars].(jpg|jpeg|png|webp)`

## Database

- **SQLite via better-sqlite3** with parameterized prepared statements throughout — no string interpolation in SQL
- Foreign key constraints enabled (`PRAGMA foreign_keys = ON`)
- WAL journal mode for safe concurrent reads

## Rate Limiting

- Auth endpoints (`/api/auth/*`): 10 requests per 15 minutes per IP
- All API routes: 200 requests per minute per IP
- Implemented via `express-rate-limit`

## HTTP Security Headers

- `helmet` middleware applies:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: no-referrer`
  - `X-DNS-Prefetch-Control: off`
  - `X-Permitted-Cross-Domain-Policies: none`
  - `X-Download-Options: noopen`

## CORS

- Explicitly allowlisted origins only (`FRONTEND_URL` env var + `http://localhost:5173`)
- Only `GET, POST, PATCH, DELETE, OPTIONS` methods allowed
- Only `Content-Type` and `Authorization` headers allowed

## Error Handling

- Stack traces are never returned to clients
- Error messages are generic for server errors; specific for client validation errors
- Passwords and tokens are never logged

---

## Known Prototype Limitations

These are known gaps acceptable for a hackathon demo but that would need to
be addressed before any real-world deployment:

| Limitation | Risk | Mitigation for Production |
|---|---|---|
| Dentist self-registration | Any user can register as a dentist | Require verification / admin approval |
| JWT in localStorage | Accessible to JavaScript (XSS risk) | Use HttpOnly, Secure, SameSite cookies |
| No email verification | Accounts active immediately | Add email verification flow |
| No 2FA | Single-factor authentication only | Add TOTP or email-based 2FA |
| SQLite single-file database | Not suitable for multi-server deployment | Replace with PostgreSQL |
| No audit logging | No record of who accessed/modified clinical data | Add structured audit log |
| No HTTPS enforcement | Backend serves HTTP | Configure TLS termination in production |
| `uploads/` is local filesystem | No redundancy | Use object storage (S3 etc.) in production |
| No CSP header | Content Security Policy not configured | Set restrictive CSP for production |
| Deterministic Dento | No patient data leaves the server | Acceptable; document limitations clearly |

---

## Sensitive Data Handling

- Patient oral images are stored in `backend/uploads/` (gitignored) and served only to authenticated users
- No patient-identifying information is logged
- No API keys or secrets are hardcoded anywhere in the codebase
- All secrets are loaded from environment variables

---

*MOLAR is a prototype for DSOLVE 2026. It is not a medical device and has not undergone clinical validation, security audit, or regulatory review.*
