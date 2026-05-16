# Installation

This guide walks through running ASAP locally for development and self-hosting. For the production deployment story (Kubernetes, scaling, backups), see the other files in [`./`](./).

## Requirements

- **Rust** 1.87+ (stable toolchain)
- **Node.js** 20+
- **pnpm** 9.15+
- **Docker** and Docker Compose v2+
- **Make**
- **PostgreSQL** 15+ (provided by Docker Compose; not needed natively)

## Quickstart with Docker Compose

```bash
git clone https://github.com/Sycatle/asap-website-builder.git
cd asap-website-builder
cp infra/.env.prod.example infra/.env.prod   # then edit the values
make dev
```

Services exposed locally:

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Dashboard | http://localhost:4321 |
| Public sites | http://{slug}.localhost:4321 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

## Common make targets

```bash
make dev              # Full dev environment with hot reload
make dev-build        # Rebuild images before starting
make down             # Stop everything
make logs             # Tail all service logs

make db-shell         # psql shell on the dev database
make migrate          # Apply outstanding migrations

make test             # Run all tests
make test-domain      # Run only the core/domain unit tests
make test-extensions  # Run only the extensions tests

make fmt              # cargo fmt + Prettier
make clippy           # cargo clippy with -D warnings
```

## Running outside Docker

If you prefer running services on the host, only run Postgres and Redis from Compose:

```bash
docker compose -f infra/docker-compose.dev.yml up -d postgres redis
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
export REDIS_URL="redis://localhost:6379"

# Terminal A — API
cargo run -p asap-api

# Terminal B — Worker
cargo run -p asap-worker

# Terminal C — Dashboard
cd apps/web && pnpm dev
```

## Configuration

Configuration is read from environment variables. Templates are in [`infra/env.example/`](../../infra/env.example/) and `infra/.env.prod.example`.

Required for any deployment:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | HMAC secret for JWT signing (use `openssl rand -hex 32`) |
| `ASAP_API_PORT` | Port the API listens on (default `3000`) |
| `ASAP_API_HOST` | Bind address (default `127.0.0.1`) |
| `RUST_LOG` | Tracing filter, e.g. `asap_api=info,sqlx=warn` |

Optional integrations:

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Billing |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | AI panel providers |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push (`scripts/generate-vapid-keys.sh`) |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth and import |

## Database

The dev compose file boots a Postgres instance with these defaults:

```
host=localhost port=5432 user=asap password=asap database=asap
```

Migrations live in [`infra/migrations/`](../../infra/migrations/) and run automatically when the API starts. To apply them manually:

```bash
make migrate
```

To reset the dev database (destructive):

```bash
make db-reset
```

For details on schema, multi-tenant isolation, and backups, see [`database.md`](./database.md).

## Building for production

```bash
# Compile Rust binaries in release mode
cargo build --release

# Build the production images
make build-prod-full

# Start the production stack
make prod
make prod-logs
```

## Code quality before pushing

```bash
make fmt-check
make clippy
make test
pnpm -r lint
```

CI runs the same set on every pull request.

## Troubleshooting

- **`make dev` fails on first run.** Make sure ports 3000, 4321, 4322, 5432, and 6379 are free.
- **`sqlx` complains about offline data.** Run `scripts/prepare-sqlx-cache.sh` or set `SQLX_OFFLINE=false` with a reachable database.
- **Custom domains not resolving locally.** Add the slug to `/etc/hosts` or run a wildcard resolver such as `dnsmasq`.
- **AI panel responses are blocked.** Check `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and that your account is not over its quota.

## Next steps

- Read [`../development/architecture.md`](../development/architecture.md) for the high-level architecture.
- Read [`../development/api.md`](../development/api.md) for the HTTP API.
- See [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) before opening pull requests.
