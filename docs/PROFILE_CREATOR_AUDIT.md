# 🎨 Profile Picture & Logo Creator - Implementation Complete

**Date:** December 28, 2025  
**Status:** ✅ IMPLEMENTED

---

## Summary

The Profile Picture & Logo Creator feature has been fully implemented, leveraging the existing Prompt Coach infrastructure with specialized prompts for profile pictures and logos.

### Rate Limits

| Tier | Monthly Limit |
|------|---------------|
| Free | 1 creation |
| Pro | 5 creations |
| Studio | 10 creations |

---

## Files Created/Modified

### Backend (New Files)
- `backend/database/migrations/032_profile_creator.sql` - Database migration
- `backend/api/routes/profile_creator.py` - API endpoints
- `backend/api/schemas/profile_creator.py` - Pydantic schemas
- `backend/services/profile_creator_service.py` - Service layer

### Backend (Modified Files)
- `backend/services/usage_limit_service.py` - Added `profile_creator` feature
- `backend/api/routes/usage.py` - Added profile_creator to status response
- `backend/api/schemas/generation.py` - Added `profile_picture`, `streamer_logo` asset types
- `backend/api/main.py` - Registered profile_creator router
- `backend/services/coach/models.py` - Added `metadata` field to CoachSession
- `backend/services/coach/session_manager.py` - Added `update_session_metadata` method

### Frontend (New Files)
- `tsx/packages/api-client/src/types/profileCreator.ts` - TypeScript types
- `tsx/packages/api-client/src/hooks/useProfileCreator.ts` - React Query hooks
- `tsx/apps/web/src/app/dashboard/profile-creator/page.tsx` - Main page
- `tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx` - Core component
- `tsx/apps/web/src/components/profile-creator/StyleSelector.tsx` - Style presets
- `tsx/apps/web/src/components/profile-creator/GenerationOptions.tsx` - Generation options
- `tsx/apps/web/src/components/profile-creator/ProfileGallery.tsx` - Gallery view
- `tsx/apps/web/src/components/profile-creator/index.ts` - Exports

### Frontend (Modified Files)
- `tsx/packages/api-client/src/types/usageLimits.ts` - Added profile_creator
- `tsx/packages/api-client/src/hooks/useUsageLimits.ts` - Added profile_creator support

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile-creator/access` | Check access & remaining quota |
| POST | `/api/v1/profile-creator/start` | Start creation session (SSE) |
| POST | `/api/v1/profile-creator/sessions/{id}/messages` | Continue chat (SSE) |
| GET | `/api/v1/profile-creator/sessions/{id}` | Get session state |
| POST | `/api/v1/profile-creator/sessions/{id}/generate` | Generate from session |
| GET | `/api/v1/profile-creator/gallery` | Get user's profile pics/logos |

---

## Features

### Style Presets
- 🎮 Gaming - Bold, dynamic gaming aesthetic
- ✨ Minimal - Clean, simple, modern
- 🌈 Vibrant - Colorful, energetic
- 🎌 Anime - Anime/manga inspired
- 👾 Retro - Pixel art, 8-bit style
- 💼 Professional - Clean, corporate look
- 🎨 Custom - User-defined style

### Output Options
- Sizes: 256px, 512px, 1024px (square)
- Formats: PNG, WebP
- Background: Transparent, Solid color

### User Flow
1. Select type (Profile Picture or Logo)
2. Choose style preset
3. Chat with AI coach to refine description
4. Configure output options
5. Generate and save to gallery

---

## To Deploy

1. Run the database migration:
   ```sql
   -- Execute backend/database/migrations/032_profile_creator.sql
   ```

2. Restart the backend server to load new routes

3. Build and deploy the frontend

---

## 1. Existing Infrastructure to Leverage

### 1.1 Coach System (100% Reusable)

The Prompt Coach is a sophisticated multi-component system we can fully leverage:

```
backend/services/coach/
├── coach_service.py         # Main orchestrator - REUSE with custom prompts
├── session_manager.py       # Redis sessions - REUSE as-is
├── intent_extractor.py      # Extract descriptions - REUSE as-is
├── prompt_builder.py        # Build prompts - EXTEND for profile/logo
├── response_processor.py    # Process responses - REUSE as-is
├── llm_client.py            # Gemini streaming - REUSE as-is
└── validator.py             # Validate output - EXTEND for profile/logo
```

**Key Pattern:** Coach helps users describe WHAT they want, not HOW to prompt. The actual prompt engineering happens in the generation pipeline.

### 1.2 Usage Limits System (Extend)

Current system tracks 4 features:
- `vibe_branding` - 1 free / 10 pro
- `aura_lab` - 2 free / 25 pro  
- `coach` - 1 free / unlimited pro
- `creations` - 3 free / 50 pro

**Required Change:** Add `profile_creator` as a 5th feature type.

### 1.3 Generation Pipeline (100% Reusable)

```python
# Current asset types in generation.py
AssetTypeEnum = Literal[
    "thumbnail", "overlay", "banner", "story_graphic", "clip_cover",
    "twitch_emote", "twitch_badge", "twitch_panel", "twitch_offline",
    # ... emote sizes
]
```

**Required Change:** Add `"profile_picture"` and `"streamer_logo"` asset types.

### 1.4 Frontend Patterns (Follow Existing)

Dashboard structure follows consistent pattern:
```
tsx/apps/web/src/app/dashboard/
├── aura-lab/page.tsx      # Tab-based feature page
├── coach/page.tsx         # Coach chat page
├── brand-kits/page.tsx    # Brand management
└── [new] profile-creator/page.tsx  # NEW
```

---

## 2. Architecture Design

### 2.1 Backend Structure

```
backend/
├── api/
│   ├── routes/
│   │   └── profile_creator.py     # NEW - Dedicated endpoints
│   └── schemas/
│       └── profile_creator.py     # NEW - Request/response schemas
├── services/
│   └── profile_creator_service.py # NEW - Thin wrapper around coach
└── database/
    └── migrations/
        └── 032_profile_creator.sql # NEW - Usage tracking column
