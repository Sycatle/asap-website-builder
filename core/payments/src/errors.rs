use thiserror::Error;

#[derive(Error, Debug)]
pub enum PaymentError {
    #[error("Invalid webhook signature")]
    InvalidSignature,
    
    #[error("Customer not found: {0}")]
    CustomerNotFound(String),
    
    #[error("Subscription not found: {0}")]
    SubscriptionNotFound(String),
    
    #[error("Payment event processing failed: {0}")]
    EventProcessingFailed(String),
    
    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Unknown error: {0}")]
    Unknown(String),
}

impl From<anyhow::Error> for PaymentError {
    fn from(err: anyhow::Error) -> Self {
        PaymentError::Unknown(err.to_string())
    }
}
