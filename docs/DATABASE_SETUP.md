# Database Configuration Guide

This guide explains how to set up and use the PostgreSQL database for local development.

## Prerequisites

- Docker and Docker Compose installed
- Rust and Cargo installed
- PostgreSQL CLI tools (optional, for direct access)

## Quick Start

### 1. Initialize Database

Run the setup script to initialize PostgreSQL with all migrations:

```bash
make setup-db
```

Or manually:

```bash
bash scripts/setup-db.sh
```

This will:
- Start PostgreSQL container if not running
- Create the `asap` database
- Apply all migrations
- Enable Row Level Security
- Create `.env.local` configuration file

### 2. Verify Connection

Test the database connection:

```bash
docker exec asap-postgres psql -U asap -d asap -c "SELECT 1;"
```

Expected output:
```
 ?column?
----------
        1
(1 row)
```

### 3. Set Environment Variables

The database URL is configured in `.env.local`:

```bash
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
```

Or add to your shell profile:

```bash
echo 'export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"' >> ~/.bashrc
source ~/.bashrc
```

## Database Commands

### Start/Stop Database

```bash
# Start PostgreSQL
make db-start

# Stop PostgreSQL
make db-stop

# Reset database (WARNING: deletes all data)
make db-reset
```

### Manual PostgreSQL Commands

Connect to the database:

```bash
docker exec -it asap-postgres psql -U asap -d asap
```

List tables:

```bash
docker exec asap-postgres psql -U asap -d asap -c "\dt"
```

Run SQL file:

```bash
docker exec asap-postgres psql -U asap -d asap -f /dev/stdin < infra/migrations/001_core_schema.sql
```

## Running Tests

### Unit Tests (No Database Required)

```bash
# Run all unit tests
make test

# Test individual components
make test-domain      # Core domain models
make test-modules     # All modules
```

### Integration Tests (Database Required)

Tests that require the database:

```bash
# Make sure DATABASE_URL is set
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"

# Run specific test suite
cargo test --lib -p asap-core-api auth::tests
```

## Environment Variables

The `.env.local` file contains:

```bash
# Database Connection
DATABASE_URL=postgresql://asap:asap@localhost:5432/asap

# Logging
RUST_LOG=asap_api=debug,asap_core_api=debug,tower_http=debug,sqlx=info

# API Server
ASAP_API_PORT=3000
ASAP_API_HOST=127.0.0.1

# JWT Configuration
JWT_SECRET=dev_secret_key_change_in_production_12345
```

## Database Schema

### Tables

- `users` - User accounts
- `tenants` - Isolated workspaces
- `user_data` - Extended user information (JSONB)
- `portfolios` - User portfolios
- `portfolio_data` - Portfolio content (JSONB)
- `events` - System events
- `modules` - Available modules
- `module_configs` - Module configuration per tenant
- `integrations` - External service connections (future)

### Security

- **Row Level Security (RLS)** enabled for tenant isolation
- **Password hashing** with bcrypt
- **JWT tokens** for API authentication
- **CORS** configuration for secure cross-origin requests

## Troubleshooting

### PostgreSQL container won't start

```bash
# Check container logs
docker logs asap-postgres

# Remove and recreate container
docker-compose -f infra/docker-compose.yml down
docker-compose -f infra/docker-compose.yml up -d
```

### Database connection refused

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check if port 5432 is accessible
netstat -an | grep 5432

# Verify database exists
docker exec asap-postgres psql -U asap -tc "SELECT datname FROM pg_database WHERE datname = 'asap';"
```

### sqlx macros fail at compile time

This happens when `DATABASE_URL` is not set. Solution:

```bash
# Set the environment variable
export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"

# Then rebuild
cargo build
```

### Tests fail due to missing tables

Ensure migrations are applied:

```bash
docker exec asap-postgres psql -U asap -d asap -f /dev/stdin < infra/migrations/001_core_schema.sql
```

## VSCode Integration

1. Install the "SQLTools" extension from VSCode marketplace
2. The connection is pre-configured in `.vscode/settings.json`
3. A database explorer will appear in the VSCode sidebar
4. You can browse tables, run queries, and more

## Docker Compose Reference

File: `infra/docker-compose.yml`

Starts a PostgreSQL 15 container with:
- Port: 5432
- Username: asap
- Password: asap
- Database: asap
- Health check enabled

## Performance Optimization

### Indexes

Indexes are created on:
- `users.email` (unique)
- `users.tenant_id`
- `tenants.slug` (unique)
- `portfolios.tenant_id`
- `portfolios.slug` (unique per tenant)

### Connection Pooling

The API uses sqlx with connection pooling:
- Minimum pool size: 5
- Maximum pool size: 20

Configure in your code:

```rust
let pool = PgPoolOptions::new()
    .min_connections(5)
    .max_connections(20)
    .connect(&database_url)
    .await?;
```

## Next Steps

1. ✅ Database is configured
2. ✅ Migrations are applied
3. ✅ Tests are set up

You're ready to:
- Run tests: `make test`
- Start the API: `cargo run -p asap-api`
- Develop with full database support