```

### 2.2 Frontend Structure

```
tsx/apps/web/src/
├── app/dashboard/
│   └── profile-creator/
│       └── page.tsx               # NEW - Main page
├── components/
│   └── profile-creator/
│       ├── ProfileCreatorCore.tsx # NEW - Main UI component
│       ├── StyleSelector.tsx      # NEW - Style presets
│       ├── PreviewPanel.tsx       # NEW - Live preview
│       └── ResultGallery.tsx      # NEW - Generated results
└── hooks/
    └── useProfileCreator.ts       # NEW - Custom hook
```

### 2.3 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROFILE CREATOR FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. User opens Profile Creator tab
   └── Check usage limit (profile_creator feature)
   └── Show remaining quota (X/5 this month)

2. User starts creation session
   └── POST /api/v1/profile-creator/start
   └── Increment usage counter
   └── Create coach session with specialized prompts

3. Coach conversation (SSE streaming)
   └── Specialized system prompt for profile pictures
   └── Gather: subject, style, mood, colors, format
   └── Validate: face clarity, logo legibility

4. User confirms intent
   └── POST /api/v1/profile-creator/generate
   └── Create generation job with profile_picture asset type
   └── Save to assets table

5. Result displayed
   └── Show generated profile picture/logo
   └── Download options (PNG, different sizes)
   └── Save to gallery
```

---

## 3. Database Changes

### 3.1 New Migration: 032_profile_creator.sql

```sql
-- Add profile_creator usage tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_profile_creator_used INTEGER DEFAULT 0;

-- Update get_tier_limits function
CREATE OR REPLACE FUNCTION get_tier_limits(p_tier TEXT)
RETURNS JSONB AS $
BEGIN
    CASE p_tier
        WHEN 'pro' THEN
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,
                'creations', 50,
                'profile_creator', 5  -- NEW
            );
        WHEN 'studio' THEN
            RETURN jsonb_build_object(
                'vibe_branding', 10,
                'aura_lab', 25,
                'coach', -1,
                'creations', 50,
                'profile_creator', 10  -- NEW
            );
        ELSE
            RETURN jsonb_build_object(
                'vibe_branding', 1,
                'aura_lab', 2,
                'coach', 1,
                'creations', 3,
                'profile_creator', 1  -- NEW
            );
    END CASE;
END;
$ LANGUAGE plpgsql IMMUTABLE;

-- Update check_usage_limit to handle profile_creator
-- Update increment_usage to handle profile_creator
-- Update get_usage_status to include profile_creator
```

