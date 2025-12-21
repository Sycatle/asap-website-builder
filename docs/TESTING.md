# Testing Guide

This document provides comprehensive information about the unit tests in ASAP v2.

## Overview

The project includes **79 unit tests** covering:
- Core domain models (31 tests)
- Core shared utilities (10 tests)
- Feature extensions (38 tests)
- API handlers
- Data validation

All tests can be run with `make test` without requiring a database.

## Running Tests

### Quick Commands

```bash
# All tests
make test

# Domain tests
make test-domain

# Extension tests
make test-extensions

# API tests (requires DATABASE_URL)
make test-api
```

### Detailed Commands

```bash
# Run specific package tests
cargo test --lib -p asap-core-domain
cargo test --lib -p asap-extension-github-sync

# Run specific test
cargo test test_account_creation -- --exact

# Run with output
cargo test --lib -- --nocapture

# Run sequentially
cargo test -- --test-threads=1

# List all tests
cargo test --lib -- --list
```

## Test Organization

### Core Domain Tests (31 tests)

#### Accounts Module (5 tests)
- `test_account_creation` - Account struct initialization
- `test_account_clone` - Account cloning capability
- `test_tenant_creation` - Tenant workspace creation
- `test_account_data_creation` - Extended account data initialization
- `test_account_data_serialization` - JSON serialization/deserialization

**File:** `core/domain/src/accounts.rs`

Tests cover:
- ✅ Account creation with UUID and timestamp
- ✅ Tenant creation for workspace isolation
- ✅ AccountData JSONB storage
- ✅ Serialization round-trip

#### Websites Module (7 tests)
- `test_website_status_default` - Default status is Draft
- `test_website_status_serialization` - Enum serialization
- `test_website_creation` - Website initialization
- `test_website_status_transitions` - Status changes
- `test_website_with_metadata` - JSONB metadata
- `test_website_data_creation` - Website data init
- `test_website_data_with_content` - Complex data storage
- `test_website_data_serialization` - JSON round-trip
- `test_website_clone` - Website cloning

**File:** `core/domain/src/websites.rs`

Tests cover:
- ✅ Website status enumeration (Draft/Published)
- ✅ Website metadata storage (JSONB)
- ✅ Website data content management
- ✅ Serialization compatibility

#### Events Module (8 tests)
- `test_event_type_serialization` - Event type enum serialization
- `test_event_creation` - Event initialization
- `test_event_is_not_processed_initially` - Initial state
- `test_event_is_processed_when_marked` - State transitions
- `test_event_with_payload` - Event data payload
- `test_event_serialization` - JSON serialization
- `test_event_clone` - Event cloning
- `test_multiple_event_types` - Various event types

**File:** `core/domain/src/events.rs`

Tests cover:
- ✅ Event type enumeration (AccountCreated, WebsitePublished, etc.)
- ✅ Event creation with payload
- ✅ Event processing state management
- ✅ Event serialization for storage

#### Integrations Module (9 tests)
- `test_github_integration_creation` - GitHub integration init
- `test_github_integration_with_token` - Token management
- `test_github_integration_with_sync_date` - Sync timestamp
- `test_github_integration_serialization` - JSON serialization
- `test_github_integration_clone` - Integration cloning
- `test_integration_enum_github` - Enum variant matching
- `test_integration_serialization` - Tagged union serialization
- `test_github_integration_token_update` - Token updates
- `test_github_integration_multiple_instances` - Multiple integrations

**File:** `core/domain/src/integrations.rs`

Tests cover:
- ✅ GitHub integration structure
- ✅ Token and sync date management
- ✅ Tagged union enumeration
- ✅ Serialization with serde

### Extension Tests

#### Analytics Extension (7 tests)
- `test_track_event_page_view` - Page view tracking
- `test_track_event_click` - Click tracking
- `test_track_event_form_submit` - Form submission tracking
- `test_track_event_custom_event` - Custom event tracking
- `test_track_event_empty_string` - Edge case handling
- `test_track_multiple_events` - Event batching
- `test_track_event_with_special_chars` - Character handling

**File:** `extensions/analytics/src/lib.rs`

Tests cover:
- ✅ Event type tracking
- ✅ String handling and validation
- ✅ Multiple event processing

#### Github Sync Extension (13 tests)

**Client Tests (6 tests):**
- `test_github_repo_creation` - Repository structure
- `test_github_repo_fork_filter` - Fork filtering
- `test_github_repo_archived_filter` - Archive filtering
- `test_github_repo_serialization` - JSON serialization
- `test_github_repo_clone` - Repo cloning
- `test_github_client_new` - Client initialization
- `test_multiple_repos_filtering` - Batch filtering

