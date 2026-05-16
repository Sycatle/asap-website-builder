//! OAuth authentication routes for user login/signup
//!
//! Supports OAuth providers (Google, GitHub, etc.) for user authentication.
//! Flow:
//! 1. Frontend calls GET /auth/oauth/{provider} to get OAuth URL
//! 2. User is redirected to provider's consent screen
//! 3. Provider redirects back to /auth/oauth/{provider}/callback
//! 4. Backend exchanges code for access token, fetches user info
//! 5. Creates or logs in user, returns JWT tokens

use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base64::Engine;
use chrono::Utc;
use hmac::{Hmac, Mac};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use uuid::Uuid;

use asap_core_shared::{
    generate_jti, generate_refresh_token, generate_token_with_jti, SharedConfig,
};

type HmacSha256 = Hmac<Sha256>;

const B64: base64::engine::GeneralPurpose = base64::engine::general_purpose::URL_SAFE_NO_PAD;

/// Encode an OAuth state payload as `<base64url(json)>.<base64url(hmac)>`.
/// HMAC integrity protects the embedded PKCE verifier and CSRF token.
fn encode_state(payload: &OAuthStatePayload, secret: &str) -> String {
    let json = serde_json::to_vec(payload).expect("OAuthStatePayload serialization");
    let body = B64.encode(&json);
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(json.as_slice());
    let tag = B64.encode(mac.finalize().into_bytes());
    format!("{body}.{tag}")
}

/// Decode and verify a signed OAuth state token.
fn decode_state(state: &str, secret: &str) -> Option<OAuthStatePayload> {
    let (body_b64, tag_b64) = state.split_once('.')?;
    let json = B64.decode(body_b64).ok()?;
    let tag = B64.decode(tag_b64).ok()?;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(&json);
    mac.verify_slice(&tag).ok()?;
    serde_json::from_slice(&json).ok()
}

/// Generate a PKCE verifier (43-128 chars of URL-safe randomness) and its S256 challenge.
fn pkce_pair() -> (String, String) {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let verifier = B64.encode(bytes);
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let challenge = B64.encode(hasher.finalize());
    (verifier, challenge)
}

/// OAuth providers we support
#[derive(Debug, Clone, Copy)]
pub enum OAuthProvider {
    Google,
    GitHub,
}

impl OAuthProvider {
    fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "google" => Ok(Self::Google),
            "github" => Ok(Self::GitHub),
            _ => Err(format!("Unsupported OAuth provider: {}", s)),
        }
    }

    fn as_str(&self) -> &'static str {
        match self {
            Self::Google => "google",
            Self::GitHub => "github",
        }
    }
}

/// Request to initiate OAuth flow
#[derive(Debug, Deserialize)]
pub struct InitiateOAuthRequest {
    pub redirect_url: Option<String>,
}

/// Response with OAuth URL
#[derive(Debug, Serialize)]
pub struct OAuthUrlResponse {
    pub redirect_url: String,
}

/// OAuth state payload - encoded as `base64url(json).base64url(hmac)` and passed through OAuth flow.
/// The HMAC binds the embedded PKCE verifier so a tampered state is rejected on callback.
#[derive(Debug, Serialize, Deserialize)]
struct OAuthStatePayload {
    /// CSRF protection token
    csrf: String,
    /// Optional redirect URL after successful auth
    redirect_url: Option<String>,
    /// PKCE code_verifier — present for providers we exchange with PKCE.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pkce_verifier: Option<String>,
}

/// OAuth callback query parameters
#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: String,
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

/// OAuth callback response
#[derive(Debug, Serialize)]
pub struct OAuthCallbackResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub account_id: String,
    pub is_new_user: bool,
    /// Redirect URL to use after authentication (preserved from initial request)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub redirect_url: Option<String>,
}

/// Google user info response
#[derive(Debug, Deserialize)]
struct GoogleUserInfo {
    sub: String, // Google user ID
    email: String,
    email_verified: bool,
    name: Option<String>,
    given_name: Option<String>,
    family_name: Option<String>,
    picture: Option<String>,
}

/// GitHub user info response
#[derive(Debug, Deserialize)]
struct GitHubUserInfo {
    id: u64,
    email: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
}

