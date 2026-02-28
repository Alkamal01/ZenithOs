use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use tracing::{error, info, warn};

use crate::AppState;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();

    // Spawn a task to listen to NATS events and send them to the WebSocket
    let nats_client = state.nats.clone();
    
    let mut join_handlers = Vec::new();

    let subjects = vec!["telemetry.>", "events.>"];
    
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<String>();

    for subject in subjects {
        let nats = nats_client.clone();
        let sub_name = subject.to_string();
        let tx = tx.clone();
        
        let jh = tokio::spawn(async move {
            let mut subscriber = match nats.subscribe(sub_name.clone()).await {
                Ok(s) => s,
                Err(e) => {
                    error!("Failed to subscribe to {}: {}", sub_name, e);
                    return;
                }
            };
            
            info!("Subscribed to NATS subject: {}", sub_name);

            while let Some(msg) = subscriber.next().await {
                if let Ok(data) = std::str::from_utf8(&msg.payload) {
                    // Create an envelope so the client knows what event this is
                    let envelope = serde_json::json!({
                        "subject": msg.subject,
                        "data": serde_json::from_str::<serde_json::Value>(data).unwrap_or(serde_json::Value::String(data.to_string()))
                    });
                    
                    if let Ok(json_str) = serde_json::to_string(&envelope) {
                        let _ = tx.send(json_str);
                    }
                }
            }
        });
        join_handlers.push(jh);
    }
    
    // Task to forward messages from the channel to the websocket
    let mut ws_sender_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if let Err(e) = sender.send(Message::Text(msg.into())).await {
                warn!("Client disconnected or error sending: {}", e);
                break;
            }
        }
    });

    // Task to receive messages from the websocket and handle commands
    // e.g. "approve" / "reject" resolutions
    let mut ws_recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                info!("Received from WS client: {}", text);
                // In a full implementation, we could parse commands here
                // and forward to another NATS topic to trigger Terraform apply.
            }
        }
    });

    // If any task exits, abort the others
    tokio::select! {
        _ = (&mut ws_sender_task) => {
            ws_recv_task.abort();
            for jh in join_handlers { jh.abort(); }
        }
        _ = (&mut ws_recv_task) => {
            ws_sender_task.abort();
            for jh in join_handlers { jh.abort(); }
        }
    }

    info!("WebSocket connection closed");
}
