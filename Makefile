# =============================================================================
# ASAP v2 - Makefile (Docker-first development)






# Sites app URL (used for canonical links)
PUBLIC_SITES_URL = http://localhost:4322
# API endpoint - points to the ASAP API server
PUBLIC_API_URL = http://localhost:3000/api

# =============================================================================
# Use bash for shell commands (required for read -n, [[ ]], etc.)
SHELL := /bin/bash
# =============================================================================
# Configuration
# =============================================================================
DOCKER_COMPOSE = docker compose
COMPOSE_FILE = -f infra/docker-compose.yml
COMPOSE_DEV = -f infra/docker-compose.yml -f infra/docker-compose.dev.yml
COMPOSE_PROD = -f infra/docker-compose.prod.yml --env-file infra/.env.prod
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
	@echo "$(CYAN)║           ASAP v2 - Docker Development Commands              ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make dev             - Start full dev environment (hot reload)"
	@echo "  make dev-build       - Rebuild and start dev environment"
	@echo "  make dev-api         - Start only API with dependencies"
	@echo "  make dev-web         - Start only Web with dependencies"
	@echo "  make dev-accounts    - Start only Accounts with dependencies"
	@echo "  make dev-sites       - Start only Sites with dependencies"
	@echo "  make dev-worker      - Start only Worker with dependencies"
	@echo ""
	@echo "$(GREEN)Docker Commands:$(NC)"
	@echo "  make up              - Start all services"
	@echo "  make up-infra        - Start only infrastructure (postgres, redis)"
	@echo "  make down            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make logs            - View logs from all services"
	@echo "  make logs-api        - View API logs"
	@echo "  make logs-web        - View Web logs"
	@echo "  make logs-accounts   - View Accounts logs"
	@echo "  make logs-sites      - View Sites logs"
	@echo "  make logs-worker     - View Worker logs"
	@echo "  make ps              - Show running containers"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make db-start        - Start PostgreSQL container only"
	@echo "  make db-stop         - Stop PostgreSQL container"
	@echo "  make db-reset        - Drop and recreate database $(RED)(DANGEROUS!)$(NC)"
	@echo "  make migrate         - Run database migrations"
	@echo "  make db-shell        - Open psql shell in database"
	@echo ""
	@echo "$(GREEN)Build Commands:$(NC)"
	@echo "  make build           - Build Docker images for dev"
	@echo "  make build-prod      - Build production Docker images"
	@echo "  make build-prod-full - Full production build (no cache)"
	@echo "  make rebuild         - Force rebuild Docker images (no cache)"
	@echo ""
	@echo "$(GREEN)Production Commands:$(NC)"
	@echo "  make prod            - Build and start production environment"
	@echo "  make prod-up         - Start production environment"
	@echo "  make prod-down       - Stop production environment"
	@echo "  make prod-logs       - View production logs"
	@echo "  make prod-ps         - Show production containers"
	@echo ""
	@echo "$(GREEN)Test Commands:$(NC)"
	@echo "  make test            - Run all tests in Docker"
	@echo "  make test-domain     - Test core domain models"
	@echo "  make test-extensions - Test all extensions"
	@echo "  make test-api        - Test API handlers"
	@echo ""
	@echo "$(GREEN)Code Quality:$(NC)"
	@echo "  make check           - Run cargo check in Docker"
	@echo "  make fmt             - Format code with rustfmt"
	@echo "  make fmt-check       - Check code formatting"
	@echo "  make clippy          - Run clippy linter"
	@echo ""
	@echo "$(GREEN)Utility Commands:$(NC)"
	@echo "  make redis-cli       - Open Redis CLI"
	@echo "  make shell-api       - Shell into API container"
	@echo "  make shell-web       - Shell into Web container"
	@echo "  make shell-worker    - Shell into Worker container"
	@echo "  make clean           - Clean Docker build cache"
	@echo "  make clean-all       - Clean all (volumes + cache)"
	@echo ""

# =============================================================================
# Development Commands (Docker-only)
# =============================================================================
.PHONY: dev dev-build dev-api dev-web dev-worker

