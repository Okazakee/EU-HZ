# AGENTS.md

## 1. Overview

EU-HZ is a small monorepo for a Europe-focused heat-zone PWA. It has two services under `apps/`: a Go API that ingests, normalizes, stores, and serves heat-map/report data from Postgres/PostGIS, and a Next.js frontend that renders the map, search, onboarding modal, and report/detail UI. The services do not import each other at the source level; the web app talks to the API over HTTP.

## 2. Repository Structure

```text
EU-HZ/
  apps/
    api/
      cmd/api/              # single Go package; entry point, DB access, ingest, geo catalogs, tests
        main.go             # HTTP server, CLI mode switch, rate limiting, CORS
        db.go               # store methods, SQL migrations/seeds wiring, query helpers
        ingest.go           # ingest request handling, normalization, heat aggregation
        geo_catalog.go      # geo/country catalog dedupe, alias matching, lookup helpers
        cities_*.go         # per-region city catalog data literals (italy, eu, france, ...)
        config.go           # env-backed runtime config
        dotenv.go           # repo-root .env loader (existing env vars win)
        ingest_test.go      # colocated Go tests (ingest, geo, search, aggregation)
        config_test.go      # colocated Go tests (origin normalization/allowance)
      go.mod                # Go module for the backend service
    web/
      src/app/
        layout.tsx          # root layout and metadata
        page.tsx            # main client page; composes map, overlays, modals
        manifest.ts         # PWA manifest
        globals.css         # Tailwind/global styles
        about/              # static info page (page.tsx)
        data-sources/       # static info page (page.tsx)
        how-it-works/       # static info page (page.tsx)
        privacy/            # static info page (page.tsx)
      src/components/
        providers.tsx       # React Query provider only
      src/features/
        api/                # fetch client, queries, shared response/request shapes
        map/                # MapLibre shell, search UI, viewport query keys
        reports/            # side panel and incident detail modal
        ui/                 # atoms, modal/brand/footer shells, error overlay, dev tools, site content
      package.json          # Next.js app scripts and dependencies
      tsconfig.json
      eslint.config.mjs
      next.config.ts
      postcss.config.mjs
  db/
    migrations/            # SQL schema changes (001_init, ..., 005_drop_ranges)
    seeds/                 # SQL seed data (002_x_whitelist)
  infra/
    docker-compose.yml          # PostGIS container for local dev
    docker-compose.backend.yml  # PostGIS + API containers for VPS deploy
  .opencode/               # opencode agent config (x-ingest command/skill) for the ingest worker
  .env.example             # reference env file; copy to .env
  README.md                # setup, env, API surface, deploy shape
  Makefile                 # root shortcuts for backend run/migrate/seed/ingest/docker
  package.json             # root pnpm workspace scripts for the web app
  pnpm-workspace.yaml
```

- Add backend code under `apps/api/cmd/api/`; this service is still a single `package main`, not a layered package tree.
- Add frontend code under `apps/web/src/features/<feature>/` and keep `src/app/page.tsx` as the composition layer.
- Static info pages live under `src/app/<route>/page.tsx` and reuse `src/features/ui/info-page-shell.tsx`; do not put feature logic in them.
- Put schema and seed changes under `db/migrations/` and `db/seeds/`; do not hide schema work inside Go strings.
- Keep infra-only artifacts in `infra/`.
- Keep the ingest agent command and skill under `.opencode/`; do not add agent config under `apps/`.
- Do not add random feature files at the repo root. The root is for workspace manifests and top-level developer entry points only.

## 3. Service Map

**api** (`apps/api/`) — Go. Serves `/health`, `/v1/heat`, `/v1/reports`, `/v1/places`, `/v1/sources`, and `/v1/incidents/*`, plus the protected `/v1/ingest` and `/v1/ingest/filter`. It also exposes CLI modes for migration, seeding, cleanup, aggregation, and ingest (`ingest-once`, `ingest-loop`). Entry point: `apps/api/cmd/api/main.go`. Package manager: Go modules.

