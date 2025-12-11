#!/bin/bash
set -e

echo "🚀 Setting up ASAP development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Copy environment files if they don't exist
if [ ! -f infra/.env ]; then
    echo "📝 Creating environment files..."
    if [ -f infra/env.example/api.env ]; then
        cp infra/env.example/api.env infra/.env
    fi
fi

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
cd infra
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations via Docker Compose
echo "📊 Running database migrations..."
docker compose up migrations
cd ..

echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  1. Terminal 1: cd apps/api && cargo run"
echo "  2. Terminal 2: cd apps/worker && cargo run"
echo "  3. Terminal 3: cd apps/web && npm run dev"
echo ""
echo "Or use Docker Compose to start all services:"
echo "  docker compose -f infra/docker-compose.yml up"
