"""
Generation Service for Aurastream.

This service handles all generation job and asset operations including:
- Creating and managing generation jobs
- Tracking job status with state machine validation
- Creating and managing generated assets
- Listing and filtering jobs and assets

Security Notes:
- All operations verify user ownership
- Job state transitions are validated
- Asset visibility can be controlled per asset
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from backend.database.supabase_client import get_supabase_client
from backend.services.exceptions import (
    AuthorizationError,
    JobNotFoundError,
    InvalidStateTransitionError,
    AssetNotFoundError,
)
from backend.services.prompt_engine import AssetType, get_prompt_engine
from backend.services.brand_kit_service import get_brand_kit_service
from backend.services.quick_create_service import get_quick_create_service


class JobStatus(str, Enum):
    """Status values for generation jobs."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


@dataclass
class GenerationJob:
    """
    Represents a generation job.
    
    Attributes:
        id: Unique job identifier (UUID)
        user_id: Owner's user ID
        brand_kit_id: Associated brand kit ID
        asset_type: Type of asset being generated
        status: Current job status
        prompt: The prompt used for generation
        progress: Progress percentage (0-100)
        error_message: Error message if job failed
        parameters: Additional job parameters (logo options, etc.)
        created_at: Job creation timestamp
        updated_at: Last update timestamp
        completed_at: Completion timestamp (if completed)
    """
    id: str
    user_id: str
    brand_kit_id: str
    asset_type: str
    status: JobStatus
    prompt: str
    progress: int
    error_message: Optional[str]
    parameters: Optional[dict]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]


@dataclass
class Asset:
    """
    Represents a generated asset.
    
    Attributes:
        id: Unique asset identifier (UUID)
        job_id: Associated generation job ID
        user_id: Owner's user ID
        asset_type: Type of asset
        url: Public URL to access the asset
        storage_path: Internal storage path
        width: Asset width in pixels
        height: Asset height in pixels
        file_size: File size in bytes
        is_public: Whether asset is publicly accessible
        viral_score: Optional viral potential score
        created_at: Asset creation timestamp
    """
    id: str
    job_id: str
    user_id: str
    asset_type: str
    url: str
    storage_path: str
    width: int
    height: int
    file_size: int
    is_public: bool
    viral_score: Optional[int]
    created_at: datetime


# Asset dimensions for different asset types
ASSET_DIMENSIONS = {
    "thumbnail": (1280, 720),
    "overlay": (1920, 1080),
    "banner": (1200, 480),
    "story_graphic": (1080, 1920),
    "clip_cover": (1080, 1080),
    # Twitch emotes
    "twitch_emote": (112, 112),      # Default emote size
    "twitch_emote_112": (112, 112),
    "twitch_emote_56": (56, 56),
    "twitch_emote_28": (28, 28),
    # TikTok emotes
    "tiktok_emote": (300, 300),      # Default TikTok emote size
    "tiktok_emote_300": (300, 300),
    "tiktok_emote_200": (200, 200),
    "tiktok_emote_100": (100, 100),
    # Other Twitch assets
    "twitch_badge": (72, 72),
    "twitch_panel": (320, 160),
    "twitch_offline": (1920, 1080),
}

# Valid state transitions for job state machine
VALID_TRANSITIONS = {
    JobStatus.QUEUED: [JobStatus.PROCESSING],
    JobStatus.PROCESSING: [JobStatus.COMPLETED, JobStatus.PARTIAL, JobStatus.FAILED],
    JobStatus.COMPLETED: [],
    JobStatus.PARTIAL: [],
    JobStatus.FAILED: [],
}


