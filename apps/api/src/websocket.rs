use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use chrono::Utc;
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc};
use tracing::{info, warn, error};

/// WebSocket message structure
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub data: serde_json::Value,
}

/// WebSocket authentication payload
#[derive(Debug, Deserialize)]
struct AuthPayload {
    token: String,
}

/// Shared state for WebSocket connections
#[derive(Clone)]
pub struct WsState {
    pub tx: broadcast::Sender<WsMessage>,
}

impl WsState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self { tx }
    }

    /// Broadcast a message to all connected clients
    pub fn broadcast(&self, msg: WsMessage) {
        if let Err(e) = self.tx.send(msg) {
            warn!("Failed to broadcast message: {}", e);
        }
    }
}

/// WebSocket handler - upgrades HTTP connection to WebSocket
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<WsState>>,
) -> Response {
    info!("WebSocket connection upgrade requested");
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle individual WebSocket connection
async fn handle_socket(socket: WebSocket, state: Arc<WsState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut broadcast_rx = state.tx.subscribe();
    
    let client_id = uuid::Uuid::new_v4();
    info!("New WebSocket client connected: {}", client_id);

    // Channel for direct messages to this client
    let (direct_tx, mut direct_rx) = mpsc::channel::<WsMessage>(32);

    // Track if client is authenticated
    let authenticated = Arc::new(tokio::sync::RwLock::new(false));
    let auth_clone = authenticated.clone();

    // Task to send messages to this client (both direct and broadcast)
    let mut send_task = tokio::spawn(async move {
        loop {
            tokio::select! {
                // Handle direct messages (always sent)
                Some(msg) = direct_rx.recv() => {
                    if let Ok(json) = serde_json::to_string(&msg) {
                        if sender.send(Message::Text(json)).await.is_err() {
                            break;
                        }
                    }
                }
                // Handle broadcast messages (only if authenticated)
                Ok(msg) = broadcast_rx.recv() => {
                    if *auth_clone.read().await {
                        if let Ok(json) = serde_json::to_string(&msg) {
                            if sender.send(Message::Text(json)).await.is_err() {
                                break;
                            }
                        }
                    }
                }
            }
        }
    });

    // Task to receive messages from this client
    let broadcast_tx = state.tx.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    match serde_json::from_str::<WsMessage>(&text) {
                        Ok(ws_msg) => {
                            info!("Received message from client {}: {}", client_id, ws_msg.msg_type);
                            
                            match ws_msg.msg_type.as_str() {
                                "auth" => {
                                    // Handle authentication
                                    if let Ok(payload) = serde_json::from_value::<AuthPayload>(ws_msg.data) {
                                        // Verify JWT token
                                        if verify_token(&payload.token) {
                                            *authenticated.write().await = true;
                                            info!("Client {} authenticated successfully", client_id);
                                            
                                            // Send auth success message directly to this client
                                            let auth_success = WsMessage {
                                                msg_type: "auth-success".to_string(),
                                                data: serde_json::json!({
                                                    "authenticated": true,
                                                    "client_id": client_id.to_string()
                                                }),
                                            };
                                            let _ = direct_tx.send(auth_success).await;
                                        } else {
                                            warn!("Client {} authentication failed", client_id);
                                            // Send auth failed message directly to this client
                                            let auth_failed = WsMessage {
                                                msg_type: "auth-failed".to_string(),
                                                data: serde_json::json!({
                                                    "error": "Invalid token"
                                                }),
                                            };
                                            let _ = direct_tx.send(auth_failed).await;
                                        }
                                    }
                                }
                                "ping" => {
                                    // Respond to ping with pong (always, no auth required for ping)
                                    let pong = WsMessage {
                                        msg_type: "pong".to_string(),
                                        data: serde_json::json!({
                                            "timestamp": Utc::now().timestamp_millis()
                                        }),
                                    };
                                    let _ = direct_tx.send(pong).await;
                                }
                                "action" => {
                                    // Broadcast action to other clients if authenticated
                                    if *authenticated.read().await {
                                        let _ = broadcast_tx.send(ws_msg);
                                    }
                                }
                                _ => {
                                    warn!("Unknown message type from client {}: {}", client_id, ws_msg.msg_type);
                                }
                            }
                        }
                        Err(e) => {
                            error!("Failed to parse message from client {}: {}", client_id, e);
                        }
                    }
                }
                Message::Close(_) => {
                    info!("Client {} sent close message", client_id);
                    break;
                }
                Message::Ping(_data) => {
                    // WebSocket protocol ping - Axum handles pong automatically
                    info!("Received WebSocket ping from client {}", client_id);
                }
                Message::Pong(_) => {
                    // Client responded to our ping
                    info!("Received WebSocket pong from client {}", client_id);
                }
                _ => {}
            }
        }
        
        info!("Client {} disconnected", client_id);
    });

    // Wait for either task to finish
    tokio::select! {
        _ = (&mut send_task) => {
            recv_task.abort();
        },
        _ = (&mut recv_task) => {
            send_task.abort();
        },
    }
    
    info!("WebSocket connection closed for client {}", client_id);
}

/// Verify JWT token (placeholder implementation)
/// TODO: Implement proper JWT verification using shared JWT secret
fn verify_token(token: &str) -> bool {
    // For now, accept any non-empty token for testing
    // In production, verify JWT signature and expiration
    !token.is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_message_serialization() {
        let msg = WsMessage {
            msg_type: "test".to_string(),
            data: serde_json::json!({ "key": "value" }),
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("\"type\":\"test\""));
        assert!(json.contains("\"key\":\"value\""));
    }

    #[test]
    fn test_ws_state_creation() {
        let state = WsState::new();
        // Should not panic
        state.broadcast(WsMessage {
            msg_type: "test".to_string(),
            data: serde_json::json!({}),
        });
    }

    #[test]
    fn test_verify_token() {
        assert!(verify_token("valid-token"));
        assert!(!verify_token(""));
    }
}
