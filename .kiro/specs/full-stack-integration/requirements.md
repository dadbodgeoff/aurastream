# FULL-STACK INTEGRATION SPEC: 100% Backend-Frontend Alignment

**Version:** 1.0.0  
**Date:** December 2024  
**Status:** ACTIVE  
**Goal:** Achieve 100% implementation coverage with zero silent failures

---

## EXECUTIVE SUMMARY

This spec guides parallel subagent work to ensure every backend endpoint, database table, and parameter is correctly wired to the frontend with proper validation, error handling, and UI exposure.

---

## CURRENT STATE ANALYSIS

### ✅ COMPLETE MODULES
- **Logo Management** - All 4 endpoints, 5 logo types, full CRUD
- **Basic Auth** - Login, signup, logout, refresh, /me
- **Module 1: Assets Management Page** ✅ - Full UI for viewing/managing generated assets
- **Module 2: Generation Brand Customization** ✅ - Brand intensity, colors, typography, voice selection
- **Module 3: Brand Kit Extended Fields** ✅ - 8 endpoints with 6-tab UI (colors, typography, voice, guidelines)
- **Module 4: Twitch Advanced Options** ✅ - Text overlay, game context, logo options
- **Module 5: Auth Extended** ✅ - Password reset, email verification, profile update, account deletion

### 🟢 ALL MODULES COMPLETE
All 5 modules have been implemented with:
- Backend endpoints and services
- Database migrations
- Frontend types and hooks
- UI pages and components
- TypeScript compilation verified

---

## MODULE 1: ASSETS MANAGEMENT PAGE

### Backend Endpoints (EXISTING - Verified Working)

```
GET  /api/v1/jobs                    → List generation jobs
GET  /api/v1/jobs/{job_id}           → Get job status
GET  /api/v1/jobs/{job_id}/assets    → Get job assets
```

### Database Schema (EXISTING)

```sql
-- assets table
id UUID PRIMARY KEY
job_id UUID REFERENCES generation_jobs(id)
user_id UUID REFERENCES users(id)
asset_type TEXT  -- thumbnail, overlay, banner, story_graphic, clip_cover
url TEXT
storage_path TEXT
width INTEGER
height INTEGER
file_size BIGINT
is_public BOOLEAN
viral_score INTEGER (0-100)
created_at TIMESTAMPTZ

-- generation_jobs table
id UUID PRIMARY KEY
user_id UUID
brand_kit_id UUID
asset_type TEXT
status TEXT  -- queued, processing, completed, failed, partial
progress INTEGER (0-100)
error_message TEXT
parameters JSONB
created_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
```

### Frontend Implementation Required

**File:** `tsx/apps/web/src/app/dashboard/assets/page.tsx`

**Features:**
1. List all user's generation jobs with status indicators
2. Show job progress for in-progress jobs (poll every 2s)
3. Display completed assets in grid with thumbnails
4. Asset actions: Download, Copy URL, Toggle Public/Private, Delete
5. Filter by: status, asset_type, date range
6. Empty state with CTA to generate page

**API Client Hooks Needed:**
```typescript
// tsx/packages/api-client/src/hooks/useAssets.ts
useJobs(filters?: { status?: string; limit?: number; offset?: number })
useJob(jobId: string)
useJobAssets(jobId: string)
useDeleteAsset()
useUpdateAssetVisibility()
```

**Type Definitions:**
```typescript
// tsx/packages/api-client/src/types/assets.ts
interface Job {
  id: string;
  userId: string;
  brandKitId: string;
  assetType: AssetType;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface Asset {
  id: string;
  jobId: string;
  userId: string;
  assetType: AssetType;
  url: string;
  width: number;
  height: number;
  fileSize: number;
  isPublic: boolean;
  viralScore: number | null;
  createdAt: string;
}
```

---

## MODULE 2: GENERATION BRAND CUSTOMIZATION UI

### Backend Schema (EXISTING - Verified Working)

