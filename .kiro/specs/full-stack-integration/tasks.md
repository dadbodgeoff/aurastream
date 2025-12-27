# FULL-STACK INTEGRATION TASKS

## Task Distribution for Parallel Subagent Execution

---

## TASK GROUP 1: ASSETS MANAGEMENT PAGE

### Task 1.1: Create Asset Types
**File:** `tsx/packages/api-client/src/types/assets.ts`
**Priority:** HIGH
**Dependencies:** None

```typescript
// Create this file with exact types matching backend schemas

export type AssetType = 'thumbnail' | 'overlay' | 'banner' | 'story_graphic' | 'clip_cover';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'partial';

export interface Job {
  id: string;
  userId: string;
  brandKitId: string;
  assetType: AssetType;
  status: JobStatus;
  progress: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
}

export interface Asset {
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

export interface AssetListResponse {
  assets: Asset[];
  total: number;
  limit: number;
  offset: number;
}
```

### Task 1.2: Create Asset Hooks
**File:** `tsx/packages/api-client/src/hooks/useAssets.ts`
**Priority:** HIGH
**Dependencies:** Task 1.1

```typescript
// Implement these hooks using TanStack Query
// Follow pattern from useLogos.ts

export function useJobs(filters?: { status?: string; limit?: number; offset?: number });
export function useJob(jobId: string);
export function useJobAssets(jobId: string);
```

**Backend Endpoints:**
- `GET /api/v1/jobs` → List jobs
- `GET /api/v1/jobs/{job_id}` → Get single job
- `GET /api/v1/jobs/{job_id}/assets` → Get job assets

### Task 1.3: Create Assets Page
**File:** `tsx/apps/web/src/app/dashboard/assets/page.tsx`
**Priority:** HIGH
**Dependencies:** Task 1.2

**Requirements:**
1. Page header with title "My Assets"
2. Filter bar: status dropdown, asset type dropdown, date range
3. Jobs list with:
   - Job card showing status, progress bar, asset type, created date
   - Expand to show assets grid
   - Status badges: queued (yellow), processing (blue), completed (green), failed (red)
4. Asset grid with:
   - Thumbnail preview
   - Hover actions: Download, Copy URL, Toggle visibility
   - Click to open full preview modal
5. Empty state with CTA to generate page
6. Polling for in-progress jobs (every 2 seconds)
7. Pagination (20 items per page)

