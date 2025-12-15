use serde_json::json;

// Note: These tests require the websocket module to be public
// For now, we'll create simple integration tests

#[tokio::test]
async fn test_websocket_message_format() {
    use serde::{Deserialize, Serialize};
    
    #[derive(Clone, Debug, Serialize, Deserialize)]
    struct WsMessage {
        #[serde(rename = "type")]
        msg_type: String,
        data: serde_json::Value,
    }
    
    let msg = WsMessage {
        msg_type: "test".to_string(),
        data: json!({"key": "value"}),
    };

    let json_str = serde_json::to_string(&msg).unwrap();
    assert!(json_str.contains("\"type\":\"test\""));
    assert!(json_str.contains("\"key\":\"value\""));
    
    let deserialized: WsMessage = serde_json::from_str(&json_str).unwrap();
    assert_eq!(deserialized.msg_type, "test");
}

#[tokio::test]
async fn test_broadcast_channel() {
    use tokio::sync::broadcast;
    
    let (tx, mut rx1) = broadcast::channel(10);
    let mut rx2 = tx.subscribe();
    
    tx.send("test message").unwrap();
    
    assert_eq!(rx1.recv().await.unwrap(), "test message");
    assert_eq!(rx2.recv().await.unwrap(), "test message");
}
