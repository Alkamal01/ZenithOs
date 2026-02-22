from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Any

from agent.policy import PolicyRule, evaluate_metric
from agent.remediation import generate_diff

logger = logging.getLogger(__name__)


class Phase(str, Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    EVALUATING = "evaluating"
    REMEDIATING = "remediating"
    DONE = "done"


@dataclass
class Finding:
    provider: str
    region: str
    resource_id: str
    metric_name: str
    labels: dict[str, str]
    value: Any


@dataclass
class Violation:
    finding: Finding
    rule: PolicyRule
    diff: str = ""


@dataclass
class AgentState:
    phase: Phase = Phase.IDLE
    raw_payload: dict | None = None
    findings: list[Finding] = field(default_factory=list)
    violations: list[Violation] = field(default_factory=list)
    diffs: list[str] = field(default_factory=list)


def analyze(state: AgentState) -> AgentState:
    state.phase = Phase.ANALYZING
    payload = state.raw_payload
    if not payload:
        logger.warning("no payload to analyze")
        state.phase = Phase.IDLE
        return state

    provider = payload.get("provider", "unknown")
    region = payload.get("region", "unknown")

    for raw_metric in payload.get("metrics", []):
        value_obj = raw_metric.get("value", {})
        metric_value = value_obj.get("value") if isinstance(value_obj, dict) else value_obj

        state.findings.append(
            Finding(
                provider=provider,
                region=region,
                resource_id=raw_metric.get("resource_id", ""),
                metric_name=raw_metric.get("name", ""),
                labels=raw_metric.get("labels", {}),
                value=metric_value,
            )
        )

    logger.info("extracted %d findings", len(state.findings))
    return state


def evaluate(state: AgentState) -> AgentState:
    state.phase = Phase.EVALUATING

    for finding in state.findings:
        violations = evaluate_metric(
            provider=finding.provider,
            metric_name=finding.metric_name,
            labels=finding.labels,
            value=finding.value,
        )
        for rule in violations:
            state.violations.append(Violation(finding=finding, rule=rule))

    logger.info("detected %d violations", len(state.violations))
    return state


_STUB_ORIGINAL_TF: dict[str, str] = {
    "close_ssh_port": (
        'resource "aws_security_group" "{resource_id}" {{\n'
        '  name = "{resource_id}"\n'
        "  ingress {{\n"
        "    from_port   = 22\n"
        "    to_port     = 22\n"
        '    protocol    = "tcp"\n'
        '    cidr_blocks = ["0.0.0.0/0"]\n'
        "  }}\n"
        "}}\n"
    ),
    "block_s3_public_access": "",
    "restrict_gcp_firewall": (
        'resource "google_compute_firewall" "{resource_id}" {{\n'
        '  name    = "{resource_id}"\n'
        '  network = "default"\n'
        "  allow {{\n"
        '    protocol = "tcp"\n'
        '    ports    = ["22"]\n'
        "  }}\n"
        '  source_ranges = ["0.0.0.0/0"]\n'
        "}}\n"
    ),
}


def remediate(state: AgentState) -> AgentState:
    state.phase = Phase.REMEDIATING

    for violation in state.violations:
        template_name = violation.rule.remediation_template
        resource_id = violation.finding.resource_id

        original_template = _STUB_ORIGINAL_TF.get(template_name, "")
        original = original_template.format(resource_id=resource_id)

        variables = {
            "resource_type": violation.rule.resource_type,
            "resource_id": resource_id,
            "allowed_cidr": "10.0.0.0/8",
        }

        diff = generate_diff(resource_id, template_name, original, variables)
        violation.diff = diff
        state.diffs.append(diff)
        logger.info("generated diff for %s on %s", violation.rule.id, resource_id)

    state.phase = Phase.DONE
    return state


def run_pipeline(raw_payload: dict) -> AgentState:
    state = AgentState(raw_payload=raw_payload)
    state = analyze(state)

    if not state.findings:
        return state

    state = evaluate(state)

    if not state.violations:
        state.phase = Phase.DONE
        return state

    state = remediate(state)
    return state
