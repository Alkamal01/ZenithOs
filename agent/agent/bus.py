from __future__ import annotations

import asyncio
import json
import logging

import nats

from agent.state import run_pipeline, publish_wri

logger = logging.getLogger(__name__)

SUBJECT = "telemetry.>"


def create_message_handler(nc: nats.aio.client.Client):
    async def message_handler(msg: nats.aio.client.Msg) -> None:
        try:
            payload = json.loads(msg.data.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.error("invalid message on %s", msg.subject)
            return

        logger.info("received telemetry on %s", msg.subject)
        state = await run_pipeline(nc, payload)

        if state.get("diffs"):
            logger.info("generated %d remediation diffs", len(state["diffs"]))
            # Simulate a WRI drop when violations are found
            await publish_wri(nc, 0.65)
        else:
            logger.info("no violations detected")
            if state.get("findings"):
                # Recover WRI if compliant
                await publish_wri(nc, 0.98)

    return message_handler


async def subscribe(nats_url: str = "nats://localhost:4222") -> None:
    nc = await nats.connect(nats_url)
    logger.info("connected to NATS at %s", nats_url)

    handler = create_message_handler(nc)
    sub = await nc.subscribe(SUBJECT, cb=handler)
    logger.info("subscribed to %s", SUBJECT)

    try:
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        pass
    finally:
        await sub.unsubscribe()
        await nc.drain()
        logger.info("disconnected from NATS")
