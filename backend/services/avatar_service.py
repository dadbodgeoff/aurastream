"""
Avatar Service for Aurastream.

This service handles user avatar CRUD operations and character
prompt generation for AI image generation.

All operations are user-scoped and backward compatible.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import NotFoundError, AuthorizationError


logger = logging.getLogger(__name__)


@dataclass
class Avatar:
    """Avatar data model."""
    id: str
    user_id: str
    name: str
    is_default: bool
    
    # Physical
    gender: str
    body_type: str
    skin_tone: str
    
    # Face
    face_shape: str
    eye_color: str
    eye_style: str
    
    # Hair
    hair_color: str
    hair_style: str
    hair_texture: str
    
    # Expression
    default_expression: str
    
    # Style
    art_style: str
    outfit_style: str
    
    # Accessories
    glasses: bool
    glasses_style: Optional[str]
    headwear: Optional[str]
    facial_hair: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_db_row(cls, row: dict) -> "Avatar":
        """Create Avatar from database row."""
        return cls(
            id=row["id"],
            user_id=row["user_id"],
            name=row["name"],
            is_default=row.get("is_default", False),
            gender=row.get("gender", "neutral"),
            body_type=row.get("body_type", "average"),
            skin_tone=row.get("skin_tone", "medium"),
            face_shape=row.get("face_shape", "oval"),
            eye_color=row.get("eye_color", "brown"),
            eye_style=row.get("eye_style", "normal"),
            hair_color=row.get("hair_color", "brown"),
            hair_style=row.get("hair_style", "short"),
            hair_texture=row.get("hair_texture", "straight"),
            default_expression=row.get("default_expression", "friendly"),
            art_style=row.get("art_style", "realistic"),
            outfit_style=row.get("outfit_style", "casual-gamer"),
            glasses=row.get("glasses", False),
            glasses_style=row.get("glasses_style"),
            headwear=row.get("headwear"),
            facial_hair=row.get("facial_hair"),
            created_at=_parse_datetime(row["created_at"]),
            updated_at=_parse_datetime(row["updated_at"]),
        )
    
    def to_prompt_block(self, expression_override: Optional[str] = None) -> str:
        """
        Generate a prompt block for AI image generation.
        
        Returns a compact character description that can be injected
        into generation prompts.
        
        Args:
            expression_override: Override the default expression for this generation
            
        Returns:
            Formatted character prompt block
        """
        expression = expression_override or self.default_expression
        
        # Build accessories string
        accessories = []
        if self.glasses and self.glasses_style:
            accessories.append(f"{self.glasses_style} glasses")
        elif self.glasses:
            accessories.append("glasses")
        if self.headwear:
            accessories.append(self.headwear)
        if self.facial_hair:
            accessories.append(self.facial_hair)
        
        accessories_str = f", {', '.join(accessories)}" if accessories else ""
        
        # Build the prompt block
        return (
            f"[CHARACTER: {self.gender} {self.body_type} build, "
            f"{self.skin_tone} skin, {self.face_shape} face, "
            f"{self.eye_color} {self.eye_style} eyes, "
            f"{self.hair_color} {self.hair_texture} {self.hair_style} hair, "
            f"{expression} expression, {self.outfit_style} outfit{accessories_str}]"
        )


def _parse_datetime(value) -> datetime:
    """Parse datetime from database value."""
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    raise ValueError(f"Cannot parse datetime from {type(value)}: {value}")


class AvatarService:
    """
    Service for managing user avatars.
    
    All operations are user-scoped for security.
    """
    
    def __init__(self, supabase_client=None):
        """Initialize the avatar service."""
        self._supabase = supabase_client
        self.table_name = "user_avatars"
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def create(
        self,
        user_id: str,
        name: str = "My Avatar",
        is_default: bool = False,
        **kwargs
    ) -> Avatar:
        """
        Create a new avatar for a user.
        
        Args:
            user_id: User's ID
            name: Avatar name
            is_default: Whether this is the default avatar
            **kwargs: Avatar customization fields
            
        Returns:
            Created Avatar
        """
        now = datetime.now(timezone.utc).isoformat()
        
        avatar_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": name,
            "is_default": is_default,
            "created_at": now,
            "updated_at": now,
            # Defaults
            "gender": kwargs.get("gender", "neutral"),
            "body_type": kwargs.get("body_type", "average"),
            "skin_tone": kwargs.get("skin_tone", "medium"),
            "face_shape": kwargs.get("face_shape", "oval"),
            "eye_color": kwargs.get("eye_color", "brown"),
            "eye_style": kwargs.get("eye_style", "normal"),
            "hair_color": kwargs.get("hair_color", "brown"),
            "hair_style": kwargs.get("hair_style", "short"),
            "hair_texture": kwargs.get("hair_texture", "straight"),
            "default_expression": kwargs.get("default_expression", "friendly"),
            "art_style": kwargs.get("art_style", "realistic"),
            "outfit_style": kwargs.get("outfit_style", "casual-gamer"),
            "glasses": kwargs.get("glasses", False),
            "glasses_style": kwargs.get("glasses_style"),
            "headwear": kwargs.get("headwear"),
            "facial_hair": kwargs.get("facial_hair"),
        }
        
        result = self.db.table(self.table_name).insert(avatar_data).execute()
        
        if not result.data:
            raise Exception("Failed to create avatar")
        
        logger.info(f"Created avatar: user_id={user_id}, avatar_id={avatar_data['id']}")
        return Avatar.from_db_row(result.data[0])
    
    async def get(self, user_id: str, avatar_id: str) -> Avatar:
        """
        Get an avatar by ID.
        
        Args:
            user_id: User's ID (for ownership check)
            avatar_id: Avatar UUID
            
        Returns:
            Avatar if found and owned by user
            
        Raises:
            NotFoundError: If avatar doesn't exist
            AuthorizationError: If user doesn't own the avatar
        """
        result = self.db.table(self.table_name).select("*").eq("id", avatar_id).execute()
        
        if not result.data:
            raise NotFoundError("Avatar", avatar_id)
        
        avatar_data = result.data[0]
        
        if avatar_data["user_id"] != user_id:
            raise AuthorizationError("avatar")
        
        return Avatar.from_db_row(avatar_data)
    
    async def get_default(self, user_id: str) -> Optional[Avatar]:
        """
        Get the user's default avatar.
        
        Args:
            user_id: User's ID
            
        Returns:
            Default Avatar or None if no default set
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("user_id", user_id)
            .eq("is_default", True)
            .execute()
        )
        
        if not result.data:
            return None
        
        return Avatar.from_db_row(result.data[0])
    
    async def list(self, user_id: str) -> List[Avatar]:
        """
        List all avatars for a user.
        
        Args:
            user_id: User's ID
            
        Returns:
            List of Avatar objects ordered by created_at desc
        """
        result = (
            self.db.table(self.table_name)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return [Avatar.from_db_row(row) for row in (result.data or [])]
    
    async def update(
        self,
        user_id: str,
        avatar_id: str,
        **kwargs
    ) -> Avatar:
        """
        Update an avatar.
        
        Args:
            user_id: User's ID (for ownership check)
            avatar_id: Avatar UUID
            **kwargs: Fields to update
            
        Returns:
            Updated Avatar
            
        Raises:
            NotFoundError: If avatar doesn't exist
            AuthorizationError: If user doesn't own the avatar
        """
        # Verify ownership
        await self.get(user_id, avatar_id)
        
        # Build update data (only include non-None values)
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        
        allowed_fields = [
            "name", "is_default", "gender", "body_type", "skin_tone",
            "face_shape", "eye_color", "eye_style", "hair_color",
            "hair_style", "hair_texture", "default_expression",
            "art_style", "outfit_style", "glasses", "glasses_style",
            "headwear", "facial_hair"
        ]
        
        for field in allowed_fields:
            if field in kwargs and kwargs[field] is not None:
                update_data[field] = kwargs[field]
        
        result = (
            self.db.table(self.table_name)
            .update(update_data)
            .eq("id", avatar_id)
            .execute()
        )
        
        if not result.data:
            raise NotFoundError("Avatar", avatar_id)
        
        logger.info(f"Updated avatar: avatar_id={avatar_id}")
        return Avatar.from_db_row(result.data[0])
    
    async def delete(self, user_id: str, avatar_id: str) -> None:
        """
        Delete an avatar.
        
        Args:
            user_id: User's ID (for ownership check)
            avatar_id: Avatar UUID
            
        Raises:
            NotFoundError: If avatar doesn't exist
            AuthorizationError: If user doesn't own the avatar
        """
        # Verify ownership
        await self.get(user_id, avatar_id)
        
        self.db.table(self.table_name).delete().eq("id", avatar_id).execute()
        logger.info(f"Deleted avatar: avatar_id={avatar_id}")
    
    async def set_default(self, user_id: str, avatar_id: str) -> Avatar:
        """
        Set an avatar as the user's default.
        
        The database trigger will automatically unset any previous default.
        
        Args:
            user_id: User's ID
            avatar_id: Avatar UUID to set as default
            
        Returns:
            Updated Avatar
        """
        return await self.update(user_id, avatar_id, is_default=True)


# Singleton instance
_avatar_service: Optional[AvatarService] = None


def get_avatar_service() -> AvatarService:
    """Get or create the avatar service singleton."""
    global _avatar_service
    if _avatar_service is None:
        _avatar_service = AvatarService()
    return _avatar_service
