"""
Coach API Routes - Prompt Coach for content creators.

Endpoints:
- GET  /tips                        - Static tips (all tiers)
- GET  /access                      - Check access level
- POST /start                       - Start session (SSE)
- POST /sessions/{id}/messages      - Continue chat (SSE)
- GET  /sessions/{id}               - Get session state
- POST /sessions/{id}/end           - End session
- GET  /sessions                    - List sessions
- POST /sessions/{id}/generate      - Generate from session
- POST /sessions/{id}/refine        - Refine image
- GET  /sessions/{id}/assets        - Get session assets
"""

from fastapi import APIRouter

from .access import router as access_router
from .sessions import router as sessions_router
from .generation import router as generation_router


router = APIRouter()

# Include sub-routers
router.include_router(access_router)
router.include_router(sessions_router)
router.include_router(generation_router)


__all__ = ["router"]
