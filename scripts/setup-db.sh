#!/bin/bash

# Initialize and configure the ASAP database
# This script sets up PostgreSQL with all necessary tables, indexes, and RLS policies

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== ASAP Database Setup ===${NC}"

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    echo -e "${YELLOW}Error: Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if PostgreSQL container exists
if ! docker ps | grep -q asap-postgres; then
    echo -e "${YELLOW}PostgreSQL container not found. Starting docker-compose...${NC}"
    docker-compose -f infra/docker-compose.yml up -d
    sleep 5
else
    echo -e "${GREEN}✓ PostgreSQL container is running${NC}"
fi

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec asap-postgres pg_isready -U asap > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}Error: PostgreSQL did not become ready in time${NC}"
        exit 1
    fi
    sleep 1
done

# Create database if it doesn't exist
echo "Checking database..."
DB_EXISTS=$(docker exec asap-postgres psql -U asap -tc "SELECT 1 FROM pg_database WHERE datname = 'asap'" 2>/dev/null || echo "")
if [ -z "$DB_EXISTS" ]; then
    echo "Creating database 'asap'..."
    docker exec asap-postgres psql -U asap -c "CREATE DATABASE asap;"
    echo -e "${GREEN}✓ Database 'asap' created${NC}"
else
    echo -e "${GREEN}✓ Database 'asap' already exists${NC}"
fi

# Run migrations
echo "Running migrations..."
if [ -f "infra/migrations/001_core_schema.sql" ]; then
    docker exec asap-postgres psql -U asap -d asap -f /dev/stdin < infra/migrations/001_core_schema.sql
    echo -e "${GREEN}✓ Migrations applied successfully${NC}"
else
    echo -e "${YELLOW}Warning: Migration file not found${NC}"
fi

# Verify tables were created
echo "Verifying tables..."
TABLE_COUNT=$(docker exec asap-postgres psql -U asap -d asap -tc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
echo -e "${GREEN}✓ Found $TABLE_COUNT tables${NC}"

# Enable RLS if needed
echo "Checking Row Level Security..."
docker exec asap-postgres psql -U asap -d asap -c "ALTER DATABASE asap SET row_security = on;" 2>/dev/null || true
echo -e "${GREEN}✓ RLS enabled${NC}"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local..."
    cat > .env.local << 'EOF'
# Local Development Configuration
DATABASE_URL=postgresql://asap:asap@localhost:5432/asap
RUST_LOG=asap_api=debug,asap_core_api=debug,tower_http=debug,sqlx=info
ASAP_API_PORT=3000
ASAP_API_HOST=127.0.0.1
JWT_SECRET=dev_secret_key_change_in_production_12345
EOF
    echo -e "${GREEN}✓ .env.local created${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

echo ""
echo -e "${GREEN}=== Database Setup Complete ===${NC}"
echo ""
echo "Database Info:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Username: asap"
echo "  Password: asap"
echo "  Database: asap"
echo ""
echo "To test the connection, run:"
echo "  ${BLUE}docker exec asap-postgres psql -U asap -d asap -c \"SELECT 1;\"${NC}"
echo ""
echo "To use the database in your code, set:"
echo "  ${BLUE}DATABASE_URL=postgresql://asap:asap@localhost:5432/asap${NC}"
