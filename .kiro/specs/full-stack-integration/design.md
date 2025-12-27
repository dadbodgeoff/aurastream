# FULL-STACK INTEGRATION DESIGN DOCUMENT

## API Contract Reference

This document provides exact API contracts for all endpoints to ensure frontend-backend alignment.

---

## SECTION 1: GENERATION API

### POST /api/v1/generate

**Request Body:**
```json
{
  "asset_type": "thumbnail",
  "brand_kit_id": "uuid-string",
  "custom_prompt": "optional string max 500 chars",
  "brand_customization": {
    "colors": {
      "primary_index": 0,
      "secondary_index": null,
      "accent_index": null,
      "use_gradient": null
    },
    "typography": {
      "level": "headline"
    },
    "voice": {
      "use_tagline": false,
      "use_catchphrase": null
    },
    "include_logo": true,
    "logo_type": "primary",
    "logo_position": "bottom-right",
    "logo_size": "medium",
    "brand_intensity": "balanced"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "job-uuid",
  "user_id": "user-uuid",
  "brand_kit_id": "brand-kit-uuid",
  "asset_type": "thumbnail",
  "status": "queued",
  "progress": 0,
  "error_message": null,
  "created_at": "2024-12-25T10:00:00Z",
  "updated_at": "2024-12-25T10:00:00Z",
  "completed_at": null
}
```

**Validation Rules:**
- `asset_type`: Required, one of: thumbnail, overlay, banner, story_graphic, clip_cover
- `brand_kit_id`: Required, valid UUID, must belong to user
- `custom_prompt`: Optional, max 500 characters
- `brand_customization.colors.primary_index`: 0-4
- `brand_customization.colors.secondary_index`: 0-4 or null
- `brand_customization.colors.accent_index`: 0-2 or null
- `brand_customization.colors.use_gradient`: 0-2 or null
- `brand_customization.typography.level`: display, headline, subheadline, body, caption, accent
- `brand_customization.logo_type`: primary, secondary, icon, watermark
- `brand_customization.logo_position`: top-left, top-right, bottom-left, bottom-right, center
- `brand_customization.logo_size`: small, medium, large
- `brand_customization.brand_intensity`: subtle, balanced, strong

---

### GET /api/v1/jobs

**Query Parameters:**
- `status`: Optional filter (queued, processing, completed, failed, partial)
- `limit`: 1-100, default 20
- `offset`: >= 0, default 0

