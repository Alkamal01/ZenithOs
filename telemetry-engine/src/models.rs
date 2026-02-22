use std::collections::HashMap;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CloudProvider {
    Aws,
    Gcp,
}

impl std::fmt::Display for CloudProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Aws => write!(f, "aws"),
            Self::Gcp => write!(f, "gcp"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type", content = "value")]
pub enum MetricValue {
    Gauge(f64),
    Counter(u64),
    Histogram(Vec<f64>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metric {
    pub name: String,
    pub value: MetricValue,
    pub resource_id: String,
    #[serde(default)]
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelemetryPayload {
    pub source: String,
    pub provider: CloudProvider,
    pub region: String,
    pub timestamp: DateTime<Utc>,
    pub metrics: Vec<Metric>,
}

#[derive(Debug, Serialize)]
pub struct IngestResponse {
    pub id: Uuid,
    pub accepted: usize,
    pub rejected: usize,
    pub errors: Vec<String>,
}
