## Quick orientation — purpose

This repo is a split React + Node Express CRM prototype. Frontend is a Vite + React app in `frontend/`. Backend is an Express server in `backend/` that exposes REST endpoints and (optionally) talks to Postgres or MSSQL. These notes highlight the patterns and files an AI agent should know to be productive.

## High-level architecture

- Frontend: `frontend/` (Vite, React Router, components in `src/components`, pages in `src/pages`). Dev server runs on port 5173 by default.
- Backend: `backend/` (ES modules). Entry: `backend/server.js`. Routes are registered under `/api/*` (for example `/api/users`, `/api/accounts`, `/api/rfqs`) and `/auth/*` for authentication.
- Database: two modes
  - Mock mode: set `USE_MOCK=true` to use `backend/mocks/dbMock.js` (fast local dev and tests).
  - Real Postgres: environment vars `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASS`, `DB_PORT` used by `backend/db.js`.
- MSSQL: `backend/mssql.js` exports `poolPromise` and `sql`. Routes that need MSSQL import it via the `/api/mssql` router.

## Important conventions and patterns

- JWT auth is cookie-based. The backend sets a `token` cookie (see `backend/controllers/authController.js`) with `httpOnly`, `secure: true`, and `sameSite: 'None'` — clients must send cookies and requests must be CORS-enabled.
- Auth middleware reads the token from the cookie: `backend/middleware/authMiddleware.js`. Any route mounted after `app.use(authMiddleware)` requires authentication.
- DB rows are converted to camelCase automatically: `backend/db.js` wraps `pool.query` results and calls `toCamel` from `backend/helper/utils.js`. When writing to DB, use `toSnake` to convert request payloads.
- Permissions and role checks are represented as strings in the JWT (`permissions` array) and used by frontend `config.js` and ProtectedRoute components.

## Key files to consult (quick map)

- `backend/server.js` — app startup, CORS allowedOrigins, route registration, healthcheck
- `backend/db.js` — Postgres pool, mock switching (`USE_MOCK`), camelCase conversion
- `backend/mssql.js` — MSSQL connection (UAT credentials present; treat as sensitive)
- `backend/controllers/authController.js` — `/auth/login`, `/auth/me`, `/auth/logout` implementations
- `backend/middleware/authMiddleware.js` — cookie JWT verification, sets `req.user`
- `backend/mocks/` — contains fake datasets and `dbMock.js` used in mock mode
- `frontend/src/config.js` — central permission and badge class mapping used across UI
- `frontend/src/components/ProtectedRoute.jsx` — shows how the app enforces auth client-side

## How to run (developer workflows)

- Backend (development with .env.dev):

  - From repo root: `cd backend` then `npm run dev`
    - `npm run dev` uses `cross-env NODE_ENV=dev nodemon -r dotenv/config server.js dotenv_config_path=.env.dev` so dotenv is loaded from `.env.dev`.

- Frontend:

  - From repo root: `cd frontend` then `npm run dev` (starts Vite on 5173 by default)

- Smoke test (quick):

  - Start backend (with mock DB): `cd backend; set USE_MOCK=true; npm run dev`
  - Start frontend: `cd frontend; npm run dev`
  - Open the app and try login (the mocks contain test users in `backend/mocks/usersMock.js`).

## API surface notes and examples

- Auth endpoints: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` (see `backend/routes/authRoutes.js`).
- Protected API pattern: routes mounted after `app.use(authMiddleware)` are protected. Example: `GET /api/users` goes through `authMiddleware`.
- MSSQL usage: the MSSQL helper exports `poolPromise` — a typical call looks like: `const pool = await poolPromise; const result = await pool.request().query('SELECT ...')` (see `backend/mssql.js` and `backend/routes/mssqlRoutes.js`).

## Small gotchas and project-specific decisions

- Cookies + CORS: server sets `sameSite: 'None'` and `secure: true`; local dev may need `FRONTEND_URL` or adding `http://localhost:5173` to `allowedOrigins` in `server.js`.
- Mock DB: toggled by `USE_MOCK=true`. Tests and fast iteration should use mock mode to avoid requiring Postgres access.
- Naming convention: database columns are snake_case; application objects use camelCase. Use `toSnake`/`toCamel` helpers for conversions when adding/updating DB rows.
- JWT lifespan: token is signed with `process.env.JWT_SECRET` and expires in 1 hour by default (see `authController.js`).

## Security & secrets (notes for maintainers)

- `backend/mssql.js` contains hard-coded UAT credentials — treat this file as sensitive and avoid committing real production secrets. Prefer using environment variables for credentials.

## When editing code, prefer small targeted changes

- Routes live in `backend/routes/*`, controllers in `backend/controllers/*`. Follow the existing pattern: validate input in controllers, use `toSnake` before DB insert/update, and return camelCased rows to clients.

---
If anything above is unclear or you'd like more examples (unit tests, specific routes, or an example PR), tell me which area to expand and I'll update this file.