**web** (`apps/web/`) — TypeScript/Next.js App Router. Renders the fullscreen map, search, onboarding gate, report side panel, and incident detail modal. Entry point: `apps/web/src/app/page.tsx` with root wiring in `apps/web/src/app/layout.tsx`. Package manager: pnpm workspace package.

## 4. Cross-Service Boundaries

Direct imports between `apps/api` and `apps/web` are absent and should stay absent. The only service boundary is HTTP: the web service calls the API endpoints and mirrors the response shapes locally in `apps/web/src/features/api/types.ts`.

There is no shared contracts package, schema generator, or shared types workspace. If an API payload changes, update the Go response shape and the matching TypeScript types/client code in the same change.

The current monorepo boundary is `apps/`, with `api` and `web` as sibling services. Do not introduce cross-service utility modules under `apps/` just to avoid duplication.

## 5. Commands and Workflows

### Root

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

### API (`apps/api`)

```bash
go run ./cmd/api serve
go run ./cmd/api migrate-up
go run ./cmd/api seed
go run ./cmd/api cleanup
go run ./cmd/api ingest-once
go run ./cmd/api ingest-loop
go run ./cmd/api aggregate
go test ./...
```

Use the root `make` targets when working from the repo root. Use the direct `go run ./cmd/api ...` forms when working inside `apps/api`.

The ingest agent contract is HTTP-only. `opencode run --command x-ingest` is launched by the backend with `INGEST_API_URL`, `INGEST_KEY`, and a default `INGEST_MODEL` of `opencode/deepseek-v4-flash-free` unless overridden by env.

When changing the ingest agent or its skill, keep duplicate filtering at the boundary:

- `POST /v1/ingest/filter` with the normal ingest payload to collapse obvious duplicate source items before submission.
- `POST /v1/ingest` still runs the same dedupe pass server-side, so duplicate filtering is enforced even if the agent skips the filter preview step.
- Dedupe is intentionally conservative: it collapses repeated copies of the same source post/item, not cross-source corroboration.

### Web (`apps/web`)

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
```

The root `pnpm dev:web` / `pnpm build:web` scripts are the repo-level entry points for these same web commands.

## 6. Code Formatting

### Go (`apps/api`)

Formatted by `gofmt`. No custom config file is present.

- Indentation uses tabs.
- Top-level declarations are separated by one blank line.
- Imports are grouped as stdlib first, then one blank line, then third-party imports.
- Opening braces stay on the same line.
- Multi-line literals and calls keep trailing commas.
- Semicolons are absent.
- Long SQL is written as raw backtick strings.
- Line length is not enforced; the `cities_*.go` catalog literals run long, but regular code stays well under 120 columns.

```go
import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)
```

```go
func serve(cfg config, db *store) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
}
```

```go
	row := s.pool.QueryRow(ctx, `
		SELECT public_id::text, title, summary, event_type, confidence, status, occurred_at, location_label, lat, lng, geo_precision
		FROM incidents
		WHERE public_id = $1::uuid
	`, publicID)