class GenerationService:
    """
    Service for managing generation jobs and assets.
    
    All operations require authenticated user context.
    Enforces job state machine transitions.
    """
    
    def __init__(self, supabase_client=None):
        """
        Initialize the generation service.
        
        Args:
            supabase_client: Supabase client instance (uses singleton if not provided)
        """
        self._supabase = supabase_client
        self.jobs_table = "generation_jobs"
        self.assets_table = "assets"
    
    @property
    def db(self):
        """Lazy-load Supabase client."""
        if self._supabase is None:
            self._supabase = get_supabase_client()
        return self._supabase
    
    def _dict_to_job(self, data: dict) -> GenerationJob:
        """Convert database dict to GenerationJob dataclass."""
        return GenerationJob(
            id=data["id"],
            user_id=data["user_id"],
            brand_kit_id=data["brand_kit_id"],
            asset_type=data["asset_type"],
            status=JobStatus(data["status"]),
            prompt=data["prompt"],
            progress=data["progress"],
            error_message=data.get("error_message"),
            parameters=data.get("parameters"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if isinstance(data["created_at"], str) else data["created_at"],
            updated_at=datetime.fromisoformat(data["updated_at"].replace("Z", "+00:00")) if isinstance(data["updated_at"], str) else data["updated_at"],
            completed_at=datetime.fromisoformat(data["completed_at"].replace("Z", "+00:00")) if data.get("completed_at") and isinstance(data["completed_at"], str) else data.get("completed_at"),
        )
    
    def _dict_to_asset(self, data: dict) -> Asset:
        """Convert database dict to Asset dataclass."""
        return Asset(
            id=data["id"],
            job_id=data["job_id"],
            user_id=data["user_id"],
            asset_type=data["asset_type"],
            url=data["url"],
            storage_path=data["storage_path"],
            width=data["width"],
            height=data["height"],
            file_size=data["file_size"],
            is_public=data["is_public"],
            viral_score=data.get("viral_score"),
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")) if isinstance(data["created_at"], str) else data["created_at"],
        )
    
    def _validate_state_transition(
        self, 
        current_status: JobStatus, 
        target_status: JobStatus
    ) -> None:
        """
        Validate that a state transition is allowed.
        
        Args:
            current_status: Current job status
            target_status: Target job status
            
        Raises:
            InvalidStateTransitionError: If transition is not allowed
        """
        # Allow same-state transitions for progress updates
        if current_status == target_status:
            return
            
        valid_targets = VALID_TRANSITIONS.get(current_status, [])
        if target_status not in valid_targets:
            raise InvalidStateTransitionError(
                current_status=current_status.value,
                target_status=target_status.value
            )
    
    async def create_job(
        self,
        user_id: str,
        brand_kit_id: Optional[str],
        asset_type: str,
        custom_prompt: Optional[str] = None,
        parameters: Optional[dict] = None,
    ) -> GenerationJob:
        """
        Create a new generation job.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit to use for generation (optional - uses AI defaults if None)
            asset_type: Type of asset to generate
            custom_prompt: Optional custom prompt addition
            parameters: Optional additional parameters (logo options, etc.)
            
        Returns:
            Created GenerationJob with generated ID
            
        Raises:
            BrandKitNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        brand_kit = None
        
        # Get brand kit if provided
        if brand_kit_id:
            brand_kit_service = get_brand_kit_service()
            brand_kit = await brand_kit_service.get(user_id, brand_kit_id)
        
        # Build prompt using prompt engine with full brand kit data
        prompt_engine = get_prompt_engine()
        quick_create_service = get_quick_create_service()
        
        # Extract brand customization from parameters if provided
        brand_customization = None
        if parameters:
            # Build brand_customization dict from parameters
            brand_customization = {
                "include_logo": parameters.get("include_logo", False),
                "logo_type": parameters.get("logo_type", "primary"),
                "logo_position": parameters.get("logo_position", "bottom-right"),
                "logo_size": parameters.get("logo_size", "medium"),
                "brand_intensity": parameters.get("brand_intensity", "balanced"),
            }
        
        # Check if this is a Quick Create template request
        # Format: __quick_create__:template_id:vibe_id | field:value | ...
        if custom_prompt and quick_create_service.is_quick_create_prompt(custom_prompt):
            # Build brand context block if brand kit provided
            brand_context = None
            if brand_kit:
                from backend.services.prompt_engine import BrandContextResolver
                context = BrandContextResolver.resolve(brand_kit, brand_customization)
                brand_context = prompt_engine.build_brand_context_prompt(context)
            
            # Build prompt from Quick Create template (proprietary prompts)
            prompt = quick_create_service.build_from_custom_prompt(
                custom_prompt=custom_prompt,
                brand_context=brand_context
            )
        else:
            # Standard prompt building flow
            # Use the enhanced prompt builder that handles all brand kit data
            # including colors_extended, typography, voice, etc.
            # If no brand kit, use AI defaults
            if brand_kit:
                prompt = prompt_engine.build_prompt_v2(
                    asset_type=AssetType(asset_type),
                    brand_kit=brand_kit,  # Pass full brand kit dict
                    customization=brand_customization,
                    custom_prompt=custom_prompt
                )
            else:
                # Build a simple prompt without brand kit constraints
                prompt = prompt_engine.build_prompt_no_brand(
                    asset_type=AssetType(asset_type),
                    custom_prompt=custom_prompt
                )
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Build job record
        job_data = {
            "id": str(uuid4()),
            "user_id": user_id,
            "brand_kit_id": brand_kit_id,
            "asset_type": asset_type,
            "status": JobStatus.QUEUED.value,
            "prompt": prompt,
            "progress": 0,
            "error_message": None,
            "parameters": parameters,
            "created_at": now,
            "updated_at": now,
            "completed_at": None,
        }
        
        result = self.db.table(self.jobs_table).insert(job_data).execute()
        
        if not result.data:
            raise Exception("Failed to create generation job")
        
        return self._dict_to_job(result.data[0])
    
    async def get_job(self, user_id: str, job_id: str) -> GenerationJob:
        """
        Get a generation job by ID.
        
        Args:
            user_id: Authenticated user's ID (for ownership check)
            job_id: Job UUID
            
        Returns:
            GenerationJob if found and owned by user
            
        Raises:
            JobNotFoundError: If job doesn't exist
            AuthorizationError: If user doesn't own the job
        """
        result = self.db.table(self.jobs_table).select("*").eq("id", job_id).execute()
        
        if not result.data:
            raise JobNotFoundError(job_id)
        
        job_data = result.data[0]
        
        # Verify ownership
        if job_data["user_id"] != user_id:
            raise AuthorizationError("generation_job")
        
        return self._dict_to_job(job_data)
    
    async def list_jobs(
        self,
        user_id: str,
        status: Optional[JobStatus] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[GenerationJob]:
        """
        List generation jobs for a user.
        
        Args:
            user_id: Authenticated user's ID
            status: Optional status filter
            limit: Maximum number of results (default: 20)
            offset: Number of results to skip (default: 0)
            
        Returns:
            List of GenerationJob objects ordered by created_at desc
        """
        query = (
            self.db.table(self.jobs_table)
            .select("*")
            .eq("user_id", user_id)
        )
        
        if status is not None:
            query = query.eq("status", status.value)
        
        result = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return [self._dict_to_job(data) for data in (result.data or [])]
    
    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = 0,
        error_message: Optional[str] = None
    ) -> GenerationJob:
        """
        Update a job's status with state machine validation.
        
        Args:
            job_id: Job UUID
            status: New status
            progress: Progress percentage (0-100)
            error_message: Optional error message (for failed status)
            
        Returns:
            Updated GenerationJob
            
        Raises:
            JobNotFoundError: If job doesn't exist
            InvalidStateTransitionError: If transition is not allowed
        """
        # Get current job state
        result = self.db.table(self.jobs_table).select("*").eq("id", job_id).execute()
        
        if not result.data:
            raise JobNotFoundError(job_id)
        
        current_job = result.data[0]
        current_status = JobStatus(current_job["status"])
        
        # Validate state transition
        self._validate_state_transition(current_status, status)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Build update data
        update_data = {
            "status": status.value,
            "progress": progress,
            "updated_at": now,
        }
        
        if error_message is not None:
            update_data["error_message"] = error_message
        
        # Set completed_at for terminal states
        if status in [JobStatus.COMPLETED, JobStatus.PARTIAL, JobStatus.FAILED]:
            update_data["completed_at"] = now
        
        result = (
            self.db.table(self.jobs_table)
            .update(update_data)
            .eq("id", job_id)
            .execute()
        )
        
        if not result.data:
            raise JobNotFoundError(job_id)
        
        return self._dict_to_job(result.data[0])
    
    async def get_job_assets(self, user_id: str, job_id: str) -> List[Asset]:
        """
        Get all assets for a specific job.
        
        Args:
            user_id: Authenticated user's ID (for ownership check)
            job_id: Job UUID
            
        Returns:
            List of Asset objects for the job
            
        Raises:
            JobNotFoundError: If job doesn't exist
            AuthorizationError: If user doesn't own the job
        """
        # Verify job ownership first
        await self.get_job(user_id, job_id)
        
        result = (
            self.db.table(self.assets_table)
            .select("*")
            .eq("job_id", job_id)
            .order("created_at", desc=True)
            .execute()
        )
        
        return [self._dict_to_asset(data) for data in (result.data or [])]
    
    async def create_asset(
        self,
        job_id: str,
        user_id: str,
        asset_type: str,
        url: str,
        storage_path: str,
        width: int,
        height: int,
        file_size: int,
        is_public: bool = False
    ) -> Asset:
        """
        Create a new asset record.
        
        Args:
            job_id: Associated generation job ID
            user_id: Owner's user ID
            asset_type: Type of asset
            url: Public URL to access the asset
            storage_path: Internal storage path
            width: Asset width in pixels
            height: Asset height in pixels
            file_size: File size in bytes
            is_public: Whether asset is publicly accessible
            
        Returns:
            Created Asset with generated ID
        """
        now = datetime.now(timezone.utc).isoformat()
        
        asset_data = {
            "id": str(uuid4()),
            "job_id": job_id,
            "user_id": user_id,
            "asset_type": asset_type,
            "url": url,
            "storage_path": storage_path,
            "width": width,
            "height": height,
            "file_size": file_size,
            "is_public": is_public,
            "viral_score": None,
            "created_at": now,
        }
        
        result = self.db.table(self.assets_table).insert(asset_data).execute()
        
        if not result.data:
            raise Exception("Failed to create asset")
        
        return self._dict_to_asset(result.data[0])
    
    async def get_asset(self, user_id: str, asset_id: str) -> Asset:
        """
        Get an asset by ID.
        
        Args:
            user_id: Authenticated user's ID (for ownership check)
            asset_id: Asset UUID
            
        Returns:
            Asset if found and owned by user
            
        Raises:
            AssetNotFoundError: If asset doesn't exist
            AuthorizationError: If user doesn't own the asset
        """
        result = self.db.table(self.assets_table).select("*").eq("id", asset_id).execute()
        
        if not result.data:
            raise AssetNotFoundError(asset_id)
        
        asset_data = result.data[0]
        
        # Verify ownership
        if asset_data["user_id"] != user_id:
            raise AuthorizationError("asset")
        
        return self._dict_to_asset(asset_data)
    
    async def list_assets(
        self,
        user_id: str,
        asset_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[Asset]:
        """
        List assets for a user.
        
        Args:
            user_id: Authenticated user's ID
            asset_type: Optional asset type filter
            limit: Maximum number of results (default: 20)
            offset: Number of results to skip (default: 0)
            
        Returns:
            List of Asset objects ordered by created_at desc
        """
        query = (
            self.db.table(self.assets_table)
            .select("*")
            .eq("user_id", user_id)
        )
        
        if asset_type is not None:
            query = query.eq("asset_type", asset_type)
        
        result = (
            query
            .order("created_at", desc=True)
            .range(offset, offset + limit - 1)
            .execute()
        )
        
        return [self._dict_to_asset(data) for data in (result.data or [])]
    
    async def delete_asset(self, user_id: str, asset_id: str) -> None:
        """
        Delete an asset.
        
        Args:
            user_id: Authenticated user's ID
            asset_id: Asset UUID
            
        Raises:
            AssetNotFoundError: If asset doesn't exist
            AuthorizationError: If user doesn't own the asset
        """
        # Verify ownership first
        await self.get_asset(user_id, asset_id)
        
        # Delete the asset
        self.db.table(self.assets_table).delete().eq("id", asset_id).execute()
    
    async def update_asset_visibility(
        self,
        user_id: str,
        asset_id: str,
        is_public: bool
    ) -> Asset:
        """
        Update an asset's visibility.
        
        Args:
            user_id: Authenticated user's ID
            asset_id: Asset UUID
            is_public: New visibility setting
            
        Returns:
            Updated Asset
            
        Raises:
            AssetNotFoundError: If asset doesn't exist
            AuthorizationError: If user doesn't own the asset
        """
        # Verify ownership first
        await self.get_asset(user_id, asset_id)
        
        result = (
            self.db.table(self.assets_table)
            .update({"is_public": is_public})
            .eq("id", asset_id)
            .execute()
        )
        
        if not result.data:
            raise AssetNotFoundError(asset_id)
        
        return self._dict_to_asset(result.data[0])


# Singleton instance for convenience
_generation_service: Optional[GenerationService] = None


def get_generation_service() -> GenerationService:
    """Get or create the generation service singleton."""
    global _generation_service
    if _generation_service is None:
        _generation_service = GenerationService()
    return _generation_service
