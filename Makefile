.PHONY: help setup-db test test-domain test-modules test-api test-all clean db-start db-stop db-reset

help:
	@echo "ASAP v2 - Development Commands"
	@echo ""
	@echo "Database Commands:"
	@echo "  make setup-db        - Initialize PostgreSQL database with migrations"
	@echo "  make db-start        - Start PostgreSQL container"
	@echo "  make db-stop         - Stop PostgreSQL container"
	@echo "  make db-reset        - Drop and recreate database (DANGEROUS!)"
	@echo ""
	@echo "Test Commands:"
	@echo "  make test            - Run all tests"
	@echo "  make test-domain     - Test core domain models"
	@echo "  make test-modules    - Test all modules"
	@echo "  make test-api        - Test API handlers (requires DATABASE_URL)"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build           - Build all crates"
	@echo "  make release         - Build release binaries"
	@echo "  make check           - Run cargo check"
	@echo ""
	@echo "Development Commands:"
	@echo "  make clean           - Clean build artifacts"
	@echo "  make fmt             - Format code with rustfmt"
	@echo "  make clippy          - Run clippy linter"
	@echo ""

setup-db:
	@bash scripts/setup-db.sh

db-start:
	docker-compose -f infra/docker-compose.yml up -d

db-stop:
	docker-compose -f infra/docker-compose.yml down

db-reset:
	@echo "⚠️  WARNING: This will DELETE all database data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker exec asap-postgres psql -U asap -c "DROP DATABASE IF EXISTS asap;"; \
		docker exec asap-postgres psql -U asap -c "CREATE DATABASE asap;"; \
		bash scripts/setup-db.sh; \
	fi

test: test-domain test-modules
	@echo "✓ All unit tests passed"

test-domain:
	@echo "Testing Core Domain..."
	cargo test --lib -p asap-core-domain

test-modules:
	@echo "Testing Modules..."
	cargo test --lib -p asap-module-analytics
	cargo test --lib -p asap-module-themes
	cargo test --lib -p asap-module-github-generator
	cargo test --lib -p asap-module-projections

test-api:
	@echo "Testing API (requires DATABASE_URL)..."
	cargo test --lib -p asap-core-api routes::tests

build:
	cargo build

release:
	cargo build --release

check:
	cargo check

clean:
	cargo clean

fmt:
	cargo fmt --all

fmt-check:
	cargo fmt --all -- --check

clippy:
	cargo clippy --all --all-targets -- -D warnings

.PHONY: help setup-db test test-domain test-modules test-api test-all clean db-start db-stop db-reset build release check fmt fmt-check clippy
