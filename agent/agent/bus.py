from __future__ import annotations

import asyncio
import json
import logging

import nats

from agent.state import run_pipeline

logger = logging.getLogger(__name__)

SUBJECT = "telemetry.>"


async def message_handler(msg: nats.aio.client.Msg) -> None:
    try:
        payload = json.loads(msg.data.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        logger.error("invalid message on %s", msg.subject)
        return

    logger.info("received telemetry on %s", msg.subject)
    state = run_pipeline(payload)

    if state.diffs:
        logger.info("generated %d remediation diffs", len(state.diffs))
        for i, diff in enumerate(state.diffs, 1):
            print(f"\n{'='*60}")
            print(f"REMEDIATION DIFF {i}/{len(state.diffs)}")
            print(f"{'='*60}")
            print(diff)
    else:
        logger.info("no violations detected")


async def subscribe(nats_url: str = "nats://localhost:4222") -> None:
    nc = await nats.connect(nats_url)
    logger.info("connected to NATS at %s", nats_url)

    sub = await nc.subscribe(SUBJECT, cb=message_handler)
    logger.info("subscribed to %s", SUBJECT)

    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        pass
    finally:
        await sub.unsubscribe()
        await nc.drain()
        logger.info("disconnected from NATS")
