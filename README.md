# ZenithOS

**Agentic, self-healing infrastructure for the cloud.** ZenithOS detects cloud misconfigurations across AWS and GCP in real-time, autonomously evaluates them against CIS Benchmarks using GPT-4o, and generates Terraform remediation patches — all visible live in a Command Center dashboard.

Built for [DevDash 2026](https://devdash.devpost.com/).

## Architecture

```
Cloud Telemetry ──POST /metrics──▶ Rust Engine ──NATS──▶ Python LangGraph Agent ──▶ Terraform Diff
(CloudWatch, Stackdriver)          (axum + WebSocket)     (gpt-4o structured output)  (Unified Diff)
                                         │
                                         ▼
                                   Next.js Dashboard ◀── WebSocket ◀── NATS events
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for Mermaid diagrams and a performance comparison vs Datadog/New Relic.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Ingestion | **Rust** (axum, tokio) | High-throughput telemetry API + WebSocket gateway |
| Message Bus | **NATS** | Sub-millisecond pub/sub between all services |
| AI Agent | **Python** (LangGraph, langchain-openai) | Autonomous CIS evaluation + Terraform diff generation |
| LLM | **OpenAI GPT-4o** | Structured JSON analysis and IaC patch authoring |
| Dashboard | **Next.js 14** (React Flow, shadcn/ui) | Real-time Command Center UI |

## Features

- **Real-time Topology Graph** — React Flow visualization of infrastructure nodes. Color-coded health status updates live as violations are detected.
- **AI Agent Intelligence Feed** — Terminal-style panel streaming the LLM's actual thought process as it analyzes telemetry and evaluates CIS rules.
- **Remediation Diff Viewer** — Split-pane Terraform diff generated entirely by GPT-4o. Approve or reject with one click.
- **WRI Gauge** — Animated SVG arc showing the Weighted Reliability Index, dropping in real-time when violations occur.
- **Audit History** — Persistent log of all approved/rejected remediations with timestamps.
- **Auto-reconnecting WebSocket** — Dashboard gracefully reconnects if the Rust gateway restarts.
- **Multi-cloud Support** — Works with AWS (Security Groups, S3) and GCP (Compute Firewall) telemetry.

## Quick Start

### Prerequisites

- [Docker](https://docker.com) (for NATS)
- [Rust](https://rustup.rs/) 1.75+
- Python 3.11+ with a virtual environment
- Node.js 18+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Start NATS

```bash
docker run -p 4222:4222 nats:latest
```

### 2. Start the Rust Telemetry Engine

```bash
cd telemetry-engine
cargo run
# Listening on http://0.0.0.0:3001
```

### 3. Start the Python AI Agent

```bash
cd agent
python -m venv venv && source venv/bin/activate
pip install nats-py pydantic jinja2 langgraph langchain-openai
export OPENAI_API_KEY="sk-your-key-here"
python -m agent.main
```

### 4. Start the Command Center Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

## Demo: Fire a Violation

### AWS — Open SSH Port (CIS-AWS-2.1)

```bash
curl -X POST http://localhost:3001/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cloudwatch",
    "provider": "aws",
    "region": "us-east-1",
    "timestamp": "2026-02-28T12:00:00Z",
    "metrics": [{
      "name": "security_group_ingress",
      "value": {"type": "gauge", "value": 1.0},
      "resource_id": "sg-open-ssh",
      "labels": {"port": "22", "cidr": "0.0.0.0/0"}
    }]
  }'
```

### GCP — Open Firewall Rule (CIS-GCP-3.1)

```bash
curl -X POST http://localhost:3001/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "source": "stackdriver",
    "provider": "gcp",
    "region": "us-central1",
    "timestamp": "2026-02-28T12:00:00Z",
    "metrics": [{
      "name": "firewall_ingress",
      "value": {"type": "gauge", "value": 1.0},
      "resource_id": "fw-allow-all-ssh",
      "labels": {"source_range": "0.0.0.0/0", "port": "22"}
    }]
  }'
```

Watch the dashboard react in real-time as GPT-4o detects the violation, evaluates CIS compliance, and generates a Terraform remediation diff.

## Configuration

| Variable | Default | Description |
|---|---|---|
| `NATS_URL` | `nats://localhost:4222` | NATS server address |
| `OPENAI_API_KEY` | — | Required for the AI agent |

## License

MIT
