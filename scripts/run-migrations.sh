#!/bin/bash

# ASAP Database Migration Runner
# This script handles automatic database migrations using SQLx
# It can be run manually or as part of Docker container startup

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="${MIGRATIONS_DIR:-/app/infra/migrations}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_DELAY="${RETRY_DELAY:-2}"

echo -e "${BLUE}=== ASAP Database Migration Runner ===${NC}"

# Check required environment variable
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Extract connection details from DATABASE_URL for pg_isready
# Format: postgresql://user:password@host:port/database
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
retries=0
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1; do
    retries=$((retries + 1))
    if [ $retries -ge $MAX_RETRIES ]; then
        echo -e "${RED}Error: PostgreSQL did not become ready in time (${MAX_RETRIES} retries)${NC}"
        exit 1
    fi
    echo "  Attempt $retries/$MAX_RETRIES - PostgreSQL not ready, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"

# Create migrations tracking table if it doesn't exist
echo "Ensuring migrations tracking table exists..."
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS _sqlx_migrations (
    version BIGINT PRIMARY KEY,
    description TEXT NOT NULL,
    installed_on TIMESTAMPTZ NOT NULL DEFAULT now(),
    success BOOLEAN NOT NULL,
    checksum BYTEA NOT NULL,
    execution_time BIGINT NOT NULL
);
" > /dev/null 2>&1 || true

# Function to compute checksum (SHA-256)
compute_checksum() {
    local file="$1"
    sha256sum "$file" | cut -d' ' -f1 | xxd -r -p | base64
}

# Function to extract version from filename
extract_version() {
    local filename="$1"
    echo "$filename" | grep -oE '^[0-9]+' | head -1
}

# Function to extract description from filename
extract_description() {
    local filename="$1"
    echo "$filename" | sed 's/^[0-9]*_//' | sed 's/\.sql$//' | tr '_' ' '
}

# Run migrations
echo "Running migrations from: $MIGRATIONS_DIR"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${YELLOW}Warning: Migrations directory not found: $MIGRATIONS_DIR${NC}"
    exit 0
fi

migration_count=0
applied_count=0

for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    [ -e "$migration_file" ] || continue
    
    filename=$(basename "$migration_file")
    version=$(extract_version "$filename")
    description=$(extract_description "$filename")
    checksum=$(compute_checksum "$migration_file")
    
    if [ -z "$version" ]; then
        echo -e "${YELLOW}Skipping $filename - invalid format (no version number)${NC}"
        continue
    fi
    
    migration_count=$((migration_count + 1))
    
    # Check if migration was already applied
    already_applied=$(psql "$DATABASE_URL" -t -c "SELECT 1 FROM _sqlx_migrations WHERE version = $version LIMIT 1;" 2>/dev/null | tr -d ' ')
    
    if [ "$already_applied" = "1" ]; then
        echo -e "  ${GREEN}✓${NC} $filename (already applied)"
        continue
    fi
    
    echo -e "  ${BLUE}→${NC} Applying: $filename"
    
    # Record start time
    start_time=$(date +%s%N)
    
    # Apply migration
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        # Record end time and calculate duration
        end_time=$(date +%s%N)
        execution_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        # Record successful migration
        psql "$DATABASE_URL" -c "
            INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time)
            VALUES ($version, '$description', true, decode('$checksum', 'base64'), $execution_time);
        " > /dev/null 2>&1
        
        echo -e "    ${GREEN}✓${NC} Applied successfully (${execution_time}ms)"
        applied_count=$((applied_count + 1))
    else
        # Record failed migration
        end_time=$(date +%s%N)
        execution_time=$(( (end_time - start_time) / 1000000 ))
        
        psql "$DATABASE_URL" -c "
            INSERT INTO _sqlx_migrations (version, description, success, checksum, execution_time)
            VALUES ($version, '$description', false, decode('$checksum', 'base64'), $execution_time)
            ON CONFLICT (version) DO UPDATE SET success = false;
        " > /dev/null 2>&1 || true
        
        echo -e "    ${RED}✗${NC} Migration failed!"
        echo -e "${RED}Error applying migration: $filename${NC}"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo "Total migrations: $migration_count"
echo "Applied in this run: $applied_count"
echo ""