**Response (200 OK):**
```json
{
  "jobs": [
    {
      "id": "job-uuid",
      "user_id": "user-uuid",
      "brand_kit_id": "brand-kit-uuid",
      "asset_type": "thumbnail",
      "status": "completed",
      "progress": 100,
      "error_message": null,
      "created_at": "2024-12-25T10:00:00Z",
      "updated_at": "2024-12-25T10:02:00Z",
      "completed_at": "2024-12-25T10:02:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

### GET /api/v1/jobs/{job_id}

**Response (200 OK):**
```json
{
  "id": "job-uuid",
  "user_id": "user-uuid",
  "brand_kit_id": "brand-kit-uuid",
  "asset_type": "thumbnail",
  "status": "processing",
  "progress": 65,
  "error_message": null,
  "created_at": "2024-12-25T10:00:00Z",
  "updated_at": "2024-12-25T10:01:00Z",
  "completed_at": null
}
```

**Error (404):**
```json
{
  "error": {
    "message": "Job not found",
    "code": "RESOURCE_NOT_FOUND",
    "details": {"resource_type": "generation_job", "resource_id": "job-uuid"}
  }
}
```

---

### GET /api/v1/jobs/{job_id}/assets

**Response (200 OK):**
```json
[
  {
    "id": "asset-uuid",
    "job_id": "job-uuid",
    "user_id": "user-uuid",
    "asset_type": "thumbnail",
    "url": "https://storage.example.com/assets/asset-uuid.png",
    "width": 1280,
    "height": 720,
    "file_size": 245678,
    "is_public": true,
    "viral_score": 85,
    "created_at": "2024-12-25T10:02:00Z"
  }
]
```

---

## SECTION 2: BRAND KIT EXTENDED API

### PUT /api/v1/brand-kits/{id}/colors

**Request Body:**
```json
{
  "primary": [
    {"hex": "#FF5733", "name": "Brand Orange", "usage": "Main brand color for CTAs"}
  ],
  "secondary": [
    {"hex": "#3498DB", "name": "Ocean Blue", "usage": "Secondary elements"}
  ],
  "accent": [
    {"hex": "#F1C40F", "name": "Gold", "usage": "Highlights"}
  ],
  "neutral": [
    {"hex": "#2C3E50", "name": "Dark Slate", "usage": "Text and backgrounds"}
  ],
  "gradients": [
    {
      "name": "Brand Gradient",
      "type": "linear",
      "angle": 90,
      "stops": [
        {"color": "#FF5733", "position": 0},
        {"color": "#3498DB", "position": 100}
      ]
    }
  ]
}
```

**Validation Rules:**
- `primary`: max 5 items
- `secondary`: max 5 items
- `accent`: max 3 items
- `neutral`: max 5 items
- `gradients`: max 3 items
- `hex`: must match #RRGGBB format
- `name`: max 50 characters
- `usage`: max 200 characters
- `gradient.angle`: 0-360
- `gradient.stops`: 2-10 items, positions must be ascending

---

### GET /api/v1/brand-kits/{id}/colors

**Response (200 OK):**
```json
{
  "brand_kit_id": "uuid",
  "colors": {
    "primary": [...],
    "secondary": [...],
    "accent": [...],
    "neutral": [...],
    "gradients": [...]
  }
}
```

---

### PUT /api/v1/brand-kits/{id}/typography

**Request Body:**
```json
{
  "display": {"family": "Oswald", "weight": 700, "style": "normal"},
  "headline": {"family": "Montserrat", "weight": 600, "style": "normal"},
  "subheadline": {"family": "Montserrat", "weight": 500, "style": "normal"},
  "body": {"family": "Inter", "weight": 400, "style": "normal"},
  "caption": {"family": "Inter", "weight": 400, "style": "italic"},
  "accent": {"family": "Playfair Display", "weight": 700, "style": "italic"}
}
```

**Validation Rules:**
- All fields optional
- `weight`: must be 100, 200, 300, 400, 500, 600, 700, 800, or 900
- `style`: must be "normal" or "italic"
- `family`: max 100 characters

---

### PUT /api/v1/brand-kits/{id}/voice

**Request Body:**
```json
{
  "tone": "competitive",
  "personality_traits": ["Bold", "Energetic", "Authentic"],
  "tagline": "Level Up Your Stream",
  "catchphrases": ["Let's gooo!", "GG everyone", "Stay awesome"],
  "content_themes": ["Gaming", "Community", "Entertainment"]
}
```

**Validation Rules:**
- `tone`: Required, one of: competitive, casual, educational, comedic, professional, inspirational, edgy, wholesome
- `personality_traits`: max 5 items, each max 30 characters
- `tagline`: max 100 characters
- `catchphrases`: max 10 items, each max 50 characters
- `content_themes`: max 5 items, each max 30 characters

---

### PUT /api/v1/brand-kits/{id}/guidelines

**Request Body:**
```json
{
  "logo_min_size_px": 48,
  "logo_clear_space_ratio": 0.25,
  "primary_color_ratio": 60.0,
  "secondary_color_ratio": 30.0,
  "accent_color_ratio": 10.0,
  "prohibited_modifications": ["Stretching", "Color changes", "Adding effects"],
  "style_do": "Use bold colors, maintain consistent spacing",
  "style_dont": "Avoid cluttered layouts, don't use more than 3 colors"
}
```

**Validation Rules:**
- `logo_min_size_px`: 16-512
- `logo_clear_space_ratio`: 0.1-1.0
- `primary_color_ratio`: 0-100
- `secondary_color_ratio`: 0-100
- `accent_color_ratio`: 0-100
- Sum of color ratios must be ≤ 100
- `prohibited_modifications`: max 10 items
- `style_do`: max 500 characters
- `style_dont`: max 500 characters

---

## SECTION 3: TWITCH API

### POST /api/v1/twitch/generate

**Request Body:**
```json
{
  "asset_type": "twitch_emote",
  "brand_kit_id": "uuid",
  "custom_prompt": "Excited streamer celebrating",
  "game_id": "12345",
  "text_overlay": "GG",
  "include_logo": true
}
```

**Validation Rules:**
- `asset_type`: Required, one of: twitch_emote, twitch_emote_112, twitch_emote_56, twitch_emote_28, twitch_badge, twitch_badge_36, twitch_badge_18, twitch_panel, twitch_offline, twitch_banner
- `brand_kit_id`: Required, valid UUID
- `custom_prompt`: max 500 characters
- `text_overlay`: max 100 characters

**Response (202 Accepted):**
```json
{
  "job_id": "uuid",
  "status": "queued",
  "asset_type": "twitch_emote",
  "message": "Generation job created successfully"
}
```

---

### GET /api/v1/twitch/game-meta/{game_id}

**Response (200 OK):**
```json
{
  "id": "12345",
  "name": "Fortnite",
  "current_season": "Chapter 5 Season 1",
  "genre": "Battle Royale",
  "icon_url": "https://example.com/fortnite-icon.png"
}
```

**Error (404):**
```json
{
  "error": "game_not_found",
  "message": "Game '12345' not found"
}
```

---

## SECTION 4: AUTH EXTENDED API

### POST /api/v1/auth/password-reset/request

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

Note: Always returns 200 to prevent email enumeration.

---

### POST /api/v1/auth/password-reset/confirm

**Request Body:**
```json
{
  "token": "reset-token-string",
  "new_password": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "message": "Password has been reset successfully."
}
```

**Error (400):**
```json
{
  "error": {
    "message": "Invalid or expired reset token",
    "code": "AUTH_INVALID_TOKEN"
  }
}
```

---

### POST /api/v1/auth/email/verify/request

**Headers:** `Authorization: Bearer <token>`

**Response (200 OK):**
```json
{
  "message": "Verification email sent."
}
```

---

### GET /api/v1/auth/email/verify/{token}

**Response (200 OK):**
```json
{
  "message": "Email verified successfully."
}
```

---

### PUT /api/v1/auth/me

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "display_name": "New Display Name",
  "avatar_url": "https://example.com/avatar.png"
}
```

