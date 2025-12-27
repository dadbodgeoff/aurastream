"""
Workers package for Aurastream.

This package contains background workers for processing async tasks.
"""

from backend.workers.generation_worker import (
    enqueue_generation_job,
    process_generation_job,
    run_worker,
    QUEUE_NAME,
    REDIS_URL,
)

from backend.workers.twitch_worker import (
    enqueue_twitch_generation_job,
    enqueue_pack_generation_job,
    process_twitch_generation_job,
    process_pack_generation_job,
    run_worker as run_twitch_worker,
    QUEUE_NAME as TWITCH_QUEUE_NAME,
)

__all__ = [
    # Generation worker
    "enqueue_generation_job",
    "process_generation_job",
    "run_worker",
    "QUEUE_NAME",
    "REDIS_URL",
    # Twitch worker
    "enqueue_twitch_generation_job",
    "enqueue_pack_generation_job",
    "process_twitch_generation_job",
    "process_pack_generation_job",
    "run_twitch_worker",
    "TWITCH_QUEUE_NAME",
]
