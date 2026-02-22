# ZenithOS

Agentic, self-healing infrastructure dashboard for DevDash 2026. Detects cloud misconfigurations (AWS/GCP) via real-time telemetry and generates automated Terraform remediation diffs.

## Architecture

```
Cloud Watchdogs ──POST /metrics──▶ Rust Engine ──NATS──▶ Python Agent ──▶ Terraform Diff
(CloudWatch, Stackdriver)          (axum/tokio)          (Pydantic AI)     (Automated PR)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full Mermaid diagrams and performance comparison.

## Components

### Telemetry Engine (Rust)

High-throughput ingestion server built with axum and tokio. Receives JSON telemetry payloads on `POST /metrics`, validates them, and publishes individual metrics to NATS subjects (`telemetry.{provider}.{region}`).

```bash
cd telemetry-engine
cargo run
```

Listens on `0.0.0.0:3000`. Requires a running NATS server.

### Remediation Agent (Python)

Stateful pipeline that consumes telemetry from NATS and evaluates it against CIS Benchmark policy rules:

| Rule | Description |
|---|---|
| CIS-AWS-2.1 | Security group allows unrestricted SSH |
| CIS-AWS-1.1 | S3 bucket missing public access block |
| CIS-GCP-3.1 | Firewall allows unrestricted ingress |

Violations produce unified Terraform diffs via Jinja2 templates.

```bash
cd agent
python -m agent.main
```

## Prerequisites

- [Rust](https://rustup.rs/) (1.75+)
- Python 3.11+
- [NATS Server](https://nats.io/)

```bash
# Quick start with Docker
docker run -p 4222:4222 nats:latest
```

## Quick Test

```bash
curl -X POST http://localhost:3000/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cloudwatch",
    "provider": "aws",
    "region": "us-east-1",
    "timestamp": "2026-02-22T22:00:00Z",
    "metrics": [{
      "name": "security_group_ingress",
      "value": {"type": "gauge", "value": 1.0},
      "resource_id": "sg-open-ssh",
      "labels": {"port": "22", "cidr": "0.0.0.0/0"}
    }]
  }'
```

The agent will detect the open SSH port violation and output a Terraform diff restricting the CIDR.

## Configuration

Both components read `NATS_URL` from the environment, defaulting to `nats://localhost:4222`.

## License

MIT
