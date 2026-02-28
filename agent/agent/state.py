from __future__ import annotations

import json
import logging
import uuid
import datetime
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Annotated, TypedDict
import operator

import nats.aio.client
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, START, END
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class Phase(str, Enum):
    IDLE = "idle"
    ANALYZING = "analyzing"
    EVALUATING = "evaluating"
    REMEDIATING = "remediating"
    DONE = "done"


class AgentStateDict(TypedDict):
    nc: nats.aio.client.Client
    phase: Phase
    raw_payload: dict
    findings: list[dict]
    violations: list[dict]
    diffs: list[str]


# Helper models for LLM structured output
class TelemetryFinding(BaseModel):
    is_violation: bool = Field(description="True if this telemetry indicates a security violation (e.g., unrestricted 0.0.0.0/0 SSH ingress, public S3 bucket, public GCP firewall).")
    rule_id: str = Field(description="The CIS benchmark or security rule ID that was violated (e.g., CIS-AWS-2.1). Empty if no violation.")
    severity: str = Field(description="Severity of the violation (e.g., HIGH, MEDIUM, LOW)")
    resource_id: str = Field(description="The ID or name of the resource that triggered the violation")
    description: str = Field(description="Human readable description of what the violation is.")


class TelemetryAnalysisResult(BaseModel):
    findings: list[TelemetryFinding]


class TerraformDiffResult(BaseModel):
    diff: str = Field(description="A valid Unified Diff formatted patch resolving the Terraform issue for the resource.")


async def publish_log(nc: nats.aio.client.Client, phase: Phase, message: str) -> None:
    event = {
        "id": f"log-{uuid.uuid4()}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "phase": phase.value,
        "message": message,
    }
    await nc.publish("events.logs", json.dumps(event).encode())


async def publish_diff(nc: nats.aio.client.Client, finding: dict, diff_text: str) -> None:
    event = {
        "id": f"diff-{uuid.uuid4()}",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "ruleId": finding.get("rule_id", "UNKNOWN"),
        "resourceId": finding.get("resource_id", "UNKNOWN"),
        "severity": finding.get("severity", "HIGH"),
        "diff": diff_text,
    }
    await nc.publish("events.diffs", json.dumps(event).encode())


async def publish_wri(nc: nats.aio.client.Client, score: float) -> None:
    event = {"score": score}
    await nc.publish("events.wri", json.dumps(event).encode())


async def analyze_node(state: AgentStateDict) -> dict:
    nc = state["nc"]
    payload = state["raw_payload"]
    
    await publish_log(nc, Phase.ANALYZING, "Ingested real-time telemetry. AI initializing context analysis...")

    # Instantiating the LLM model
    # The user must provide OPENAI_API_KEY in the environment running the agent
    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    structured_llm = llm.with_structured_output(TelemetryAnalysisResult)

    prompt = f"""
    You are an expert DevSecOps Cloud AI agent.
    Analyze the following incoming JSON telemetry payload:
    
    {json.dumps(payload, indent=2)}
    
    Determine if this represents a security violation based on standard CIS Best Practices.
    Common violations:
    - aws security_group_ingress allowing 0.0.0.0/0 on port 22
    - google_compute_firewall allowing 0.0.0.0/0 on port 22
    - s3_public_access being 1
    """

    await publish_log(nc, Phase.EVALUATING, "Correlating telemetry with CIS Benchmarks logic utilizing LLM capabilities...")
    
    result = await structured_llm.ainvoke([SystemMessage(content=prompt)])
    
    violations = []
    for finding in result.findings:
        if finding.is_violation:
            violations.append(finding.model_dump())

    if violations:
        await publish_log(nc, Phase.EVALUATING, f"LLM confirmed {len(violations)} risk(s): {violations[0]['description']}")
    else:
        await publish_log(nc, Phase.EVALUATING, "Infrastructure is compliant. No violations detected by AI.")

    return {"violations": violations, "phase": Phase.EVALUATING}


def should_remediate(state: AgentStateDict) -> str:
    if state.get("violations", []):
        return "remediate"
    return "end"


async def remediate_node(state: AgentStateDict) -> dict:
    nc = state["nc"]
    violations = state["violations"]
    payload = state["raw_payload"]
    
    await publish_log(nc, Phase.REMEDIATING, "Generating infrastructure-as-code remediation patch.")

    llm = ChatOpenAI(model="gpt-4o", temperature=0)
    structured_llm = llm.with_structured_output(TerraformDiffResult)

    new_diffs = []
    for violation in violations:
        prompt = f"""
        You are an expert infrastructure-as-code automation AI.
        
        We have detected the following security violation in our infrastructure:
        Resource ID: {violation['resource_id']}
        Rule Violated: {violation['rule_id']}
        Description: {violation['description']}
        
        Telemetry Context: {json.dumps(payload, indent=2)}
        
        Write a Unified Diff formatted patch that modifies the Terraform configuration file (`a/{violation['resource_id']}.tf` to `b/{violation['resource_id']}.tf`).
        - For SSH issues, restrict the port 22 CIDR to "10.0.0.0/8" instead of "0.0.0.0/0".
        - For S3, add an aws_s3_bucket_public_access_block.
        
        Output ONLY the valid Unified Diff string.
        """
        
        result = await structured_llm.ainvoke([SystemMessage(content=prompt)])
        diff_text = result.diff
        new_diffs.append(diff_text)
        
        logger.info("Generated LLM Diff for %s", violation["resource_id"])
        await publish_diff(nc, violation, diff_text)

    await publish_log(nc, Phase.DONE, "Waiting for operator approval on generated pull request patch.")
    return {"diffs": new_diffs, "phase": Phase.DONE}


# Compile the LangGraph
workflow = StateGraph(AgentStateDict)

workflow.add_node("analyze", analyze_node)
workflow.add_node("remediate", remediate_node)

workflow.add_edge(START, "analyze")
workflow.add_conditional_edges("analyze", should_remediate, {"remediate": "remediate", "end": END})
workflow.add_edge("remediate", END)

# The compiled graph
graph = workflow.compile()


async def run_pipeline(nc: nats.aio.client.Client, raw_payload: dict) -> AgentStateDict:
    initial_state = {
        "nc": nc,
        "raw_payload": raw_payload,
        "phase": Phase.IDLE,
        "findings": [],
        "violations": [],
        "diffs": [],
    }
    
    # Execute the LLM graph
    final_state = await graph.ainvoke(initial_state)
    return final_state
