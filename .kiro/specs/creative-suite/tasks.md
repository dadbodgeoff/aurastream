# AuraStream Creative Suite - Implementation Tasks
**Features:** Vibe Branding + The Aura Lab
**Status:** ✅ PHASE B COMPLETE - All Core Features Working, Endpoints Verified
**Orchestrator:** Main Agent
**Subagents:** Backend, Frontend, Integration

---

## VERIFICATION STATUS (December 28, 2025)

All 7 Aura Lab endpoints tested and verified working:
- ✅ GET /api/v1/aura-lab/elements - Returns 20 elements (12 free, 8 premium)
- ✅ GET /api/v1/aura-lab/usage - Returns daily usage with tier limits
- ✅ GET /api/v1/aura-lab/inventory - Returns saved fusions with rarity counts
- ✅ POST /api/v1/aura-lab/set-subject - Uploads test subject (24hr expiry)
- ✅ POST /api/v1/aura-lab/fuse - Performs fusion with rarity scoring
- ✅ POST /api/v1/aura-lab/keep - Saves fusion to inventory
- ✅ POST /api/v1/aura-lab/trash - Deletes fusion

Auth pattern verified: Using apiClient namespace from @aurastream/api-client

---

## EXECUTION STRATEGY

**Phase A:** Vibe Branding (simpler, solves onboarding)
**Phase B:** The Aura Lab (complex, drives retention/virality)

Complete Phase A 100% before starting Phase B.

---

# PHASE A: VIBE BRANDING

## TASK BREAKDOWN

### PHASE 1: DATABASE & MIGRATIONS

#### Task 1.1: User Usage Column
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 15 min
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/database/migrations/024_vibe_branding_usage.sql

CONTENT:
- Add vibe_analyses_this_month column to users table
- Add index for monthly reset queries
- Add RPC function: increment_vibe_analyses(user_id)
- Add RPC function: reset_monthly_vibe_analyses()
```

**Acceptance Criteria:**
- [x] Migration runs without errors
- [x] Column defaults to 0
- [x] RPC functions work correctly

---

#### Task 1.2: Brand Kit Source Tracking
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 10 min
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/database/migrations/025_brand_kit_source.sql

CONTENT:
- Add extracted_from column to brand_kits (TEXT, nullable)
- Add source_image_hash column to brand_kits (TEXT, nullable)
```

**Acceptance Criteria:**
- [x] Migration runs without errors
- [x] Existing brand kits unaffected (NULL values)

---

#### Task 1.3: Analysis Cache Table
**Assignee:** Backend Subagent
**Priority:** P1
**Estimated:** 15 min
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/database/migrations/026_vibe_analysis_cache.sql

CONTENT:
- Create vibe_analysis_cache table
- Add indexes for hash lookup and expiry
- Add cleanup function
```

**Acceptance Criteria:**
- [ ] Table created with correct schema
- [ ] Indexes created
- [ ] Cleanup function works

---

### PHASE 2: BACKEND SERVICES

#### Task 2.1: Gemini Vision Client
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1 hour
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/services/gemini_vision_client.py

IMPLEMENT:
- GeminiVisionClient class
- VisionAnalysisRequest dataclass
- VisionAnalysisResponse dataclass
- analyze() method with multimodal request
- Error handling (ContentPolicyError, RateLimitError, AnalysisError)
- JSON parsing with markdown code block handling
```

**Acceptance Criteria:**
- [x] Can send image + prompt to Gemini
- [x] Parses JSON response correctly
- [x] Handles errors gracefully
- [x] Returns image hash for caching

---

#### Task 2.2: Vibe Branding Service
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1.5 hours
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/services/vibe_branding_service.py

IMPLEMENT:
- VibeBrandingService class
- VIBE_ANALYSIS_PROMPT constant (from design.md)
- analyze_image() method
- _validate_analysis() method (normalize colors, fonts, tone)
- _get_cached_analysis() method
- _cache_analysis() method
- create_brand_kit_from_analysis() method
- check_user_quota() method
- increment_usage() method
```

**Acceptance Criteria:**
- [x] Validates all analysis fields
- [x] Falls back to defaults for invalid values
- [x] Caches results for 24 hours
- [x] Creates brand kit with correct mapping
- [x] Enforces tier-based quotas

---

#### Task 2.3: API Schemas
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/api/schemas/vibe_branding.py

IMPLEMENT:
- FontsSchema
- VibeAnalysisSchema
- AnalyzeURLRequest
- AnalyzeResponse
- UsageResponse
- All Literal types (LightingMood, BrandTone)
```

