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

from backend.workers.creator_intel_worker import (
    run_generation_sync as run_creator_intel_generation,
    run_continuous as run_creator_intel_worker,
    run_once as run_creator_intel_once,
    GENERATION_INTERVAL as CREATOR_INTEL_GENERATION_INTERVAL,
    TRACKED_GAMES as CREATOR_INTEL_TRACKED_GAMES,
)

from backend.workers.twitch_streams_worker import (
    run_fetch_sync as run_twitch_streams_fetch,
    run_continuous as run_twitch_streams_worker,
    run_once as run_twitch_streams_once,
    FETCH_INTERVAL as TWITCH_STREAMS_FETCH_INTERVAL,
    TRACKED_GAMES as TWITCH_STREAMS_TRACKED_GAMES,
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
    # Creator Intel worker
    "run_creator_intel_generation",
    "run_creator_intel_worker",
    "run_creator_intel_once",
    "CREATOR_INTEL_GENERATION_INTERVAL",
    "CREATOR_INTEL_TRACKED_GAMES",
    # Twitch Streams worker
    "run_twitch_streams_fetch",
    "run_twitch_streams_worker",
    "run_twitch_streams_once",
    "TWITCH_STREAMS_FETCH_INTERVAL",
    "TWITCH_STREAMS_TRACKED_GAMES",
]