```

### TypeScript (`apps/web`)

No Prettier config is present. Style is enforced by consistent source formatting plus Next/ESLint config.

- Indentation uses 2 spaces.
- Top-level declarations are separated by one blank line.
- Imports are grouped as external imports first, then one blank line, then internal imports.
- Double quotes are standard.
- Semicolons are present.
- Opening braces stay on the same line.
- Multi-line object literals, arrays, hook configs, and JSX props keep trailing commas.
- Type-only imports use `import type`.
- Line length stays within ~100 columns in app code.

```tsx
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { useHeatQuery, useReportsQuery } from "@/features/api/queries";
import type { PlaceItem, ViewportBounds } from "@/features/api/types";
import { MapShell } from "@/features/map/map-shell";
import { SearchBar } from "@/features/map/search-bar";
import { IncidentModal } from "@/features/reports/incident-modal";
import { ReportsPanel } from "@/features/reports/reports-panel";
import { ModalShell } from "@/features/ui/modal-shell";
import { BrandMark } from "@/features/ui/brand-mark";
import { PrimaryButton, IconButton } from "@/features/ui/atoms";
```

```tsx
const defaultBounds: ViewportBounds = {
  west: -10,
  south: 35,
  east: 30,
  north: 60,
  zoom: 4.2,
};
```

```tsx
      <ReportsPanel
        reports={reportItems}
        isLoading={isPanelLoading}
        hasMore={Boolean(reportsQuery.hasNextPage)}
        onSelectReport={setSelectedReportId}
        onLoadMore={() => {
          if (reportsQuery.hasNextPage && !reportsQuery.isFetchingNextPage) {
            void reportsQuery.fetchNextPage();
          }
        }}
      />