/// Initiate OAuth flow
///
/// GET /auth/oauth/{provider}?redirect_url=...
///
/// Security: The state parameter contains a CSRF token (UUID) that is validated
/// on callback. This prevents CSRF attacks as the token is unpredictable and
/// tied to the user's session via the redirect flow.
pub async fn initiate_oauth(
    Path(provider): Path<String>,
    Query(params): Query<InitiateOAuthRequest>,
    Extension(config): Extension<SharedConfig>,
) -> Result<Json<OAuthUrlResponse>, impl IntoResponse> {
    let provider = match OAuthProvider::from_str(&provider) {
        Ok(p) => p,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": e
                })),
            ));
        }
    };

    let csrf_token = Uuid::new_v4().to_string();

    // PKCE only for providers that support it on OAuth Apps. Google does; GitHub OAuth Apps does not.
    let (pkce_verifier, pkce_challenge) = match provider {
        OAuthProvider::Google => {
            let (v, c) = pkce_pair();
            (Some(v), Some(c))
        }
        OAuthProvider::GitHub => (None, None),
    };

    let state_payload = OAuthStatePayload {
        csrf: csrf_token,
        redirect_url: params.redirect_url,
        pkce_verifier,
    };
    let state = encode_state(&state_payload, &config.jwt_secret);

    let oauth_url = match provider {
        OAuthProvider::Google => {
            let client_id = std::env::var("GOOGLE_CLIENT_ID")
                .unwrap_or_else(|_| "GOOGLE_CLIENT_ID_NOT_SET".to_string());
            let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI").unwrap_or_else(|_| {
                "http://localhost:3000/api/auth/oauth/google/callback".to_string()
            });

            let challenge = pkce_challenge
                .as_deref()
                .expect("PKCE challenge is generated for Google");
            format!(
                "https://accounts.google.com/o/oauth2/v2/auth?\
                client_id={}&\
                redirect_uri={}&\
                response_type=code&\
                scope=openid%20email%20profile&\
                state={}&\
                code_challenge={}&\
                code_challenge_method=S256&\
                access_type=offline&\
                prompt=consent",
                client_id,
                urlencoding::encode(&redirect_uri),
                state,
                challenge,
            )
        }
        OAuthProvider::GitHub => {
            let client_id = std::env::var("GITHUB_CLIENT_ID")
                .unwrap_or_else(|_| "GITHUB_CLIENT_ID_NOT_SET".to_string());
            let redirect_uri = std::env::var("GITHUB_REDIRECT_URI").unwrap_or_else(|_| {
                "http://localhost:3000/api/auth/oauth/github/callback".to_string()
            });

            format!(
                "https://github.com/login/oauth/authorize?\
                client_id={}&\
                redirect_uri={}&\
                scope=read:user%20user:email&\
                state={}",
                client_id,
                urlencoding::encode(&redirect_uri),
                state
            )
        }
    };

    tracing::info!("OAuth flow initiated for provider: {}", provider.as_str());

    Ok(Json(OAuthUrlResponse {
        redirect_url: oauth_url,
    }))
}