### 3.2 New Asset Types

Add to `AssetTypeEnum` in `backend/api/schemas/generation.py`:
```python
AssetTypeEnum = Literal[
    # ... existing types ...
    "profile_picture",      # NEW - Square profile picture
    "streamer_logo",        # NEW - Logo/avatar
]
```

---

## 4. API Endpoints

### 4.1 New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile-creator/access` | Check access & remaining quota |
| POST | `/api/v1/profile-creator/start` | Start creation session (SSE) |
| POST | `/api/v1/profile-creator/sessions/{id}/messages` | Continue chat (SSE) |
| POST | `/api/v1/profile-creator/sessions/{id}/generate` | Generate from session |
| GET | `/api/v1/profile-creator/gallery` | Get user's profile pics/logos |

### 4.2 Request/Response Schemas

```python
# profile_creator.py schemas

class ProfileCreatorAccessResponse(BaseModel):
    can_use: bool
    used: int
    limit: int
    remaining: int
    tier: str
    resets_at: Optional[str]

class StartProfileCreatorRequest(BaseModel):
    creation_type: Literal["profile_picture", "streamer_logo"]
    brand_context: Optional[BrandContext] = None
    initial_description: Optional[str] = None
    style_preset: Optional[str] = None  # "gaming", "minimal", "vibrant", etc.

class GenerateProfileRequest(BaseModel):
    session_id: str
    size: Literal["small", "medium", "large"] = "medium"
    format: Literal["png", "webp"] = "png"
    background: Literal["transparent", "solid"] = "transparent"
```

---

## 5. Coach Customization

### 5.1 Specialized System Prompt

```python
PROFILE_CREATOR_SYSTEM_PROMPT = '''You help streamers create {creation_type}.

RULE #1: Do what the user asks. If they request changes, make them.

Context: {brand_context}
Brand colors: {color_list}

For PROFILE PICTURES, gather:
- Subject (face, character, mascot, or abstract)
- Style (realistic, anime, cartoon, pixel art, 3D render)
- Expression/mood (friendly, intense, mysterious, playful)
- Background preference (solid color, gradient, transparent)
- Any text or symbols to include

For LOGOS, gather:
- Main element (letter, symbol, mascot, abstract shape)
- Style (minimal, detailed, vintage, modern, gaming)
- Color scheme (from brand or custom)
- Shape preference (circle, square, shield, custom)

Keep responses to 2-3 sentences. When ready:
"✨ Ready! [summary] [INTENT_READY]"
'''
```

### 5.2 Validation Rules

```python
PROFILE_VALIDATION_RULES = {
    "profile_picture": {
        "required_elements": ["subject", "style"],
        "recommended_elements": ["expression", "background"],
        "size_constraints": {"min": 256, "max": 1024, "aspect": "1:1"},
    },
    "streamer_logo": {
        "required_elements": ["main_element", "style"],
        "recommended_elements": ["color_scheme", "shape"],
        "size_constraints": {"min": 128, "max": 512, "aspect": "1:1"},
    },
}
```

---

## 6. Frontend Implementation

### 6.1 Page Structure

```tsx
// tsx/apps/web/src/app/dashboard/profile-creator/page.tsx

export default function ProfileCreatorPage() {
  return (
    <div>
      <PageHeader 
        title="Profile Creator" 
        subtitle="Create your perfect profile picture or logo"
      />
      
      <UsageIndicator feature="profile_creator" />
      
      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create</TabsTrigger>
          <TabsTrigger value="gallery">My Creations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <ProfileCreatorCore />
        </TabsContent>
        
        <TabsContent value="gallery">
          <ResultGallery />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 6.2 Core Component Flow

```tsx
// ProfileCreatorCore.tsx

1. Type Selection
   └── Profile Picture | Logo
   
2. Style Presets (optional quick start)
   └── Gaming | Minimal | Vibrant | Anime | Custom
   
