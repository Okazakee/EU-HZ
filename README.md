# EU - Heat Zones

Europe-focused heat-zone PWA for recent safety-awareness checks by country or city.

![EU - Heat Zones](apps/web/public/euhz.png)

The repo is a small monorepo:

- `apps/api`: Go API for places, reports, heat cells, ingest filtering, and incident details.
- `apps/web`: Next.js PWA frontend with the fullscreen map, search, onboarding, footer, and report UI.
- `db`: SQL migrations and seeds.
- `infra`: Docker Compose files for Postgres-only local dev and backend deployment.

## Stack

- Frontend: Next.js 16, React 19, Tailwind CSS 4, MapLibre, React Query
- Backend: Go, pgx, Postgres/PostGIS
- Deploy shape: Vercel for `apps/web`, VPS Docker Compose for `apps/api`

## Monorepo layout

```text
.
├── apps/
│   ├── api/
│   └── web/
├── db/
├── infra/
├── .env.example
├── Makefile
├── package.json
└── pnpm-workspace.yaml
```

## Prerequisites

- Node.js 22+
- pnpm
- Go
- Docker + Docker Compose

Optional for ingest:

- `opencode` CLI available in `PATH`

## Environment

Root reference file:

```bash
cp .env.example .env
```

What matters:

- `DATABASE_URL`: backend database connection string
- `PORT`: backend port
- `CORS_ALLOWED_ORIGINS`: exact frontend origins allowed by the API
- `INGEST_KEY`: shared key for protected ingest endpoints
- `INGEST_MODEL`: default ingest model, currently `opencode/deepseek-v4-flash-free`
- `INGEST_INTERVAL`: loop cadence for ingest worker mode
- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: backend Docker Compose Postgres config
- `NEXT_PUBLIC_API_BASE_URL`: frontend API base URL

Frontend local dev reads `apps/web/.env.local`, so copy the frontend value there:

```bash
printf 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8080\n' > apps/web/.env.local
```

## Local development

Install web dependencies:

```bash
pnpm install
```

Start Postgres:

```bash
make docker-up
```

Run migrations and seed:

```bash
make migrate-up
make seed
```

Run backend:

```bash
make dev-backend
```

Run frontend:

```bash
pnpm dev:web
```

Frontend default URL: `http://localhost:3000`

Backend default URL: `http://localhost:8080`

## Useful commands

```bash
pnpm dev:web
pnpm build:web
pnpm lint
pnpm typecheck

make dev-backend
make worker-once
make worker-loop
make migrate-up
make seed
make cleanup
make docker-up
make docker-down
make docker-up-backend
make docker-down-backend
```

## API surface

- `GET /health`
- `GET /v1/heat`
- `GET /v1/reports`
- `GET /v1/places`
- `GET /v1/sources`
- `GET /v1/incidents/:publicId`
- `POST /v1/ingest/filter`
- `POST /v1/ingest`

The ingest endpoints require `INGEST_KEY`.

## Deployment

### Frontend

Deploy `apps/web` to Vercel.

Required env:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.your-domain.tld
```

### Backend

Deploy from this repo on your VPS with:

```bash
cp .env.example .env
make docker-up-backend
```

The backend compose file uses:

- `infra/docker-compose.backend.yml`
- PostGIS container
- API container built from `apps/api/Dockerfile`

Put Nginx Proxy Manager in front of the backend and keep `CORS_ALLOWED_ORIGINS` limited to your frontend domain and any preview domains you intentionally support.

## Notes

- The frontend intentionally has no login.
- The backend rate-limits public endpoints.
- Search is country + city oriented across Europe, down to capoluoghi-equivalent city coverage currently present in the backend catalogs.