dev:
	@echo "$(CYAN)Starting full dev environment with Docker...$(NC)"
	@echo "$(YELLOW)Ensuring local ports are free: 4322, 4321, 4323, 3000$(NC)"
	@fuser -k 4322/tcp 2>/dev/null || true
	@fuser -k 4321/tcp 2>/dev/null || true
	@fuser -k 4323/tcp 2>/dev/null || true
	@fuser -k 3000/tcp 2>/dev/null || true
	@echo "$(YELLOW)Killed local processes on those ports (if any).$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d
	@echo "$(GREEN)✓ Development environment started$(NC)"
	@echo ""
	@echo "  API:      http://localhost:3000"
	@echo "  Web:      http://localhost:4321"
	@echo "  Accounts: http://localhost:4323"
	@echo "  Sites:    http://localhost:4322"
	@echo "  Postgres: localhost:5432"
	@echo "  Redis:    localhost:6379"
	@echo ""
	@echo "$(YELLOW)Run 'make logs' to follow logs$(NC)"

dev-build:
	@echo "$(CYAN)Rebuilding and starting dev environment with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d --build
	@echo "$(GREEN)✓ Development environment rebuilt and started$(NC)"

dev-api:
	@echo "$(CYAN)Starting API with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d api
	@echo "$(GREEN)✓ API started at http://localhost:3000$(NC)"

dev-web:
	@echo "$(CYAN)Starting Web with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d web
	@echo "$(GREEN)✓ Web started at http://localhost:4321$(NC)"

dev-accounts:
	@echo "$(CYAN)Starting Accounts with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d accounts
	@echo "$(GREEN)✓ Accounts started at http://localhost:4323$(NC)"

dev-worker:
	@echo "$(CYAN)Starting Worker with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d worker
	@echo "$(GREEN)✓ Worker started$(NC)"

# Sites app runs locally (no Docker) - requires API running
dev-sites:
	@echo "$(CYAN)Starting Sites container with Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) up -d sites
	@echo "$(GREEN)✓ Sites started at http://localhost:4322$(NC)"

# =============================================================================
# Docker Commands
# =============================================================================
.PHONY: up up-infra down restart logs logs-api logs-web logs-worker ps

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

logs-accounts:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f accounts

logs-sites:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f sites

logs-worker:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) logs -f worker

ps:
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) ps

# =============================================================================
# Database Commands
# =============================================================================
.PHONY: db-start db-stop db-reset migrate db-shell

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
# Build Commands (Docker-based)
# =============================================================================
.PHONY: build build-prod rebuild build-prod-full

build:
	@echo "$(CYAN)Building Docker images for development...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) build
	@echo "$(GREEN)✓ Docker images built$(NC)"

build-prod:
	@echo "$(CYAN)Building production Docker images...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) build
	@echo "$(GREEN)✓ Production images built$(NC)"

build-prod-full:
	@echo "$(CYAN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(CYAN)║       ASAP v2 - Full Production Build                        ║$(NC)"
	@echo "$(CYAN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)Building all production images from scratch...$(NC)"
	@echo ""
	@echo "$(CYAN)[1/4] Building API (Rust)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) build --no-cache api
	@echo "$(GREEN)✓ API built$(NC)"
	@echo ""
	@echo "$(CYAN)[2/4] Building Worker (Rust)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) build --no-cache worker
	@echo "$(GREEN)✓ Worker built$(NC)"
	@echo ""
	@echo "$(CYAN)[3/4] Building Web Dashboard (Astro/React)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) build --no-cache web
	@echo "$(GREEN)✓ Web built$(NC)"
	@echo ""
	@echo "$(CYAN)[4/4] Building Sites (Astro/React)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) build --no-cache sites
	@echo "$(GREEN)✓ Sites built$(NC)"
	@echo ""
	@echo "$(GREEN)╔══════════════════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║       ✓ All production images built successfully!            ║$(NC)"
	@echo "$(GREEN)╚══════════════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@docker images | grep asap- | head -10

rebuild:
	@echo "$(CYAN)Rebuilding Docker images (no cache)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) build --no-cache
	@echo "$(GREEN)✓ Docker images rebuilt$(NC)"

# =============================================================================
# Production Commands
# =============================================================================
.PHONY: prod prod-up prod-down prod-logs prod-ps

prod: build-prod prod-up
	@echo "$(GREEN)✓ Production environment ready$(NC)"

