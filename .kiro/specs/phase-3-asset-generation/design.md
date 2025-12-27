# Phase 3: Asset Generation Core — Design Document

## Overview

This design document provides the architectural blueprint for the asset generation system. All implementations MUST conform to the patterns defined in the master schema.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/design.md`

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Next.js Web   │  React Native   │           SwiftUI iOS                   │
│   GeneratePage  │  GenerateScreen │           GenerateView                  │
└────────┬────────┴────────┬────────┴──────────────────┬──────────────────────┘
         │                 │                           │
         └─────────────────┼───────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/v1/generate, /api/v1/jobs/*                   │   │
│  │  POST /generate  │  GET /jobs/{id}  │  GET /jobs/{id}/assets         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       GenerationService                               │   │
│  │  create_job() │ get_job() │ update_status() │ get_assets()           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       PromptEngine                                    │   │
│  │  load_template() │ inject_brand_kit() │ sanitize() │ build_prompt()  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│     REDIS       │   │   NANO BANANA   │   │    SUPABASE     │
│   (Job Queue)   │   │   (AI Service)  │   │   (Storage)     │
│                 │   │                 │   │                 │
│  - generation   │   │  - /generate    │   │  - assets/      │
│    queue        │   │  - /status      │   │  - uploads/     │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENERATION WORKER                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  process_job() → build_prompt() → call_api() → upload() → complete() │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Interfaces

### PromptEngine Interface

```python
from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum

class AssetType(str, Enum):
    THUMBNAIL = "thumbnail"
    OVERLAY = "overlay"
    BANNER = "banner"
    STORY_GRAPHIC = "story_graphic"
    CLIP_COVER = "clip_cover"

@dataclass
class PromptTemplate:
    """Loaded prompt template."""
    name: str
    version: str
    base_prompt: str
    quality_modifiers: list[str]
    placeholders: list[str]

@dataclass
class BrandKitContext:
    """Brand kit values for prompt injection."""
    primary_colors: list[str]
    accent_colors: list[str]
    headline_font: str
    body_font: str
    tone: str
    style_reference: Optional[str] = None

class PromptEngine:
    """
    Engine for building AI prompts from templates and brand kits.
    """
    
    def load_template(self, asset_type: AssetType, version: str = "v1.0") -> PromptTemplate:
        """
        Load a prompt template from the prompts directory.
        
        Args:
            asset_type: Type of asset to generate
            version: Template version (default v1.0)
            
        Returns:
            Loaded PromptTemplate
            
        Raises:
            TemplateNotFoundError: If template doesn't exist
        """
        pass
    
    def inject_brand_kit(
        self, 
        template: PromptTemplate, 
        brand_kit: BrandKitContext
    ) -> str:
        """
        Inject brand kit values into template placeholders.
        
        Args:
            template: Loaded prompt template
            brand_kit: Brand kit context with colors, fonts, tone
            
        Returns:
            Prompt string with placeholders replaced
        """
        pass
    
    def sanitize_input(self, user_input: str) -> str:
        """
        Sanitize user input to prevent prompt injection.
        
        Args:
            user_input: Raw user input
            
        Returns:
            Sanitized input string
        """
        pass
    
    def build_prompt(
        self,
        asset_type: AssetType,
        brand_kit: BrandKitContext,
        custom_prompt: Optional[str] = None,
        version: str = "v1.0"
    ) -> str:
        """
        Build complete prompt for generation.
        
        Args:
            asset_type: Type of asset to generate
            brand_kit: Brand kit context
            custom_prompt: Optional user custom prompt
            version: Template version
            
        Returns:
            Complete prompt string ready for AI
        """
        pass
```

### NanoBananaClient Interface

```python
from dataclasses import dataclass
from typing import Optional
import aiohttp

@dataclass
class GenerationRequest:
    """Request to Nano Banana API."""
    prompt: str
    width: int
    height: int
    model: str = "default"
    seed: Optional[int] = None

@dataclass
class GenerationResponse:
    """Response from Nano Banana API."""
    image_url: str
    generation_id: str
    seed: int
    inference_time_ms: int

