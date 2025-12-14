# =============================================================================
# ASAP v2 - Makefile
# =============================================================================
# Use bash for shell commands (required for read -n, [[ ]], etc.)
SHELL := /bin/bash
# =============================================================================
# Configuration
# =============================================================================
DOCKER_COMPOSE = docker compose
COMPOSE_FILE = -f infra/docker-compose.yml
COMPOSE_DEV = -f infra/docker-compose.yml -f infra/docker-compose.dev.yml
INFRA_DIR = infra

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
CYAN   := \033[0;36m
NC     := \033[0m # No Color

.PHONY: help
help:
	@echo ""
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║           ASAP v2 - Development Commands                     ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Docker Commands:$(NC)"
	@echo "  make up              - Start all services (dev mode)"
	@echo "  make up-infra        - Start only infrastructure (postgres, redis)"
	@echo "  make up-api          - Start API service with dependencies"
	@echo "  make up-web          - Start Web service with dependencies"
	@echo "  make down            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make logs            - View logs from all services"
	@echo "  make logs-api        - View API logs"
	@echo "  make logs-web        - View Web logs"
	@echo "  make logs-worker     - View Worker logs"
	@echo "  make ps              - Show running containers"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make setup-db        - Initialize PostgreSQL database with migrations"
	@echo "  make db-start        - Start PostgreSQL container only"
	@echo "  make db-stop         - Stop PostgreSQL container"
	@echo "  make db-reset        - Drop and recreate database $(RED)(DANGEROUS!)$(NC)"
	@echo "  make migrate         - Run database migrations"
	@echo "  make db-shell        - Open psql shell in database"
	@echo ""
	@echo "$(GREEN)Build Commands:$(NC)"
	@echo "  make build           - Build all Rust crates (debug)"
	@echo "  make release         - Build release binaries"
	@echo "  make docker-build    - Build Docker images"
	@echo "  make docker-rebuild  - Force rebuild Docker images (no cache)"
	@echo "  make check           - Run cargo check"
	@echo ""
	@echo "$(GREEN)Test Commands:$(NC)"
	@echo "  make test            - Run all unit tests"
	@echo "  make test-domain     - Test core domain models"
	@echo "  make test-modules    - Test all modules"
	@echo "  make test-api        - Test API handlers (requires DATABASE_URL)"
	@echo "  make test-all        - Run all tests including integration"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make dev             - Start full dev environment"
	@echo "  make dev-api         - Run API locally with cargo watch"
	@echo "  make dev-web         - Run web app locally (npm run dev)"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make clean-all       - Clean all (build + Docker volumes)"
	@echo "  make fmt             - Format code with rustfmt"
	@echo "  make clippy          - Run clippy linter"
	@echo ""
	@echo "$(GREEN)Utility Commands:$(NC)"
	@echo "  make redis-cli       - Open Redis CLI"
	@echo "  make shell-api       - Shell into API container"
	@echo "  make shell-web       - Shell into Web container"
	@echo ""

# =============================================================================
# Docker Commands
# =============================================================================
.PHONY: up up-infra up-api up-web down restart logs logs-api logs-web logs-worker ps

up:
	@echo "$(CYAN)Starting all services in dev mode...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d
	@echo "$(GREEN)✓ All services started$(NC)"
	@echo "  - API:      http://localhost:3000"
	@echo "  - Web:      http://localhost:4321"
	@echo "  - Postgres: localhost:5432"
	@echo "  - Redis:    localhost:6379"

up-infra:
	@echo "$(CYAN)Starting infrastructure services...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) up -d postgres redis
	@echo "$(GREEN)✓ Infrastructure started$(NC)"

up-api:
	@echo "$(CYAN)Starting API with dependencies...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) up -d postgres redis migrations api
	@echo "$(GREEN)✓ API started at http://localhost:3000$(NC)"

up-web:
	@echo "$(CYAN)Starting Web with dependencies...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d postgres redis migrations api web
	@echo "$(GREEN)✓ Web started at http://localhost:4321$(NC)"

down:
	@echo "$(CYAN)Stopping all services...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) down
	@echo "$(GREEN)✓ All services stopped$(NC)"

restart:
	@echo "$(CYAN)Restarting all services...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) restart
	@echo "$(GREEN)✓ All services restarted$(NC)"

logs:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f

logs-api:
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) logs -f api

logs-web:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f web

logs-worker:
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) logs -f worker

ps:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) ps

# =============================================================================
# Database Commands
# =============================================================================
.PHONY: setup-db db-start db-stop db-reset migrate db-shell

setup-db:
	@bash scripts/setup-db.sh

db-start:
	@echo "$(CYAN)Starting PostgreSQL...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) up -d postgres
	@echo "$(GREEN)✓ PostgreSQL started at localhost:5432$(NC)"

db-stop:
	@echo "$(CYAN)Stopping PostgreSQL...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) stop postgres
	@echo "$(GREEN)✓ PostgreSQL stopped$(NC)"