3. Coach Chat (reuse existing components)
   └── SessionContextBar
   └── EnhancedCoachMessage
   └── CoachInput
   
4. Preview Panel
   └── Live preview of described concept
   └── Size selector
   └── Background toggle
   
5. Generate Button
   └── Disabled until intent ready
   └── Shows remaining quota
```

### 6.3 Hook Implementation

```typescript
// useProfileCreator.ts

export function useProfileCreator() {
  // Reuse useCoachChat with custom config
  const coachChat = useCoachChat({
    endpoint: '/api/v1/profile-creator',
    sessionType: 'profile_creator',
  });
  
  // Usage tracking
  const { data: usage } = useUsageCheck('profile_creator');
  
  // Generation
  const generateMutation = useMutation({
    mutationFn: generateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries(['profile-creator', 'gallery']);
    },
  });
  
  return {
    ...coachChat,
    usage,
    canCreate: usage?.canUse ?? false,
    remaining: usage?.remaining ?? 0,
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
  };
}
```

---

## 7. Implementation Plan

### Phase 1: Backend Foundation (Day 1)
1. Create migration `032_profile_creator.sql`
2. Update `UsageLimitService` to handle `profile_creator`
3. Add asset types to `generation.py` schemas
4. Create `profile_creator.py` routes and schemas

### Phase 2: Coach Integration (Day 1-2)
1. Create `ProfileCreatorService` (thin wrapper)
2. Add specialized system prompts
3. Add validation rules for profile/logo
4. Test SSE streaming with new prompts

### Phase 3: Frontend (Day 2-3)
1. Create page at `/dashboard/profile-creator`
2. Build `ProfileCreatorCore` component
3. Create `useProfileCreator` hook
4. Add to navigation

### Phase 4: Polish (Day 3)
1. Add style presets
2. Add preview panel
3. Add gallery view
4. Add download options
5. Analytics tracking

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Coach prompts not optimized for profile pics | Iterate on system prompt with real user testing |
| Usage limits not enforced correctly | Reuse existing `UsageLimitService` patterns |
| Generation quality for logos | Add specific validation for logo legibility |
| Session timeout during creation | Show clear timeout warning, allow resume |

---

## 9. Success Metrics

- **Adoption:** % of users who try Profile Creator
- **Completion:** % of sessions that result in generation
- **Satisfaction:** User ratings on generated assets
- **Conversion:** Free users upgrading for more quota

---

## 10. Files to Create/Modify

### New Files
- `backend/database/migrations/032_profile_creator.sql`
- `backend/api/routes/profile_creator.py`
- `backend/api/schemas/profile_creator.py`
- `backend/services/profile_creator_service.py`
- `tsx/apps/web/src/app/dashboard/profile-creator/page.tsx`
- `tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx`
- `tsx/apps/web/src/components/profile-creator/StyleSelector.tsx`
- `tsx/apps/web/src/components/profile-creator/PreviewPanel.tsx`
- `tsx/apps/web/src/components/profile-creator/ResultGallery.tsx`
- `tsx/apps/web/src/hooks/useProfileCreator.ts`
- `tsx/packages/api-client/src/hooks/useProfileCreator.ts`
- `tsx/packages/api-client/src/types/profileCreator.ts`

### Modified Files
- `backend/services/usage_limit_service.py` - Add `profile_creator` feature
- `backend/api/schemas/generation.py` - Add asset types
- `backend/api/routes/usage.py` - Include profile_creator in status
- `tsx/packages/api-client/src/hooks/useUsageLimits.ts` - Add profile_creator
- `tsx/packages/api-client/src/types/usageLimits.ts` - Add types
- `tsx/apps/web/src/components/navigation/*.tsx` - Add nav item

---

## Approval Checklist

- [ ] Rate limits confirmed (1 free / 5 pro / 10 studio)
- [ ] Asset types confirmed (profile_picture, streamer_logo)
- [ ] Navigation placement confirmed
- [ ] Style presets defined
- [ ] Ready to proceed with implementation

---

*This audit provides a complete blueprint for implementing the Profile Picture & Logo Creator feature while maximizing reuse of existing infrastructure.*
