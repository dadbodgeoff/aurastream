"""
Aurastream - Supabase Database Client

Provides singleton Supabase client for database operations.
Uses service role key for server-side operations with full access.
"""

import logging
from functools import lru_cache
from typing import Optional

from supabase import create_client, Client

from backend.api.config import get_settings

# Configure module logger
logger = logging.getLogger(__name__)


class SupabaseConnectionError(Exception):
    """Raised when unable to connect to Supabase."""
    pass


class SupabaseConfigurationError(Exception):
    """Raised when Supabase credentials are not properly configured."""
    pass


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get the Supabase client singleton.
    
    Uses service role key for full database access.
    The client is cached for reuse across the application.
    
    Returns:
        Client: Supabase client instance
        
    Raises:
        SupabaseConfigurationError: If Supabase credentials are not configured
        SupabaseConnectionError: If unable to establish connection
        
    Example:
        ```python
        from database.supabase_client import get_supabase_client
        
        client = get_supabase_client()
        response = client.table("users").select("*").execute()
        ```
    """
    settings = get_settings()
    
    # Validate required credentials
    if not settings.SUPABASE_URL:
        raise SupabaseConfigurationError(
            "SUPABASE_URL is not configured. "
            "Set SUPABASE_URL in your environment variables or .env file."
        )
    
    if not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseConfigurationError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured. "
            "Set SUPABASE_SERVICE_ROLE_KEY in your environment variables or .env file."
        )
    
    try:
        # Create client with service role key for full database access
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )
        
        logger.info("Supabase client initialized successfully")
        return client
        
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        raise SupabaseConnectionError(
            f"Unable to connect to Supabase: {e}. "
            "Please verify your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are correct."
        ) from e


def get_anon_client() -> Client:
    """
    Get a Supabase client using the anonymous key.
    
    Use this for operations that should respect Row Level Security (RLS).
    This client has limited access based on RLS policies.
    
    Returns:
        Client: Supabase client with anonymous key
        
    Raises:
        SupabaseConfigurationError: If credentials are not configured
    """
    settings = get_settings()
    
    if not settings.SUPABASE_URL:
        raise SupabaseConfigurationError(
            "SUPABASE_URL is not configured."
        )
    
    if not settings.SUPABASE_ANON_KEY:
        raise SupabaseConfigurationError(
            "SUPABASE_ANON_KEY is not configured."
        )
    
    try:
        return create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY
        )
    except Exception as e:
        logger.error(f"Failed to create anonymous Supabase client: {e}")
        raise SupabaseConnectionError(
            f"Unable to connect to Supabase with anonymous key: {e}"
        ) from e


# Convenience alias for getting the service role client
supabase = get_supabase_client


class SupabaseService:
    """
    Service class for common Supabase operations.
    
    Provides typed methods for database operations with error handling.
    This class wraps the Supabase client and provides convenient methods
    for common database operations used throughout the application.
    
    Example:
        ```python
        from database.supabase_client import SupabaseService
        
        service = SupabaseService()
        user = await service.get_user_by_id("user-uuid")
        ```
    """
    
    def __init__(self, client: Optional[Client] = None):
        """
        Initialize the Supabase service.
        
        Args:
            client: Optional Supabase client. If not provided, uses the singleton.
        """
        self._client = client or get_supabase_client()
    
    @property
    def client(self) -> Client:
        """Get the underlying Supabase client."""
        return self._client
    
    # =========================================================================
    # User Operations
    # =========================================================================
    
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        Get user by ID.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            User data dict or None if not found
        """
        try:
            response = (
                self._client.table("users")
                .select("*")
                .eq("id", user_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by ID {user_id}: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """
        Get user by email address.
        
        Args:
            email: The user's email address
            
        Returns:
            User data dict or None if not found
        """
        try:
            response = (
                self._client.table("users")
                .select("*")
                .eq("email", email)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user by email {email}: {e}")
            return None
    
    async def create_user(self, user_data: dict) -> Optional[dict]:
        """
        Create a new user.
        
        Args:
            user_data: Dictionary containing user fields
            
        Returns:
            Created user data or None on failure
        """
        try:
            response = self._client.table("users").insert(user_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def update_user(self, user_id: str, update_data: dict) -> Optional[dict]:
        """
        Update user data.
        
        Args:
            user_id: The user's UUID
            update_data: Dictionary of fields to update
            
        Returns:
            Updated user data or None on failure
        """
        try:
            response = (
                self._client.table("users")
                .update(update_data)
                .eq("id", user_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}")
            raise
    
    # =========================================================================
    # Brand Kit Operations
    # =========================================================================
    
    async def get_brand_kits_by_user(self, user_id: str) -> list[dict]:
        """
        Get all brand kits for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            List of brand kit dictionaries
        """
        try:
            response = (
                self._client.table("brand_kits")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching brand kits for user {user_id}: {e}")
            return []
    
    async def get_active_brand_kit(self, user_id: str) -> Optional[dict]:
        """
        Get the active brand kit for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Active brand kit dict or None if not found
        """
        try:
            response = (
                self._client.table("brand_kits")
                .select("*")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching active brand kit for user {user_id}: {e}")
            return None
    
    async def create_brand_kit(self, brand_kit_data: dict) -> Optional[dict]:
        """
        Create a new brand kit.
        
        Args:
            brand_kit_data: Dictionary containing brand kit fields
            
        Returns:
            Created brand kit data or None on failure
        """
        try:
            response = self._client.table("brand_kits").insert(brand_kit_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating brand kit: {e}")
            raise
    
    async def update_brand_kit(self, brand_kit_id: str, update_data: dict) -> Optional[dict]:
        """
        Update a brand kit.
        
        Args:
            brand_kit_id: The brand kit's UUID
            update_data: Dictionary of fields to update
            
        Returns:
            Updated brand kit data or None on failure
        """
        try:
            response = (
                self._client.table("brand_kits")
                .update(update_data)
                .eq("id", brand_kit_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating brand kit {brand_kit_id}: {e}")
            raise
    
    async def set_active_brand_kit(self, user_id: str, brand_kit_id: str) -> bool:
        """
        Set a brand kit as active and deactivate others.
        
        Args:
            user_id: The user's UUID
            brand_kit_id: The brand kit to activate
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Deactivate all brand kits for user
            self._client.table("brand_kits").update(
                {"is_active": False}
            ).eq("user_id", user_id).execute()
            
            # Activate the specified brand kit
            self._client.table("brand_kits").update(
                {"is_active": True}
            ).eq("id", brand_kit_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Error setting active brand kit: {e}")
            return False
    
    # =========================================================================
    # Generation Job Operations
    # =========================================================================
    
    async def create_generation_job(self, job_data: dict) -> Optional[dict]:
        """
        Create a new generation job.
        
        Args:
            job_data: Dictionary containing job fields
            
        Returns:
            Created job data or None on failure
        """
        try:
            response = self._client.table("generation_jobs").insert(job_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating generation job: {e}")
            raise
    
    async def get_job_by_id(self, job_id: str) -> Optional[dict]:
        """
        Get a generation job by ID.
        
        Args:
            job_id: The job's UUID
            
        Returns:
            Job data dict or None if not found
        """
        try:
            response = (
                self._client.table("generation_jobs")
                .select("*")
                .eq("id", job_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching job {job_id}: {e}")
            return None
    
    async def update_job_status(
        self, 
        job_id: str, 
        status: str, 
        **kwargs
    ) -> Optional[dict]:
        """
        Update generation job status.
        
        Args:
            job_id: The job's UUID
            status: New status (pending, processing, completed, failed)
            **kwargs: Additional fields to update (e.g., error_message, result_url)
            
        Returns:
            Updated job data or None on failure
        """
        try:
            update_data = {"status": status, **kwargs}
            response = (
                self._client.table("generation_jobs")
                .update(update_data)
                .eq("id", job_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating job status for {job_id}: {e}")
            raise
    
    async def get_jobs_by_user(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        limit: int = 50, 
        offset: int = 0
    ) -> list[dict]:
        """
        Get generation jobs for a user with optional filtering.
        
        Args:
            user_id: The user's UUID
            status: Optional status filter
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of job dictionaries
        """
        try:
            query = (
                self._client.table("generation_jobs")
                .select("*")
                .eq("user_id", user_id)
            )
            
            if status:
                query = query.eq("status", status)
            
            response = (
                query
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching jobs for user {user_id}: {e}")
            return []
    
    # =========================================================================
    # Asset Operations
    # =========================================================================
    
    async def create_asset(self, asset_data: dict) -> Optional[dict]:
        """
        Create a new asset record.
        
        Args:
            asset_data: Dictionary containing asset fields
            
        Returns:
            Created asset data or None on failure
        """
        try:
            response = self._client.table("assets").insert(asset_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating asset: {e}")
            raise
    
    async def get_asset_by_id(self, asset_id: str) -> Optional[dict]:
        """
        Get an asset by ID.
        
        Args:
            asset_id: The asset's UUID
            
        Returns:
            Asset data dict or None if not found
        """
        try:
            response = (
                self._client.table("assets")
                .select("*")
                .eq("id", asset_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching asset {asset_id}: {e}")
            return None
    
    async def get_assets_by_user(
        self, 
        user_id: str, 
        asset_type: Optional[str] = None,
        limit: int = 50, 
        offset: int = 0
    ) -> list[dict]:
        """
        Get assets for a user with pagination.
        
        Args:
            user_id: The user's UUID
            asset_type: Optional filter by asset type (thumbnail, overlay, etc.)
            limit: Maximum number of results
            offset: Number of results to skip
            
        Returns:
            List of asset dictionaries
        """
        try:
            query = (
                self._client.table("assets")
                .select("*")
                .eq("user_id", user_id)
            )
            
            if asset_type:
                query = query.eq("asset_type", asset_type)
            
            response = (
                query
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return response.data or []
        except Exception as e:
            logger.error(f"Error fetching assets for user {user_id}: {e}")
            return []
    
    async def delete_asset(self, asset_id: str) -> bool:
        """
        Delete an asset.
        
        Args:
            asset_id: The asset's UUID
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            self._client.table("assets").delete().eq("id", asset_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting asset {asset_id}: {e}")
            return False
    
    # =========================================================================
    # Subscription Operations
    # =========================================================================
    
    async def get_subscription(self, user_id: str) -> Optional[dict]:
        """
        Get subscription for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Subscription data dict or None if not found
        """
        try:
            response = (
                self._client.table("subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching subscription for user {user_id}: {e}")
            return None
    
    async def create_subscription(self, subscription_data: dict) -> Optional[dict]:
        """
        Create a new subscription.
        
        Args:
            subscription_data: Dictionary containing subscription fields
            
        Returns:
            Created subscription data or None on failure
        """
        try:
            response = self._client.table("subscriptions").insert(subscription_data).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            raise
    
    async def update_subscription(
        self, 
        user_id: str, 
        update_data: dict
    ) -> Optional[dict]:
        """
        Update a user's subscription.
        
        Args:
            user_id: The user's UUID
            update_data: Dictionary of fields to update
            
        Returns:
            Updated subscription data or None on failure
        """
        try:
            response = (
                self._client.table("subscriptions")
                .update(update_data)
                .eq("user_id", user_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating subscription for user {user_id}: {e}")
            raise
    
    # =========================================================================
    # Usage Tracking Operations
    # =========================================================================
    
    async def increment_usage(self, user_id: str) -> bool:
        """
        Increment monthly asset usage for a user.
        
        Uses an RPC function for atomic increment to prevent race conditions.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self._client.rpc(
                "increment_user_usage",
                {"p_user_id": user_id}
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error incrementing usage for user {user_id}: {e}")
            return False
    
    async def get_usage_stats(self, user_id: str) -> Optional[dict]:
        """
        Get usage statistics for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            Usage stats dict or None if not found
        """
        try:
            response = (
                self._client.table("usage_stats")
                .select("*")
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching usage stats for user {user_id}: {e}")
            return None
    
    async def reset_monthly_usage(self, user_id: str) -> bool:
        """
        Reset monthly usage counter for a user.
        
        Args:
            user_id: The user's UUID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self._client.rpc(
                "reset_monthly_usage",
                {"p_user_id": user_id}
            ).execute()
            return True
        except Exception as e:
            logger.error(f"Error resetting usage for user {user_id}: {e}")
            return False


# Create a default service instance for convenience
def get_supabase_service() -> SupabaseService:
    """
    Get a SupabaseService instance.
    
    Returns:
        SupabaseService: Service instance with the singleton client
    """
    return SupabaseService()
