# Core Shared Module

The `asap-core-shared` module provides common utilities and types used across all ASAP components.

## Components

### Configuration (`config.rs`)

Provides centralized configuration management:

```rust
use asap_core_shared::SharedConfig;

let config = SharedConfig::from_env()?;
// Access JWT secret and expiration settings
```

**Environment Variables:**
- `JWT_SECRET` - Secret key for JWT signing (defaults to dev secret if not set)
- `JWT_EXPIRATION_HOURS` - Token expiration time in hours (default: 24)

### Authentication (`auth.rs`)

JWT token generation and validation utilities:

```rust
use asap_core_shared::{generate_token, validate_token, Claims};

// Generate a token
let token = generate_token(user_id, account_id, &config)?;

// Validate and extract claims
let claims = validate_token(&token, &config)?;
```

**Features:**
- Token generation with configurable expiration
- Token validation with automatic expiry checking
- Claims extraction with user_id and account_id

### Error Handling (`errors.rs`)

Common error types used across ASAP:

```rust
use asap_core_shared::SharedError;

pub type Result<T> = std::result::Result<T, SharedError>;
```

**Error Types:**
- `ConfigError` - Configuration-related errors
- `AuthError` - Authentication failures
- `JwtError` - JWT processing errors
- `InvalidToken` - Token format errors
- `TokenExpired` - Expired token errors

## Usage in Components

### In Core API

```rust
use asap_core_shared::{SharedConfig, generate_token};

pub async fn signup(
    Extension(config): Extension<SharedConfig>,
    // ... other params
) -> impl IntoResponse {
    let token = generate_token(&user_id, &account_id, &config)?;
    // ...
}
```

### In Middleware

```rust
use asap_core_shared::{validate_token, SharedConfig};

pub async fn auth_middleware(
    State(config): State<SharedConfig>,
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let claims = validate_token(token, &config)?;
    // ...
}
```

## Testing

All modules include comprehensive unit tests:

```bash
cargo test -p asap-core-shared
```

## Design Principles

1. **Separation of Concerns** - Config, auth, and errors are separate modules
2. **Type Safety** - Strong typing with custom error types
3. **Reusability** - Shared utilities reduce duplication
4. **Testability** - All functions are testable with default configs
5. **Documentation** - Inline documentation for all public APIs