db-reset:
	@echo "$(RED)⚠️  WARNING: This will DELETE all database data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(CYAN)Resetting database...$(NC)"; \
		docker exec asap-postgres psql -U asap -c "DROP DATABASE IF EXISTS asap;"; \
		docker exec asap-postgres psql -U asap -c "CREATE DATABASE asap;"; \
		$(DOCKER_COMPOSE) $(COMPOSE_FILE) up migrations; \
		echo "$(GREEN)✓ Database reset complete$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

migrate:
	@echo "$(CYAN)Running migrations...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) up migrations
	@echo "$(GREEN)✓ Migrations complete$(NC)"

db-shell:
	@echo "$(CYAN)Connecting to PostgreSQL...$(NC)"
	docker exec -it asap-postgres psql -U asap -d asap

# =============================================================================
# Build Commands
# =============================================================================
.PHONY: build release docker-build docker-rebuild check

build:
	@echo "$(CYAN)Building all crates (debug)...$(NC)"
	cargo build
	@echo "$(GREEN)✓ Build complete$(NC)"

release:
	@echo "$(CYAN)Building release binaries...$(NC)"
	cargo build --release
	@echo "$(GREEN)✓ Release build complete$(NC)"

docker-build:
	@echo "$(CYAN)Building Docker images...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) build
	@echo "$(GREEN)✓ Docker images built$(NC)"

docker-rebuild:
	@echo "$(CYAN)Rebuilding Docker images (no cache)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✓ Docker images rebuilt$(NC)"

check:
	@echo "$(CYAN)Running cargo check...$(NC)"
	cargo check
	@echo "$(GREEN)✓ Check complete$(NC)"

# =============================================================================
# Test Commands
# =============================================================================
.PHONY: test test-domain test-modules test-api test-all

test: test-domain test-modules
	@echo "$(GREEN)✓ All unit tests passed$(NC)"

test-domain:
	@echo "$(CYAN)Testing Core Domain...$(NC)"
	cargo test --lib -p asap-core-domain
	@echo "$(GREEN)✓ Domain tests passed$(NC)"

test-modules:
	@echo "$(CYAN)Testing Modules...$(NC)"
	cargo test --lib -p asap-module-analytics
	cargo test --lib -p asap-module-themes
	cargo test --lib -p asap-module-github-generator
	cargo test --lib -p asap-module-projections
	@echo "$(GREEN)✓ Module tests passed$(NC)"

test-api:
	@echo "$(CYAN)Testing API (requires DATABASE_URL)...$(NC)"
	cargo test --lib -p asap-core-api routes::tests
	@echo "$(GREEN)✓ API tests passed$(NC)"

test-all: test-domain test-modules test-api
	@echo "$(GREEN)✓ All tests passed$(NC)"

# =============================================================================
# Development Commands
# =============================================================================
.PHONY: dev dev-api dev-web clean clean-all fmt fmt-check clippy

dev: up
	@echo "$(GREEN)Development environment ready!$(NC)"
	@echo "Run 'make logs' to follow logs"

dev-api: up-infra
	@echo "$(CYAN)Starting API with cargo watch...$(NC)"
	@echo "$(YELLOW)Make sure cargo-watch is installed: cargo install cargo-watch$(NC)"
	cargo watch -x 'run --bin asap-api'

dev-web:
	@echo "$(CYAN)Starting web app locally...$(NC)"
	cd apps/web && npm run dev

clean:
	@echo "$(CYAN)Cleaning build artifacts...$(NC)"
	cargo clean
	@echo "$(GREEN)✓ Clean complete$(NC)"

clean-all: clean
	@echo "$(RED)⚠️  WARNING: This will remove Docker volumes!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) $(COMPOSE_DEV) down -v; \
		echo "$(GREEN)✓ Full clean complete$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

fmt:
	@echo "$(CYAN)Formatting code...$(NC)"
	cargo fmt --all
	@echo "$(GREEN)✓ Formatting complete$(NC)"

fmt-check:
	@echo "$(CYAN)Checking formatting...$(NC)"
	cargo fmt --all -- --check
	@echo "$(GREEN)✓ Formatting check passed$(NC)"

clippy:
	@echo "$(CYAN)Running clippy...$(NC)"
	cargo clippy --all --all-targets -- -D warnings
	@echo "$(GREEN)✓ Clippy passed$(NC)"

# =============================================================================
# Utility Commands
# =============================================================================
.PHONY: redis-cli shell-api shell-web

redis-cli:
	@echo "$(CYAN)Connecting to Redis...$(NC)"
	docker exec -it asap-redis redis-cli

shell-api:
	@echo "$(CYAN)Opening shell in API container...$(NC)"
	docker exec -it asap-api /bin/sh

shell-web:
	@echo "$(CYAN)Opening shell in Web container...$(NC)"
	docker exec -it asap-web /bin/sh

# =============================================================================
# Quick aliases
# =============================================================================
.PHONY: start stop status

start: up
stop: down
status: ps