```

### JavaScript config files (`apps/web/*.mjs`) [tentative]

The repo only has a few JavaScript config files. They follow the same 2-space, semicolon-terminated style as the TypeScript app code.

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

## 7. Naming Conventions

### Repo-wide

- Service directories under `apps/` use short lowercase names: `api`, `web`.
- Feature files in the web app use kebab-case names such as `map-shell.tsx`, `search-bar.tsx`, `reports-panel.tsx`, and `modal-shell.tsx`.
- SQL migration and seed files use zero-padded numeric prefixes: `001_init.sql`, `003_heat_cell_dominant_event_type.sql`, `005_drop_ranges.sql`; seeds such as `002_x_whitelist.sql`.

### Go (`apps/api`)

- Types, functions, variables, and interfaces are mostly lowerCamelCase because everything lives inside `package main`; exported PascalCase API surface is largely avoided.
- Small data carriers use lowerCamelCase nouns: `heatCell`, `report`, `incidentDetail`, `queryFilters`, `countryCell`.
- Functions use verb-led lowerCamelCase: `loadConfig`, `runIngestOnce`, `aggregateHeat`, `searchPlaces`, `normalizeIngestItem`.
- Catalog variables use lowerCamelCase with noun suffixes: `geoCatalog`, `countryCatalog`, `limiterStore`.
- Test files use `<module>_test.go`.

```go
type incidentDetail struct {
	PublicID   string         `json:"publicId"`
	Title      string         `json:"title"`
	Summary    string         `json:"summary"`
	EventType  string         `json:"eventType"`
}
```

```go
func searchPlaces(query string) []placeItem {
	query = strings.ToLower(strings.TrimSpace(query))
	if len(query) < 2 {
		return nil
	}
```

### TypeScript (`apps/web`)

- React components and shared types use PascalCase: `MapShell`, `SearchBar`, `ReportsPanel`, `IncidentModal`, `BrandMark`, `PrimaryButton`, `PlaceItem`.
- UI atom components and their props follow the same pattern: `Pill`, `IconButton`, `SurfaceCard`, with `PillProps`, `IconButtonProps`, `SurfaceCardProps`.
- Props types use the `XProps` suffix: `MapShellProps`, `SearchBarProps`, `ReportsPanelProps`, `IncidentModalProps`, `ModalShellProps`.
- Custom hooks use the `useXxx` prefix, and data hooks frequently end in `Query`: `useHeatQuery`, `useReportsQuery`, `usePlacesQuery`, `useIncidentQuery`.
- Local state and handler names use lowerCamelCase: `selectedReportId`, `onboardingOpen`, `handleSelectPlace`, `isPanelLoading`.
- Shared API shapes are centralized in `src/features/api/types.ts`.

```ts
export type PlaceItem = {
  key: string;
  label: string;
  kind: "country" | "city";
  city: string;
  countryCode: string;
```

```tsx
type SearchBarProps = {
  onSelect: (place: PlaceItem) => void;
  disabled?: boolean;
};
```

## 8. Type Annotations

### Go (`apps/api`)

Go uses explicit concrete types everywhere, with package-private structs and functions instead of interfaces except where an abstraction already exists (`sourceAdapter`).

```go
type sourceAdapter interface {
	Fetch(ctx context.Context, source sourceRecord, cursor sourceCursor) ([]rawSourceItem, sourceCursor, error)
}
```

```go
func (s *store) incident(ctx context.Context, publicID string) (incidentDetail, error) {
```

### TypeScript (`apps/web`)

- `tsconfig.json` has `"strict": true`; type-checking is not optional.
- API payloads and UI contracts are declared as `type` aliases in `src/features/api/types.ts`.
- Props are explicitly typed.
- Inline state objects are typed at the `useState` call site when inference would be too weak.
- Return types are usually inferred for components and hooks rather than spelled out manually.

```ts
const [focusTarget, setFocusTarget] = useState<{
  lng: number;
  lat: number;
  zoom: number;
  bounds?: [number, number, number, number];
} | null>(null);
```

```ts
export function useIncidentQuery(publicId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["incident", publicId],
    queryFn: () => getIncident(publicId ?? ""),
    enabled: enabled && Boolean(publicId),
  });
}
```

## 9. Imports

### Go (`apps/api`)

- Standard library imports come first.
- A single blank line separates stdlib from third-party packages.
- Imports are kept in one grouped block.
- No aliasing is used in the current code.

```go
import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)
```

### TypeScript (`apps/web`)

- External packages come first.
- One blank line separates external imports from local imports.
- App-level modules use the `@/` alias.
- Feature-internal imports often use short relative paths.
- `import type` is used for pure type dependencies.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
```

```tsx
import { useDeferredValue, useEffect, useState } from "react";

import { usePlacesQuery } from "../api/queries";
import type { PlaceItem } from "../api/types";
```

Never use wildcard imports; none appear in the repo.

## 10. Error Handling

### Go (`apps/api`)

- Functions that can fail usually return `(value, error)` or `error` and return early on failure.
- Startup paths fail hard with `log.Fatalf` / `log.Fatal`.
- HTTP handlers delegate failures to a small `writeError` helper instead of formatting ad hoc error responses inline.
- Recoverable worker-loop failures are logged and retried after sleep instead of crashing the process.

```go
db, err := openStore(ctx, cfg)
if err != nil {
	log.Fatalf("open db: %v", err)
}
```

```go
reports, err := db.reports(r.Context(), params)
if err != nil {
	writeError(w, err)
	return
}
```

```go
for {
	if err := execIngestCommand(ctx, cfg); err != nil {
		log.Printf("ingest-loop error: %v", err)
	}
	<-ticker.C
}
```

### TypeScript (`apps/web`)

- Network failures are surfaced by throwing from the fetch wrapper.
- Query hooks let TanStack Query own the async/error state instead of wrapping every call in component-local `try/catch`.
- UI code gates fetches with `enabled` rather than firing requests and then suppressing them afterward.

```ts
async function getJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}
```

```ts
return useQuery({
  queryKey: ["places", query],
  queryFn: () => getPlaces(search),
  enabled: query.trim().length >= 2,
  staleTime: 5 * 60_000,
});
```

## 11. Comments and Docstrings

Comments are sparse. Most application code is left uncommented, and there are no docstrings or JSDoc blocks in the main services. Add comments only when they explain a non-obvious exception or preserve external-tool context.

```js
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
```

In normal app and API code, prefer self-explanatory names over comment banners:

```tsx
const isPanelLoading =
  isNavigating ||
  heatQuery.isLoading ||
  heatQuery.isFetching ||
  reportsQuery.isLoading ||
  reportsQuery.isFetching ||
  reportsQuery.isFetchingNextPage;
```

## 12. Testing

### Go (`apps/api`)

- Tests are colocated with the code they exercise (`ingest_test.go`, `config_test.go`).
- Test files use the standard `_test.go` suffix.
- The current style is direct `testing` package usage with `t.Fatal` / `t.Fatalf`.
- Tests are short, single-purpose, and instantiate plain structs rather than fixtures or test helpers.

```go
func TestNormalizeIngestItemFindsCityAndEvent(t *testing.T) {
	item := ingestItem{
		Title:       "Police investigate harassment reports in Brussels nightlife district",
		Summary:     "Police investigate harassment reports in Brussels nightlife district after several women were attacked late at night.",
		EventType:   "harassment",
		Location:    "Brussels",
		CountryCode: "BE",
		City:        "Brussels",
		XPostedAt:   time.Date(2026, 6, 30, 8, 0, 0, 0, time.UTC).Format(time.RFC3339),
	}

	incident, ok := normalizeIngestItem(item)
	if !ok {
		t.Fatal("expected incident to be accepted")
	}
```

### TypeScript (`apps/web`)

There are currently no frontend test files. Do not invent a test framework convention that the repo does not already contain. If you add frontend tests, introduce the framework explicitly in the same change instead of pretending one is already established.

## 13. Git

The short history uses plain imperative subject lines with no conventional-commit prefix and no scope.

- Write a single imperative subject line; do not prefix with `feat:`, `fix:`, etc. History is uniformly unprefixed.
- Do not add a service scope; commits are not split by `apps/api` vs `apps/web`.
- Keep the subject short. History centers around 20–35 characters and no subject exceeds ~55.
- Capitalization is not enforced: "Make migrations idempotent for repeated migrate-up runs" and "add png to readme" both appear.
- Commit bodies are rare; add one only when the subject cannot carry the reasoning.
- Do not GPG-sign commits; no signed commits exist in history.
- Branch naming and merge strategy are not yet established at scale. The history so far is linear with no merge commits, consistent with rebase.

## 14. Dependencies and Tooling

### Repo-wide

- Workspace management is pnpm-based at the root.
- `README.md` documents setup, env, API surface, and deploy shape; there is no `LICENSE` file.
- There is no `.github/workflows/` directory in this repo snapshot, so do not assume CI exists.

### API (`apps/api`)

- Go version is pinned in `apps/api/go.mod` (currently `go 1.26.4`).
- The backend depends on `github.com/jackc/pgx/v5` for Postgres access and `golang.org/x/time/rate` for rate limiting.
- Postgres is provisioned through `infra/docker-compose.yml` with a PostGIS image.
- Schema changes and seed data are plain SQL files under `db/`.

```go
require (
	github.com/jackc/pgx/v5 v5.10.0
	golang.org/x/time v0.15.0
)
```

### Web (`apps/web`)

- Next.js App Router on Next `16.2.9`
- React `19.2.4`
- `@tanstack/react-query` for client-side fetching/caching
- `maplibre-gl` for map rendering
- Tailwind CSS 4 via `@tailwindcss/postcss`
- ESLint uses `eslint-config-next` plus the TypeScript preset
- TypeScript runs in strict mode

```json
"dependencies": {
  "@tanstack/react-query": "^5.101.2",
  "maplibre-gl": "^5.24.0",
  "next": "16.2.9",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

No dedicated frontend formatter config exists; do not claim Prettier or Biome unless one is added.

## 15. Red Lines

- Do not add direct imports between `apps/web` and `apps/api`; keep the service boundary at HTTP.
- Do not introduce a shared cross-service contracts package unless the repo actually adds one. Right now the frontend mirrors API shapes locally.
- Do not split the Go backend into exported library packages casually. The existing backend is a single `package main` with lowerCamelCase internal types and helpers.
- Do not move UI business logic into `src/app/layout.tsx` or provider files. Keep layout/providers thin and put feature logic under `src/features/`.
- Do not claim CI or license conventions that are not present in the repo: there is no `.github/workflows/` and no `LICENSE` file. Git and formatter conventions are documented above.
