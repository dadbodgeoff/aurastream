"""
Session Manager for Prompt Coach.

Handles Redis-backed session storage with:
- Session creation with pre-loaded context
- Session retrieval and updates
- Message and prompt history tracking
- TTL-based expiration (30 minutes)
- Session limits enforcement

Security Notes:
- All operations verify user ownership
- Sessions are isolated per user
- Sensitive data is not logged
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any

from backend.services.coach.models import CoachSession, CoachMessage, PromptSuggestion
from backend.services.coach.core.exceptions import (
    SessionNotFoundError,
    SessionExpiredError,
    SessionLimitExceededError,
)
from backend.services.coach.core.types import (
    MAX_TURNS,
    MAX_TOKENS_IN,
    MAX_TOKENS_OUT,
    SESSION_TTL_SECONDS,
    SESSION_KEY_PREFIX,
)


class SessionManager:
    """
    Manages coach sessions with Redis storage.
    
    Sessions are stored in Redis with automatic TTL expiration.
    Each session tracks conversation history, prompt versions,
    and token usage for billing.
    """
    
    def __init__(self, redis_client=None):
        """
        Initialize the session manager.
        
        Args:
            redis_client: Redis client instance (uses singleton if not provided)
        """
        self._redis = redis_client
    
    @property
    def redis(self):
        """Lazy-load Redis client."""
        if self._redis is None:
            # Import here to avoid circular imports
            from backend.database.redis_client import get_redis_client
            self._redis = get_redis_client()
        return self._redis
    
    def _key(self, session_id: str) -> str:
        """Generate Redis key for session."""
        return f"{SESSION_KEY_PREFIX}{session_id}"
    
    async def create_with_context(
        self,
        user_id: str,
        brand_context: Dict[str, Any],
        asset_type: str,
        mood: str,
        game_context: Optional[str] = None,
        brand_aesthetic: Optional[Dict[str, Any]] = None,
    ) -> CoachSession:
        """
        Create a new coach session with pre-loaded context.
        
        Args:
            user_id: Authenticated user's ID
            brand_context: Brand kit context from client
            asset_type: Type of asset being created
            mood: Selected mood/style
            game_context: Optional game context from grounding
            brand_aesthetic: Optional cached brand aesthetic
            
        Returns:
            Created CoachSession
        """
        session = CoachSession(
            session_id=str(uuid.uuid4()),
            user_id=user_id,
            status="active",
            brand_context=brand_context,
            asset_type=asset_type,
            mood=mood,
            game_context=game_context,
            brand_aesthetic=brand_aesthetic,
        )
        
        await self._save(session)
        return session
    
    async def get(self, session_id: str) -> Optional[CoachSession]:
        """
        Get a session by ID.
        
        Args:
            session_id: Session UUID
            
        Returns:
            CoachSession if found, None otherwise
        """
        key = self._key(session_id)
        data = await self.redis.get(key)
        
        if data is None:
            return None
        
        try:
            session_dict = json.loads(data)
            return CoachSession.from_dict(session_dict)
        except (json.JSONDecodeError, KeyError):
            return None
    
    async def get_or_raise(self, session_id: str, user_id: str) -> CoachSession:
        """
        Get a session by ID, raising if not found or not owned.
        
        Args:
            session_id: Session UUID
            user_id: User ID for ownership check
            
        Returns:
            CoachSession
            
        Raises:
            SessionNotFoundError: If session doesn't exist
            SessionExpiredError: If session has expired
        """
        session = await self.get(session_id)
        
        if session is None:
            raise SessionNotFoundError(session_id)
        
        if session.user_id != user_id:
            # Don't reveal that session exists for other user
            raise SessionNotFoundError(session_id)
        
        if session.status == "expired":
            raise SessionExpiredError(session_id)
        
        return session
    
    async def add_message(
        self,
        session_id: str,
        message: CoachMessage,
    ) -> CoachSession:
        """
        Add a message to session history.
        
        Args:
            session_id: Session UUID
            message: Message to add
            
        Returns:
            Updated CoachSession
            
        Raises:
            SessionNotFoundError: If session doesn't exist
        """
        session = await self.get(session_id)
        if session is None:
            raise SessionNotFoundError(session_id)
        
        session.messages.append(message)
        session.tokens_in_total += message.tokens_in
        session.tokens_out_total += message.tokens_out
        
        if message.role == "user":
            session.turns_used += 1
        
        if message.grounding_used:
            session.grounding_calls += 1
        
        session.updated_at = datetime.now().timestamp()
        
        await self._save(session)
        return session
    
    async def add_prompt_suggestion(
        self,
        session_id: str,
        prompt: str,
        refinement_request: Optional[str] = None,
        changes_made: Optional[List[str]] = None,
        brand_elements: Optional[List[str]] = None,
    ) -> CoachSession:
        """
        Add a prompt suggestion to history.
        
        Args:
            session_id: Session UUID
            prompt: The suggested prompt
            refinement_request: What user asked to change (if refinement)
            changes_made: List of changes from previous version
            brand_elements: Brand elements used in this prompt
            
        Returns:
            Updated CoachSession
            
        Raises:
            SessionNotFoundError: If session doesn't exist
        """
        session = await self.get(session_id)
        if session is None:
            raise SessionNotFoundError(session_id)
        
        version = len(session.prompt_history) + 1
        suggestion = PromptSuggestion(
            version=version,
            prompt=prompt,
            timestamp=datetime.now().timestamp(),
            refinement_request=refinement_request,
            changes_made=changes_made or [],
            brand_elements_used=brand_elements or [],
        )
        
        session.prompt_history.append(suggestion)
        session.current_prompt_draft = prompt
        session.updated_at = datetime.now().timestamp()
        
        await self._save(session)
        return session
    
    async def check_limits(self, session: CoachSession) -> Dict[str, Any]:
        """
        Check if session has exceeded any limits.
        
        Args:
            session: Session to check
            
        Returns:
            Dict with limit status
        """
        return {
            "turns_exceeded": session.turns_used >= MAX_TURNS,
            "tokens_in_exceeded": session.tokens_in_total >= MAX_TOKENS_IN,
            "tokens_out_exceeded": session.tokens_out_total >= MAX_TOKENS_OUT,
            "turns_remaining": max(0, MAX_TURNS - session.turns_used),
            "can_continue": (
                session.turns_used < MAX_TURNS and
                session.tokens_in_total < MAX_TOKENS_IN and
                session.tokens_out_total < MAX_TOKENS_OUT and
                session.status == "active"
            ),
        }
    
    async def end(self, session_id: str, user_id: str) -> CoachSession:
        """
        End a session and mark it complete.
        
        Args:
            session_id: Session UUID
            user_id: User ID for ownership check
            
        Returns:
            Updated CoachSession
            
        Raises:
            SessionNotFoundError: If session doesn't exist
        """
        session = await self.get_or_raise(session_id, user_id)
        
        session.status = "ended"
        session.updated_at = datetime.now().timestamp()
        
        await self._save(session)
        return session
    
    async def get_prompt_history(self, session_id: str) -> List[PromptSuggestion]:
        """
        Get prompt refinement history for a session.
        
        Args:
            session_id: Session UUID
            
        Returns:
            List of PromptSuggestion objects
        """
        session = await self.get(session_id)
        return session.prompt_history if session else []
    
    async def refresh_ttl(self, session_id: str) -> bool:
        """
        Refresh the TTL for a session.
        
        Args:
            session_id: Session UUID
            
        Returns:
            True if TTL was refreshed, False if session not found
        """
        key = self._key(session_id)
        result = await self.redis.expire(key, SESSION_TTL_SECONDS)
        return result
    
    async def delete(self, session_id: str) -> bool:
        """
        Delete a session.
        
        Args:
            session_id: Session UUID
            
        Returns:
            True if deleted, False if not found
        """
        key = self._key(session_id)
        result = await self.redis.delete(key)
        return result > 0
    
    async def update_session_metadata(
        self,
        session_id: str,
        metadata: Dict[str, Any],
    ) -> Optional[CoachSession]:
        """
        Update session with additional metadata.
        
        Args:
            session_id: Session UUID
            metadata: Metadata dict to merge into session
            
        Returns:
            Updated CoachSession or None if not found
        """
        session = await self.get(session_id)
        if session is None:
            return None
        
        # Store metadata in a dedicated field
        if not hasattr(session, 'metadata') or session.metadata is None:
            session.metadata = {}
        
        session.metadata.update(metadata)
        session.updated_at = datetime.now().timestamp()
        
        await self._save(session)
        return session
    
    async def get_session(self, session_id: str) -> Optional[CoachSession]:
        """
        Alias for get() for compatibility.
        
        Args:
            session_id: Session UUID
            
        Returns:
            CoachSession if found, None otherwise
        """
        return await self.get(session_id)
    
    async def update(self, session: CoachSession) -> CoachSession:
        """
        Update an existing session.
        
        Args:
            session: Session to update
            
        Returns:
            Updated CoachSession
        """
        session.updated_at = datetime.now().timestamp()
        await self._save(session)
        return session
    
    async def _save(self, session: CoachSession) -> None:
        """
        Save session to Redis with TTL and persist to PostgreSQL.
        
        Args:
            session: Session to save
        """
        key = self._key(session.session_id)
        data = json.dumps(session.to_dict())
        await self.redis.setex(key, SESSION_TTL_SECONDS, data)
        
        # Also persist to PostgreSQL for history
        await self._persist_to_db(session)
    
    async def _persist_to_db(self, session: CoachSession) -> None:
        """
        Persist session to PostgreSQL for long-term storage.
        
        Args:
            session: Session to persist
        """
        try:
            from backend.database.supabase_client import get_supabase_client
            db = get_supabase_client()
            
            # Convert messages to JSON-serializable format
            messages_json = [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp,
                }
                for msg in session.messages
            ]
            
            # Build session data for PostgreSQL
            session_data = {
                "id": session.session_id,
                "user_id": session.user_id,
                "brand_kit_id": session.brand_context.get("brand_kit_id") if session.brand_context else None,
                "asset_type": session.asset_type or "thumbnail",
                "mood": session.mood,
                "game_context": session.game_context,
                "status": session.status,
                "turns_used": session.turns_used,
                "current_prompt": session.current_prompt_draft,
                "messages": messages_json,
                "updated_at": datetime.now().isoformat(),
            }
            
            if session.status == "ended":
                session_data["ended_at"] = datetime.now().isoformat()
            
            # Upsert to handle both create and update
            db.table("coach_sessions").upsert(session_data, on_conflict="id").execute()
            
        except Exception as e:
            # Log but don't fail - Redis is the primary store
            import logging
            logging.getLogger(__name__).warning(f"Failed to persist session to PostgreSQL: {e}")


# Singleton instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get or create the session manager singleton."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager


__all__ = [
    "SessionManager",
    "get_session_manager",
]
