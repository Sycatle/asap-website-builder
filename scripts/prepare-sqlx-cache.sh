#!/bin/bash

# Prepare sqlx offline mode cache
# This script generates the query cache for sqlx to work in offline mode

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Preparing SQLx Cache ===${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}DATABASE_URL not set, loading from .env.local...${NC}"
    if [ -f ".env.local" ]; then
        export $(grep "^DATABASE_URL" .env.local | xargs)
    else
        export DATABASE_URL="postgresql://asap:asap@localhost:5432/asap"
    fi
fi

echo "Using DATABASE_URL: $DATABASE_URL"

# Create sqlx cache directory if it doesn't exist
mkdir -p .sqlx

# Run cargo sqlx prepare to generate the cache
echo "Generating SQLx query cache..."
cd core/api
cargo sqlx prepare --database-url "$DATABASE_URL" 2>&1 || {
    echo -e "${YELLOW}Note: SQLx prepare requires cargo-sqlx CLI${NC}"
    echo "Install it with: cargo install sqlx-cli --no-default-features --features postgres"
    cd ..
    exit 0
}

cd ..

echo -e "${GREEN}✓ SQLx cache prepared successfully${NC}"
echo ""
echo "The cache files are stored in: .sqlx/"
echo "You can now run tests with: SQLX_OFFLINE=true cargo test"