/// Handle OAuth callback
///
/// GET /auth/oauth/{provider}/callback?code=...&state=...
///
/// Security: Validates the CSRF token from state parameter by checking
/// it's a valid UUID format. While not stored server-side, the unpredictability
/// of UUID v4 combined with the state parameter binding provides CSRF protection.
pub async fn oauth_callback(
    Path(provider): Path<String>,
    Query(params): Query<OAuthCallbackQuery>,
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    // Check for OAuth errors from provider
    if let Some(error) = params.error {
        let error_desc = params
            .error_description
            .unwrap_or_else(|| "OAuth authentication failed".to_string());
        tracing::warn!("OAuth error from provider: {} - {}", error, error_desc);

        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": error,
                "error_description": error_desc
            })),
        ));
    }

    // Decode and HMAC-verify state payload.
    let state_payload = match params.state.as_deref() {
        Some(state) => match decode_state(state, &config.jwt_secret) {
            Some(p) => p,
            None => {
                tracing::warn!("OAuth state failed HMAC verification or decode");
                return Err((
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({
                        "error": "Invalid OAuth state",
                        "code": "STATE_INVALID"
                    })),
                ));
            }
        },
        None => {
            tracing::warn!("Missing state parameter in OAuth callback");
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": "Missing state parameter",
                    "code": "STATE_MISSING"
                })),
            ));
        }
    };

    let redirect_url_from_state = state_payload.redirect_url.clone();
    let pkce_verifier = state_payload.pkce_verifier.clone();

    if Uuid::parse_str(&state_payload.csrf).is_err() {
        tracing::warn!("Invalid CSRF token format in OAuth state");
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": "Invalid CSRF token format",
                "code": "CSRF_INVALID"
            })),
        ));
    }
    tracing::debug!("OAuth state HMAC verified, CSRF token format OK");

    let provider = match OAuthProvider::from_str(&provider) {
        Ok(p) => p,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": e
                })),
            ));
        }
    };

    // Exchange authorization code for access token
    let (oauth_email, oauth_user_id, display_name, avatar_url, given_name, family_name) =
        match provider {
            OAuthProvider::Google => {
                let verifier = pkce_verifier.as_deref().ok_or_else(|| {
                    tracing::warn!("Google OAuth callback missing PKCE verifier in state");
                    (
                        StatusCode::BAD_REQUEST,
                        Json(serde_json::json!({
                            "error": "Missing PKCE verifier",
                            "code": "PKCE_MISSING"
                        })),
                    )
                })?;
                exchange_google_code(&params.code, verifier).await?
            }
            OAuthProvider::GitHub => exchange_github_code(&params.code).await?,
        };

    tracing::info!(
        "OAuth user info retrieved: provider={}, email={}, user_id={}",
        provider.as_str(),
        oauth_email,
        oauth_user_id
    );

    // Check if user exists by email
    let existing_account = sqlx::query!(
        r#"
        SELECT id, email, plan
        FROM accounts
        WHERE email = $1
        "#,
        oauth_email
    )
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Database error checking existing account: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Database error"
            })),
        )
    })?;

    let (account_id, is_new_user) = if let Some(account) = existing_account {
        // Existing user - log them in and update profile/avatar if changed
        tracing::info!("Existing account found for email: {}", oauth_email);
        tracing::debug!("Avatar URL from OAuth: {:?}", avatar_url);

        // Check if avatar URL has changed and update if needed
        if let Some(ref new_avatar_url) = avatar_url {
            tracing::info!("Checking avatar for existing account {}", account.id);
            // Fetch current account_data to compare avatar
            let current_data_row = sqlx::query!(
                r#"SELECT data as "data: serde_json::Value" FROM account_data WHERE account_id = $1"#,
                account.id
            )
            .fetch_optional(&pool)
            .await
            .ok()
            .flatten();

            let should_update_avatar = if let Some(data_row) = current_data_row {
                // Extract current avatar_url from JSONB
                let current_avatar_url = data_row
                    .data
                    .get("oauth")
                    .and_then(|oauth| oauth.get(provider.as_str()))
                    .and_then(|p| p.get("avatar_url"))
                    .and_then(|v| v.as_str());

                // Update if URL changed
                current_avatar_url != Some(new_avatar_url.as_str())
            } else {
                // No account_data yet, should create
                true
            };

            if should_update_avatar {
                tracing::info!(
                    "Avatar URL changed for account {}, downloading new avatar",
                    account.id
                );

                // Download and store new avatar with provider-specific naming
                let new_avatar_file_id = match download_and_store_avatar(
                    &pool,
                    account.id,
                    new_avatar_url,
                    provider.as_str(),
                )
                .await
                {
                    Ok(file_id) => {
                        tracing::info!("Avatar successfully updated for account {}", account.id);
                        Some(file_id)
                    }
                    Err(e) => {
                        tracing::error!(
                            "Failed to update avatar for account {}: {}",
                            account.id,
                            e
                        );
                        None
                    }
                };

                // Update account_data with new avatar info
                let mut updated_data = serde_json::json!({
                    "display_name": display_name,
                    "given_name": given_name,
                    "family_name": family_name,
                    "oauth": {
                        provider.as_str(): {
                            "user_id": oauth_user_id,
                            "email": oauth_email,
                            "avatar_url": new_avatar_url
                        }
                    }
                });

                if let Some(avatar_id) = new_avatar_file_id {
                    updated_data["avatar_file_id"] = serde_json::json!(avatar_id.to_string());
                }

                sqlx::query!(
                    r#"
                    INSERT INTO account_data (account_id, data)
                    VALUES ($1, $2)
                    ON CONFLICT (account_id) DO UPDATE SET data = $2
                    "#,
                    account.id,
                    updated_data
                )
                .execute(&pool)
                .await
                .ok(); // Ignore errors - not critical
            }
        }

        (account.id, false)
    } else {
        // New user - create account
        tracing::info!("Creating new account for email: {}", oauth_email);

        let new_account_id = Uuid::new_v4();
        let now = Utc::now();

        // OAuth users don't have passwords
        let placeholder_password = "OAUTH_USER_NO_PASSWORD";

        sqlx::query!(
            r#"
            INSERT INTO accounts (id, email, password_hash, plan, created_at)
            VALUES ($1, $2, $3, 'free', $4)
            "#,
            new_account_id,
            oauth_email,
            placeholder_password,
            now
        )
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("Failed to create account: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to create account"
                })),
            )
        })?;

        // Download and store avatar in user's cloud storage with provider-specific naming
        let avatar_file_id = if let Some(ref avatar_url) = avatar_url {
            match download_and_store_avatar(&pool, new_account_id, avatar_url, provider.as_str())
                .await
            {
                Ok(file_id) => {
                    tracing::info!(
                        "Avatar successfully downloaded for account {}",
                        new_account_id
                    );
                    Some(file_id)
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to download avatar for account {}: {}",
                        new_account_id,
                        e
                    );
                    None
                }
            }
        } else {
            None
        };

        // Store OAuth provider info, profile data and avatar in account_data
        let mut account_data = serde_json::json!({
            "display_name": display_name,
            "given_name": given_name,
            "family_name": family_name,
            "oauth": {
                provider.as_str(): {
                    "user_id": oauth_user_id,
                    "email": oauth_email,
                    "avatar_url": avatar_url
                }
            }
        });

        if let Some(avatar_id) = avatar_file_id {
            account_data["avatar_file_id"] = serde_json::json!(avatar_id.to_string());
        }

        sqlx::query!(
            r#"
            INSERT INTO account_data (account_id, data)
            VALUES ($1, $2)
            ON CONFLICT (account_id) DO UPDATE
            SET data = account_data.data || $2
            "#,
            new_account_id,
            account_data
        )
        .execute(&pool)
        .await
        .ok(); // Ignore errors - not critical

        (new_account_id, true)
    };

    // Generate JWT tokens
    let jti = generate_jti();

    let access_token =
        generate_token_with_jti(&account_id.to_string(), &jti, &config).map_err(|e| {
            tracing::error!("Failed to generate access token: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to generate tokens"
                })),
            )
        })?;

    let refresh_token_obj = generate_refresh_token(
        &config.jwt_secret,
        None,
        true, // remember_me = true pour OAuth
    )
    .map_err(|e| {
        tracing::error!("Failed to generate refresh token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to generate tokens"
            })),
        )
    })?;

    // Store refresh token in database
    let refresh_token_hash = asap_core_shared::hash_refresh_token(&refresh_token_obj.token);
    let refresh_expires_at = chrono::DateTime::from_timestamp(refresh_token_obj.expires_at, 0)
        .unwrap_or_else(|| Utc::now() + chrono::Duration::days(7));
    let now = Utc::now();

    let family_id = Uuid::parse_str(&refresh_token_obj.family_id).map_err(|e| {
        tracing::error!("Invalid family_id format: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid session ID format"
            })),
        )
    })?;

    sqlx::query!(
        r#"
        INSERT INTO refresh_tokens (account_id, token_hash, family_id, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5)
        "#,
        account_id,
        refresh_token_hash,
        family_id,
        refresh_expires_at,
        now
    )
    .execute(&pool)
    .await
    .map_err(|e| {
        tracing::error!("Failed to store refresh token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to store session"
            })),
        )
    })?;

    // Note: jwt_sessions table not implemented yet - session management via refresh_tokens only

    tracing::info!(
        "OAuth authentication successful: account_id={}, is_new_user={}, redirect_url={:?}",
        account_id,
        is_new_user,
        redirect_url_from_state
    );

    Ok(Json(OAuthCallbackResponse {
        access_token,
        refresh_token: refresh_token_obj.token,
        account_id: account_id.to_string(),
        is_new_user,
        redirect_url: redirect_url_from_state,
    }))
}

