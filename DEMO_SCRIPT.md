# ZenithOS — Demo Video Script (2-5 minutes)

## Setup Before Recording
- Have 4 terminal tabs ready (NATS, Rust, Python Agent, curl)
- Have the browser open to `http://localhost:3000`
- Make sure all services are stopped so you can show the cold boot

---

## SCENE 1: Introduction (30 seconds)
**[Show browser with the dashboard idle — dark, empty state]**

> *"This is ZenithOS — a self-healing infrastructure platform that uses AI to detect cloud misconfigurations in real-time and automatically propose Terraform fixes.*
>
> *It's built with Rust for high-throughput telemetry ingestion, a Python LangGraph agent powered by GPT-4o for autonomous security analysis, and a Next.js Command Center dashboard connected via WebSockets through NATS."*

---

## SCENE 2: Cold Boot (30 seconds)
**[Switch to terminal, show the 3 services starting]**

**Terminal 1 — NATS:**
```bash
docker run -p 4222:4222 nats:latest
```

**Terminal 2 — Rust Engine:**
```bash
cd telemetry-engine && cargo run
```
> *"The Rust engine starts on port 3001. It exposes both a REST ingest API and a WebSocket gateway."*

**Terminal 3 — Python Agent:**
```bash
cd agent && source venv/bin/activate
export OPENAI_API_KEY="sk-..."
python -m agent.main
```
> *"The Python agent connects to NATS and subscribes to all telemetry events."*

**[Switch to browser — show StatusBar turning green: "NATS Connected"]**

> *"The dashboard auto-connects via WebSocket. You can see the connection status is live."*

---

## SCENE 3: AWS Violation — Open SSH (60 seconds)
**[Switch to terminal, fire the AWS curl]**

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

**[Immediately switch to browser — show the dashboard reacting live]**

> *"Watch what happens. The telemetry hits the Rust engine, gets published to NATS, and the Python AI agent picks it up instantly.*
>
> *In the Agent Feed you can see GPT-4o reasoning in real-time — it's analyzing the payload, correlating it against CIS Benchmarks, and confirming this is a HIGH severity violation: unrestricted SSH on port 22.*
>
> *The WRI gauge drops to reflect the degraded security posture.*
>
> *And here's the Terraform remediation diff — generated entirely by the LLM — restricting the CIDR from 0.0.0.0/0 to 10.0.0.0/8."*

**[Click "Approve & Apply"]**

> *"When I approve it, the WRI recovers and the decision is logged in the Audit History panel."*

---

## SCENE 4: GCP Violation — Open Firewall (45 seconds)
**[Switch to terminal, fire the GCP curl]**

```bash
curl -X POST http://localhost:3001/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "source": "stackdriver",
    "provider": "gcp",
    "region": "us-central1",
    "timestamp": "2026-02-28T12:01:00Z",
    "metrics": [{
      "name": "firewall_ingress",
      "value": {"type": "gauge", "value": 1.0},
      "resource_id": "fw-allow-all-ssh",
      "labels": {"source_range": "0.0.0.0/0", "port": "22"}
    }]
  }'
```

**[Switch to browser]**

> *"Same flow, different cloud provider. The AI agent handles GCP firewall rules just as well — it's not hardcoded. The LLM understands the context and writes the appropriate Terraform patch for Google Compute resources."*

**[Click "Reject" this time]**

> *"This time I reject it. The audit log captures both decisions with timestamps."*

---

## SCENE 5: Architecture & Wrap-up (30 seconds)
**[Show the ARCHITECTURE.md diagram or a slide]**

> *"To summarize the architecture:*
> - *Rust handles ingestion at scale and serves as the WebSocket gateway*
> - *NATS provides sub-millisecond pub/sub between all services*
> - *The Python LangGraph agent uses GPT-4o with structured outputs for analysis and remediation*
> - *The Next.js dashboard consumes everything in real-time over a single WebSocket*
>
> *The dashboard also auto-reconnects if any service restarts, and all operator decisions are tracked in the audit log.*
>
> *This is ZenithOS. Thank you."*