```python
# backend/api/schemas/generation.py

class ColorSelection(BaseModel):
    primary_index: int = Field(default=0, ge=0, le=4)
    secondary_index: Optional[int] = Field(default=None, ge=0, le=4)
    accent_index: Optional[int] = Field(default=None, ge=0, le=2)
    use_gradient: Optional[int] = Field(default=None, ge=0, le=2)

class TypographySelection(BaseModel):
    level: Literal["display", "headline", "subheadline", "body", "caption", "accent"]

class VoiceSelection(BaseModel):
    use_tagline: bool = False
    use_catchphrase: Optional[int] = None  # Index of catchphrase

class BrandCustomization(BaseModel):
    colors: Optional[ColorSelection]
    typography: Optional[TypographySelection]
    voice: Optional[VoiceSelection]
    include_logo: bool = False
    logo_type: Literal["primary", "secondary", "icon", "watermark"] = "primary"
    logo_position: Literal["top-left", "top-right", "bottom-left", "bottom-right", "center"]
    logo_size: Literal["small", "medium", "large"] = "medium"
    brand_intensity: Literal["subtle", "balanced", "strong"] = "balanced"
```

### Frontend Implementation Required

**File:** `tsx/apps/web/src/app/dashboard/generate/page.tsx`

**Add New Sections:**

1. **Brand Intensity Selector** (Step 3.5)
   - Three options: Subtle, Balanced, Strong
   - Visual indicator showing intensity level
   - Tooltip explaining each level

2. **Color Selection** (Step 3.6 - Collapsible Advanced)
   - Show brand kit's primary colors (up to 5)
   - Allow selecting primary_index (0-4)
   - Optional: secondary_index, accent_index
   - Gradient toggle if brand kit has gradients

3. **Typography Selection** (Step 3.7 - Collapsible Advanced)
   - Dropdown: display, headline, subheadline, body, caption, accent
   - Preview of selected typography style

4. **Voice Selection** (Step 3.8 - Collapsible Advanced)
   - Toggle: Include tagline
   - Dropdown: Select catchphrase (if brand kit has catchphrases)

5. **Logo Type Selection** (Enhance existing Step 3)
   - Radio buttons: Primary, Secondary, Icon, Watermark
   - Only show types that exist in brand kit

**Update API Call:**
```typescript
const result = await generateMutation.mutateAsync({
  assetType: selectedType,
  brandKitId: selectedBrandKitId,
  customPrompt: customPrompt || undefined,
  brandCustomization: {
    includeLogo: includeLogo && hasLogo,
    logoType: selectedLogoType,
    logoPosition: logoPosition,
    logoSize: logoSize,
    brandIntensity: brandIntensity,
    colors: showAdvanced ? {
      primaryIndex: primaryColorIndex,
      secondaryIndex: secondaryColorIndex,
      accentIndex: accentColorIndex,
      useGradient: useGradient ? gradientIndex : undefined,
    } : undefined,
    typography: showAdvanced ? {
      level: typographyLevel,
    } : undefined,
    voice: showAdvanced ? {
      useTagline: useTagline,
      useCatchphrase: selectedCatchphraseIndex,
    } : undefined,
  },
});
```

**API Client Update:**
```typescript
// tsx/packages/api-client/src/hooks/useGeneration.ts
interface GenerateAssetParams {
  assetType: AssetType;
  brandKitId: string;
  customPrompt?: string;
  brandCustomization?: {
    includeLogo?: boolean;
    logoType?: 'primary' | 'secondary' | 'icon' | 'watermark';
    logoPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    logoSize?: 'small' | 'medium' | 'large';
    brandIntensity?: 'subtle' | 'balanced' | 'strong';
    colors?: {
      primaryIndex?: number;
      secondaryIndex?: number;
      accentIndex?: number;
      useGradient?: number;
    };
    typography?: {
      level?: 'display' | 'headline' | 'subheadline' | 'body' | 'caption' | 'accent';
    };
    voice?: {
      useTagline?: boolean;
      useCatchphrase?: number;
    };
  };
}
```

---

## MODULE 3: BRAND KIT EXTENDED FIELDS UI

### Backend Endpoints (EXISTING - Verified Working)

```
PUT  /api/v1/brand-kits/{id}/colors      → Update extended colors
GET  /api/v1/brand-kits/{id}/colors      → Get extended colors
PUT  /api/v1/brand-kits/{id}/typography  → Update typography
GET  /api/v1/brand-kits/{id}/typography  → Get typography
PUT  /api/v1/brand-kits/{id}/voice       → Update brand voice
GET  /api/v1/brand-kits/{id}/voice       → Get brand voice
PUT  /api/v1/brand-kits/{id}/guidelines  → Update guidelines
GET  /api/v1/brand-kits/{id}/guidelines  → Get guidelines
```

### Backend Schemas (EXISTING)