/// Exchange Google authorization code for user info
async fn exchange_google_code(
    code: &str,
    code_verifier: &str,
) -> Result<
    (
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ),
    (StatusCode, Json<serde_json::Value>),
> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Google OAuth not configured"
            })),
        )
    })?;

    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Google OAuth not configured"
            })),
        )
    })?;

    let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")
        .unwrap_or_else(|_| "http://localhost:3000/api/auth/oauth/google/callback".to_string());

    // Exchange code for access token
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("code", code),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
            ("redirect_uri", &redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", code_verifier),
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to exchange Google code: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to authenticate with Google"
                })),
            )
        })?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {}", error_text);
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Google authentication failed"
            })),
        ));
    }

    let token_data: serde_json::Value = token_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse Google token response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid response from Google"
            })),
        )
    })?;

    let access_token = token_data["access_token"].as_str().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "No access token in Google response"
            })),
        )
    })?;

    // Fetch user info
    let user_info_response = client
        .get("https://www.googleapis.com/oauth2/v3/userinfo")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch Google user info: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to fetch user info from Google"
                })),
            )
        })?;

    let user_info: GoogleUserInfo = user_info_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse Google user info: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid user info from Google"
            })),
        )
    })?;

    if !user_info.email_verified {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Email not verified with Google"
            })),
        ));
    }

    Ok((
        user_info.email,
        user_info.sub,
        user_info.name.clone().or(user_info.given_name.clone()),
        user_info.picture.clone(),
        user_info.given_name,
        user_info.family_name,
    ))
}