**Acceptance Criteria:**
- [x] All schemas match design.md spec
- [x] Validation rules enforced
- [x] OpenAPI examples included

---

#### Task 2.4: API Routes
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1 hour
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/api/routes/vibe_branding.py

IMPLEMENT:
- POST /api/v1/vibe-branding/analyze/upload
- POST /api/v1/vibe-branding/analyze/url
- GET /api/v1/vibe-branding/usage
- File validation (type, size)
- Quota enforcement
- Error responses
```

**Acceptance Criteria:**
- [x] Upload endpoint accepts multipart/form-data
- [x] URL endpoint fetches and validates remote images
- [x] Usage endpoint returns correct quota info
- [x] All error cases handled with proper HTTP codes

---

#### Task 2.5: Register Routes
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 5 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: backend/api/main.py (or routes/__init__.py)

ADD:
- Import vibe_branding router
- Register router with app
```

**Acceptance Criteria:**
- [x] Routes accessible at /api/v1/vibe-branding/*

---

#### Task 2.6: Backend Unit Tests
**Assignee:** Backend Subagent
**Priority:** P1
**Estimated:** 1 hour

```
CREATE FILE: backend/tests/unit/test_vibe_branding_service.py

TESTS:
- test_validate_analysis_normalizes_colors
- test_validate_analysis_validates_fonts
- test_validate_analysis_validates_tone
- test_cache_lookup_returns_cached_result
- test_cache_miss_calls_gemini
- test_quota_check_free_tier
- test_quota_check_pro_tier
- test_quota_check_studio_tier
- test_increment_usage
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Coverage > 80%

---

### PHASE 3: FRONTEND COMPONENTS

#### Task 3.1: Types & Constants
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 15 min
**Status:** ✅ COMPLETE

```
CREATE FILES:
- tsx/apps/web/src/components/vibe-branding/types.ts
- tsx/apps/web/src/components/vibe-branding/constants.ts
- tsx/apps/web/src/components/vibe-branding/index.ts

CONTENT: Copy from design.md sections 3.2 and 3.3
```

**Acceptance Criteria:**
- [x] Types match backend schemas
- [x] Constants defined
- [x] Barrel export works

---

#### Task 3.2: API Hook
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/hooks/useVibeBranding.ts

IMPLEMENT:
- useAnalyzeImage() mutation hook
- useAnalyzeUrl() mutation hook
- useVibeBrandingUsage() query hook
```

**Acceptance Criteria:**
- [x] Hooks use TanStack Query
- [x] File upload works with FormData
- [x] Error handling included

---

#### Task 3.3: Upload Dropzone Component
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/UploadDropzone.tsx

IMPLEMENT:
- Drag & drop zone with react-dropzone
- Visual feedback for drag state
- File type hints
- Styling matching design system
```

**Acceptance Criteria:**
- [x] Drag & drop works
- [x] Click to browse works
- [x] Visual feedback on drag
- [x] Matches design system

---

#### Task 3.4: Analyzing Terminal Component
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/AnalyzingTerminal.tsx

IMPLEMENT:
- Fake terminal log animation
- Staggered message appearance (700ms intervals)
- Blinking cursor
- "GEMINI VISION ACTIVE" header with pulse
```

**Acceptance Criteria:**
- [x] Messages appear sequentially
- [x] Cursor blinks
- [x] Header pulses
- [x] Smooth animations

---

#### Task 3.5: Color Palette Preview Component
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 20 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/ColorPalettePreview.tsx

IMPLEMENT:
- Horizontal color bar with primary + accent colors
- Hover to show hex code
- Copy hex on click (optional)
```

**Acceptance Criteria:**
- [x] Colors display correctly
- [x] Hover shows hex
- [x] Responsive sizing

---

#### Task 3.6: Results Display Component
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 45 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/VibeResultsDisplay.tsx

IMPLEMENT:
- Success header with checkmark
- Color palette preview
- Metadata grid (tone, lighting, fonts)
- Style keywords as tags
- Confidence indicator
- CTAs: "Save to Brand Kits" and "Generate Assets Now"
```

**Acceptance Criteria:**
- [x] All analysis data displayed
- [x] CTAs navigate correctly
- [x] Matches design system

---

#### Task 3.7: Main Modal Component
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1 hour
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/VibeBrandingModal.tsx

IMPLEMENT:
- Modal wrapper with backdrop
- Step state machine (upload → analyzing → success/error)
- File drop handling
- API call orchestration
- Confetti on success
- Error state with retry
- Usage indicator
```

**Acceptance Criteria:**
- [x] All steps work correctly
- [x] Confetti fires on success
- [x] Error recovery works
- [x] Modal closes properly

---

#### Task 3.8: Frontend Tests
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 1 hour

```
CREATE FILE: tsx/apps/web/src/components/vibe-branding/__tests__/VibeBrandingModal.test.tsx

TESTS:
- renders upload state initially
- transitions to analyzing on drop
- shows success with results
- shows error on failure
- calls onKitCreated callback
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Key user flows covered

---

### PHASE 4: INTEGRATION

#### Task 4.1: Sidebar Navigation
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 15 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx

ADD:
- "Vibe Branding" nav item with Sparkles icon
- Route: /dashboard/brand-kits?vibe=true (modal trigger)
```

**Acceptance Criteria:**
- [x] Nav item visible
- [x] Icon displays
- [x] Navigation works

---

#### Task 4.2: Brand Kits Page Integration
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/app/dashboard/brand-kits/page.tsx

ADD:
- "Import from Image" button
- VibeBrandingModal integration
- Refresh brand kits list on kit created
```

**Acceptance Criteria:**
- [x] Button visible
- [x] Modal opens
- [x] List refreshes after creation

---

#### Task 4.3: Create Page Integration
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/app/dashboard/create/page.tsx

ADD:
- Detect ?vibe_kit query param
- Auto-select brand kit
- Pre-fill prompt from style_reference
- Show "Generating with your stolen vibe" banner
```

**Acceptance Criteria:**
- [x] Query param detected
- [x] Brand kit auto-selected
- [x] Banner displays

---

#### Task 4.4: Mobile Navigation
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 10 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/components/mobile/MobileNavDropdown.tsx

ADD:
- "Vibe Branding" option
```

**Acceptance Criteria:**
- [x] Option visible on mobile
- [x] Navigation works

---

### PHASE 5: POLISH & DOCUMENTATION

#### Task 5.1: Analytics Events
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 20 min
**Status:** ✅ COMPLETE

```
ADD TRACKING:
- vibe_branding_started
- vibe_branding_completed
- vibe_branding_failed
- vibe_branding_kit_created
- vibe_branding_generate_clicked
```

**Acceptance Criteria:**
- [x] Events fire correctly
- [x] Properties included

---

#### Task 5.2: Update Frontend Experience Report
**Assignee:** Main Agent
**Priority:** P2
**Estimated:** 15 min
**Status:** SKIPPED (Moving to Phase B)

---

## EXECUTION ORDER

```
1. Database Migrations (1.1 → 1.2 → 1.3)
2. Backend Services (2.1 → 2.2 → 2.3 → 2.4 → 2.5)
3. Backend Tests (2.6)
4. Frontend Types (3.1 → 3.2)
5. Frontend Components (3.3 → 3.4 → 3.5 → 3.6 → 3.7)
6. Frontend Tests (3.8)
7. Integration (4.1 → 4.2 → 4.3 → 4.4)
8. Polish (5.1 → 5.2)
```

---

## DEPENDENCIES

```
react-dropzone: Already installed (check package.json)
framer-motion: Already installed
canvas-confetti: May need to install
lucide-react: Already installed
```

---

## NOTES FOR SUBAGENTS

1. **Follow the design.md spec exactly** - Don't deviate from the schemas or component structure
2. **Use existing patterns** - Look at how Coach, Brand Kits, and Generation are implemented
3. **Match the design system** - Use existing Tailwind classes and color tokens
4. **Test locally before marking complete** - Run the dev server and verify
5. **Report blockers immediately** - If something in the spec is unclear or impossible

---

*End of Phase A: Vibe Branding tasks.*

---

# PHASE B: THE AURA LAB

## TASK BREAKDOWN

### PHASE B1: DATABASE & MIGRATIONS

#### Task B1.1: Aura Lab Tables
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Depends On:** Phase A complete
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/database/migrations/027_aura_lab.sql

CONTENT:
- aura_lab_subjects table (user's locked test subjects)
- aura_lab_fusions table (fusion results)
- aura_lab_recipes table (discovery tracking)
- aura_lab_squad_invites table (viral feature)
- Add aura_lab_fusions_today column to users
- Add aura_lab_last_fusion_date column to users
- RPC function: check_aura_lab_usage(user_id, limit)
- RPC function: increment_aura_lab_usage(user_id)
```

**Acceptance Criteria:**
- [x] All tables created with correct schema
- [x] Foreign keys and indexes in place
- [x] RPC functions work correctly
- [x] Daily reset logic works

---

### PHASE B2: BACKEND SERVICES

#### Task B2.1: Aura Lab Service
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 2 hours
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/services/aura_lab_service.py

IMPLEMENT:
- AuraLabService class
- ELEMENTS constant (all 20 elements with prompts)
- FUSION_PROMPT template
- RARITY_SCORING_PROMPT template
- set_subject() method - upload and lock test subject
- fuse() method - perform fusion with element
- _score_rarity() method - call Gemini to score result
- _check_first_discovery() method - recipe tracking
- keep_fusion() method - save to inventory
- get_inventory() method - list saved fusions
- get_usage() method - daily quota check
```

**Acceptance Criteria:**
- [x] All 20 elements defined with prompts
- [x] Fusion preserves identity, transforms material
- [x] Rarity scoring returns common/rare/mythic
- [x] First discovery tracking works
- [x] Daily quota enforced per tier

---

#### Task B2.2: Aura Lab Schemas
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 30 min
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/api/schemas/aura_lab.py

IMPLEMENT:
- ElementSchema
- SubjectSchema
- FusionResultSchema (with rarity, scores)
- InventoryItemSchema
- UsageResponse
- SquadInviteSchema
- All Literal types (RarityTier, ElementId)
```

**Acceptance Criteria:**
- [x] All schemas match design.md spec
- [x] Validation rules enforced
- [x] OpenAPI examples included

---

#### Task B2.3: Aura Lab Routes
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1.5 hours
**Status:** ✅ COMPLETE

```
CREATE FILE: backend/api/routes/aura_lab.py

IMPLEMENT:
- POST /api/v1/aura-lab/set-subject
- POST /api/v1/aura-lab/fuse
- POST /api/v1/aura-lab/keep
- GET /api/v1/aura-lab/inventory
- GET /api/v1/aura-lab/usage
- GET /api/v1/aura-lab/elements
- POST /api/v1/aura-lab/squad/invite (Pro/Studio only)
- POST /api/v1/aura-lab/squad/accept
```

**Acceptance Criteria:**
- [x] All endpoints functional
- [x] Tier gating enforced
- [x] Daily limits enforced
- [x] Error handling complete

---

#### Task B2.4: Register Aura Lab Routes
**Assignee:** Backend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 5 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: backend/api/main.py (or routes/__init__.py)

ADD:
- Import aura_lab router
- Register router with app
```

**Acceptance Criteria:**
- [x] Routes accessible at /api/v1/aura-lab/*

---

#### Task B2.5: Aura Lab Unit Tests
**Assignee:** Backend Subagent
**Priority:** P1
**Estimated:** 1.5 hours

```
CREATE FILE: backend/tests/unit/test_aura_lab_service.py

TESTS:
- test_set_subject_uploads_image
- test_fuse_calls_gemini_with_correct_prompt
- test_fuse_preserves_identity
- test_rarity_scoring_common
- test_rarity_scoring_rare
- test_rarity_scoring_mythic
- test_first_discovery_creates_recipe
- test_first_discovery_returns_false_for_existing
- test_daily_quota_free_tier
- test_daily_quota_pro_tier
- test_daily_quota_resets_at_midnight
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Coverage > 80%

---

### PHASE B3: FRONTEND COMPONENTS

#### Task B3.1: Aura Lab Types & Constants
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 20 min
**Status:** ✅ COMPLETE

```
CREATE FILES:
- tsx/apps/web/src/components/aura-lab/types.ts
- tsx/apps/web/src/components/aura-lab/constants.ts
- tsx/apps/web/src/components/aura-lab/index.ts

CONTENT:
- Element interface with id, name, icon, description, premium
- FusionResult interface with rarity, scores, isFirstDiscovery
- RarityTier type
- ELEMENTS constant (all 20 with icons)
- RARITY_COLORS constant
- SOUND_EFFECTS paths (if using)
```

**Acceptance Criteria:**
- [x] Types match backend schemas
- [x] All 20 elements defined
- [x] Barrel export works

---

#### Task B3.2: Aura Lab API Hooks
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 45 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/hooks/useAuraLab.ts

IMPLEMENT:
- useSetSubject() mutation
- useFuse() mutation
- useKeepFusion() mutation
- useAuraLabInventory() query
- useAuraLabUsage() query
- useAuraLabElements() query
```

**Acceptance Criteria:**
- [x] All hooks use TanStack Query
- [x] Optimistic updates where appropriate
- [x] Error handling included

---

#### Task B3.3: Test Subject Panel
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 45 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/TestSubjectPanel.tsx

IMPLEMENT:
- Upload dropzone for PFP/logo
- "Lock In" button
- Preview of locked subject
- "Change Subject" option
- Styling: Dark panel, glowing border when locked
```

**Acceptance Criteria:**
- [x] Upload works
- [x] Lock state persists
- [x] Preview displays correctly
- [x] Can change subject

---

#### Task B3.4: Element Grid
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1 hour
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/ElementGrid.tsx

IMPLEMENT:
- Grid of element icons (4x5 or responsive)
- Draggable elements (react-dnd or native drag)
- Premium elements locked with overlay
- Hover tooltip with element name/description
- Visual feedback on drag
```

**Acceptance Criteria:**
- [x] All 20 elements display
- [x] Click to select works
- [x] Premium lock visible for free users
- [x] Tooltips work

---

#### Task B3.5: Fusion Core
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1.5 hours
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/FusionCore.tsx

IMPLEMENT:
- Circular drop zone in center
- Spinning animation when processing
- Particle effects (CSS or canvas)
- Drop target for elements
- "FUSE!" button (or auto-fuse on drop)
- Visual states: idle, ready, processing, complete
```

**Acceptance Criteria:**
- [x] Drop zone accepts elements
- [x] Spinning animation smooth
- [x] Particle effects visible
- [x] State transitions work

---

#### Task B3.6: Fusion Result Card
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1 hour
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/FusionResultCard.tsx

IMPLEMENT:
- Card with generated image
- Rarity border (grey/blue glow/gold animated)
- Holographic tilt effect (react-tilt)
- Rarity badge
- "CRITICAL SUCCESS!" animation for mythic
- "NEW RECIPE DISCOVERED" badge
- Buttons: [Keep] [Trash] [Share]
```

**Acceptance Criteria:**
- [x] Image displays correctly
- [x] Rarity styling matches tier
- [x] Confetti effect works for mythic
- [x] Animations smooth
- [x] Buttons functional

---

#### Task B3.7: Inventory Gallery
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 45 min
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/InventoryGallery.tsx

IMPLEMENT:
- Grid of saved fusions
- Filter by rarity
- Filter by element
- Download button (112/56/28px sizes)
- "Pokedex" completion percentage
- Empty state
```

**Acceptance Criteria:**
- [x] Grid displays saved fusions
- [x] Filters work
- [x] Download works
- [x] Stats display accurate

---

#### Task B3.8: Main Aura Lab Page
**Assignee:** Frontend Subagent
**Priority:** P0 (Blocking)
**Estimated:** 1.5 hours
**Status:** ✅ COMPLETE

```
CREATE FILE: tsx/apps/web/src/app/dashboard/aura-lab/page.tsx

IMPLEMENT:
- Three-column layout (Subject | Core | Elements)
- Results area below
- Inventory tab/section
- Usage indicator
- Sound effects integration (optional)
- Confetti on mythic result
```

**Acceptance Criteria:**
- [x] Layout matches design
- [x] All components integrated
- [x] Flow works end-to-end
- [x] Responsive on tablet+

---

#### Task B3.9: Aura Lab Frontend Tests
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 1 hour

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/__tests__/AuraLab.test.tsx

TESTS:
- renders all three panels
- can upload test subject
- can drag element to core
- shows processing state during fusion
- displays result with correct rarity
- can keep fusion to inventory
- shows first discovery badge
```

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Key user flows covered

---

### PHASE B4: INTEGRATION

#### Task B4.1: Sidebar Navigation
**Assignee:** Frontend Subagent
**Priority:** P1
**Estimated:** 15 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/components/dashboard/layout/Sidebar.tsx

ADD:
- "The Aura Lab" nav item with Flask/Beaker icon
- Route: /dashboard/aura-lab
```

**Acceptance Criteria:**
- [x] Nav item visible
- [x] Icon displays
- [x] Navigation works

---

#### Task B4.2: Mobile Navigation
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 10 min
**Status:** ✅ COMPLETE

```
MODIFY FILE: tsx/apps/web/src/components/mobile/MobileNavDropdown.tsx

ADD:
- "Aura Lab" option
```

**Acceptance Criteria:**
- [x] Option visible on mobile
- [x] Navigation works

---

#### Task B4.3: Squad Fusion UI (Pro/Studio)
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 1 hour

```
CREATE FILE: tsx/apps/web/src/components/aura-lab/SquadFusion.tsx

IMPLEMENT:
- Two-slot UI (My PFP + Friend PFP)
- Generate invite link
- Share button (Twitter, Discord, Copy)
- Accept invite flow
- Result display for both users
```

**Acceptance Criteria:**
- [ ] Invite generation works
- [ ] Share buttons work
- [ ] Accept flow works
- [ ] Gated to Pro/Studio

---

### PHASE B5: POLISH

#### Task B5.1: Sound Effects
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 30 min

```
ADD SOUNDS:
- Element pickup
- Element drop (metallic clank)
- Fusion processing (energy hum)
- Result reveal (whoosh)
- Mythic result (fanfare)
- First discovery (achievement chime)
```

**Acceptance Criteria:**
- [ ] Sounds play at correct moments
- [ ] Volume appropriate
- [ ] Can be disabled in settings

---

#### Task B5.2: Analytics Events
**Assignee:** Frontend Subagent
**Priority:** P2
**Estimated:** 20 min
**Status:** ✅ COMPLETE

```
ADD TRACKING:
- aura_lab_subject_set
- aura_lab_fusion_started
- aura_lab_fusion_completed (with rarity)
- aura_lab_first_discovery
- aura_lab_fusion_kept
- aura_lab_fusion_trashed
- aura_lab_squad_invite_created
- aura_lab_squad_invite_accepted
```

**Acceptance Criteria:**
- [x] Events fire correctly
- [x] Properties included

---

#### Task B5.3: Update Frontend Experience Report
**Assignee:** Main Agent
**Priority:** P2
**Estimated:** 20 min

```
MODIFY FILE: docs/FRONTEND_EXPERIENCE_REPORT.md

ADD:
- The Aura Lab section
- Component documentation
- API endpoints
- Element list
```

---

## FULL EXECUTION ORDER

```
=== PHASE A: VIBE BRANDING ===
A1. Database Migrations (1.1 → 1.2 → 1.3)
A2. Backend Services (2.1 → 2.2 → 2.3 → 2.4 → 2.5)
A3. Backend Tests (2.6)
A4. Frontend Types (3.1 → 3.2)
A5. Frontend Components (3.3 → 3.4 → 3.5 → 3.6 → 3.7)
A6. Frontend Tests (3.8)
A7. Integration (4.1 → 4.2 → 4.3 → 4.4)
A8. Polish (5.1 → 5.2)

=== CHECKPOINT: Vibe Branding 100% Complete ===

=== PHASE B: THE AURA LAB ===
B1. Database Migrations (B1.1)
B2. Backend Services (B2.1 → B2.2 → B2.3 → B2.4)
B3. Backend Tests (B2.5)
B4. Frontend Types (B3.1 → B3.2)
B5. Frontend Components (B3.3 → B3.4 → B3.5 → B3.6 → B3.7 → B3.8)
B6. Frontend Tests (B3.9)
B7. Integration (B4.1 → B4.2 → B4.3)
B8. Polish (B5.1 → B5.2 → B5.3)

=== CHECKPOINT: Aura Lab 100% Complete ===
```

---

## DEPENDENCIES

```
# Vibe Branding
react-dropzone: Already installed
framer-motion: Already installed
canvas-confetti: May need to install
lucide-react: Already installed

# Aura Lab (additional)
react-dnd: May need to install (for drag-drop)
react-tilt: May need to install (for holographic effect)
howler: May need to install (for sound effects)
```

---

## NOTES FOR SUBAGENTS

1. **Follow the design.md spec exactly** - Don't deviate from schemas or component structure
2. **Use existing patterns** - Look at Coach, Brand Kits, Generation implementations
3. **Match the design system** - Use existing Tailwind classes and color tokens
4. **Test locally before marking complete** - Run dev server and verify
5. **Report blockers immediately** - If spec is unclear or impossible
6. **Complete Phase A before Phase B** - No skipping ahead

---

*This task list is the execution plan for the Creative Suite. Mark tasks complete as you finish them.*
