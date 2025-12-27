# Phase 2: Brand Kit Management — Design Document

## Overview

This design document provides the architectural blueprint, implementation patterns, and correctness properties for the Brand Kit system. All implementations MUST conform to the patterns defined in the master schema.

**Master Schema Reference:** `.kiro/specs/streamer-studio-master-schema/design.md`

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────┬─────────────────┬─────────────────────────────────────────┤
│   Next.js Web   │  React Native   │           SwiftUI iOS                   │
│   BrandKitPage  │  BrandKitScreen │           BrandKitView                  │
└────────┬────────┴────────┬────────┴──────────────────┬──────────────────────┘
         │                 │                           │
         └─────────────────┼───────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FASTAPI APPLICATION                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/v1/brand-kits/*                               │   │
│  │  GET /  │  POST /  │  GET /{id}  │  PUT /{id}  │  DELETE /{id}       │   │
│  │  POST /{id}/activate  │  POST /analyze                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       BrandKitService                                 │   │
│  │  create() │ get() │ list() │ update() │ delete() │ activate()        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                 │                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    BrandKitExtractionService                          │   │
│  │  analyze_uploads() │ extract_colors() │ detect_fonts() │ infer_tone()│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│    SUPABASE     │   │   VISION AI     │   │   S3 / BLOB     │
│   (PostgreSQL)  │   │  (Color/Font    │   │   (Logos)       │
│                 │   │   Extraction)   │   │                 │
│  - brand_kits   │   │                 │   │  - logos/       │
│                 │   │                 │   │  - uploads/     │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Service Interfaces

### BrandKitService Interface

```python
class BrandKitService:
    """
    Service for managing brand kits.
    
    All operations require authenticated user context.
    Enforces one active brand kit per user constraint.
    """
    
    async def create(self, user_id: str, data: BrandKitCreate) -> BrandKit:
        """
        Create a new brand kit for the user.
        
        Args:
            user_id: Authenticated user's ID
            data: Validated brand kit creation data
            
        Returns:
            Created BrandKit with generated ID
            
        Raises:
            ValidationError: If data fails validation
            BrandKitLimitExceededError: If user has 10+ brand kits
        """
        pass
    
    async def get(self, user_id: str, brand_kit_id: str) -> BrandKit:
        """
        Get a brand kit by ID.
        
        Args:
            user_id: Authenticated user's ID (for ownership check)
            brand_kit_id: Brand kit UUID
            
        Returns:
            BrandKit if found and owned by user
            
        Raises:
            ResourceNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        pass
    
    async def list(self, user_id: str) -> List[BrandKit]:
        """
        List all brand kits for a user.
        
        Args:
            user_id: Authenticated user's ID
            
        Returns:
            List of BrandKits ordered by created_at desc
        """
        pass
    
    async def update(self, user_id: str, brand_kit_id: str, data: BrandKitUpdate) -> BrandKit:
        """
        Update an existing brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            data: Partial update data
            
        Returns:
            Updated BrandKit
            
        Raises:
            ResourceNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
            ValidationError: If data fails validation
        """
        pass
    
    async def delete(self, user_id: str, brand_kit_id: str) -> None:
        """
        Delete a brand kit.
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID
            
        Raises:
            ResourceNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        pass
    
    async def activate(self, user_id: str, brand_kit_id: str) -> BrandKit:
        """
        Set a brand kit as active (deactivates all others).
        
        Args:
            user_id: Authenticated user's ID
            brand_kit_id: Brand kit UUID to activate
            
        Returns:
            Activated BrandKit with is_active=True
            
        Raises:
            ResourceNotFoundError: If brand kit doesn't exist
            AuthorizationError: If user doesn't own the brand kit
        """
        pass
    
    async def get_active(self, user_id: str) -> Optional[BrandKit]:
        """
        Get the user's active brand kit.
        
        Args:
            user_id: Authenticated user's ID
            
        Returns:
            Active BrandKit or None if no active kit
        """
        pass
```

### BrandKitExtractionService Interface

```python
@dataclass
class BrandKitExtraction:
    """Result of brand kit extraction from uploaded files."""
    primary_colors: List[str]      # Extracted hex codes (5-7)
    accent_colors: List[str]       # Secondary colors (2-3)
    detected_fonts: List[str]      # Font families detected
    suggested_tone: str            # Inferred tone
    confidence: float              # 0-1 confidence score
    source_files: List[str]        # File names used


class BrandKitExtractionService:
    """
    Service for extracting brand kit data from uploaded images/clips.
    
    Uses Vision AI for color extraction and font detection.
    """
    
    async def analyze_uploads(
        self,
        user_id: str,
        files: List[UploadFile]
    ) -> BrandKitExtraction:
        """
        Analyze uploaded files to extract brand kit data.
        
        Args:
            user_id: Authenticated user's ID
            files: 3-5 uploaded image/video files
            
        Returns:
            BrandKitExtraction with extracted data
            
        Raises:
            ValidationError: If file count not 3-5
            ValidationError: If file types not supported
            ExtractionError: If Vision AI fails
        """
        pass
    
    async def extract_colors(self, image_data: bytes) -> List[str]:
        """
        Extract dominant colors from an image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            List of hex color codes (5-7 colors)
        """
        pass
    
    async def detect_fonts(self, image_data: bytes) -> List[str]:
        """
        Detect font families in an image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            List of detected font family names
        """
        pass
    
    async def infer_tone(self, colors: List[str], fonts: List[str]) -> str:
        """
        Infer brand tone from colors and fonts.
        
        Args:
            colors: Extracted color palette
            fonts: Detected fonts
            
        Returns:
            One of: competitive, casual, educational, comedic, professional
        """
        pass
```

---

## Pydantic Schemas

### Request Schemas

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Literal
import re

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')

SUPPORTED_FONTS = [
    'Inter', 'Roboto', 'Montserrat', 'Open Sans', 'Poppins',
    'Lato', 'Oswald', 'Raleway', 'Nunito', 'Playfair Display',
    'Merriweather', 'Source Sans Pro', 'Ubuntu', 'Rubik', 'Work Sans',
    'Fira Sans', 'Barlow', 'Quicksand', 'Karla', 'Mulish'
]

VALID_TONES = Literal['competitive', 'casual', 'educational', 'comedic', 'professional']


class BrandKitFonts(BaseModel):
    """Font configuration for brand kit."""
    headline: str = Field(..., description="Headline font family")
    body: str = Field(..., description="Body text font family")
    
    @field_validator('headline', 'body')
    @classmethod
    def validate_font(cls, v: str) -> str:
        if v not in SUPPORTED_FONTS:
            raise ValueError(f'Unsupported font: {v}. Supported: {SUPPORTED_FONTS}')
        return v


class BrandKitCreate(BaseModel):
    """Request body for creating a brand kit."""
    name: str = Field(..., min_length=1, max_length=100, description="Brand kit name")
    primary_colors: List[str] = Field(..., min_length=1, max_length=5, description="Primary color palette (1-5 hex codes)")
    accent_colors: List[str] = Field(default=[], max_length=3, description="Accent colors (0-3 hex codes)")
    fonts: BrandKitFonts = Field(..., description="Font configuration")
    tone: VALID_TONES = Field(default='professional', description="Brand tone")
    style_reference: str = Field(default='', max_length=500, description="Style description")
    logo_url: Optional[str] = Field(default=None, description="Logo CDN URL")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()
    
    @field_validator('primary_colors', 'accent_colors')
    @classmethod
    def validate_colors(cls, v: List[str]) -> List[str]:
        validated = []
        for color in v:
            color = color.upper()
            if not HEX_PATTERN.match(color):
                raise ValueError(f'Invalid hex color: {color}. Must be #RRGGBB format.')
            validated.append(color)
        return validated
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "name": "Gaming Stream Kit",
                "primary_colors": ["#FF0000", "#1E90FF", "#00FF00"],
                "accent_colors": ["#FFD700"],
                "fonts": {"headline": "Montserrat", "body": "Inter"},
                "tone": "competitive",
                "style_reference": "Bold, energetic gaming aesthetic"
            }]
        }
    }


class BrandKitUpdate(BaseModel):
    """Request body for updating a brand kit (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    primary_colors: Optional[List[str]] = Field(None, min_length=1, max_length=5)
    accent_colors: Optional[List[str]] = Field(None, max_length=3)
    fonts: Optional[BrandKitFonts] = None
    tone: Optional[VALID_TONES] = None
    style_reference: Optional[str] = Field(None, max_length=500)
    logo_url: Optional[str] = None
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v
    
    @field_validator('primary_colors', 'accent_colors')
    @classmethod
    def validate_colors(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        validated = []
        for color in v:
            color = color.upper()
            if not HEX_PATTERN.match(color):
                raise ValueError(f'Invalid hex color: {color}')
            validated.append(color)
        return validated
```

### Response Schemas

```python
from datetime import datetime


class BrandKitResponse(BaseModel):
    """Brand kit data in API responses."""
    id: str = Field(..., description="Brand kit UUID")
    user_id: str = Field(..., description="Owner user ID")
    name: str
    is_active: bool
    primary_colors: List[str]
    accent_colors: List[str]
    fonts: BrandKitFonts
    logo_url: Optional[str]
    tone: VALID_TONES
    style_reference: str
    extracted_from: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    model_config = {
        "json_schema_extra": {
            "examples": [{
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user-123",
                "name": "Gaming Stream Kit",
                "is_active": True,
                "primary_colors": ["#FF0000", "#1E90FF"],
                "accent_colors": ["#FFD700"],
                "fonts": {"headline": "Montserrat", "body": "Inter"},
                "logo_url": "https://cdn.example.com/logos/logo.png",
                "tone": "competitive",
                "style_reference": "Bold gaming aesthetic",
                "extracted_from": None,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z"
            }]
        }
    }


class BrandKitExtractionResponse(BaseModel):
    """Response from brand kit extraction."""
    primary_colors: List[str]
    accent_colors: List[str]
    detected_fonts: List[str]
    suggested_tone: VALID_TONES
    confidence: float = Field(..., ge=0, le=1)
    source_files: List[str]
```

---

## Database Operations

### SQL Queries

```sql
-- Create brand kit
INSERT INTO brand_kits (
    id, user_id, name, is_active, primary_colors, accent_colors,
    fonts, logo_url, tone, style_reference, extracted_from,
    created_at, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
) RETURNING *;

-- Get brand kit by ID
SELECT * FROM brand_kits WHERE id = $1;

-- List brand kits for user
SELECT * FROM brand_kits 
WHERE user_id = $1 
ORDER BY created_at DESC;

-- Update brand kit
UPDATE brand_kits 
SET name = COALESCE($3, name),
    primary_colors = COALESCE($4, primary_colors),
    accent_colors = COALESCE($5, accent_colors),
    fonts = COALESCE($6, fonts),
    logo_url = COALESCE($7, logo_url),
    tone = COALESCE($8, tone),
    style_reference = COALESCE($9, style_reference),
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING *;

-- Delete brand kit
DELETE FROM brand_kits WHERE id = $1 AND user_id = $2;

-- Activate brand kit (transaction)
BEGIN;
UPDATE brand_kits SET is_active = FALSE WHERE user_id = $1;
UPDATE brand_kits SET is_active = TRUE, updated_at = NOW() 
WHERE id = $2 AND user_id = $1 RETURNING *;
COMMIT;

-- Get active brand kit
SELECT * FROM brand_kits WHERE user_id = $1 AND is_active = TRUE;

-- Count brand kits for user
SELECT COUNT(*) FROM brand_kits WHERE user_id = $1;
```

---

## Correctness Properties

### Property 4: Hex Color Validation

```python
from hypothesis import given, strategies as st
import re

HEX_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')

@given(st.text(max_size=10))
def test_hex_validation_rejects_invalid(s):
    """For any string, hex validator returns True only for valid hex codes."""
    is_valid = is_valid_hex_color(s)
    if is_valid:
        assert HEX_PATTERN.match(s)

@given(st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True))
def test_hex_validation_accepts_valid(hex_color):
    """All valid hex codes pass validation."""
    assert is_valid_hex_color(hex_color) == True
```

### Property 5: Brand Kit Serialization Round-Trip

```python
@given(brand_kit=brand_kit_strategy())
def test_brand_kit_roundtrip(brand_kit):
    """Serializing then deserializing produces equivalent object."""
    json_str = brand_kit.model_dump_json()
    restored = BrandKit.model_validate_json(json_str)
    assert restored == brand_kit
```

### Property 6: Brand Kit Color Array Bounds

```python
@given(brand_kit=brand_kit_strategy())
def test_brand_kit_color_bounds(brand_kit):
    """Color arrays are within valid bounds."""
    assert 1 <= len(brand_kit.primary_colors) <= 5
    assert 0 <= len(brand_kit.accent_colors) <= 3
```

### Additional Properties

```python
@given(
    name=st.text(min_size=1, max_size=100),
    colors=st.lists(
        st.from_regex(r'#[0-9A-Fa-f]{6}', fullmatch=True),
        min_size=1, max_size=5
    )
)
def test_brand_kit_creation_preserves_data(name, colors):
    """Created brand kit preserves input data."""
    data = BrandKitCreate(
        name=name,
        primary_colors=colors,
        fonts={"headline": "Inter", "body": "Inter"},
        tone="professional"
    )
    # Simulate creation
    brand_kit = create_brand_kit(data)
    assert brand_kit.name == name.strip()
    assert brand_kit.primary_colors == [c.upper() for c in colors]

@given(st.sampled_from(SUPPORTED_FONTS))
def test_supported_fonts_pass_validation(font):
    """All supported fonts pass validation."""
    fonts = BrandKitFonts(headline=font, body=font)
    assert fonts.headline == font

@given(st.text(min_size=1, max_size=50).filter(lambda x: x not in SUPPORTED_FONTS))
def test_unsupported_fonts_fail_validation(font):
    """Unsupported fonts fail validation."""
    with pytest.raises(ValueError):
        BrandKitFonts(headline=font, body="Inter")
```

---

## Frontend Patterns

### TSX API Client Extension

```typescript
// packages/api-client/src/client.ts (extend existing)

brandKits = {
  list: () => this.request<BrandKit[]>('GET', '/brand-kits'),
  
  create: (data: BrandKitCreate) => 
    this.request<BrandKit>('POST', '/brand-kits', { body: data }),
  
  get: (id: string) => 
    this.request<BrandKit>('GET', `/brand-kits/${id}`),
  
  update: (id: string, data: BrandKitUpdate) => 
    this.request<BrandKit>('PUT', `/brand-kits/${id}`, { body: data }),
  
  delete: (id: string) => 
    this.request<void>('DELETE', `/brand-kits/${id}`),
  
  activate: (id: string) => 
    this.request<BrandKit>('POST', `/brand-kits/${id}/activate`),
  
  analyze: (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.request<BrandKitExtraction>('POST', '/brand-kits/analyze', {
      body: formData,
      headers: {} // Let browser set Content-Type for multipart
    });
  },
};
```

### TSX Hooks (TanStack Query)

```typescript
// packages/api-client/src/hooks/useBrandKits.ts

export function useBrandKits() {
  return useQuery({
    queryKey: ['brandKits'],
    queryFn: () => apiClient.brandKits.list(),
  });
}

export function useBrandKit(id: string) {
  return useQuery({
    queryKey: ['brandKits', id],
    queryFn: () => apiClient.brandKits.get(id),
    enabled: !!id,
  });
}

export function useActiveBrandKit() {
  const { data: brandKits } = useBrandKits();
  return brandKits?.find(kit => kit.isActive) ?? null;
}

export function useCreateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BrandKitCreate) => apiClient.brandKits.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

export function useUpdateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BrandKitUpdate }) => 
      apiClient.brandKits.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
      queryClient.invalidateQueries({ queryKey: ['brandKits', id] });
    },
  });
}

export function useDeleteBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.brandKits.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

export function useActivateBrandKit() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => apiClient.brandKits.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandKits'] });
    },
  });
}

export function useAnalyzeBrandKit() {
  return useMutation({
    mutationFn: (files: File[]) => apiClient.brandKits.analyze(files),
  });
}
```

### TSX Zustand Store

```typescript
// packages/shared/src/stores/brandKitStore.ts

interface BrandKitState {
  activeBrandKit: BrandKit | null;
  setActiveBrandKit: (kit: BrandKit | null) => void;
}

export const useBrandKitStore = create<BrandKitState>((set) => ({
  activeBrandKit: null,
  setActiveBrandKit: (kit) => set({ activeBrandKit: kit }),
}));
```

### Swift Patterns

```swift
// Features/BrandKit/BrandKitViewModel.swift

@Observable
final class BrandKitViewModel {
    private let apiClient: APIClient
    
    var brandKits: [BrandKit] = []
    var activeBrandKit: BrandKit? { brandKits.first { $0.isActive } }
    var isLoading = false
    var error: BrandKitError?
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    func loadBrandKits() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            let response = try await apiClient.request(
                BrandKitEndpoint.list,
                responseType: [BrandKit].self
            )
            brandKits = response.data
        } catch {
            self.error = .loadFailed(error)
        }
    }
    
    func createBrandKit(_ data: BrandKitCreate) async throws -> BrandKit {
        let response = try await apiClient.request(
            BrandKitEndpoint.create(data),
            responseType: BrandKit.self
        )
        await loadBrandKits()
        return response.data
    }
    
    func activateBrandKit(_ id: String) async throws {
        _ = try await apiClient.request(
            BrandKitEndpoint.activate(id),
            responseType: BrandKit.self
        )
        await loadBrandKits()
    }
    
    func deleteBrandKit(_ id: String) async throws {
        _ = try await apiClient.request(
            BrandKitEndpoint.delete(id),
            responseType: EmptyResponse.self
        )
        await loadBrandKits()
    }
}
```

---

## Error Handling

### Backend Exception Classes

```python
# services/exceptions.py (extend existing)

class BrandKitError(StreamerStudioError):
    """Base class for brand kit errors."""
    pass

class BrandKitNotFoundError(BrandKitError):
    def __init__(self, brand_kit_id: str):
        super().__init__(
            code="RESOURCE_NOT_FOUND",
            message="Brand kit not found",
            details={"resource_type": "brand_kit", "resource_id": brand_kit_id},
            status_code=404
        )

class BrandKitLimitExceededError(BrandKitError):
    def __init__(self, current_count: int, max_count: int = 10):
        super().__init__(
            code="BRAND_KIT_LIMIT_EXCEEDED",
            message=f"Maximum brand kits ({max_count}) reached",
            details={"current_count": current_count, "max_count": max_count},
            status_code=403
        )

class BrandKitValidationError(BrandKitError):
    def __init__(self, field: str, message: str):
        super().__init__(
            code="VALIDATION_FAILED",
            message=message,
            details={"field": field},
            status_code=422
        )

class HexColorValidationError(BrandKitError):
    def __init__(self, color: str):
        super().__init__(
            code="VALIDATION_HEX_COLOR",
            message=f"Invalid hex color format: {color}",
            details={"color": color, "expected_format": "#RRGGBB"},
            status_code=422
        )

class UnsupportedFontError(BrandKitError):
    def __init__(self, font: str, supported: List[str]):
        super().__init__(
            code="VALIDATION_FONT_UNSUPPORTED",
            message=f"Unsupported font: {font}",
            details={"font": font, "supported_fonts": supported},
            status_code=422
        )
```

---

## File Structure

### Backend Files to Create

```
backend/
├── api/
│   ├── routes/
│   │   └── brand_kits.py          # Route handlers
│   └── schemas/
│       └── brand_kit.py           # Pydantic schemas
├── services/
│   ├── brand_kit_service.py       # CRUD operations
│   └── brand_kit_extraction.py    # Vision AI extraction
└── tests/
    ├── properties/
    │   └── test_brand_kit_properties.py
    ├── unit/
    │   └── test_brand_kit_endpoints.py
    └── integration/
        └── test_brand_kit_flow.py
```

### TSX Files to Create

```
tsx/
├── packages/
│   ├── api-client/
│   │   └── src/
│   │       ├── types/
│   │       │   └── brandKit.ts    # TypeScript types
│   │       └── hooks/
│   │           └── useBrandKits.ts
│   └── shared/
│       └── src/
│           └── stores/
│               └── brandKitStore.ts
└── apps/
    ├── web/
    │   └── src/
    │       └── app/
    │           └── (dashboard)/
    │               └── brand-kits/
    │                   ├── page.tsx
    │                   └── [id]/
    │                       └── page.tsx
    └── mobile/
        └── src/
            └── app/
                └── (tabs)/
                    └── brand-kits/
                        └── index.tsx
```

### Swift Files to Create

```
swift/
└── Sources/
    └── StreamerStudio/
        └── Features/
            └── BrandKit/
                ├── BrandKitViewModel.swift
                ├── BrandKitListView.swift
                ├── BrandKitEditorView.swift
                └── Components/
                    ├── ColorPicker.swift
                    └── FontSelector.swift
```
