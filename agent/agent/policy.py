from __future__ import annotations

import re
from collections.abc import Callable
from typing import Any

from pydantic import BaseModel


class PolicyRule(BaseModel):
    id: str
    description: str
    provider: str
    resource_type: str
    severity: str = "HIGH"
    remediation_template: str

    def check(self, metric_name: str, labels: dict[str, str], value: Any) -> bool:
        raise NotImplementedError("Subclasses must implement check()")


class OpenSSHPortRule(PolicyRule):
    """CIS-AWS-2.1: Security group must not allow unrestricted SSH."""

    id: str = "CIS-AWS-2.1"
    description: str = "Security group allows unrestricted SSH (0.0.0.0/0 on port 22)"
    provider: str = "aws"
    resource_type: str = "aws_security_group"
    remediation_template: str = "close_ssh_port"

    def check(self, metric_name: str, labels: dict[str, str], value: Any) -> bool:
        return (
            metric_name == "security_group_ingress"
            and labels.get("port") == "22"
            and labels.get("cidr") == "0.0.0.0/0"
        )


class S3PublicAccessRule(PolicyRule):
    """CIS-AWS-1.1: S3 bucket must block public access."""

    id: str = "CIS-AWS-1.1"
    description: str = "S3 bucket does not block public access"
    provider: str = "aws"
    resource_type: str = "aws_s3_bucket"
    remediation_template: str = "block_s3_public_access"

    def check(self, metric_name: str, labels: dict[str, str], value: Any) -> bool:
        return metric_name == "s3_public_access" and value == 1


class GCPOpenFirewallRule(PolicyRule):
    """CIS-GCP-3.1: Firewall must not allow 0.0.0.0/0 ingress."""

    id: str = "CIS-GCP-3.1"
    description: str = "Firewall rule allows unrestricted ingress (0.0.0.0/0)"
    provider: str = "gcp"
    resource_type: str = "google_compute_firewall"
    remediation_template: str = "restrict_gcp_firewall"

    def check(self, metric_name: str, labels: dict[str, str], value: Any) -> bool:
        return (
            metric_name == "firewall_ingress"
            and labels.get("source_range") == "0.0.0.0/0"
        )


POLICY_REGISTRY: list[PolicyRule] = [
    OpenSSHPortRule(),
    S3PublicAccessRule(),
    GCPOpenFirewallRule(),
]


def evaluate_metric(
    provider: str,
    metric_name: str,
    labels: dict[str, str],
    value: Any,
) -> list[PolicyRule]:
    violations = []
    for rule in POLICY_REGISTRY:
        if rule.provider == provider and rule.check(metric_name, labels, value):
            violations.append(rule)
    return violations
