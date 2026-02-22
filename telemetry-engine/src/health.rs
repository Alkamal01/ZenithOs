use axum::extract::State;
use axum::http::StatusCode;
use serde::Serialize;

use crate::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub nats_connected: bool,
}

pub async fn healthz(State(state): State<AppState>) -> (StatusCode, axum::Json<HealthResponse>) {
    let connected = state.nats.connection_state() == async_nats::connection::State::Connected;
    let status = if connected { "healthy" } else { "degraded" };

    (
        StatusCode::OK,
        axum::Json(HealthResponse {
            status,
            nats_connected: connected,
        }),
    )
}
