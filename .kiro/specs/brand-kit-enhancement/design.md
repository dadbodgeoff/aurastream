# Brand Kit Enhancement - Design Document

## Overview

This design document outlines the technical implementation for enhancing the brand kit system to enterprise-grade capabilities, with a focus on logo management and integration with AI asset generation.

## Phase 1: Logo System (Current Implementation)

### Storage Architecture

```
Supabase Storage
├── logos/                          # Logo bucket (private)
│   └── {user_id}/
│       └── {brand_kit_id}/
│           ├── primary.png         # Main logo
│           ├── secondary.png       # Alternative logo
│           ├── icon.png            # Icon-only version
│           ├── monochrome.png      # Single-color version
│           └── watermark.png       # Transparent watermark
│
└── brand-assets/                   # Brand assets bucket (private)
    └── {user_id}/
        └── {brand_kit_id}/
            ├── overlays/
            ├── alerts/
            ├── panels/
            ├── emotes/
            └── badges/
```

### Logo Service

**File:** `backend/services/logo_service.py`

```python
class LogoService:
    """Manages logo upload, retrieval, and deletion."""
    
    BUCKET_NAME = "logos"
    
    async def upload_logo(user_id, brand_kit_id, logo_type, file_data, content_type)
    async def get_logo_url(user_id, brand_kit_id, logo_type) -> Optional[str]
    async def list_logos(user_id, brand_kit_id) -> Dict[LogoType, Optional[str]]
    async def delete_logo(user_id, brand_kit_id, logo_type) -> bool
    async def get_logo_for_generation(user_id, brand_kit_id) -> Optional[bytes]
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/brand-kits/{id}/logos` | Upload a logo |
| GET | `/api/v1/brand-kits/{id}/logos` | List all logos |
| GET | `/api/v1/brand-kits/{id}/logos/{type}` | Get specific logo URL |
| DELETE | `/api/v1/brand-kits/{id}/logos/{type}` | Delete a logo |

### Logo Types

| Type | Purpose | Recommended Size |
|------|---------|------------------|
| `primary` | Main logo for generation | 512x512 or larger |
| `secondary` | Alternative logo | 512x512 or larger |
| `icon` | Favicon, small displays | 128x128 |
| `monochrome` | Single-color version | 512x512 |
| `watermark` | Transparent overlay | 256x256 |

## Integration with Asset Generation

### Include Logo Option

When generating assets, users can opt to include their logo:

```python
# Generation request with logo
{
    "asset_type": "thumbnail",
    "brand_kit_id": "uuid",
    "custom_prompt": "Epic gaming moment",
    "include_logo": true,           # NEW
    "logo_position": "bottom-right", # NEW
    "logo_size": "medium"           # NEW: small, medium, large
}
```

### Logo Injection in Prompt Engine

The prompt engine will be enhanced to:
1. Fetch the user's primary logo
2. Include logo placement instructions in the prompt
3. Pass logo bytes to the AI model for composition

```python
# prompt_engine.py enhancement
async def build_prompt_with_logo(
    template: str,
    brand_kit: dict,
    include_logo: bool = False,
    logo_position: str = "bottom-right",
    logo_size: str = "medium",
) -> tuple[str, Optional[bytes]]:
    """Build prompt with optional logo inclusion."""
    prompt = build_prompt(template, brand_kit)
    
    if include_logo:
        logo_service = get_logo_service()
        logo_bytes = await logo_service.get_logo_for_generation(
            user_id=brand_kit["user_id"],
            brand_kit_id=brand_kit["id"],
        )
        
        if logo_bytes:
            prompt += f"\n\nInclude the provided logo in the {logo_position} corner, sized {logo_size}."
        
        return prompt, logo_bytes
    
    return prompt, None
```

## Phase 2: Extended Colors & Typography (Future)

### Enhanced Color Schema

```python
class ExtendedColor(BaseModel):
    hex: str
    name: str
    usage: str  # Description of when to use

class ColorPalette(BaseModel):
    primary: List[ExtendedColor]      # 1-5 colors
    secondary: List[ExtendedColor]    # 0-5 colors
    accent: List[ExtendedColor]       # 0-3 colors
    neutral: List[ExtendedColor]      # 0-5 colors
    gradients: List[Gradient]         # 0-3 gradients
```

### Typography Hierarchy

```python
class FontConfig(BaseModel):
    family: str
    weight: int  # 100-900
    style: Literal["normal", "italic"]

class Typography(BaseModel):
    display: FontConfig      # Large display text
    headline: FontConfig     # H1-H2
    subheadline: FontConfig  # H3-H4
    body: FontConfig         # Body text
    caption: FontConfig      # Small text
    accent: FontConfig       # Special text
```

## Phase 3: Streamer Assets (Future)

### Asset Categories

1. **Overlays** - Stream scenes (starting, BRB, ending, gameplay)
2. **Alerts** - Notification animations (follow, sub, donation, raid)
3. **Panels** - Channel info panels (about, schedule, rules)
4. **Emotes** - Custom emotes by tier
5. **Badges** - Subscriber badges by month
6. **Facecam** - Webcam frame
7. **Stinger** - Transition animation

### Storage Structure

```
brand-assets/{user_id}/{brand_kit_id}/
├── overlays/
│   ├── starting_soon.png
│   ├── brb.png
│   ├── ending.png
│   └── gameplay.png
├── alerts/
│   ├── follow.gif
│   ├── follow.mp3
│   ├── subscribe.gif
│   └── subscribe.mp3
├── panels/
│   ├── about.png
│   ├── schedule.png
│   └── rules.png
├── emotes/
│   ├── hype_t1.png
│   ├── hype_t2.png
│   └── hype_t3.png
├── badges/
│   ├── 1month.png
│   ├── 3month.png
│   └── 6month.png
├── facecam/
│   └── frame.png
└── stinger/
    └── transition.mp4
```

## Security Considerations

1. **Ownership Verification** - All operations verify brand kit ownership
2. **File Validation** - MIME type and size validation before upload
3. **Signed URLs** - Private buckets use signed URLs with expiration
4. **Rate Limiting** - Upload endpoints rate limited per user
5. **Content Scanning** - Future: Scan uploads for malicious content

## Performance Considerations

1. **Lazy Loading** - Logo URLs fetched on demand
2. **Caching** - Signed URLs cached for 1 year
3. **Parallel Uploads** - Multiple logos can be uploaded concurrently
4. **CDN Integration** - Future: Serve logos via CDN for faster delivery

## Migration Path

### Database Changes

```sql
-- Add logo metadata to brand_kits table
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS logos JSONB DEFAULT '{}';

-- Example logos JSON structure:
-- {
--   "primary": {"url": "...", "uploaded_at": "..."},
--   "secondary": {"url": "...", "uploaded_at": "..."},
--   "icon": null,
--   "monochrome": null,
--   "watermark": null
-- }
```

### Backward Compatibility

- Existing `logo_url` field remains for backward compatibility
- New `logos` JSONB field stores all logo variations
- API returns both for transition period
