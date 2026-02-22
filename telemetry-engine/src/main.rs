mod health;
mod ingest;
mod models;

use axum::{routing, Router};
use tracing::info;
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
pub struct AppState {
    pub nats: async_nats::Client,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let nats_url =
        std::env::var("NATS_URL").unwrap_or_else(|_| "nats://localhost:4222".to_string());
    info!(url = %nats_url, "connecting to NATS");
    let nats = async_nats::connect(&nats_url).await?;

    let state = AppState { nats };
    let app = Router::new()
        .route("/metrics", routing::post(ingest::ingest_metrics))
        .route("/healthz", routing::get(health::healthz))
        .with_state(state);

    let addr = "0.0.0.0:3000";
    info!(addr, "telemetry engine listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
