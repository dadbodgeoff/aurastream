"""
Internal models for Prompt Coach service.

These are dataclasses used internally by the coach services,
separate from the API schemas. They handle:
- Session state management
- Message tracking
- Prompt refinement history
- Token usage tracking
- Redis serialization/deserialization
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional, Dict, Any


@dataclass
class CoachMessage:
    """
    Single message in a coach session.
    
    Tracks both the content and metadata about each message exchange,
    including token usage for cost tracking.
    """
    role: str  # "user" or "assistant"
    content: str
    timestamp: float
    grounding_used: bool = False
    tokens_in: int = 0
    tokens_out: int = 0


@dataclass
class PromptSuggestion:
    """
    A single prompt suggestion in the refinement history.
    
    Tracks each version of the prompt as it evolves through
    the coaching conversation, including what changes were made
    and which brand elements were incorporated.
    """
    version: int
    prompt: str
    timestamp: float
    refinement_request: Optional[str] = None
    changes_made: List[str] = field(default_factory=list)
    brand_elements_used: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "version": self.version,
            "prompt": self.prompt,
            "timestamp": self.timestamp,
            "refinement_request": self.refinement_request,
            "changes_made": self.changes_made,
            "brand_elements_used": self.brand_elements_used,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PromptSuggestion":
        """Create from dictionary."""
        return cls(
            version=data["version"],
            prompt=data["prompt"],
            timestamp=data["timestamp"],
            refinement_request=data.get("refinement_request"),
            changes_made=data.get("changes_made", []),
            brand_elements_used=data.get("brand_elements_used", []),
        )


@dataclass
class CoachSession:
    """
    Coach conversation session with refinement tracking.
    
    This is the main session object that tracks the entire coaching
    conversation, including:
    - User and session identification
    - Brand and asset context
    - Full conversation history
    - Token usage for billing
    - Prompt evolution history
    - Grounding call tracking
    - Multi-turn image refinement history
    
    Sessions are stored in Redis with TTL for automatic expiration.
    """
    session_id: str
    user_id: str
    status: str = "active"  # "active", "ended", "expired"
    
    # Context (stored from initial request)
    brand_context: Optional[Dict[str, Any]] = None
    asset_type: Optional[str] = None
    mood: Optional[str] = None
    game_context: Optional[str] = None
    
    # Conversation
    messages: List[CoachMessage] = field(default_factory=list)
    turns_used: int = 0
    
    # Token tracking for billing
    tokens_in_total: int = 0
    tokens_out_total: int = 0
    
    # Grounding (visual search) tracking
    grounding_calls: int = 0
    
    # Refinement tracking
    prompt_history: List[PromptSuggestion] = field(default_factory=list)
    current_prompt_draft: Optional[str] = None
    
    # Brand aesthetic (cached from initial analysis)
    brand_aesthetic: Optional[Dict[str, Any]] = None
    
    # Generic metadata for extensions (e.g., profile creator)
    metadata: Optional[Dict[str, Any]] = None
    
    # NEW: Multi-turn image refinement support
    # Stores Gemini conversation history for cheaper refinements
    gemini_history: List[Dict[str, Any]] = field(default_factory=list)
    refinements_used: int = 0
    last_generated_asset_id: Optional[str] = None
    
    # NEW: Reference assets from user's media library
    # These are passed to NanoBanana when generating from this session
    reference_assets: List[Dict[str, Any]] = field(default_factory=list)
    
    # Timestamps
    created_at: float = field(default_factory=lambda: datetime.now().timestamp())
    updated_at: float = field(default_factory=lambda: datetime.now().timestamp())
    
    def add_message(
        self,
        role: str,
        content: str,
        grounding_used: bool = False,
        tokens_in: int = 0,
        tokens_out: int = 0
    ) -> CoachMessage:
        """
        Add a message to the conversation.
        
        Args:
            role: "user" or "assistant"
            content: Message content
            grounding_used: Whether grounding was used for this message
            tokens_in: Input tokens used
            tokens_out: Output tokens generated
            
        Returns:
            The created CoachMessage
        """
        message = CoachMessage(
            role=role,
            content=content,
            timestamp=datetime.now().timestamp(),
            grounding_used=grounding_used,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
        )
        self.messages.append(message)
        self.tokens_in_total += tokens_in
        self.tokens_out_total += tokens_out
        if role == "user":
            self.turns_used += 1
        if grounding_used:
            self.grounding_calls += 1
        self.updated_at = datetime.now().timestamp()
        return message
    
    def add_prompt_version(
        self,
        prompt: str,
        refinement_request: Optional[str] = None,
        changes_made: Optional[List[str]] = None,
        brand_elements_used: Optional[List[str]] = None
    ) -> PromptSuggestion:
        """
        Add a new prompt version to the history.
        
        Args:
            prompt: The new prompt text
            refinement_request: What the user asked for (if refinement)
            changes_made: List of changes made from previous version
            brand_elements_used: Brand elements incorporated
            
        Returns:
            The created PromptSuggestion
        """
        version = len(self.prompt_history) + 1
        suggestion = PromptSuggestion(
            version=version,
            prompt=prompt,
            timestamp=datetime.now().timestamp(),
            refinement_request=refinement_request,
            changes_made=changes_made or [],
            brand_elements_used=brand_elements_used or [],
        )
        self.prompt_history.append(suggestion)
        self.current_prompt_draft = prompt
        self.updated_at = datetime.now().timestamp()
        return suggestion
    
    def get_conversation_for_llm(self) -> List[Dict[str, str]]:
        """
        Get conversation history formatted for LLM context.
        
        Returns:
            List of message dicts with 'role' and 'content' keys
        """
        return [
            {"role": m.role, "content": m.content}
            for m in self.messages
        ]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Redis storage."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "status": self.status,
            "brand_context": self.brand_context,
            "asset_type": self.asset_type,
            "mood": self.mood,
            "game_context": self.game_context,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "timestamp": m.timestamp,
                    "grounding_used": m.grounding_used,
                    "tokens_in": m.tokens_in,
                    "tokens_out": m.tokens_out,
                }
                for m in self.messages
            ],
            "turns_used": self.turns_used,
            "tokens_in_total": self.tokens_in_total,
            "tokens_out_total": self.tokens_out_total,
            "grounding_calls": self.grounding_calls,
            "prompt_history": [p.to_dict() for p in self.prompt_history],
            "current_prompt_draft": self.current_prompt_draft,
            "brand_aesthetic": self.brand_aesthetic,
            "metadata": self.metadata,
            # Multi-turn refinement fields
            "gemini_history": self.gemini_history,
            "refinements_used": self.refinements_used,
            "last_generated_asset_id": self.last_generated_asset_id,
            # Reference assets
            "reference_assets": self.reference_assets,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CoachSession":
        """Create from dictionary (Redis retrieval)."""
        messages = [
            CoachMessage(
                role=m["role"],
                content=m["content"],
                timestamp=m["timestamp"],
                grounding_used=m.get("grounding_used", False),
                tokens_in=m.get("tokens_in", 0),
                tokens_out=m.get("tokens_out", 0),
            )
            for m in data.get("messages", [])
        ]
        
        prompt_history = [
            PromptSuggestion.from_dict(p)
            for p in data.get("prompt_history", [])
        ]
        
        return cls(
            session_id=data["session_id"],
            user_id=data["user_id"],
            status=data.get("status", "active"),
            brand_context=data.get("brand_context"),
            asset_type=data.get("asset_type"),
            mood=data.get("mood"),
            game_context=data.get("game_context"),
            messages=messages,
            turns_used=data.get("turns_used", 0),
            tokens_in_total=data.get("tokens_in_total", 0),
            tokens_out_total=data.get("tokens_out_total", 0),
            grounding_calls=data.get("grounding_calls", 0),
            prompt_history=prompt_history,
            current_prompt_draft=data.get("current_prompt_draft"),
            brand_aesthetic=data.get("brand_aesthetic"),
            metadata=data.get("metadata"),
            # Multi-turn refinement fields
            gemini_history=data.get("gemini_history", []),
            refinements_used=data.get("refinements_used", 0),
            last_generated_asset_id=data.get("last_generated_asset_id"),
            # Reference assets
            reference_assets=data.get("reference_assets", []),
            created_at=data.get("created_at", datetime.now().timestamp()),
            updated_at=data.get("updated_at", datetime.now().timestamp()),
        )


__all__ = [
    "CoachMessage",
    "PromptSuggestion",
    "CoachSession",
]
