export type CloudProvider = "aws" | "gcp";

export type MetricValue =
  | { type: "gauge"; value: number }
  | { type: "counter"; value: number }
  | { type: "histogram"; value: number[] };

export interface Metric {
  name: string;
  value: MetricValue;
  resource_id: string;
  labels: Record<string, string>;
}

export interface TelemetryPayload {
  source: string;
  provider: CloudProvider;
  region: string;
  timestamp: string;
  metrics: Metric[];
}

export type AgentPhase = "idle" | "analyzing" | "evaluating" | "remediating" | "done";

export interface AgentLog {
  id: string;
  timestamp: string;
  phase: AgentPhase;
  message: string;
}

export interface TopologyNodeData extends Record<string, unknown> {
  label: string;
  health: "healthy" | "risk" | "violation";
  type: string;
  metrics?: Record<string, any>;
}

export interface RemediationDiffData {
  id: string;
  timestamp: string;
  ruleId: string;
  resourceId: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  diff: string;
}

export interface SystemStatus {
  natsConnected: boolean;
  activeViolations: number;
  wriScore: number; // 0.0 to 1.0
  uptime: number;
}