**Response (200 OK):**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "email_verified": true,
  "display_name": "New Display Name",
  "avatar_url": "https://example.com/avatar.png",
  "subscription_tier": "pro",
  "subscription_status": "active",
  "assets_generated_this_month": 42,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-12-25T10:00:00Z"
}
```

---

### POST /api/v1/auth/me/password

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "current_password": "OldPassword123",
  "new_password": "NewPassword456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully."
}
```

**Error (401):**
```json
{
  "error": {
    "message": "Current password is incorrect",
    "code": "AUTH_INVALID_CREDENTIALS"
  }
}
```

---

### DELETE /api/v1/auth/me

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "password": "CurrentPassword123",
  "confirmation": "DELETE"
}
```

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully."
}
```

**Validation Rules:**
- `password`: Required, must match current password
- `confirmation`: Required, must be exactly "DELETE"

---

## SECTION 5: ERROR RESPONSE FORMAT

All API errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE",
    "details": {
      "field": "additional context"
    }
  }
}
```

**Common Error Codes:**
- `AUTH_INVALID_CREDENTIALS` - Wrong email/password
- `AUTH_TOKEN_EXPIRED` - JWT expired
- `AUTH_TOKEN_INVALID` - JWT malformed
- `AUTH_UNAUTHORIZED` - Not authorized for resource
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `BRAND_KIT_LIMIT_EXCEEDED` - Max 10 brand kits
- `GENERATION_ERROR` - Asset generation failed

---

## SECTION 6: FRONTEND TYPE MAPPING

### Snake Case to Camel Case Conversion

Backend uses snake_case, frontend uses camelCase. Transform on API boundary.

**Example:**
```typescript
// Backend response
{
  "brand_kit_id": "uuid",
  "asset_type": "thumbnail",
  "created_at": "2024-12-25T10:00:00Z"
}

// Frontend type
interface Job {
  brandKitId: string;
  assetType: string;
  createdAt: string;
}

// Transform function
function transformJob(data: any): Job {
  return {
    id: data.id,
    brandKitId: data.brand_kit_id,
    assetType: data.asset_type,
    createdAt: data.created_at,
    // ... etc
  };
}
```

### API Client Pattern

```typescript
// hooks/useJobs.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { Job, JobListResponse } from '../types/assets';