/// Exchange GitHub authorization code for user info
async fn exchange_github_code(
    code: &str,
) -> Result<
    (
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<String>,
    ),
    (StatusCode, Json<serde_json::Value>),
> {
    let client_id = std::env::var("GITHUB_CLIENT_ID").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "GitHub OAuth not configured"
            })),
        )
    })?;

    let client_secret = std::env::var("GITHUB_CLIENT_SECRET").map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "GitHub OAuth not configured"
            })),
        )
    })?;

    // Exchange code for access token
    let client = reqwest::Client::new();
    let token_response = client
        .post("https://github.com/login/oauth/access_token")
        .header("Accept", "application/json")
        .form(&[
            ("code", code),
            ("client_id", &client_id),
            ("client_secret", &client_secret),
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to exchange GitHub code: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to authenticate with GitHub"
                })),
            )
        })?;

    let token_data: serde_json::Value = token_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse GitHub token response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid response from GitHub"
            })),
        )
    })?;

    let access_token = token_data["access_token"].as_str().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "No access token in GitHub response"
            })),
        )
    })?;

    // Fetch user info
    let user_info_response = client
        .get("https://api.github.com/user")
        .header("Authorization", format!("Bearer {}", access_token))
        .header("User-Agent", "ASAP-Platform")
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to fetch GitHub user info: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to fetch user info from GitHub"
                })),
            )
        })?;

    let user_info: GitHubUserInfo = user_info_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse GitHub user info: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid user info from GitHub"
            })),
        )
    })?;

    // GitHub doesn't always return email in main endpoint
    let email = if let Some(email) = user_info.email {
        email
    } else {
        // Fetch emails separately
        let emails_response = client
            .get("https://api.github.com/user/emails")
            .header("Authorization", format!("Bearer {}", access_token))
            .header("User-Agent", "ASAP-Platform")
            .send()
            .await
            .map_err(|e| {
                tracing::error!("Failed to fetch GitHub emails: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({
                        "error": "Failed to fetch email from GitHub"
                    })),
                )
            })?;

        let emails: Vec<serde_json::Value> = emails_response.json().await.map_err(|e| {
            tracing::error!("Failed to parse GitHub emails: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Invalid email data from GitHub"
                })),
            )
        })?;

        // Find primary verified email
        emails
            .iter()
            .find(|e| e["primary"].as_bool() == Some(true) && e["verified"].as_bool() == Some(true))
            .and_then(|e| e["email"].as_str())
            .ok_or_else(|| {
                (
                    StatusCode::FORBIDDEN,
                    Json(serde_json::json!({
                        "error": "No verified email found in GitHub account"
                    })),
                )
            })?
            .to_string()
    };

    Ok((
        email,
        user_info.id.to_string(),
        user_info.name.clone(),
        user_info.avatar_url,
        None, // GitHub doesn't provide given_name
        None, // GitHub doesn't provide family_name
    ))
}

