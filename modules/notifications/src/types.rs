//! Notification types and data structures

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Notification category for filtering and display
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum NotificationCategory {
    /// System announcements and updates
    System,
    /// Account-related notifications
    Account,
    /// Website/portfolio updates
    Website,
    /// Module-related notifications
    Module,
    /// Billing and payment notifications
    Billing,
    /// Analytics and stats
    Analytics,
    /// Security alerts
    Security,
}

impl Default for NotificationCategory {
    fn default() -> Self {
        Self::System
    }
}

/// Notification priority level
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, sqlx::Type)]
#[sqlx(type_name = "TEXT", rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum NotificationPriority {
    Low,
    Normal,
    High,
    Urgent,
}

impl Default for NotificationPriority {
    fn default() -> Self {
        Self::Normal
    }
}

/// Notification type for action handling
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum NotificationType {
    // System notifications
    WelcomeMessage,
    SystemUpdate,
    MaintenanceScheduled,
    
    // Account notifications
    PasswordChanged,
    EmailVerified,
    ProfileUpdated,
    
    // Website notifications
    WebsitePublished,
    WebsiteUnpublished,
    WebsiteDataUpdated,
    NewVisitor,
    
    // Module notifications
    ModuleActivated,
    ModuleDeactivated,
    ModuleConfigUpdated,
    
    // Billing notifications
    PaymentSuccessful,
    PaymentFailed,
    SubscriptionRenewed,
    SubscriptionExpiring,
    PlanUpgraded,
    PlanDowngraded,
    
    // Analytics notifications
    MilestoneReached,
    WeeklyReport,
    TrafficSpike,
    
    // Security notifications
    NewLoginDetected,
    SuspiciousActivity,
    
    // Custom notification
    Custom(String),
}

impl ToString for NotificationType {
    fn to_string(&self) -> String {
        match self {
            Self::WelcomeMessage => "welcome_message".to_string(),
            Self::SystemUpdate => "system_update".to_string(),
            Self::MaintenanceScheduled => "maintenance_scheduled".to_string(),
            Self::PasswordChanged => "password_changed".to_string(),
            Self::EmailVerified => "email_verified".to_string(),
            Self::ProfileUpdated => "profile_updated".to_string(),
            Self::WebsitePublished => "website_published".to_string(),
            Self::WebsiteUnpublished => "website_unpublished".to_string(),
            Self::WebsiteDataUpdated => "website_data_updated".to_string(),
            Self::NewVisitor => "new_visitor".to_string(),
            Self::ModuleActivated => "module_activated".to_string(),
            Self::ModuleDeactivated => "module_deactivated".to_string(),
            Self::ModuleConfigUpdated => "module_config_updated".to_string(),
            Self::PaymentSuccessful => "payment_successful".to_string(),
            Self::PaymentFailed => "payment_failed".to_string(),
            Self::SubscriptionRenewed => "subscription_renewed".to_string(),
            Self::SubscriptionExpiring => "subscription_expiring".to_string(),
            Self::PlanUpgraded => "plan_upgraded".to_string(),
            Self::PlanDowngraded => "plan_downgraded".to_string(),
            Self::MilestoneReached => "milestone_reached".to_string(),
            Self::WeeklyReport => "weekly_report".to_string(),
            Self::TrafficSpike => "traffic_spike".to_string(),
            Self::NewLoginDetected => "new_login_detected".to_string(),
            Self::SuspiciousActivity => "suspicious_activity".to_string(),
            Self::Custom(s) => format!("custom:{}", s),
        }
    }
}

/// A notification entity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: Uuid,
    pub account_id: Uuid,
    pub title: String,
    pub message: String,
    pub notification_type: String,
    pub category: NotificationCategory,
    pub priority: NotificationPriority,
    /// Whether the notification has been read
    pub read: bool,
    /// Optional link/action URL
    pub action_url: Option<String>,
    /// Optional icon name
    pub icon: Option<String>,
    /// Additional metadata as JSON
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

/// Request to create a new notification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNotificationRequest {
    pub account_id: Uuid,
    pub title: String,
    pub message: String,
    #[serde(default)]
    pub notification_type: Option<String>,
    #[serde(default)]
    pub category: Option<NotificationCategory>,
    #[serde(default)]
    pub priority: Option<NotificationPriority>,
    #[serde(default)]
    pub action_url: Option<String>,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub metadata: Option<serde_json::Value>,
}

/// Response for notification list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationListResponse {
    pub notifications: Vec<Notification>,
    pub total: i64,
    pub unread_count: i64,
}

/// Filters for listing notifications
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct NotificationFilters {
    pub category: Option<NotificationCategory>,
    pub read: Option<bool>,
    pub priority: Option<NotificationPriority>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Push notification subscription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushSubscription {
    pub id: Uuid,
    pub account_id: Uuid,
    pub endpoint: String,
    pub p256dh_key: String,
    pub auth_key: String,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: Option<DateTime<Utc>>,
}

/// Request to subscribe to push notifications
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushSubscriptionRequest {
    pub endpoint: String,
    pub keys: PushSubscriptionKeys,
    pub user_agent: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushSubscriptionKeys {
    pub p256dh: String,
    pub auth: String,
}

/// Notification settings per user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationSettings {
    pub account_id: Uuid,
    /// Enable push notifications
    pub push_enabled: bool,
    /// Enable email notifications
    pub email_enabled: bool,
    /// Categories to notify for
    pub enabled_categories: Vec<NotificationCategory>,
    /// Quiet hours start (e.g., "22:00")
    pub quiet_hours_start: Option<String>,
    /// Quiet hours end (e.g., "08:00")
    pub quiet_hours_end: Option<String>,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            account_id: Uuid::nil(),
            push_enabled: true,
            email_enabled: false,
            enabled_categories: vec![
                NotificationCategory::System,
                NotificationCategory::Account,
                NotificationCategory::Website,
                NotificationCategory::Billing,
                NotificationCategory::Security,
            ],
            quiet_hours_start: None,
            quiet_hours_end: None,
        }
    }
}
