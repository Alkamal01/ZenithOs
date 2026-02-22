Role: Act as a Principal Systems Architect and Rust/Python specialist. We are building ZenithOS, an agentic, self-healing infrastructure dashboard for DevDash 2026.

Objective: Design a high-performance telemetry engine in Rust and a decision-making Python Agent that identifies and remediates cloud misconfigurations (AWS/GCP) via automated PRs.

Requirements & Constraints:

    Telemetry Ingestion (Rust): Provide a minimalist implementation using tokio and axum. Focus on a high-throughput /metrics endpoint that ingests JSON payloads from cloud watchdogs. Avoid blocking I/O.

    Agentic Logic (Python): Use LangGraph or Pydantic AI to design a state machine. The agent must:

        Analyze incoming Rust telemetry.

        Compare against a "Best Practice" policy (e.g., CIS Benchmarks).

        Generate a diff for a Terraform file to fix the issue (e.g., closing an open SSH port).

    Communication: The Rust backend and Python agent must communicate via a high-speed message bus (Redis Pub/Sub or NATS).

    Output Format: Provide the system architecture diagram (Mermaid), the core Rust struct definitions for telemetry data, and the Python agent's state-transition logic.

No Filler: Skip the introductions. Give me raw, deployable logic and efficient data structures. Compare the performance overhead of this approach vs. traditional Datadog/New Relic agents.