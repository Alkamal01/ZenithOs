from __future__ import annotations

import asyncio
import logging
import os

from agent.bus import subscribe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    nats_url = os.environ.get("NATS_URL", "nats://localhost:4222")
    logger.info("starting ZenithOS remediation agent")
    asyncio.run(subscribe(nats_url))


if __name__ == "__main__":
    main()
