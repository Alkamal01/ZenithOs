from __future__ import annotations

import difflib
from textwrap import dedent

from jinja2 import BaseLoader, Environment

TEMPLATES: dict[str, str] = {
    "close_ssh_port": dedent("""\
        resource "{{ resource_type }}" "{{ resource_id }}" {
          name        = "{{ resource_id }}"
          description = "Managed by ZenithOS remediation"

          ingress {
            from_port   = 22
            to_port     = 22
            protocol    = "tcp"
            cidr_blocks = ["{{ allowed_cidr }}"]
          }
        }
    """),
    "block_s3_public_access": dedent("""\
        resource "aws_s3_bucket_public_access_block" "{{ resource_id }}" {
          bucket = "{{ resource_id }}"

          block_public_acls       = true
          block_public_policy     = true
          ignore_public_acls      = true
          restrict_public_buckets = true
        }
    """),
    "restrict_gcp_firewall": dedent("""\
        resource "google_compute_firewall" "{{ resource_id }}" {
          name    = "{{ resource_id }}"
          network = "{{ network | default('default') }}"

          allow {
            protocol = "tcp"
            ports    = ["22"]
          }

          source_ranges = ["{{ allowed_cidr }}"]
        }
    """),
}

_env = Environment(loader=BaseLoader(), keep_trailing_newline=True)


def render_terraform(template_name: str, variables: dict) -> str:
    source = TEMPLATES[template_name]
    template = _env.from_string(source)
    return template.render(**variables)


def generate_diff(
    resource_id: str,
    template_name: str,
    original: str,
    variables: dict,
) -> str:
    remediated = render_terraform(template_name, variables)
    original_lines = original.splitlines(keepends=True)
    remediated_lines = remediated.splitlines(keepends=True)

    diff = difflib.unified_diff(
        original_lines,
        remediated_lines,
        fromfile=f"a/{resource_id}.tf",
        tofile=f"b/{resource_id}.tf",
    )
    return "".join(diff)
