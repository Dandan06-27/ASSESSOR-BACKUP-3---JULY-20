# Land Bookkeeping & Client Services (Enterprise)

Full-stack land records and client service management: **NestJS** + **PostgreSQL** + **HTML/CSS** frontend (served statically). **Socket.IO** provides real-time notifications and record refresh. **JWT** sessions are mirrored in **localStorage** on the browser for convenience (rotate `JWT_SECRET` in production).

## Features (summary)

- **Roles:** Super Admin, Assistant Admin, Admin, User — with guards on API routes.
- **Registration:** pending until Super/Assistant **approve**; notifications go to active Super/Assistant accounts.
- **Admin role assignment:** requires `ADMIN_ROLE_SECRET_KEY` (see `.env`); Assistant Admin role can only be granted by Super Admin.
- **Land records:** create (Admin+), view/search (all active users), GIS markers, document upload to local disk under `/storage`.
- **Audit log** and **organizational chart** (Super Admin & Assistant Admin).
- **Timezone:** server uses `Asia/Manila` (GMT+8); UI shows Philippine-formatted timestamps where applicable.

## Quick start

1. **PostgreSQL** — easiest via Docker:

```bash
docker compose up -d
```

2. **Backend env** — copy `backend/.env.example` to `backend/.env` and adjust secrets.

3. **Install & run:**

```bash
cd backend
npm install
npm run start:dev
```

4. Open **http://localhost:3000** — the UI is served from the `frontend/` folder.

### Default Super Admin (from seed)

After first DB connection, seed creates a Super Admin if missing:

- **Email:** `superadmin@gov.ph` (or `SUPER_ADMIN_EMAIL` in `.env`)
- **Password:** `SuperAdmin@2026` (or `SUPER_ADMIN_PASSWORD`)

Change these immediately in production.

## Project layout

| Path | Purpose |
|------|---------|
| `backend/` | NestJS API, WebSocket gateway, TypeORM entities |
| `frontend/` | Static `index.html`, `styles.css`, `app.js` |
| `storage/uploads/` | Local document storage (created on first upload) |
| `docker-compose.yml` | PostgreSQL 16 |

## API highlights

- `POST /api/auth/register` — public; creates **pending** user.
- `POST /api/auth/login` — returns JWT.
- `GET /api/divisions` — public list (for registration).
- `GET /api/system/config` — barangay list, classification labels, server PH time.
- `GET /api/records/overview` — records + aggregates + classification counts.
- `GET /api/records/view-land` — search endpoint for “View land”.
- `POST /api/documents/upload` — multipart `file`, optional `landRecordId` (Admin+).

## Security notes

- Replace `JWT_SECRET` and `ADMIN_ROLE_SECRET_KEY` before production.
- `synchronize: true` is enabled for development convenience; use migrations for production.
- Configure HTTPS and hardened CORS in production.