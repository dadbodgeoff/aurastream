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

from backend.workers.playbook_worker import (
    run_generation_sync as run_playbook_generation,
    run_continuous as run_playbook_worker,
    run_once as run_playbook_once,
    GENERATION_INTERVAL as PLAYBOOK_GENERATION_INTERVAL,
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
    # Playbook worker
    "run_playbook_generation",
    "run_playbook_worker",
    "run_playbook_once",
    "PLAYBOOK_GENERATION_INTERVAL",
]