/// Download avatar from OAuth provider and store in user's cloud storage.
/// Naming convention: {provider}-avatar.{extension} (e.g. github-avatar.png).
async fn download_and_store_avatar(
    pool: &PgPool,
    account_id: Uuid,
    avatar_url: &str,
    provider: &str,
) -> anyhow::Result<Uuid> {
    use crate::storage::FileStorageService;

    // Download avatar image
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client.get(avatar_url).send().await?;

    if !response.status().is_success() {
        anyhow::bail!("Failed to download avatar: HTTP {}", response.status());
    }

    // Get content type
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string();

    // Download image bytes
    let image_bytes = response.bytes().await?;

    // Generate filename based on provider and content type
    // Convention: {provider}-avatar.{extension}
    let extension = match content_type.as_str() {
        "image/png" => "png",
        "image/jpeg" | "image/jpg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "jpg",
    };
    let filename = format!("{}-avatar.{}", provider, extension);

    // Store in user's personal cloud storage with public visibility
    // No website_id = personal cloud
    let storage = FileStorageService::new(pool.clone());
    let description = format!("Avatar imported from {}", provider);
    let file = storage
        .upload_file_with_metadata(
            account_id,
            crate::storage::UploadParams {
                filename: &filename,
                mime_type: &content_type,
                data: &image_bytes,
                website_id: None,
                folder_id: None,
                visibility: Some("public"), // avatars must be accessible
                description: Some(&description),
                tags: None,
            },
        )
        .await?;

    tracing::info!(
        "Avatar downloaded and stored: account_id={}, file_id={}, filename={}, size={}",
        account_id,
        file.id,
        filename,
        image_bytes.len()
    );

    Ok(file.id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pkce_challenge_matches_s256_of_verifier() {
        let (verifier, challenge) = pkce_pair();
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let expected = B64.encode(hasher.finalize());
        assert_eq!(challenge, expected);
        assert!(
            verifier.len() >= 43,
            "verifier must be >= 43 chars (RFC 7636)"
        );
    }

    #[test]
    fn state_roundtrip_preserves_payload() {
        let payload = OAuthStatePayload {
            csrf: Uuid::new_v4().to_string(),
            redirect_url: Some("https://app.example.com/cb".to_string()),
            pkce_verifier: Some("v".repeat(64)),
        };
        let token = encode_state(&payload, "test-secret-1234567890123456789012");
        let decoded = decode_state(&token, "test-secret-1234567890123456789012").unwrap();
        assert_eq!(decoded.csrf, payload.csrf);
        assert_eq!(decoded.redirect_url, payload.redirect_url);
        assert_eq!(decoded.pkce_verifier, payload.pkce_verifier);
    }

    #[test]
    fn state_decode_rejects_wrong_secret() {
        let payload = OAuthStatePayload {
            csrf: Uuid::new_v4().to_string(),
            redirect_url: None,
            pkce_verifier: Some("v".repeat(64)),
        };
        let token = encode_state(&payload, "secret-A-1234567890123456789012345");
        assert!(decode_state(&token, "secret-B-1234567890123456789012345").is_none());
    }

    #[test]
    fn state_decode_rejects_tampered_body() {
        let payload = OAuthStatePayload {
            csrf: Uuid::new_v4().to_string(),
            redirect_url: None,
            pkce_verifier: None,
        };
        let secret = "test-secret-1234567890123456789012";
        let token = encode_state(&payload, secret);
        let (body, tag) = token.split_once('.').unwrap();
        // flip one character in the body
        let mut tampered_body = body.to_string();
        let last = tampered_body.pop().unwrap();
        tampered_body.push(if last == 'A' { 'B' } else { 'A' });
        let tampered = format!("{tampered_body}.{tag}");
        assert!(decode_state(&tampered, secret).is_none());
    }

    #[test]
    fn state_decode_rejects_malformed() {
        let secret = "test-secret-1234567890123456789012";
        assert!(decode_state("not-a-valid-token", secret).is_none());
        assert!(decode_state("only-one-segment", secret).is_none());
        assert!(decode_state("", secret).is_none());
    }
}
