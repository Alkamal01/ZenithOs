use axum::extract::State;
use axum::http::StatusCode;
use axum::Json;
use tracing::{info, warn};
use uuid::Uuid;

use crate::models::{IngestResponse, Metric, TelemetryPayload};
use crate::AppState;

pub async fn ingest_metrics(
    State(state): State<AppState>,
    Json(payload): Json<TelemetryPayload>,
) -> (StatusCode, Json<IngestResponse>) {
    let request_id = Uuid::new_v4();
    let total = payload.metrics.len();

    info!(
        request_id = %request_id,
        source = %payload.source,
        provider = %payload.provider,
        region = %payload.region,
        metric_count = total,
        "ingesting telemetry"
    );

    let mut accepted = 0usize;
    let mut errors = Vec::new();
    let subject = format!("telemetry.{}.{}", payload.provider, payload.region);

    for metric in &payload.metrics {
        match publish_metric(&state, &subject, metric).await {
            Ok(()) => accepted += 1,
            Err(e) => {
                warn!(metric = %metric.name, error = %e, "failed to publish metric");
                errors.push(format!("{}: {e}", metric.name));
            }
        }
    }

    let rejected = total - accepted;
    let status = if rejected == 0 {
        StatusCode::OK
    } else if accepted > 0 {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::INTERNAL_SERVER_ERROR
    };

    (
        status,
        Json(IngestResponse {
            id: request_id,
            accepted,
            rejected,
            errors,
        }),
    )
}

async fn publish_metric(state: &AppState, subject: &str, metric: &Metric) -> Result<(), String> {
    let bytes = serde_json::to_vec(metric).map_err(|e| e.to_string())?;
    state
        .nats
        .publish(subject.to_string(), bytes.into())
        .await
        .map_err(|e| e.to_string())
}
