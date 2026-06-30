## Local

```bash
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_BASE_URL` in `apps/web/.env.local` if the API is not on `http://localhost:8080`.

## Vercel

Create a Vercel project from this repo and set the project root directory to `apps/web`.

Required environment variable:

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

If `NEXT_PUBLIC_API_BASE_URL` is missing in production, the app now fails loudly instead of silently calling localhost.

## Backend CORS

The Go API only allows browser requests from exact origins listed in `CORS_ALLOWED_ORIGINS`.

Example:

```bash
CORS_ALLOWED_ORIGINS=https://eu-hz.vercel.app,https://heatzones.example.com
```

If you want Vercel preview deployments to work, add their exact preview URLs too, or use a stable custom frontend domain and only allow that.
