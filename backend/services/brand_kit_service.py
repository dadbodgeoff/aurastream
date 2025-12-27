"""
Brand Kit Service for Aurastream.

This service handles all brand kit operations including:
- Creating brand kits with validation
- Retrieving brand kits with ownership verification
- Listing user's brand kits
- Updating brand kits with partial updates
- Deleting brand kits
- Activating brand kits (one active per user)

Security Notes:
- All operations verify user ownership
- Maximum 10 brand kits per user enforced
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import (
    AuthorizationError,
    BrandKitNotFoundError,
    BrandKitLimitExceededError,
)


class BrandKitService:
    """
    Service for managing brand kits.
    
    All operations require authenticated user context.
    Enforces one active brand kit per user constraint.
    Enforces maximum 10 brand kits per user.
    """
    
    def __init__(self, supabase_client=None):
        """
        Initialize the brand kit service.
        
        Args:
            supabase_client: Supabase client instance (uses singleton if not provided)
        """
        self._supabase = supabase_client
        self.table = "brand_kits"
        self.max_brand_kits = 10
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    async def create(self, user_id: str, data) -> dict:
        """
        Create a new brand kit for the user.
        
        Args:
            user_id: Authenticated user's ID
            data: Validated brand kit creation data (BrandKitCreate)
            
        Returns:
            Created brand kit dictionary with generated ID
            
        Raises:
            BrandKitLimitExceededError: If user has 10+ brand kits
        """
        # Check limit
        current_count = await self.count(user_id)
        if current_count >= self.max_brand_kits:
            raise BrandKitLimitExceededError(current_count, self.max_brand_kits)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Build brand kit record
        brand_kit = {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": data.name,
            "is_active": False,
            "primary_colors": data.primary_colors,
            "accent_colors": data.accent_colors if data.accent_colors else [],
            "fonts": data.fonts.model_dump() if hasattr(data.fonts, 'model_dump') else data.fonts,
            "logo_url": data.logo_url,
            "tone": data.tone,
            "style_reference": data.style_reference if data.style_reference else "",
            "extracted_from": None,
            # Enhanced brand kit fields (Section 6)
            "colors_extended": {},
            "typography": {},
            "voice": {},
            "streamer_assets": {},
            "guidelines": {},
            "social_profiles": {},
            "logos": {},
            "created_at": now,
            "updated_at": now,
        }
        
        result = self.db.table(self.table).insert(brand_kit).execute()
        
        if not result.data:
            raise Exception("Failed to create brand kit")
        
        return result.data[0]
    
    async def get(self, user_id: str, brand_kit_id: str) -> dict:
        """
        Get a brand kit by ID.
        
        Args:
            user_id: Authenticated user's ID (for ownership check)
            brand_kit_id: Brand kit UUID
            
        Returns:
            Brand kit dictionary if found and owned by user
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        result = self.db.table(self.table).select("*").eq("id", brand_kit_id).execute()
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        brand_kit = result.data[0]
        
        # Verify ownership
        if brand_kit["user_id"] != user_id:
            raise AuthorizationError("brand_kit")
        
        return brand_kit
    
    async def list(self, user_id: str) -> List[dict]:
        """
        List all brand kits for a user.
        
        Args:
            user_id: Authenticated user's ID
            
        Returns:
            List of brand kit dictionaries ordered by created_at desc
        """
        result = (
            self.db.table(self.table)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return result.data or []
    
    async def update(self, user_id: str, brand_kit_id: str, data) -> dict:
        """
        Update an existing brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            data: Partial update data (BrandKitUpdate)
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        existing = await self.get(user_id, brand_kit_id)
        
        # Build update dict with only non-None fields
        update_data = {}
        
        if hasattr(data, 'name') and data.name is not None:
            update_data["name"] = data.name
        
        if hasattr(data, 'primary_colors') and data.primary_colors is not None:
            update_data["primary_colors"] = data.primary_colors
        
        if hasattr(data, 'accent_colors') and data.accent_colors is not None:
            update_data["accent_colors"] = data.accent_colors
        
        if hasattr(data, 'fonts') and data.fonts is not None:
            update_data["fonts"] = data.fonts.model_dump() if hasattr(data.fonts, 'model_dump') else data.fonts
        
        if hasattr(data, 'logo_url') and data.logo_url is not None:
            update_data["logo_url"] = data.logo_url
        
        if hasattr(data, 'tone') and data.tone is not None:
            update_data["tone"] = data.tone
        
        if hasattr(data, 'style_reference') and data.style_reference is not None:
            update_data["style_reference"] = data.style_reference
        
        # Always update the timestamp
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]
    
    async def delete(self, user_id: str, brand_kit_id: str) -> None:
        """
        Delete a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        # Delete the brand kit
        self.db.table(self.table).delete().eq("id", brand_kit_id).execute()
    
    async def activate(self, user_id: str, brand_kit_id: str) -> dict:
        """
        Set a brand kit as active (deactivates all others).
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID to activate
            
        Returns:
            Activated brand kit dictionary with is_active=True
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Deactivate ALL user's brand kits
        self.db.table(self.table).update({"is_active": False}).eq("user_id", user_id).execute()
        
        # Activate the target brand kit
        result = (
            self.db.table(self.table)
            .update({"is_active": True, "updated_at": now})
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]
    
    async def get_active(self, user_id: str) -> Optional[dict]:
        """
        Get the user's active brand kit.
        
        Args:
            user_id: Authenticated user's ID
            
        Returns:
            Active brand kit dictionary or None if no active kit
        """
        result = (
            self.db.table(self.table)
            .select("*")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        
        if not result.data:
            return None
        
        return result.data[0]
    
    async def count(self, user_id: str) -> int:
        """
        Return count of user's brand kits.
        
        Args:
            user_id: Authenticated user's ID
            
        Returns:
            Number of brand kits owned by the user
        """
        result = (
            self.db.table(self.table)
            .select("id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        
        return result.count if result.count is not None else 0

    # =========================================================================
    # Enhanced Brand Kit Field Update Methods (Section 6)
    # =========================================================================

    async def update_colors_extended(self, user_id: str, brand_kit_id: str, colors: dict) -> dict:
        """
        Update the extended colors JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            colors: Extended colors data dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "colors_extended": colors,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_typography(self, user_id: str, brand_kit_id: str, typography: dict) -> dict:
        """
        Update the typography JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            typography: Typography configuration dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "typography": typography,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_voice(self, user_id: str, brand_kit_id: str, voice: dict) -> dict:
        """
        Update the voice JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            voice: Voice/tone configuration dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "voice": voice,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_guidelines(self, user_id: str, brand_kit_id: str, guidelines: dict) -> dict:
        """
        Update the guidelines JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            guidelines: Brand guidelines dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "guidelines": guidelines,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_streamer_assets(self, user_id: str, brand_kit_id: str, streamer_assets: dict) -> dict:
        """
        Update the streamer assets JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            streamer_assets: Streamer-specific assets dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "streamer_assets": streamer_assets,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_social_profiles(self, user_id: str, brand_kit_id: str, social_profiles: dict) -> dict:
        """
        Update the social profiles JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            social_profiles: Social media profiles dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "social_profiles": social_profiles,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]

    async def update_logos_metadata(self, user_id: str, brand_kit_id: str, logos: dict) -> dict:
        """
        Update the logos metadata JSONB field for a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            logos: Logos metadata dictionary
            
        Returns:
            Updated brand kit dictionary
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        # Verify ownership first
        await self.get(user_id, brand_kit_id)
        
        update_data = {
            "logos": logos,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        result = (
            self.db.table(self.table)
            .update(update_data)
            .eq("id", brand_kit_id)
            .execute()
        )
        
        if not result.data:
            raise BrandKitNotFoundError(brand_kit_id)
        
        return result.data[0]


# Singleton instance for convenience
_brand_kit_service: Optional[BrandKitService] = None


def get_brand_kit_service() -> BrandKitService:
    """Get or create the brand kit service singleton."""
    global _brand_kit_service
    if _brand_kit_service is None:
        _brand_kit_service = BrandKitService()
    return _brand_kit_service