prod-up:
	@echo "$(CYAN)Starting production environment...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) up -d
	@echo "$(GREEN)✓ Production environment started$(NC)"
	@echo ""
	@echo "  API:   http://localhost:$${API_PORT:-3000}"
	@echo "  Web:   http://localhost:$${WEB_PORT:-4321}"
	@echo "  Sites: http://localhost:$${SITES_PORT:-4322}"

prod-down:
	@echo "$(CYAN)Stopping production environment...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) down
	@echo "$(GREEN)✓ Production environment stopped$(NC)"

prod-logs:
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) logs -f

prod-ps:
	$(DOCKER_COMPOSE) $(COMPOSE_PROD) ps

# =============================================================================
# Test Commands (Docker-based)
# =============================================================================
.PHONY: test test-domain test-extensions test-api

test: test-domain test-extensions
	@echo "$(GREEN)✓ All unit tests passed$(NC)"

test-domain:
	@echo "$(CYAN)Testing Core Domain...$(NC)"
	docker run --rm -v "$(PWD)":/app -w /app rustlang/rust:nightly-slim \
		cargo test --lib -p asap-core-domain
	@echo "$(GREEN)✓ Domain tests passed$(NC)"

test-extensions:
	@echo "$(CYAN)Testing Extensions...$(NC)"
	docker run --rm -v "$(PWD)":/app -w /app rustlang/rust:nightly-slim \
		cargo test --lib -p asap-extension-github-sync
	@echo "$(GREEN)✓ Extension tests passed$(NC)"

test-api:
	@echo "$(CYAN)Testing API (uses Docker network)...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec api cargo test --lib -p asap-core-api routes::tests
	@echo "$(GREEN)✓ API tests passed$(NC)"

# =============================================================================
# Code Quality (Docker-based)
# =============================================================================
.PHONY: check fmt fmt-check clippy

check:
	@echo "$(CYAN)Running cargo check in Docker...$(NC)"
	$(DOCKER_COMPOSE) $(COMPOSE_DEV) exec api cargo check --all
	@echo "$(GREEN)✓ Check complete$(NC)"

fmt:
	@echo "$(CYAN)Formatting code...$(NC)"
	docker run --rm -v "$(PWD)":/app -w /app rustlang/rust:nightly-slim \
		cargo fmt --all
	@echo "$(GREEN)✓ Formatting complete$(NC)"

fmt-check:
	@echo "$(CYAN)Checking formatting...$(NC)"
	docker run --rm -v "$(PWD)":/app -w /app rustlang/rust:nightly-slim \
		cargo fmt --all -- --check
	@echo "$(GREEN)✓ Formatting check passed$(NC)"

clippy:
	@echo "$(CYAN)Running clippy...$(NC)"
	docker run --rm -v "$(PWD)":/app -w /app \
		-e SQLX_OFFLINE=true \
		rustlang/rust:nightly-slim \
		sh -c "rustup component add clippy && cargo clippy --all --all-targets -- -D warnings"
	@echo "$(GREEN)✓ Clippy passed$(NC)"

# =============================================================================
# Utility Commands
# =============================================================================
.PHONY: redis-cli shell-api shell-web shell-worker clean clean-all

redis-cli:
	@echo "$(CYAN)Connecting to Redis...$(NC)"
	docker exec -it asap-redis redis-cli

shell-api:
	@echo "$(CYAN)Opening shell in API container...$(NC)"
	docker exec -it asap-api /bin/bash

shell-web:
	@echo "$(CYAN)Opening shell in Web container...$(NC)"
	docker exec -it asap-web /bin/sh

shell-worker:
	@echo "$(CYAN)Opening shell in Worker container...$(NC)"
	docker exec -it asap-worker /bin/bash

clean:
	@echo "$(CYAN)Cleaning Docker build cache...$(NC)"
	docker builder prune -f
	@echo "$(GREEN)✓ Clean complete$(NC)"

clean-all:
	@echo "$(RED)⚠️  WARNING: This will remove Docker volumes and all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		$(DOCKER_COMPOSE) $(COMPOSE_DEV) down -v; \
		docker builder prune -f; \
		echo "$(GREEN)✓ Full clean complete$(NC)"; \
	else \
		echo "$(YELLOW)Aborted$(NC)"; \
	fi

# =============================================================================
# Quick aliases
# =============================================================================
.PHONY: start stop status

start: dev
stop: down
status: ps
