# Aurelia — production deployment

This folder deploys the full stack with Docker Compose:

| Service    | Image / build              | Role                                    |
| ---------- | -------------------------- | --------------------------------------- |
| `postgres` | `postgres:16-alpine`       | Relational store (users, conversations, KBs, usage). |
| `redis`    | `redis:7-alpine`           | Cache, rate-limit counters, cross-process stop-stream pub/sub. |
| `qdrant`   | `qdrant/qdrant:v1.12.4`    | Vector search for RAG.                  |
| `sandbox`  | `ghcr.io/hjxwz123/aurelia-sandbox-sidecar` | Bundled code-execution sandbox (internal-only). |
| `app`      | `ghcr.io/hjxwz123/aurelia-app` *(or local build via `Dockerfile.app`)* | One container serving BOTH the built SPA and the `/api` backend on the same origin. |

See the [root README](../README.md) for the full project overview; this file is
just the deployment cheat-sheet.

## How backend selection works

The API binary is the **same** one used in local dev. It picks each backend by
inspecting an environment URL at boot:

- `DATABASE_URL=postgres://…` → Postgres (via the `pgcompat` driver); anything
  else (e.g. a `*.db` path) → embedded SQLite.
- `REDIS_URL` set → Redis; unset → in-process memory cache.
- `QDRANT_URL` set → Qdrant; unset → vector search disabled, RAG falls back to
  brute-force cosine over the embeddings mirrored in the relational store.

So **nothing needs to be installed locally** to run the app — leave those URLs
unset and it runs on SQLite + memory + brute-force. This compose file sets all
three, giving the production topology.

Embeddings are dual-written: every chunk vector goes to both Postgres (insurance
/ fallback) and Qdrant (search). Deleting a document/KB/conversation removes its
points from Qdrant too.

## First deploy (prebuilt images)

```bash
cd deploy
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, REDIS_PASSWORD, and JWT_SECRET at minimum.
# There is NO domain/CORS/port env to set — the app serves the SPA and /api on
# one origin, so whatever host it's reached on works (multiple domains included).
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

The app is then on `http://<host>` (host port 80 by default; change the
`"80:8787"` mapping in `docker-compose.prod.yml` if 80 is taken). On first launch
the deployment has zero users — the FIRST account you create via the setup screen
becomes the administrator. Then add real provider channels in **/admin** (their
API keys are stored in the database).

`store.Migrate()` runs automatically on boot and creates the Postgres schema
(`schema_pg.sql`) if the tables don't exist — no manual SQL step.

## Build the images locally

When iterating on the codebase, or on an architecture not covered by the
official images:

```bash
cd deploy
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```

The compose file declares both `image:` and `build:`, so Compose prefers the
prebuilt image when present and falls back to a local build otherwise.

## Embedding dimension

Qdrant uses one collection per embedding width (`aurelia_c<dim>`). If you
configure a real embedding model, set `EMBEDDING_DIM` (and/or the model's `dim`
in the admin UI) to match — otherwise the local 256-dim embedder is used and
its collection won't match a 1536-dim model's vectors.

## TLS & domains

The `app` container serves plain HTTP on host port 80. For public deployments put
a TLS terminator (Caddy, Traefik, or a cloud LB) in front of it. Because the SPA
and `/api` share one origin, there is **nothing to configure per domain** — point
as many domains as you like at the proxy and each one works, as long as the proxy
forwards the `Host` header (every reverse proxy does by default). No
`PUBLIC_ORIGIN` / `ALLOWED_ORIGINS`.

## Backups

Persisted in named volumes: `pgdata`, `redisdata`, `qdrantdata`, `apidata`
(uploads + artifacts). Back these up together so vectors, rows and files stay
consistent.
