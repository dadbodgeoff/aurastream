"""
SSE Stream Guardian Package.

Provides enterprise-grade reliability for Server-Sent Events (SSE) streaming
in AuraStream. Includes stream tracking, orphan detection, and recovery.

Components:
- StreamRegistry: Tracks active SSE streams in Redis
- CompletionStore: Stores completion data for client recovery
- StreamGuardian: Monitors streams and handles orphan detection

Usage:
    from backend.services.sse import (
        StreamRegistry,
        CompletionStore,
        StreamGuardian,
        StreamType,
        StreamState,
        StreamMetadata,
        CompletionData,
        TERMINAL_EVENTS,
    )
    
    # Register a stream
    registry = get_stream_registry()
    await registry.register(
        stream_id="gen:job123:abc12345",
        stream_type=StreamType.GENERATION,
        user_id="user-uuid",
        metadata={"job_id": "job123"},
    )
    
    # Heartbeat on each event
    await registry.heartbeat(stream_id)
    
    # Store completion on terminal event
    store = get_completion_store()
    await store.store_completion(
        stream_id,
        event_type="completed",
        event_data={"asset": {...}},
    )
    
    # Guardian checks for orphans (run periodically)
    guardian = get_stream_guardian()
    orphaned = await guardian.check_orphaned_streams()
"""

from .types import (
    StreamType,
    StreamState,
    StreamMetadata,
    CompletionData,
    TERMINAL_EVENTS,
    is_terminal_event,
)

from .registry import (
    StreamRegistry,
    get_stream_registry,
    KEY_PREFIX,
    STREAM_TTL_SECONDS,
)

from .completion_store import (
    CompletionStore,
    get_completion_store,
    COMPLETION_TTL_SECONDS,
)

from .guardian import (
    StreamGuardian,
    get_stream_guardian,
    DEFAULT_STALE_THRESHOLD_SECONDS,
    EXPIRED_THRESHOLD_SECONDS,
)


__all__ = [
    # Types
    "StreamType",
    "StreamState",
    "StreamMetadata",
    "CompletionData",
    "TERMINAL_EVENTS",
    "is_terminal_event",
    # Registry
    "StreamRegistry",
    "get_stream_registry",
    "KEY_PREFIX",
    "STREAM_TTL_SECONDS",
    # Completion Store
    "CompletionStore",
    "get_completion_store",
    "COMPLETION_TTL_SECONDS",
    # Guardian
    "StreamGuardian",
    "get_stream_guardian",
    "DEFAULT_STALE_THRESHOLD_SECONDS",
    "EXPIRED_THRESHOLD_SECONDS",
]