class NanoBananaClient:
    """
    Async client for Nano Banana AI generation API.
    """
    
    def __init__(
        self, 
        api_key: str,
        base_url: str = "https://api.nanobanana.ai",
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.base_url = base_url
        self.timeout = timeout
        self.max_retries = max_retries
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """
        Generate an image using Nano Banana API.
        
        Args:
            request: Generation request with prompt and dimensions
            
        Returns:
            GenerationResponse with image URL
            
        Raises:
            RateLimitError: If rate limited (429)
            ContentPolicyError: If content violates policy
            GenerationTimeoutError: If request times out
            GenerationError: For other API errors
        """
        pass
    
    async def _request_with_retry(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> dict:
        """
        Make HTTP request with exponential backoff retry.
        
        Retry delays: 1s, 2s, 4s (max 3 retries)
        """
        pass
```

### GenerationService Interface

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from enum import Enum

class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"

@dataclass
class GenerationJob:
    """Generation job entity."""
    id: str
    user_id: str
    brand_kit_id: str
    asset_type: AssetType
    status: JobStatus
    prompt: str
    progress: int  # 0-100
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

@dataclass
class Asset:
    """Generated asset entity."""
    id: str
    job_id: str
    user_id: str
    asset_type: AssetType
    url: str
    width: int
    height: int
    file_size: int
    is_public: bool
    viral_score: Optional[int]
    created_at: datetime

class GenerationService:
    """
    Service for managing generation jobs and assets.
    """
    
    async def create_job(
        self,
        user_id: str,
        brand_kit_id: str,
        asset_type: AssetType,
        custom_prompt: Optional[str] = None
    ) -> GenerationJob:
        """
        Create a new generation job and enqueue it.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit to use for generation
            asset_type: Type of asset to generate
            custom_prompt: Optional custom prompt from user
            
        Returns:
            Created GenerationJob with status=queued
        """
        pass
    
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
        pass
    
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
            limit: Max results (default 20)
            offset: Pagination offset
            
        Returns:
            List of GenerationJobs ordered by created_at desc
        """
        pass
    
    async def update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = 0,
        error_message: Optional[str] = None
    ) -> GenerationJob:
        """
        Update job status (called by worker).
        
        Args:
            job_id: Job UUID
            status: New status
            progress: Progress percentage (0-100)
            error_message: Error message if failed
            
        Returns:
            Updated GenerationJob
        """
        pass
    
    async def get_job_assets(self, user_id: str, job_id: str) -> List[Asset]:
        """
        Get assets generated by a job.
        
        Args:
            user_id: Authenticated user's ID
            job_id: Job UUID
            
        Returns:
            List of Assets for the job
        """
        pass
```

### StorageService Interface

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class UploadResult:
    """Result of file upload."""
    url: str
    path: str
    file_size: int

class StorageService:
    """
    Service for managing asset storage in Supabase.
    """
    
    async def upload_asset(
        self,
        user_id: str,
        job_id: str,
        image_data: bytes,
        content_type: str = "image/png"
    ) -> UploadResult:
        """
        Upload generated asset to storage.
        
        Args:
            user_id: Owner user ID
            job_id: Associated job ID
            image_data: Raw image bytes
            content_type: MIME type
            
        Returns:
            UploadResult with public URL
        """
        pass
    
    async def delete_asset(self, path: str) -> None:
        """
        Delete asset from storage.
        
        Args:
            path: Storage path of asset
        """
        pass
    
    async def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """
        Generate signed URL for private asset.
        
        Args:
            path: Storage path
            expires_in: Expiration in seconds (default 1 hour)
            
        Returns:
            Signed URL string
        """
        pass
    
    async def set_visibility(self, path: str, is_public: bool) -> str:
        """
        Set asset visibility.
        
        Args:
            path: Storage path
            is_public: Whether asset should be public
            
        Returns:
            New URL (public or signed)
        """
        pass
```

---

## Pydantic Schemas

### Request Schemas

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal

AssetTypeEnum = Literal["thumbnail", "overlay", "banner", "story_graphic", "clip_cover"]

class GenerateRequest(BaseModel):
    """Request body for asset generation."""
    asset_type: AssetTypeEnum = Field(..., description="Type of asset to generate")
    brand_kit_id: str = Field(..., description="Brand kit UUID to use")
    custom_prompt: Optional[str] = Field(
        None, 
        max_length=500, 
        description="Optional custom prompt"
    )
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "asset_type": "thumbnail",
                "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
                "custom_prompt": "Epic gaming moment with explosions"
            }]
        }
    }

class AssetVisibilityUpdate(BaseModel):
    """Request body for visibility toggle."""
    is_public: bool = Field(..., description="Whether asset should be public")
```

### Response Schemas

```python
from datetime import datetime
from typing import Optional, List

class JobResponse(BaseModel):
    """Generation job in API responses."""
    id: str
    user_id: str
    brand_kit_id: str
    asset_type: AssetTypeEnum
    status: Literal["queued", "processing", "completed", "failed", "partial"]
    progress: int = Field(..., ge=0, le=100)
    error_message: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

class AssetResponse(BaseModel):
    """Asset in API responses."""
    id: str
    job_id: str
    user_id: str
    asset_type: AssetTypeEnum
    url: str
    width: int
    height: int
    file_size: int
    is_public: bool
    viral_score: Optional[int]
    created_at: datetime

class JobWithAssetsResponse(JobResponse):
    """Job response including generated assets."""
    assets: List[AssetResponse] = []

class JobListResponse(BaseModel):
    """Paginated job list response."""
    jobs: List[JobResponse]
    total: int
    limit: int
    offset: int

class AssetListResponse(BaseModel):
    """Paginated asset list response."""
    assets: List[AssetResponse]
    total: int
    limit: int
    offset: int
```

---

## Job State Machine

```
                    ┌─────────┐
                    │ QUEUED  │
                    └────┬────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ PROCESSING  │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
      ┌─────────┐    ┌─────────┐    ┌─────────┐
      │COMPLETED│    │ PARTIAL │    │ FAILED  │
      └─────────┘    └─────────┘    └─────────┘

Valid Transitions:
- queued → processing
- processing → completed
- processing → partial (for batch jobs)
- processing → failed
```

---

## Asset Dimensions

```python
ASSET_DIMENSIONS = {
    "thumbnail": (1280, 720),
    "overlay": (1920, 1080),
    "banner": (1200, 480),
    "story_graphic": (1080, 1920),
    "clip_cover": (1080, 1080),
}
```

---

## Prompt Template Format (YAML)

```yaml
# prompts/thumbnail/v1.0.yaml
name: thumbnail
version: "1.0"
base_prompt: |
  Create a YouTube thumbnail with {tone} style.
  Use colors: {primary_colors}.
  Typography style: {headline_font} for headlines.
  {custom_prompt}
quality_modifiers:
  - "high quality"
  - "professional"
  - "eye-catching"
  - "4K resolution"
placeholders:
  - tone
  - primary_colors
  - headline_font
  - custom_prompt
```

---

## Correctness Properties

### Property 7: Asset Dimensions Match Type

```python
from hypothesis import given, strategies as st

@given(asset_type=st.sampled_from(list(AssetType)))
def test_asset_dimensions_match_type(asset_type):
    """Generated assets have correct dimensions for their type."""
    expected = ASSET_DIMENSIONS[asset_type.value]
    # Simulate generation
    asset = generate_asset(asset_type)
    assert (asset.width, asset.height) == expected
```

### Property 8: Prompt Contains Brand Kit Values

```python
@given(brand_kit=brand_kit_strategy())
def test_prompt_contains_brand_kit(brand_kit):
    """Built prompts contain brand kit values."""
    prompt = prompt_engine.build_prompt(
        asset_type=AssetType.THUMBNAIL,
        brand_kit=brand_kit
    )
    # At least one primary color should be in prompt
    assert any(color in prompt for color in brand_kit.primary_colors)
    # Tone should be in prompt
    assert brand_kit.tone in prompt
```

### Property 9: Job State Machine Validity

```python
VALID_TRANSITIONS = {
    JobStatus.QUEUED: {JobStatus.PROCESSING},
    JobStatus.PROCESSING: {JobStatus.COMPLETED, JobStatus.PARTIAL, JobStatus.FAILED},
    JobStatus.COMPLETED: set(),
    JobStatus.PARTIAL: set(),
    JobStatus.FAILED: set(),
}

@given(
    current=st.sampled_from(list(JobStatus)),
    target=st.sampled_from(list(JobStatus))
)
def test_job_state_transitions(current, target):
    """Only valid state transitions are allowed."""
    is_valid = target in VALID_TRANSITIONS[current]
    if is_valid:
        # Transition should succeed
        job = create_job_with_status(current)
        updated = update_job_status(job.id, target)
        assert updated.status == target
    else:
        # Transition should fail
        job = create_job_with_status(current)
        with pytest.raises(InvalidStateTransitionError):
            update_job_status(job.id, target)
```

### Property 13: Retry Count Limit

```python
@given(failure_count=st.integers(min_value=0, max_value=10))
def test_retry_count_limit(failure_count):
    """API client retries at most 3 times."""
    client = NanoBananaClient(api_key="test", max_retries=3)
    # Mock API to fail N times
    mock_api_failures(failure_count)
    
    if failure_count <= 3:
        # Should eventually succeed or fail after retries
        try:
            result = client.generate(request)
            assert mock_api_call_count() <= 4  # 1 initial + 3 retries
        except GenerationError:
            assert mock_api_call_count() == 4
    else:
        # Should fail after max retries
        with pytest.raises(GenerationError):
            client.generate(request)
        assert mock_api_call_count() == 4
```

---

## Frontend Patterns

### TSX Hooks

```typescript
// packages/api-client/src/hooks/useGeneration.ts

export function useGenerateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: GenerateRequest) => apiClient.generation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => apiClient.generation.getJob(jobId),
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Poll while processing
      if (data?.status === 'queued' || data?.status === 'processing') {
        return 2000; // 2 seconds
      }
      return false;
    },
  });
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiClient.generation.listJobs(filters),
  });
}

export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: ['assets', filters],
    queryFn: () => apiClient.assets.list(filters),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.assets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
```

### TSX Components

```typescript
// GenerationProgress component states
interface GenerationProgressProps {
  job: Job;
}

function GenerationProgress({ job }: GenerationProgressProps) {
  return (
    <div className="generation-progress">
      <div className="progress-bar" style={{ width: `${job.progress}%` }} />
      <span className="status">{job.status}</span>
      {job.status === 'failed' && (
        <span className="error">{job.error_message}</span>
      )}
    </div>
  );
}
```

---

## File Structure

### Backend Files to Create

```
backend/
├── api/
│   ├── routes/
│   │   ├── generation.py      # Generation endpoints
│   │   └── assets.py          # Asset endpoints
│   └── schemas/
│       ├── generation.py      # Generation schemas
│       └── asset.py           # Asset schemas
├── services/
│   ├── generation_service.py  # Job management
│   ├── prompt_engine.py       # Prompt building
│   ├── nano_banana_client.py  # AI API client
│   └── storage_service.py     # Supabase storage
├── workers/
│   └── generation_worker.py   # Redis queue worker
├── prompts/
│   ├── thumbnail/
│   │   └── v1.0.yaml
│   ├── overlay/
│   │   └── v1.0.yaml
│   ├── banner/
│   │   └── v1.0.yaml
│   ├── story_graphic/
│   │   └── v1.0.yaml
│   └── clip_cover/
│       └── v1.0.yaml
└── tests/
    ├── properties/
    │   └── test_generation_properties.py
    ├── unit/
    │   ├── test_generation_endpoints.py
    │   └── test_asset_endpoints.py
    └── integration/
        └── test_generation_flow.py
```

### TSX Files to Create

```
tsx/
├── packages/
│   ├── api-client/
│   │   └── src/
│   │       ├── types/
│   │       │   ├── generation.ts
│   │       │   └── asset.ts
│   │       └── hooks/
│   │           ├── useGeneration.ts
│   │           └── useAssets.ts
│   └── shared/
│       └── src/
│           └── stores/
│               └── generationStore.ts
└── apps/
    ├── web/
    │   └── src/
    │       └── app/
    │           └── (dashboard)/
    │               ├── generate/
    │               │   └── page.tsx
    │               └── assets/
    │                   ├── page.tsx
    │                   └── [id]/
    │                       └── page.tsx
    └── mobile/
        └── src/
            └── app/
                └── (tabs)/
                    ├── generate/
                    │   └── index.tsx
                    └── assets/
                        └── index.tsx
```

### Swift Files to Create

```
swift/
└── Sources/
    └── StreamerStudio/
        └── Features/
            └── Generation/
                ├── GenerationModels.swift
                ├── GenerationViewModel.swift
                ├── GenerateView.swift
                ├── JobProgressView.swift
                └── AssetGalleryView.swift
```