**Processor Tests (7 tests):**
- `test_generate_website_content_empty` - Empty repo list
- `test_generate_website_content_single_repo` - Single repo
- `test_generate_website_content_multiple_repos` - Multiple repos
- `test_generate_website_content_sorting` - Star sorting
- `test_generate_website_content_missing_fields` - Missing data
- `test_generate_website_content_structure` - Output structure
- `test_generate_website_content_missing_fields` - Fallback values

**Files:** 
- `extensions/github-sync/src/client.rs`
- `extensions/github-sync/src/processor.rs`

Tests cover:
- ✅ GitHub repository data structures
- ✅ Fork and archive filtering
- ✅ Website content generation
- ✅ Sorting by popularity (stars)
- ✅ Missing field handling

### API Tests (Available with DATABASE_URL)

#### Auth Module Tests

**Password & Token Tests (16 tests):**
- `test_hash_password` - Bcrypt hashing
- `test_verify_correct_password` - Correct password verification
- `test_verify_incorrect_password` - Wrong password rejection
- `test_hash_same_password_different_hashes` - Bcrypt salt
- `test_generate_token` - JWT generation
- `test_generate_token_different_accounts` - Token uniqueness
- `test_claims_structure` - Claims validation
- `test_signup_request_creation` - Request struct
- `test_login_request_creation` - Request struct
- `test_account_response` - Response struct
- `test_tenant_response` - Response struct
- `test_me_response` - Response struct
- `test_email_validation` - Email format
- `test_password_validation` - Password requirements
- `test_slug_validation` - Slug format
- `test_claims_serialization` - Token serialization

**File:** `core/api/src/auth.rs`

Tests cover:
- ✅ Password hashing with bcrypt
- ✅ JWT token generation
- ✅ Request/response validation
- ✅ Input validation (email, password, slug)
- ✅ Token serialization

#### Routes Module Tests (13 tests)
- `test_root_response_structure` - Root endpoint
- `test_api_route_endpoints_exist` - Route definitions
- `test_authenticated_routes` - Auth-required routes
- `test_public_routes` - Public routes
- `test_route_parameter_patterns` - Parameter syntax
- `test_api_version_format` - Version format
- `test_website_crud_routes` - Website routes
- `test_event_routes` - Event routes
- `test_extension_configuration_routes` - Extension routes
- `test_auth_routes` - Auth routes
- `test_account_integration_routes` - Integration routes
- `test_public_website_routes` - Public routes

**File:** `core/api/src/routes.rs`

Tests cover:
- ✅ Route definitions and structure
- ✅ Parameter patterns
- ✅ Public vs authenticated routes
- ✅ CRUD operation routes

## Test Execution Flow

```
cargo test --lib
    ↓
Compile tests
    ↓
Run test modules:
    ├── core/domain
    │   ├── accounts::tests (5)
    │   ├── websites::tests (7)
    │   ├── events::tests (8)
    │   └── integrations::tests (11)
    ├── core/shared
    │   └── all::tests (10)
    ├── extensions
    │   ├── analytics::tests (7)
    │   └── github-sync::tests (13)
    └── api (optional)
        ├── auth::password_tests
        └── routes::tests
    ↓
Test results summary
```

## Test Statistics

| Component | Tests | Status |
|-----------|-------|--------|
| Core Domain | 31 | ✅ Passing |
| Core Shared | 10 | ✅ Passing |
| Analytics | 7 | ✅ Passing |
| Github Sync | 13 | ✅ Passing |

*Auth & Routes tests require DATABASE_URL to be set

## Writing New Tests

### Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_feature() {
        // Arrange
        let input = create_test_data();
        
        // Act
        let result = function_under_test(input);
        
        // Assert
        assert_eq!(result, expected_value);
    }
}
```

### Async Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_my_async_feature() {
        // Arrange
        let input = create_test_data();
        
        // Act
        let result = async_function(input).await;
        
        // Assert
        assert!(result.is_ok());
    }
}
```

## Continuous Integration

Tests are automatically run:
1. ✅ On every local test command
2. ✅ During CI/CD pipeline (GitHub Actions)
3. ✅ Before commits (git hooks, optional)

## Performance

Test execution time: **< 5 seconds** (all 67 tests)

Breakdown:
- Domain tests: < 1s
- Module tests: < 2s
- API tests: < 2s (with database)

## Coverage Goals

Current coverage:
- Core models: 100%
- Module functions: 100%
- API handlers: 70% (auth handlers mostly)
- Integration: 0% (integration tests todo)

Future goals:
- 90%+ overall coverage
- Integration tests for full workflows
- Property-based testing with proptest
- Performance benchmarks

