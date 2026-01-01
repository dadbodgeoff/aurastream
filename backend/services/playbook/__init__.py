"""
Streamer Playbook Service - Enterprise Modular Architecture.

Transforms raw trend data into actionable strategies for small streamers.
Generates timestamped reports synced with YouTube data refreshes.

Module Structure:
- analyzers/       - Data analysis modules (golden hours, niches, hooks)
- generators/      - Content generators (titles, thumbnails, strategies)
- repository.py    - Database operations
- orchestrator.py  - Main service orchestrator
- constants.py     - Shared constants and templates
"""

from backend.services.playbook.orchestrator import PlaybookOrchestrator
from backend.services.playbook.repository import PlaybookRepository

__all__ = [
    "PlaybookOrchestrator",
    "PlaybookRepository",
    "get_playbook_service",
]

# Singleton instance
_playbook_service: PlaybookOrchestrator | None = None


def get_playbook_service() -> PlaybookOrchestrator:
    """Get or create the playbook service singleton."""
    global _playbook_service
    if _playbook_service is None:
        _playbook_service = PlaybookOrchestrator()
    return _playbook_service
