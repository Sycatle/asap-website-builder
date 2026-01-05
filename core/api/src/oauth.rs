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
    extract::{Path, Query, State, Extension},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use base64::Engine;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use chrono::Utc;

use asap_core_shared::{
    generate_token_with_jti, generate_refresh_token, generate_jti, SharedConfig,
};

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

/// OAuth state payload - encoded in base64 and passed through OAuth flow
#[derive(Debug, Serialize, Deserialize)]
struct OAuthStatePayload {
    /// CSRF protection token
    csrf: String,
    /// Optional redirect URL after successful auth
    redirect_url: Option<String>,
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
    sub: String,  // Google user ID
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
    login: String,
    email: Option<String>,
    name: Option<String>,
    avatar_url: Option<String>,
}

/// Initiate OAuth flow
/// 
/// GET /auth/oauth/{provider}?redirect_url=...
pub async fn initiate_oauth(
    Path(provider): Path<String>,
    Query(params): Query<InitiateOAuthRequest>,
) -> Result<Json<OAuthUrlResponse>, impl IntoResponse> {
    let provider = match OAuthProvider::from_str(&provider) {
        Ok(p) => p,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": e
                }))
            ));
        }
    };

    // Build state payload with CSRF token and optional redirect URL
    let state_payload = OAuthStatePayload {
        csrf: Uuid::new_v4().to_string(),
        redirect_url: params.redirect_url,
    };
    
    // Encode state as base64 JSON
    let state_json = serde_json::to_string(&state_payload).unwrap_or_default();
    let state = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(state_json.as_bytes());
    
    // TODO: Store CSRF token in Redis with expiration (5 minutes) for validation
    // For now, we rely on the state parameter being tamper-evident

    let oauth_url = match provider {
        OAuthProvider::Google => {
            let client_id = std::env::var("GOOGLE_CLIENT_ID")
                .unwrap_or_else(|_| "GOOGLE_CLIENT_ID_NOT_SET".to_string());
            let redirect_uri = std::env::var("GOOGLE_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:3000/api/auth/oauth/google/callback".to_string());
            
            format!(
                "https://accounts.google.com/o/oauth2/v2/auth?\
                client_id={}&\
                redirect_uri={}&\
                response_type=code&\
                scope=openid%20email%20profile&\
                state={}&\
                access_type=offline&\
                prompt=consent",
                client_id,
                urlencoding::encode(&redirect_uri),
                state
            )
        }
        OAuthProvider::GitHub => {
            let client_id = std::env::var("GITHUB_CLIENT_ID")
                .unwrap_or_else(|_| "GITHUB_CLIENT_ID_NOT_SET".to_string());
            let redirect_uri = std::env::var("GITHUB_REDIRECT_URI")
                .unwrap_or_else(|_| "http://localhost:3000/api/auth/oauth/github/callback".to_string());
            
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
pub async fn oauth_callback(
    Path(provider): Path<String>,
    Query(params): Query<OAuthCallbackQuery>,
    State(pool): State<PgPool>,
    Extension(config): Extension<SharedConfig>,
) -> Result<impl IntoResponse, impl IntoResponse> {
    // Check for OAuth errors from provider
    if let Some(error) = params.error {
        let error_desc = params.error_description.unwrap_or_else(|| "OAuth authentication failed".to_string());
        tracing::warn!("OAuth error from provider: {} - {}", error, error_desc);
        
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "error": error,
                "error_description": error_desc
            }))
        ));
    }

    // Decode state payload to extract redirect_url
    let state_payload: Option<OAuthStatePayload> = params.state.as_ref().and_then(|state| {
        base64::engine::general_purpose::URL_SAFE_NO_PAD
            .decode(state)
            .ok()
            .and_then(|bytes| String::from_utf8(bytes).ok())
            .and_then(|json: String| serde_json::from_str::<OAuthStatePayload>(&json).ok())
    });
    
    let redirect_url_from_state = state_payload.as_ref().and_then(|p| p.redirect_url.clone());
    
    // TODO: Validate CSRF token from state_payload.csrf against stored value in Redis

    let provider = match OAuthProvider::from_str(&provider) {
        Ok(p) => p,
        Err(e) => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": e
                }))
            ));
        }
    };
    
    // Exchange authorization code for access token
    let (oauth_email, oauth_user_id, display_name, avatar_url, given_name, family_name) = match provider {
        OAuthProvider::Google => {
            exchange_google_code(&params.code).await?
        }
        OAuthProvider::GitHub => {
            exchange_github_code(&params.code).await?
        }
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
            }))
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
                let current_avatar_url = data_row.data
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
                tracing::info!("Avatar URL changed for account {}, downloading new avatar", account.id);
                
                // Download and store new avatar with provider-specific naming
                let new_avatar_file_id = match download_and_store_avatar(&pool, account.id, new_avatar_url, provider.as_str()).await {
                    Ok(file_id) => {
                        tracing::info!("Avatar successfully updated for account {}", account.id);
                        Some(file_id)
                    }
                    Err(e) => {
                        tracing::error!("Failed to update avatar for account {}: {}", account.id, e);
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
                }))
            )
        })?;

        // Download and store avatar in user's cloud storage with provider-specific naming
        let avatar_file_id = if let Some(ref avatar_url) = avatar_url {
            match download_and_store_avatar(&pool, new_account_id, avatar_url, provider.as_str()).await {
                Ok(file_id) => {
                    tracing::info!("Avatar successfully downloaded for account {}", new_account_id);
                    Some(file_id)
                }
                Err(e) => {
                    tracing::error!("Failed to download avatar for account {}: {}", new_account_id, e);
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
    
    let access_token = generate_token_with_jti(
        &account_id.to_string(),
        &jti,
        &config
    ).map_err(|e| {
        tracing::error!("Failed to generate access token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to generate tokens"
            }))
        )
    })?;

    let refresh_token_obj = generate_refresh_token(
        &config.jwt_secret,
        None,
        true // remember_me = true pour OAuth
    ).map_err(|e| {
        tracing::error!("Failed to generate refresh token: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Failed to generate tokens"
            }))
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
            }))
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
            }))
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
) -> Result<(String, String, Option<String>, Option<String>, Option<String>, Option<String>), (StatusCode, Json<serde_json::Value>)> {
    let client_id = std::env::var("GOOGLE_CLIENT_ID")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Google OAuth not configured"
                }))
            )
        })?;
    
    let client_secret = std::env::var("GOOGLE_CLIENT_SECRET")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Google OAuth not configured"
                }))
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
        ])
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to exchange Google code: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Failed to authenticate with Google"
                }))
            )
        })?;

    if !token_response.status().is_success() {
        let error_text = token_response.text().await.unwrap_or_default();
        tracing::error!("Google token exchange failed: {}", error_text);
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Google authentication failed"
            }))
        ));
    }

    let token_data: serde_json::Value = token_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse Google token response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid response from Google"
            }))
        )
    })?;

    let access_token = token_data["access_token"]
        .as_str()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "No access token in Google response"
                }))
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
                }))
            )
        })?;

    let user_info: GoogleUserInfo = user_info_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse Google user info: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid user info from Google"
            }))
        )
    })?;

    if !user_info.email_verified {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Email not verified with Google"
            }))
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
) -> Result<(String, String, Option<String>, Option<String>, Option<String>, Option<String>), (StatusCode, Json<serde_json::Value>)> {
    let client_id = std::env::var("GITHUB_CLIENT_ID")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "GitHub OAuth not configured"
                }))
            )
        })?;
    
    let client_secret = std::env::var("GITHUB_CLIENT_SECRET")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "GitHub OAuth not configured"
                }))
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
                }))
            )
        })?;

    let token_data: serde_json::Value = token_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse GitHub token response: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid response from GitHub"
            }))
        )
    })?;

    let access_token = token_data["access_token"]
        .as_str()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "No access token in GitHub response"
                }))
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
                }))
            )
        })?;

    let user_info: GitHubUserInfo = user_info_response.json().await.map_err(|e| {
        tracing::error!("Failed to parse GitHub user info: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "error": "Invalid user info from GitHub"
            }))
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
                    }))
                )
            })?;

        let emails: Vec<serde_json::Value> = emails_response.json().await.map_err(|e| {
            tracing::error!("Failed to parse GitHub emails: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "error": "Invalid email data from GitHub"
                }))
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
                    }))
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

// TODO: Implement avatar download
// This function will be re-enabled once we confirm file storage is working properly
/// Download avatar from OAuth provider and store in user's cloud storage
/// Uses naming convention: {provider}-avatar.{extension} (e.g., github-avatar.png)
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
    let file = storage
        .upload_file_with_metadata(
            account_id,
            &filename,
            &content_type,
            &image_bytes,
            None,           // website_id = None (personal cloud)
            None,           // folder_id
            Some("public"), // visibility = public (avatars must be accessible)
            Some(&format!("Avatar imported from {}", provider)), // description
            None,           // tags
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