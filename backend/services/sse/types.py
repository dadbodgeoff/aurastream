"""
SSE Stream Guardian Types.

Defines enums, dataclasses, and constants for SSE stream tracking and recovery.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class StreamType(str, Enum):
    """Types of SSE streams in AuraStream."""
    GENERATION = "generation"
    COACH_START = "coach_start"
    COACH_CONTINUE = "coach_continue"
    PROFILE_START = "profile_start"
    PROFILE_CONTINUE = "profile_continue"


class StreamState(str, Enum):
    """States a stream can be in."""
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    ORPHANED = "orphaned"
    EXPIRED = "expired"


@dataclass
class StreamMetadata:
    """Metadata for an active SSE stream."""
    stream_id: str
    stream_type: StreamType
    user_id: str
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_heartbeat: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    state: StreamState = StreamState.ACTIVE
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return {
            "stream_id": self.stream_id,
            "stream_type": self.stream_type.value,
            "user_id": self.user_id,
            "started_at": self.started_at.isoformat(),
            "last_heartbeat": self.last_heartbeat.isoformat(),
            "state": self.state.value,
            "metadata": self.metadata,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StreamMetadata":
        """Create from dictionary (Redis data)."""
        return cls(
            stream_id=data["stream_id"],
            stream_type=StreamType(data["stream_type"]),
            user_id=data["user_id"],
            started_at=datetime.fromisoformat(data["started_at"]) if isinstance(data["started_at"], str) else data["started_at"],
            last_heartbeat=datetime.fromisoformat(data["last_heartbeat"]) if isinstance(data["last_heartbeat"], str) else data["last_heartbeat"],
            state=StreamState(data["state"]),
            metadata=data.get("metadata", {}),
        )


@dataclass
class CompletionData:
    """Completion data for a finished stream (for recovery)."""
    stream_id: str
    terminal_event_type: str
    terminal_event_data: Dict[str, Any] = field(default_factory=dict)
    completed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return {
            "stream_id": self.stream_id,
            "terminal_event_type": self.terminal_event_type,
            "terminal_event_data": self.terminal_event_data,
            "completed_at": self.completed_at.isoformat(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CompletionData":
        """Create from dictionary (Redis data)."""
        return cls(
            stream_id=data["stream_id"],
            terminal_event_type=data["terminal_event_type"],
            terminal_event_data=data.get("terminal_event_data", {}),
            completed_at=datetime.fromisoformat(data["completed_at"]) if isinstance(data["completed_at"], str) else data["completed_at"],
        )


# Terminal events that indicate a stream has completed
# Maps StreamType to list of terminal event types
TERMINAL_EVENTS: Dict[StreamType, List[str]] = {
    StreamType.GENERATION: ["completed", "failed", "timeout", "error"],
    StreamType.COACH_START: ["done", "error"],
    StreamType.COACH_CONTINUE: ["done", "error"],
    StreamType.PROFILE_START: ["done", "error"],
    StreamType.PROFILE_CONTINUE: ["done", "error"],
}


def is_terminal_event(stream_type: StreamType, event_type: str) -> bool:
    """Check if an event type is terminal for the given stream type."""
    terminal_types = TERMINAL_EVENTS.get(stream_type, [])
    return event_type in terminal_types


__all__ = [
    "StreamType",
    "StreamState",
    "StreamMetadata",
    "CompletionData",
    "TERMINAL_EVENTS",
    "is_terminal_event",
]