export function useJobs(filters?: { status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['jobs', 'list', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));
      
      const response = await apiClient.get(`/jobs?${params}`);
      return transformJobListResponse(response.data);
    },
  });
}

function transformJobListResponse(data: any): JobListResponse {
  return {
    jobs: data.jobs.map(transformJob),
    total: data.total,
    limit: data.limit,
    offset: data.offset,
  };
}

function transformJob(data: any): Job {
  return {
    id: data.id,
    userId: data.user_id,
    brandKitId: data.brand_kit_id,
    assetType: data.asset_type,
    status: data.status,
    progress: data.progress,
    errorMessage: data.error_message,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    completedAt: data.completed_at,
  };
}
```

---

## SECTION 7: DATABASE SCHEMA REFERENCE

### brand_kits Table (Current)

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
name TEXT NOT NULL
is_active BOOLEAN DEFAULT FALSE
primary_colors TEXT[] NOT NULL
accent_colors TEXT[] DEFAULT '{}'
fonts JSONB NOT NULL
logo_url TEXT
tone TEXT DEFAULT 'professional'
style_reference TEXT
extracted_from TEXT
-- Enhanced fields (Migration 003)
colors_extended JSONB DEFAULT '{}'
typography JSONB DEFAULT '{}'
voice JSONB DEFAULT '{}'
streamer_assets JSONB DEFAULT '{}'
guidelines JSONB DEFAULT '{}'
social_profiles JSONB DEFAULT '{}'
logos JSONB DEFAULT '{}'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### generation_jobs Table (Current)

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
parent_job_id UUID
status TEXT DEFAULT 'queued'
job_type TEXT DEFAULT 'single'
asset_type TEXT NOT NULL
custom_prompt TEXT
brand_kit_id UUID
platform_context JSONB
total_assets INTEGER DEFAULT 1
completed_assets INTEGER DEFAULT 0
failed_assets INTEGER DEFAULT 0
queued_at TIMESTAMPTZ
started_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
error_message TEXT
retry_count INTEGER DEFAULT 0
-- Enhanced fields (Migration 004)
prompt TEXT
progress INTEGER DEFAULT 0
parameters JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### assets Table (Current)

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
job_id UUID NOT NULL
brand_kit_id UUID
asset_type TEXT NOT NULL
width INTEGER NOT NULL
height INTEGER NOT NULL
format TEXT DEFAULT 'png'
cdn_url TEXT
storage_key TEXT
shareable_url TEXT
is_public BOOLEAN DEFAULT TRUE
prompt_used TEXT
generation_params JSONB
viral_score INTEGER
viral_suggestions TEXT[]
-- Enhanced fields (Migration 005)
url TEXT
storage_path TEXT
file_size BIGINT
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
```

### auth_tokens Table (NEW - Migration 006)

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
token_type TEXT NOT NULL  -- 'password_reset' | 'email_verification'
token_hash TEXT NOT NULL
expires_at TIMESTAMPTZ NOT NULL
used_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

---

## SECTION 8: SUPPORTED FONTS LIST

```typescript
const SUPPORTED_FONTS = [
  'Inter',
  'Roboto',
  'Montserrat',
  'Open Sans',
  'Poppins',
  'Lato',
  'Oswald',
  'Raleway',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Source Sans Pro',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Fira Sans',
  'Barlow',
  'Quicksand',
  'Karla',
  'Mulish',
];
```

---

## SECTION 9: DESIGN TOKENS

```typescript
// Colors
const colors = {
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',  // Electric Purple - Primary
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },
  accent: {
    400: '#22D3EE',
    500: '#00D9FF',  // Neon Cyan - Accent
    600: '#0891B2',
  },
  success: {
    light: '#4ADE80',
    main: '#22C55E',
    dark: '#166534',
  },
  warning: {
    light: '#FCD34D',
    main: '#F59E0B',
    dark: '#92400E',
  },
  error: {
    light: '#F87171',
    main: '#EF4444',
    dark: '#991B1B',
  },
  background: {
    base: '#0F0F14',
    surface: '#1A1A24',
    elevated: '#252532',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
  },
  border: {
    subtle: '#27272A',
    default: '#3F3F46',
  },
};

// Shadows
const shadows = {
  glowPrimary: '0 0 20px rgba(139, 92, 246, 0.3)',
  glowAccent: '0 0 20px rgba(0, 217, 255, 0.3)',
};
```