**Design Tokens:**
- Use existing design system from brand-kits pages
- SectionCard component pattern
- Primary color: Electric Purple (#8B5CF6)
- Accent: Neon Cyan (#00D9FF)

---

## TASK GROUP 2: GENERATION BRAND CUSTOMIZATION

### Task 2.1: Update Generation Types
**File:** `tsx/packages/api-client/src/types/generation.ts`
**Priority:** HIGH
**Dependencies:** None

```typescript
// Add/update these types to match backend BrandCustomization schema

export interface ColorSelection {
  primaryIndex?: number;  // 0-4
  secondaryIndex?: number;  // 0-4
  accentIndex?: number;  // 0-2
  useGradient?: number;  // 0-2
}

export interface TypographySelection {
  level: 'display' | 'headline' | 'subheadline' | 'body' | 'caption' | 'accent';
}

export interface VoiceSelection {
  useTagline?: boolean;
  useCatchphrase?: number;  // Index of catchphrase
}

export type LogoType = 'primary' | 'secondary' | 'icon' | 'watermark';
export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
export type LogoSize = 'small' | 'medium' | 'large';
export type BrandIntensity = 'subtle' | 'balanced' | 'strong';

export interface BrandCustomization {
  colors?: ColorSelection;
  typography?: TypographySelection;
  voice?: VoiceSelection;
  includeLogo?: boolean;
  logoType?: LogoType;
  logoPosition?: LogoPosition;
  logoSize?: LogoSize;
  brandIntensity?: BrandIntensity;
}

export interface GenerateRequest {
  assetType: AssetType;
  brandKitId: string;
  customPrompt?: string;
  brandCustomization?: BrandCustomization;
}
```

### Task 2.2: Update Generation Hook
**File:** `tsx/packages/api-client/src/hooks/useGeneration.ts`
**Priority:** HIGH
**Dependencies:** Task 2.1

**Update `useGenerateAsset` mutation to:**
1. Accept full `BrandCustomization` object
2. Transform camelCase to snake_case for API
3. Handle all new parameters

### Task 2.3: Update Generate Page UI
**File:** `tsx/apps/web/src/app/dashboard/generate/page.tsx`
**Priority:** HIGH
**Dependencies:** Task 2.2

**Add New UI Sections:**

1. **Brand Intensity Selector** (After Logo Options)
   ```tsx
   const BRAND_INTENSITIES = [
     { id: 'subtle', label: 'Subtle', description: 'Light brand presence' },
     { id: 'balanced', label: 'Balanced', description: 'Moderate brand elements' },
     { id: 'strong', label: 'Strong', description: 'Bold brand expression' },
   ];
   ```

2. **Advanced Options Collapsible** (New Section)
   - Toggle to show/hide advanced options
   - Contains: Color Selection, Typography, Voice

3. **Color Selection** (Inside Advanced)
   - Fetch brand kit's extended colors
   - Show color swatches for primary colors (0-4)
   - Radio/checkbox selection for primary_index
   - Optional secondary_index, accent_index
   - Gradient toggle if gradients exist

4. **Typography Selection** (Inside Advanced)
   - Dropdown with 6 levels
   - Show preview text in selected style

5. **Voice Selection** (Inside Advanced)
   - Checkbox: "Include tagline"
   - Dropdown: Select catchphrase (fetch from brand kit voice)

6. **Logo Type Selection** (Enhance existing)
   - Fetch available logo types from brand kit
   - Radio buttons for available types only

**State Management:**
```typescript
const [brandIntensity, setBrandIntensity] = useState<BrandIntensity>('balanced');
const [showAdvanced, setShowAdvanced] = useState(false);
const [primaryColorIndex, setPrimaryColorIndex] = useState(0);
const [secondaryColorIndex, setSecondaryColorIndex] = useState<number | undefined>();
const [accentColorIndex, setAccentColorIndex] = useState<number | undefined>();
const [useGradient, setUseGradient] = useState(false);
const [gradientIndex, setGradientIndex] = useState(0);
const [typographyLevel, setTypographyLevel] = useState<TypographyLevel>('headline');
const [useTagline, setUseTagline] = useState(false);
const [selectedCatchphraseIndex, setSelectedCatchphraseIndex] = useState<number | undefined>();
const [selectedLogoType, setSelectedLogoType] = useState<LogoType>('primary');
```

---

## TASK GROUP 3: BRAND KIT EXTENDED UI

### Task 3.1: Create Extended Hooks
**File:** `tsx/packages/api-client/src/hooks/useBrandKitExtended.ts`
**Priority:** MEDIUM
**Dependencies:** None

```typescript
// Implement hooks for extended brand kit endpoints

// Extended Colors
export function useExtendedColors(brandKitId: string | undefined);
export function useUpdateExtendedColors();

// Typography
export function useTypography(brandKitId: string | undefined);
export function useUpdateTypography();

// Brand Voice
export function useBrandVoice(brandKitId: string | undefined);
export function useUpdateBrandVoice();

// Guidelines
export function useBrandGuidelines(brandKitId: string | undefined);
export function useUpdateBrandGuidelines();
```

**Backend Endpoints:**
- `GET/PUT /api/v1/brand-kits/{id}/colors`
- `GET/PUT /api/v1/brand-kits/{id}/typography`
- `GET/PUT /api/v1/brand-kits/{id}/voice`
- `GET/PUT /api/v1/brand-kits/{id}/guidelines`

### Task 3.2: Create Extended Types
**File:** `tsx/packages/api-client/src/types/brandKitExtended.ts`
**Priority:** MEDIUM
**Dependencies:** None

```typescript
// Match backend/api/schemas/brand_kit_enhanced.py exactly

export interface ExtendedColor {
  hex: string;
  name: string;
  usage: string;
}

export interface GradientStop {
  color: string;
  position: number;
}

export interface Gradient {
  name: string;
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export interface ColorPalette {
  primary: ExtendedColor[];
  secondary: ExtendedColor[];
  accent: ExtendedColor[];
  neutral: ExtendedColor[];
  gradients: Gradient[];
}

export interface FontConfig {
  family: string;
  weight: number;
  style: 'normal' | 'italic';
}

export interface Typography {
  display?: FontConfig;
  headline?: FontConfig;
  subheadline?: FontConfig;
  body?: FontConfig;
  caption?: FontConfig;
  accent?: FontConfig;
}

export type ExtendedTone = 
  | 'competitive' | 'casual' | 'educational' | 'comedic'
  | 'professional' | 'inspirational' | 'edgy' | 'wholesome';

export interface BrandVoice {
  tone: ExtendedTone;
  personalityTraits: string[];
  tagline?: string;
  catchphrases: string[];
  contentThemes: string[];
}

export interface BrandGuidelines {
  logoMinSizePx: number;
  logoClearSpaceRatio: number;
  primaryColorRatio: number;
  secondaryColorRatio: number;
  accentColorRatio: number;
  prohibitedModifications: string[];
  styleDo?: string;
  styleDont?: string;
}
```

### Task 3.3: Update Brand Kit Edit Page
**File:** `tsx/apps/web/src/app/dashboard/brand-kits/[id]/page.tsx`
**Priority:** MEDIUM
**Dependencies:** Task 3.1, Task 3.2

**Add New Tabs:**

1. **Extended Colors Tab**
   - Color palette editor with 4 categories
   - Each color: hex picker, name input, usage textarea
   - Add/remove colors (respect max limits)
   - Gradient editor with visual preview
   - Save button with loading state

2. **Typography Tab**
   - 6 typography level editors
   - Font family dropdown (use SUPPORTED_FONTS from backend)
   - Weight slider (100-900 in 100 increments)
   - Style toggle (normal/italic)
   - Live preview panel

3. **Brand Voice Tab**
   - Tone selector (8 options as cards)
   - Personality traits tag input (max 5)
   - Tagline input (max 100 chars)
   - Catchphrases list editor (max 10)
   - Content themes tag input (max 5)

4. **Guidelines Tab**
   - Logo minimum size slider (16-512px)
   - Clear space ratio slider (0.1-1.0)
   - Color ratio inputs with validation (sum ≤ 100)
   - Prohibited modifications list
   - Style do's textarea (max 500)
   - Style don'ts textarea (max 500)

**Tab Navigation:**
```tsx
const TABS = [
  { id: 'basics', label: 'Basics' },
  { id: 'logos', label: 'Logos' },
  { id: 'colors', label: 'Extended Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'voice', label: 'Brand Voice' },
  { id: 'guidelines', label: 'Guidelines' },
];
```

---

## TASK GROUP 4: TWITCH ADVANCED OPTIONS

### Task 4.1: Update Twitch Types
**File:** `tsx/packages/api-client/src/types/twitch.ts`
**Priority:** MEDIUM
**Dependencies:** None

**Verify/Add:**
```typescript
export interface TwitchGenerateRequest {
  assetType: TwitchAssetType;
  brandKitId: string;
  customPrompt?: string;
  gameId?: string;
  textOverlay?: string;
  includeLogo?: boolean;
}

export interface GameMetaResponse {
  id: string;
  name: string;
  currentSeason?: string;
  genre?: string;
  iconUrl?: string;
}
```

### Task 4.2: Add Game Meta Hook
**File:** `tsx/packages/api-client/src/hooks/useTwitch.ts`
**Priority:** MEDIUM
**Dependencies:** Task 4.1

```typescript
// Add hook for game metadata
export function useGameMeta(gameId: string | undefined);
```

**Backend Endpoint:**
- `GET /api/v1/twitch/game-meta/{game_id}`

### Task 4.3: Update Twitch Page
**File:** `tsx/apps/web/src/app/dashboard/twitch/page.tsx`
**Priority:** MEDIUM
**Dependencies:** Task 4.2

**Add New Sections:**

1. **Text Overlay Input** (After Custom Prompt)
   ```tsx
   <SectionCard>
     <h2>Text Overlay</h2>
     <input 
       value={textOverlay}
       onChange={(e) => setTextOverlay(e.target.value)}
       maxLength={100}
       placeholder="GG, POG, etc."
     />
     <span>{textOverlay.length}/100</span>
   </SectionCard>
   ```

2. **Game Context** (New Section)
   - Game search input with autocomplete
   - Display selected game info (icon, name, season)
   - Clear button

3. **Logo Options** (New Section - same as Generate page)
   - Include logo toggle
   - Position selector (5 options)
   - Size selector (3 options)

**State:**
```typescript
const [textOverlay, setTextOverlay] = useState('');
const [selectedGameId, setSelectedGameId] = useState<string | undefined>();
const [includeLogo, setIncludeLogo] = useState(false);
const [logoPosition, setLogoPosition] = useState<LogoPosition>('bottom-right');
const [logoSize, setLogoSize] = useState<LogoSize>('medium');
```

---

## TASK GROUP 5: AUTH EXTENDED

### Task 5.1: Create Auth Tokens Migration
**File:** `backend/database/migrations/006_auth_tokens.sql`
**Priority:** HIGH
**Dependencies:** None

```sql
-- Migration 006: Auth tokens for password reset and email verification

CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_type TEXT NOT NULL CHECK (token_type IN ('password_reset', 'email_verification')),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_type_expires ON auth_tokens(token_type, expires_at);

-- Clean up expired tokens (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM auth_tokens WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE auth_tokens IS 'Tokens for password reset and email verification';
```

### Task 5.2: Create Auth Token Service
**File:** `backend/services/auth_token_service.py`
**Priority:** HIGH
**Dependencies:** Task 5.1

```python
# Implement token generation and validation
class AuthTokenService:
    async def create_password_reset_token(self, user_id: str) -> str:
        """Generate password reset token, store hash, return plain token."""
        pass
    
    async def validate_password_reset_token(self, token: str) -> Optional[str]:
        """Validate token, return user_id if valid."""
        pass
    
    async def create_email_verification_token(self, user_id: str) -> str:
        """Generate email verification token."""
        pass
    
    async def validate_email_verification_token(self, token: str) -> Optional[str]:
        """Validate token, return user_id if valid."""
        pass
    
    async def mark_token_used(self, token_id: str) -> None:
        """Mark token as used."""
        pass
```

### Task 5.3: Add Auth Endpoints
**File:** `backend/api/routes/auth.py`
**Priority:** HIGH
**Dependencies:** Task 5.2

**Add these endpoints:**

```python
# Password Reset
@router.post("/password-reset/request")
async def request_password_reset(data: PasswordResetRequest):
    """Send password reset email."""
    pass

@router.post("/password-reset/confirm")
async def confirm_password_reset(data: PasswordResetConfirm):
    """Reset password with token."""
    pass

# Email Verification
@router.post("/email/verify/request")
async def request_email_verification(current_user: TokenPayload):
    """Send verification email."""
    pass

@router.get("/email/verify/{token}")
async def verify_email(token: str):
    """Verify email with token."""
    pass

# Profile Management
@router.put("/me")
async def update_profile(data: ProfileUpdate, current_user: TokenPayload):
    """Update display name and avatar."""
    pass

@router.post("/me/password")
async def change_password(data: PasswordChange, current_user: TokenPayload):
    """Change password."""
    pass

@router.delete("/me")
async def delete_account(data: AccountDelete, current_user: TokenPayload):
    """Delete account (requires password confirmation)."""
    pass
```

### Task 5.4: Create Auth Schemas
**File:** `backend/api/schemas/auth.py`
**Priority:** HIGH
**Dependencies:** None

**Add these schemas:**

```python
class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=50)
    avatar_url: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class AccountDelete(BaseModel):
    password: str  # Require password confirmation
    confirmation: str = Field(pattern="^DELETE$")  # Must type "DELETE"
```

### Task 5.5: Create Auth Frontend Pages
**Files:**
- `tsx/apps/web/src/app/auth/forgot-password/page.tsx`
- `tsx/apps/web/src/app/auth/reset-password/page.tsx`
- `tsx/apps/web/src/app/auth/verify-email/page.tsx`

**Priority:** MEDIUM
**Dependencies:** Task 5.3

### Task 5.6: Create Settings Page
**File:** `tsx/apps/web/src/app/dashboard/settings/page.tsx`
**Priority:** MEDIUM
**Dependencies:** Task 5.3

**Sections:**
1. Profile (display name, avatar upload)
2. Email (status, resend verification)
3. Security (change password)
4. Danger Zone (delete account with confirmation)

---

## VERIFICATION TASKS

### Task V1: Type Alignment Check
**Priority:** HIGH
**After:** All implementation tasks

Run TypeScript compiler to verify all types align:
```bash
cd tsx && npm run typecheck
```

### Task V2: API Integration Test
**Priority:** HIGH
**After:** All implementation tasks

Test each endpoint manually:
1. Start backend: `docker compose up`
2. Login as test user
3. Call each new endpoint
4. Verify response matches schema

### Task V3: UI Smoke Test
**Priority:** HIGH
**After:** All implementation tasks

1. Navigate to each new/updated page
2. Verify all controls render
3. Test form submissions
4. Check error handling
5. Verify loading states

---

## COMPLETION CHECKLIST

### Module 1: Assets Management
- [ ] Types created (`types/assets.ts`)
- [ ] Hooks created (`hooks/useAssets.ts`)
- [ ] Page created (`dashboard/assets/page.tsx`)
- [ ] Job list renders
- [ ] Asset grid renders
- [ ] Polling works
- [ ] Actions work (download, copy, visibility)

### Module 2: Generation Customization
- [ ] Types updated (`types/generation.ts`)
- [ ] Hook updated (`hooks/useGeneration.ts`)
- [ ] Brand intensity selector added
- [ ] Advanced options collapsible added
- [ ] Color selection works
- [ ] Typography selection works
- [ ] Voice selection works
- [ ] Logo type selection works
- [ ] API call includes all parameters

### Module 3: Brand Kit Extended
- [ ] Types created (`types/brandKitExtended.ts`)
- [ ] Hooks created (`hooks/useBrandKitExtended.ts`)
- [ ] Extended Colors tab added
- [ ] Typography tab added
- [ ] Brand Voice tab added
- [ ] Guidelines tab added
- [ ] All forms save correctly

### Module 4: Twitch Advanced
- [ ] Types verified/updated
- [ ] Game meta hook added
- [ ] Text overlay input added
- [ ] Game context selector added
- [ ] Logo options added
- [ ] API call includes all parameters

### Module 5: Auth Extended
- [ ] Migration created and run
- [ ] Token service created
- [ ] Endpoints added
- [ ] Schemas added
- [ ] Forgot password page created
- [ ] Reset password page created
- [ ] Verify email page created
- [ ] Settings page created

---

## NOTES FOR SUBAGENTS

1. **Follow Existing Patterns** - Look at `useLogos.ts` and `useBrandKits.ts` for hook patterns
2. **Use Design System** - Copy component patterns from existing pages
3. **Match Backend Exactly** - TypeScript types must match Pydantic schemas
4. **Handle All States** - Loading, error, empty, success
5. **Invalidate Queries** - On mutations, invalidate related queries
6. **Test Locally** - Run `docker compose up` and test manually
7. **No Silent Failures** - Always show errors to user