```python
# backend/api/schemas/brand_kit_enhanced.py

class ExtendedColor(BaseModel):
    hex: str  # #RRGGBB
    name: str  # max 50 chars
    usage: str  # max 200 chars

class GradientStop(BaseModel):
    color: str  # #RRGGBB
    position: int  # 0-100

class Gradient(BaseModel):
    name: str
    type: Literal['linear', 'radial']
    angle: int  # 0-360
    stops: List[GradientStop]  # 2-10 stops

class ColorPalette(BaseModel):
    primary: List[ExtendedColor]  # max 5
    secondary: List[ExtendedColor]  # max 5
    accent: List[ExtendedColor]  # max 3
    neutral: List[ExtendedColor]  # max 5
    gradients: List[Gradient]  # max 3

class FontConfig(BaseModel):
    family: str
    weight: int  # 100-900
    style: Literal['normal', 'italic']

class Typography(BaseModel):
    display: Optional[FontConfig]
    headline: Optional[FontConfig]
    subheadline: Optional[FontConfig]
    body: Optional[FontConfig]
    caption: Optional[FontConfig]
    accent: Optional[FontConfig]

class BrandVoice(BaseModel):
    tone: Literal['competitive', 'casual', 'educational', 'comedic', 
                  'professional', 'inspirational', 'edgy', 'wholesome']
    personality_traits: List[str]  # max 5, each max 30 chars
    tagline: Optional[str]  # max 100 chars
    catchphrases: List[str]  # max 10, each max 50 chars
    content_themes: List[str]  # max 5, each max 30 chars

class BrandGuidelines(BaseModel):
    logo_min_size_px: int  # 16-512
    logo_clear_space_ratio: float  # 0.1-1.0
    primary_color_ratio: float  # 0-100
    secondary_color_ratio: float  # 0-100
    accent_color_ratio: float  # 0-100
    prohibited_modifications: List[str]  # max 10
    style_do: Optional[str]  # max 500 chars
    style_dont: Optional[str]  # max 500 chars
```

### Frontend Implementation Required

**File:** `tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx`

**Add New Tabs:**

1. **Extended Colors Tab**
   - Primary colors editor (5 slots with name, hex, usage)
   - Secondary colors editor (5 slots)
   - Accent colors editor (3 slots)
   - Neutral colors editor (5 slots)
   - Gradients editor (3 slots with visual preview)

2. **Typography Tab**
   - 6 typography levels: display, headline, subheadline, body, caption, accent
   - Each level: font family dropdown, weight slider (100-900), style toggle
   - Live preview of each level

3. **Brand Voice Tab**
   - Tone selector (8 options)
   - Personality traits (5 tags)
   - Tagline input
   - Catchphrases list (10 max)
   - Content themes (5 tags)

4. **Guidelines Tab**
   - Logo minimum size slider
   - Clear space ratio slider
   - Color ratio inputs (must sum to ≤100)
   - Prohibited modifications list
   - Style do's textarea
   - Style don'ts textarea

**API Client Hooks Needed:**
```typescript
// tsx/packages/api-client/src/hooks/useBrandKitExtended.ts
useExtendedColors(brandKitId: string)
useUpdateExtendedColors()
useTypography(brandKitId: string)
useUpdateTypography()
useBrandVoice(brandKitId: string)
useUpdateBrandVoice()
useBrandGuidelines(brandKitId: string)
useUpdateBrandGuidelines()
```

---

## MODULE 4: TWITCH ADVANCED OPTIONS

### Backend Schema (EXISTING)

```python
# backend/api/schemas/twitch.py

class TwitchGenerateRequest(BaseModel):
    asset_type: TwitchAssetType
    brand_kit_id: str
    custom_prompt: Optional[str]  # max 500
    game_id: Optional[str]
    text_overlay: Optional[str]  # max 100
    include_logo: bool = False
```

### Frontend Implementation Required

**File:** `tsx/apps/web/src/app/dashboard/twitch/page.tsx`

**Add New Sections:**

1. **Text Overlay Input** (After Custom Prompt)
   - Text input, max 100 chars
   - Preview of text on asset mockup
   - Font style selector (from brand kit typography)

2. **Game Context** (New Step)
   - Game search/autocomplete
   - Uses `/api/v1/twitch/game-meta/{game_id}` endpoint
   - Shows game icon and current season
   - Influences generation style

3. **Logo Options** (Same as Generate page)
   - Include logo toggle
   - Position selector
   - Size selector

**Update API Call:**
```typescript
const result = await generateAssetMutation.mutateAsync({
  assetType: selectedAssetType,
  brandKitId: selectedBrandKitId,
  customPrompt: customPrompt || undefined,
  gameId: selectedGameId || undefined,
  textOverlay: textOverlay || undefined,
  includeLogo: includeLogo,
});
```

