# ASAP Development Guide

This guide covers the development setup and workflow for ASAP v2.

## Prerequisites

- **Rust** 1.70+
- **Docker** & Docker Compose
- **PostgreSQL** 15+ (via Docker or local)
- **Node.js** 18+ (for future frontend)
- **Make** (optional, for command shortcuts)

## Quick Start

### 1. Initialize Database (One-time Setup)

```bash
# Start PostgreSQL and apply migrations
make setup-db

# Or manually:
bash scripts/setup-db.sh

# Verify connection
docker exec asap-postgres psql -U asap -d asap -c "SELECT 1;"
```

### 2. Set Environment Variables

```bash
# Load database configuration
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"

# Or add to .bashrc/.zshrc for persistence
echo 'export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"' >> ~/.bashrc
```

### 3. Run Tests

```bash
# All unit tests
make test

# Test by component
make test-domain      # Core domain models (31 tests)
make test-extensions  # All extensions (36 tests)
```

### 4. Development Workflow

Start the services in separate terminals:

```bash
# Terminal 1 - API
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
cargo run -p asap-api

# Terminal 2 - Worker
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
cargo run -p asap-worker
```

The API will be available at `http://localhost:3000`.

## Project Structure

```
asap-v2/
├── core/                   # Core domain and API
│   ├── domain/            # Domain models (Account, Website, Event, etc.)
│   └── api/               # HTTP routes and handlers
├── modules/               # Feature extensions
│   ├── github-generator/  # Import GitHub repos
│   ├── themes/            # Theme rendering
│   ├── analytics/         # Usage tracking
│   └── projections/       # Static file generation
├── apps/                  # Executable applications
│   ├── api/              # Core API server
│   ├── worker/           # Event processor
│   └── web/              # Frontend (Astro + React)
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

## Testing

### Unit Tests

All tests can be run without a database connection:

```bash
# Run all unit tests
make test

# Test core domain (31 tests)
make test-domain

# Test extensions (36 tests)
make test-extensions

# Run specific test suite
cargo test --lib -p asap-core-domain
cargo test --lib -p asap-extension-analytics
cargo test --lib -p asap-extension-themes
cargo test --lib -p asap-extension-github-generator
cargo test --lib -p asap-extension-projections
```

### Test Coverage

**79 unit tests covering:**

- **Core Domain**: 31 tests
  - Accounts (5 tests): creation, cloning, serialization
  - Websites (7 tests): status, metadata, data
  - Events (8 tests): creation, processing, serialization
  - Integrations (11 tests): GitHub integration, token management

- **Core Shared**: 10 tests
  - Configuration management
  - JWT token generation and validation
  - Error handling

- **Extensions**: 38 tests
  - Analytics (7 tests): event tracking
  - Themes (10 tests): theme application, JSON handling
  - GitHub Generator (13 tests): repo filtering, content generation
  - Projections (8 tests): slug validation, data structure

- **API**: Password & Route tests (requires DATABASE_URL)
  - Password hashing & verification
  - Route definitions
  - Request/Response structures

### Running Tests with Output

```bash
# Show test output
cargo test --lib -- --nocapture

# Run single test
cargo test test_user_creation -- --exact

# Run tests sequentially (for debugging)
cargo test -- --test-threads=1

# List all tests
cargo test --lib -- --list
```

## Database Management

### Database Commands

```bash
# Initialize database (one-time)
make setup-db

# Start PostgreSQL
make db-start

# Stop PostgreSQL
make db-stop

# Reset database (WARNING: deletes data)
make db-reset

# Connect to database shell
docker exec -it asap-postgres psql -U asap -d asap

# List tables
docker exec asap-postgres psql -U asap -d asap -c "\dt"

# View table structure
docker exec asap-postgres psql -U asap -d asap -c "\d accounts"
```

### Database Configuration

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Username: `asap`
- Password: `asap`
- Database: `asap`

**Environment Variable:**
```bash
DATABASE_URL=postgresql://asap:asap@localhost:5432/asap
```

### Database Schema

**Tables:**
- `accounts` - User accounts with email and password hash
- `tenants` - Isolated workspaces (multi-tenancy)
- `account_data` - Extended account info (JSONB format)
- `websites` - User website records
- `website_data` - Website content (JSONB format)
- `website_sections` - Website sections
- `website_pages` - Website pages
- `events` - System events for event-driven architecture
- `extensions` - Available extensions
- `website_extensions` - Extensions enabled per website

**Security Features:**
- Row-Level Security (RLS) for tenant isolation
- Password hashing with bcrypt
- JWT token authentication
- CORS configuration

## Code Quality

```bash
# Format code
make fmt

# Check formatting
make fmt-check

# Run linter
make clippy

# Check for errors
cargo check

# Run clippy with strict rules
cargo clippy --all --all-targets -- -D warnings
```

## Environment Setup

### .env.local

The project uses `.env.local` for configuration:

```bash
# Database
DATABASE_URL=postgresql://asap:asap@localhost:5432/asap

# Logging
RUST_LOG=asap_api=debug,asap_core_api=debug,tower_http=debug,sqlx=info

# API Server
ASAP_API_PORT=3000
ASAP_API_HOST=127.0.0.1

# JWT
JWT_SECRET=dev_secret_key_change_in_production_12345

# Extensions
GITHUB_API_ENABLED=true
ANALYTICS_ENABLED=true
THEMES_ENABLED=true
PROJECTIONS_ENABLED=true
```

### Load Environment

```bash
# In your shell session
set -a
source .env.local
set +a
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if container is running
docker ps | grep asap-postgres

# Restart PostgreSQL
make db-stop
make db-start

# Check logs
docker logs asap-postgres

# Verify connection
docker exec asap-postgres psql -U asap -d asap -c "SELECT 1;"
```

### sqlx Macro Compilation Errors

The `sqlx!` macros require DATABASE_URL to be set:

```bash
# Set environment variable
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"

# Rebuild
cargo build
```

### Tests Failing

```bash
# Ensure DATABASE_URL is set
echo $DATABASE_URL

# Ensure PostgreSQL is running
docker ps | grep postgres

# Run setup again if needed
make setup-db
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

### ✅ Completed (Phase 1-3)
- [x] Monorepo structure
- [x] Core domain models
- [x] API routes and handlers
- [x] Database schema
- [x] Docker infrastructure
- [x] Development scripts
- [x] Core API implementation
- [x] Authentication (JWT, bcrypt)
- [x] Database integration (SQLx)
- [x] Account management endpoints
- [x] Website management endpoints
- [x] Worker event processor
- [x] GitHub Generator extension
- [x] Theme rendering extension
- [x] Projections extension
- [x] Analytics extension
- [x] Redis caching (optional)
- [x] File storage with quotas

### 🚧 In Progress (Current Phase)
- [ ] Frontend (Astro)
- [ ] End-to-end tests
- [ ] CI/CD pipeline

### 📋 Planned (Future)
- [ ] AI Generator extension
- [ ] Custom domains
- [ ] Advanced analytics
- [ ] Stripe integration

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
