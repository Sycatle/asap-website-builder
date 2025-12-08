# ASAP Development Guide

This guide covers the development setup and workflow for ASAP v2.

## Prerequisites

- **Rust** 1.75+
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (via Docker or local)
- **Node.js** 18+ (for future frontend)

## Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/Sycatle/asap-v2.git
cd asap-v2

# Run the setup script
./scripts/setup-dev.sh
```

### 2. Development Workflow

Start the services in separate terminals:

```bash
# Terminal 1 - API
cd apps/api
cargo run

# Terminal 2 - Worker
cd apps/worker
cargo run
```

The API will be available at `http://localhost:3000`.

## Project Structure

```
asap-v2/
├── core/                   # Core domain and API
│   ├── domain/            # Domain models (User, Portfolio, Event, etc.)
│   └── api/               # HTTP routes and handlers
├── modules/               # Feature modules
│   ├── github-generator/  # Import GitHub repos
│   ├── themes/            # Theme rendering
│   ├── analytics/         # Usage tracking
│   └── projections/       # Static file generation
├── apps/                  # Executable applications
│   ├── api/              # Core API server
│   ├── worker/           # Event processor
│   └── web/              # Frontend (TODO)
├── infra/                # Infrastructure
│   ├── migrations/       # Database migrations
│   ├── docker-compose.yml
│   └── env.example/      # Environment templates
└── docs/                 # Documentation
```

## Building the Project

```bash
# Build all workspace members
cargo build

# Build specific component
cargo build -p asap-api
cargo build -p asap-worker

# Build for production
cargo build --release
```

## Running Tests

```bash
# Run all tests
cargo test

# Run specific package tests
cargo test -p asap-core-domain
cargo test -p asap-core-api
```

## Database Migrations

Migrations are located in `infra/migrations/` and are applied automatically by the setup script.

To manually apply migrations:

```bash
export DATABASE_URL="postgres://asap:asap_dev_password@localhost:5432/asap"

# Apply all migrations
for file in infra/migrations/*.sql; do
    psql $DATABASE_URL -f $file
done
```

## Docker Development

Start all services with Docker Compose:

```bash
cd infra
docker-compose up
```

Stop services:

```bash
cd infra
docker-compose down
```

## Environment Variables

Copy the example environment files:

```bash
cp infra/env.example/api.env infra/api.env
cp infra/env.example/worker.env infra/worker.env
```

Edit the files as needed for your environment.

## Code Style

- Follow Rust conventions (`rustfmt`, `clippy`)
- Use meaningful commit messages
- Add tests for new features
- Update documentation

Format code:

```bash
cargo fmt

# Check formatting
cargo fmt -- --check
```

Lint code:

```bash
cargo clippy
```

## Current Status

### ✅ Completed (Phase 1)
- [x] Monorepo structure
- [x] Core domain models
- [x] API route stubs
- [x] Database schema
- [x] Docker infrastructure
- [x] Development scripts

### 🚧 In Progress (Phase 2)
- [ ] Core API implementation
- [ ] Authentication (JWT, bcrypt)
- [ ] Database integration (SQLx)
- [ ] User management endpoints
- [ ] Portfolio management endpoints

### 📋 Planned (Phase 3+)
- [ ] Worker event processor
- [ ] GitHub Generator module
- [ ] Theme rendering
- [ ] Frontend (Astro)
- [ ] End-to-end tests

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## Troubleshooting

### Port already in use

If port 3000 or 5432 is already in use:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9
lsof -ti:5432 | xargs kill -9
```

### Database connection issues

Ensure PostgreSQL is running:

```bash
docker ps | grep postgres

# Or check local postgres
pg_isready -h localhost -p 5432
```

### Build errors

Clean and rebuild:

```bash
cargo clean
cargo build
```

## Resources

- [Rust Documentation](https://doc.rust-lang.org/)
- [Axum Web Framework](https://docs.rs/axum/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For questions or issues, please open an issue on GitHub.