---

## MODULE 5: AUTH EXTENDED ENDPOINTS

### Backend Implementation Required

**File:** `backend/api/routes/auth.py`

**New Endpoints:**

```python
# 1. Password Reset Request
@router.post("/password-reset/request")
async def request_password_reset(email: EmailStr):
    """Send password reset email with token."""
    # Generate reset token, store in DB, send email
    pass

# 2. Password Reset Confirm
@router.post("/password-reset/confirm")
async def confirm_password_reset(token: str, new_password: str):
    """Reset password using token."""
    pass

# 3. Email Verification Request
@router.post("/email/verify/request")
async def request_email_verification(current_user: TokenPayload):
    """Send email verification link."""
    pass

# 4. Email Verification Confirm
@router.post("/email/verify/confirm")
async def confirm_email_verification(token: str):
    """Verify email using token."""
    pass

# 5. Update Profile
@router.put("/me")
async def update_profile(
    display_name: Optional[str],
    avatar_url: Optional[str],
    current_user: TokenPayload
):
    """Update user profile."""
    pass

# 6. Delete Account (GDPR)
@router.delete("/me")
async def delete_account(
    password: str,  # Require password confirmation
    current_user: TokenPayload
):
    """Permanently delete user account and all data."""
    pass

# 7. Change Password
@router.post("/me/password")
async def change_password(
    current_password: str,
    new_password: str,
    current_user: TokenPayload
):
    """Change password for authenticated user."""
    pass
```

**Database Migration Required:**
```sql
-- Migration 006: Auth tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT CHECK (token_type IN ('password_reset', 'email_verification')),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at);
```

### Frontend Implementation Required

**Files:**
- `tsx/apps/web/src/app/auth/forgot-password/page.tsx`
- `tsx/apps/web/src/app/auth/reset-password/page.tsx`
- `tsx/apps/web/src/app/auth/verify-email/page.tsx`
- `tsx/apps/web/src/app/dashboard/settings/page.tsx`

**Settings Page Sections:**
1. Profile (display name, avatar)
2. Security (change password)
3. Email (verification status, resend)
4. Danger Zone (delete account)

---

## VALIDATION CHECKLIST

### For Each Module, Verify:

- [ ] Backend endpoint exists and returns correct schema
- [ ] Database columns exist with correct types
- [ ] API client hook exists with correct types
- [ ] Frontend component calls hook correctly
- [ ] Error states handled (loading, error, empty)
- [ ] Form validation matches backend validation
- [ ] Success/error toasts shown
- [ ] Query invalidation on mutations
- [ ] TypeScript types match backend schemas exactly

### Testing Commands:

```bash
# Backend tests
cd backend && python -m pytest tests/ -v

# Frontend type check
cd tsx && npm run typecheck

# Frontend tests
cd tsx && npm run test

# E2E test (if available)
cd tsx && npm run test:e2e
```

---

## PARALLEL WORK DISTRIBUTION

### Subagent 1: Assets Management
- Create `tsx/apps/web/src/app/dashboard/assets/page.tsx`
- Create `tsx/packages/api-client/src/hooks/useAssets.ts`
- Create `tsx/packages/api-client/src/types/assets.ts`

### Subagent 2: Generation Brand Customization
- Update `tsx/apps/web/src/app/dashboard/generate/page.tsx`
- Update `tsx/packages/api-client/src/hooks/useGeneration.ts`

### Subagent 3: Brand Kit Extended UI
- Update `tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx`
- Create `tsx/packages/api-client/src/hooks/useBrandKitExtended.ts`

### Subagent 4: Twitch Advanced Options
- Update `tsx/apps/web/src/app/dashboard/twitch/page.tsx`
- Update `tsx/packages/api-client/src/hooks/useTwitch.ts`

### Subagent 5: Auth Extended
- Update `backend/api/routes/auth.py`
- Create `backend/database/migrations/006_auth_tokens.sql`
- Create auth frontend pages
- Create settings page

---

## SUCCESS CRITERIA

1. **Zero TypeScript Errors** - `npm run typecheck` passes
2. **All Backend Endpoints Callable** - Every endpoint has a frontend hook
3. **All Parameters Exposed** - Every backend parameter has UI control
4. **Error Handling Complete** - All error states have UI feedback
5. **Validation Aligned** - Frontend validation matches backend exactly
6. **No Silent Failures** - All API errors shown to user

