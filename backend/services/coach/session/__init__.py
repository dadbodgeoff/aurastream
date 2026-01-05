"""
Session lifecycle management with Redis and PostgreSQL persistence.

This module provides:
- SessionManager: Redis-backed session storage
- Session limit checking and enforcement
"""

from backend.services.coach.session.manager import (
    SessionManager,
    get_session_manager,
)

__all__ = [
    "SessionManager",
    "get_session_manager",
]
