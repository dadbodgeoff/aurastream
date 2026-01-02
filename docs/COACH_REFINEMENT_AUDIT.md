# 🎨 Coach Refinement Flow Audit
## Multi-Turn Image Editing Implementation Plan

**Date:** January 1, 2026  
**Last Updated:** January 1, 2026  
**Status:** ✅ IMPLEMENTATION COMPLETE  
**Purpose:** Audit existing infrastructure for implementing "Satisfied or Refine?" flow

---

## Executive Summary

The goal is to keep coach sessions open after image generation, allowing users to refine images through conversation without re-uploading the image. This leverages Gemini's multi-turn conversation capability for cheaper refinements.

**Key Insight:** Gemini maintains context of generated images within a conversation. Refinements like "make the armor gold" don't require re-sending the image - just the text instruction.

---

## Implementation Status

### ✅ Backend (Complete)
- [x] `NanoBananaClient` - Multi-turn conversation support with `ConversationTurn` dataclass
- [x] `CoachSession` model - Added `gemini_history`, `refinements_used`, `last_generated_asset_id` fields
- [x] `UsageLimitService` - Added `refinements` feature type to `TIER_LIMITS`
- [x] Coach schemas - Added `RefineImageRequest` and `RefineImageResponse`
- [x] Coach routes - Added `POST /sessions/{session_id}/refine` endpoint
- [x] Generation worker - Refinement handling with `conversation_history` support
- [x] Database migration - `052_coach_refinements.sql`

### ✅ Frontend (Complete)
- [x] TypeScript types - `RefineImageRequest`, `RefineImageResponse`, `RefinementUsageStatus`
- [x] API client - Added `coach.refineImage()` method
- [x] `RefinementChoice` component - "Satisfied/Refine" UI buttons
- [x] `RefineInput` component - Refinement text input with suggestions
- [x] `useRefinement` hook - Manages refinement flow state and API calls
- [x] `GenerationResultWithRefinement` component - Combined result + refinement flow
- [x] `InlineGenerationCard` - Updated to use refinement flow

---

## Current Architecture

### 1. Coach Session Flow (Today)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User starts coach session                                   │
│     POST /coach/start → SSE stream                              │
│     ↓                                                           │
│  2. User refines prompt through chat                            │
│     POST /coach/sessions/{id}/messages → SSE stream             │
│     ↓                                                           │
│  3. User triggers generation                                    │
│     POST /coach/sessions/{id}/generate                          │
│     ↓                                                           │
│  4. Session effectively "done" (user leaves)                    │
│     POST /coach/sessions/{id}/end (optional)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Proposed Flow (Refinement Loop)

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW FLOW                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User starts coach session                                   │
│     POST /coach/start → SSE stream                              │
│     ↓                                                           │
│  2. User refines prompt through chat                            │
│     POST /coach/sessions/{id}/messages → SSE stream             │
│     ↓                                                           │
│  3. User triggers generation                                    │
│     POST /coach/sessions/{id}/generate                          │
│     ↓                                                           │
│  4. Image shown with "Satisfied?" or "Refine" buttons           │
│     ↓                                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ IF "Satisfied" → Session ends, asset saved                  ││
│  │ IF "Refine" → User types refinement in chat                 ││
│  │              → POST /coach/sessions/{id}/refine             ││
│  │              → NEW image generated (multi-turn, cheaper)    ││
│  │              → Loop back to step 4                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Existing Infrastructure Inventory

### ✅ What We Have

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| Coach Session Model | `backend/services/coach/models.py` | ✅ Ready | Has `messages`, `prompt_history`, `metadata` |
| Session Manager | `backend/services/coach/session_manager.py` | ✅ Ready | Redis + PostgreSQL persistence |
| Continue Chat Endpoint | `POST /coach/sessions/{id}/messages` | ✅ Ready | SSE streaming, conversation history |
| Generate Endpoint | `POST /coach/sessions/{id}/generate` | ✅ Ready | Creates job, links to session |
| Session Assets Endpoint | `GET /coach/sessions/{id}/assets` | ✅ Ready | Lists generated assets |
| Usage Limit Service | `backend/services/usage_limit_service.py` | ✅ Ready | Tracks `creations` and `coach` usage |
| Nano Banana Client | `backend/services/nano_banana_client.py` | ⚠️ Needs Update | Single-turn only, no conversation history |
| Generation Worker | `backend/workers/generation_worker.py` | ⚠️ Needs Update | No multi-turn support |

### 🔧 What Needs to Change

| Component | Change Required | Complexity |
|-----------|-----------------|------------|
| Nano Banana Client | Add multi-turn conversation support | Medium |
| Coach Session Model | Add `gemini_conversation_history` field | Low |
| Generation Worker | Pass conversation history to Nano Banana | Medium |
| New Endpoint | `POST /coach/sessions/{id}/refine` | Medium |
| Usage Limit Service | Add `refinements` feature type | Low |
| Frontend | "Satisfied/Refine" UI after generation | Medium |

---

## Detailed Component Analysis

### 1. Nano Banana Client (`backend/services/nano_banana_client.py`)

**Current State:**
```python
@dataclass
class GenerationRequest:
    prompt: str
    width: int
    height: int
    model: str = "gemini-3-pro-image-preview"
    seed: Optional[int] = None
    input_image: Optional[bytes] = None  # For image-to-image
    input_mime_type: str = "image/png"
```

**What's Missing:**
- No `conversation_history` parameter
- Single `contents` array with one turn
- No way to reference previous generations

**Required Change:**
```python
@dataclass
class GenerationRequest:
    prompt: str
    width: int
    height: int
    model: str = "gemini-3-pro-image-preview"
    seed: Optional[int] = None
    input_image: Optional[bytes] = None
    input_mime_type: str = "image/png"
    # NEW: Multi-turn conversation history
    conversation_history: Optional[List[Dict[str, Any]]] = None
```

**API Change:**
```python
# Current (single turn)
request_body = {
    "contents": [{
        "parts": [{"text": prompt}]
    }]
}

# New (multi-turn)
request_body = {
    "contents": [
        # Previous turns from history
        {"role": "user", "parts": [{"text": "Generate a warrior thumbnail"}]},
        {"role": "model", "parts": [{"inlineData": {...previous_image...}}]},
        # New refinement turn
        {"role": "user", "parts": [{"text": "Make the armor gold"}]},
    ]
}
```

### 2. Coach Session Model (`backend/services/coach/models.py`)

**Current State:**
```python
@dataclass
class CoachSession:
    session_id: str
    user_id: str
    messages: List[CoachMessage]  # Chat messages
    prompt_history: List[PromptSuggestion]  # Prompt versions
    current_prompt_draft: Optional[str]
    metadata: Optional[Dict[str, Any]]  # Generic metadata
```

**What's Missing:**
- No storage for Gemini conversation history (with images)
- No tracking of refinement count

**Required Change:**
```python
@dataclass
class CoachSession:
    # ... existing fields ...
    
    # NEW: Gemini conversation history for multi-turn
    gemini_history: List[Dict[str, Any]] = field(default_factory=list)
    
    # NEW: Refinement tracking
    refinements_used: int = 0
    last_generated_image_id: Optional[str] = None
```

### 3. Usage Limits (`backend/services/usage_limit_service.py`)

**Current State:**
```python
TIER_LIMITS = {
    "free": {
        "creations": 3,
        "coach": 1,
    },
    "pro": {
        "creations": 50,
        "coach": -1,  # unlimited
    },
}
```

**Required Change:**
```python
TIER_LIMITS = {
    "free": {
        "creations": 3,
        "coach": 1,
        "refinements": 0,  # Free users can't refine
    },
    "pro": {
        "creations": 50,
        "coach": -1,
        "refinements": 5,  # 5 free refinements/month
    },
    "studio": {
        "creations": -1,
        "coach": -1,
        "refinements": -1,  # Unlimited
    },
}
```

**Refinement Billing Logic:**
- Pro: First 5 refinements/month are FREE
- After 5: Each refinement counts as 1 creation
- Studio: Unlimited refinements (no extra cost)

### 4. New Endpoint: Refine Generation

**Location:** `backend/api/routes/coach.py`

```python
@router.post(
    "/sessions/{session_id}/refine",
    response_model=GenerateFromSessionResponse,
    summary="Refine generated image",
)
async def refine_generation(
    session_id: str,
    data: RefineRequest,  # New schema
    current_user: TokenPayload = Depends(get_current_user),
) -> GenerateFromSessionResponse:
    """
    Refine the last generated image using multi-turn conversation.
    
    Pro users get 5 free refinements/month, then counts as creation.
    Studio users get unlimited refinements.
    """
```

**New Schema:**
```python
class RefineRequest(BaseModel):
    refinement: str = Field(
        ...,
        min_length=3,
        max_length=500,
        description="What to change about the image",
        examples=["Make the armor gold", "Add more sparkles", "Make it brighter"]
    )
```

---

## Database Changes

### New Migration: `052_coach_refinements.sql`

```sql
-- Add refinement tracking to coach_sessions
ALTER TABLE coach_sessions
ADD COLUMN IF NOT EXISTS refinements_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_generated_asset_id UUID REFERENCES assets(id),
ADD COLUMN IF NOT EXISTS gemini_history JSONB DEFAULT '[]'::jsonb;

-- Add refinements to usage tracking
ALTER TABLE user_usage
ADD COLUMN IF NOT EXISTS refinements_used INTEGER DEFAULT 0;

-- Update check_usage_limit function to handle refinements
-- (Pro: 5 free, then counts as creation)
```

---

## Frontend Changes

### Coach Chat Component

**Current:** After generation, user sees image and can leave or continue chatting.

**New:** After generation, show explicit choice:

```tsx
// After image generation completes
{generatedAsset && (
  <div className="refinement-choice">
    <img src={generatedAsset.url} alt="Generated" />
    
    <div className="choice-buttons">
      <Button 
        variant="primary"
        onClick={handleSatisfied}
      >
        ✓ I'm Happy With This
      </Button>
      
      <Button 
        variant="secondary"
        onClick={() => setShowRefineInput(true)}
      >
        ✏️ Refine It
      </Button>
    </div>
    
    {showRefineInput && (
      <RefineInput 
        onSubmit={handleRefine}
        remainingFreeRefinements={refinementsRemaining}
      />
    )}
  </div>
)}
```

### Refinement Input Component

```tsx
interface RefineInputProps {
  onSubmit: (refinement: string) => void;
  remainingFreeRefinements: number;
}

function RefineInput({ onSubmit, remainingFreeRefinements }: RefineInputProps) {
  const [refinement, setRefinement] = useState('');
  
  return (
    <div className="refine-input">
      <textarea
        value={refinement}
        onChange={(e) => setRefinement(e.target.value)}
        placeholder="What would you like to change? (e.g., 'Make the colors brighter')"
      />
      
      {remainingFreeRefinements > 0 ? (
        <p className="hint">
          {remainingFreeRefinements} free refinements remaining this month
        </p>
      ) : (
        <p className="hint warning">
          This refinement will count as 1 creation
        </p>
      )}
      
      <Button onClick={() => onSubmit(refinement)}>
        Refine Image
      </Button>
    </div>
  );
}
```

---

## Implementation Order

### Phase 1: Backend Foundation (Day 1)
1. ✅ Add `conversation_history` to `GenerationRequest`
2. ✅ Update `NanoBananaClient._execute_generation()` for multi-turn
3. ✅ Add `gemini_history` field to `CoachSession`
4. ✅ Create migration `052_coach_refinements.sql`

### Phase 2: Refinement Endpoint (Day 1-2)
1. ✅ Add `RefineRequest` schema
2. ✅ Create `POST /coach/sessions/{id}/refine` endpoint
3. ✅ Update usage limit service for refinements
4. ✅ Update generation worker to handle refinement jobs

### Phase 3: Frontend (Day 2-3)
1. ✅ Add "Satisfied/Refine" UI after generation
2. ✅ Create `RefineInput` component
3. ✅ Update coach hooks for refinement flow
4. ✅ Add refinement usage display

### Phase 4: Testing & Polish (Day 3)
1. ✅ Unit tests for multi-turn generation
2. ✅ Integration tests for refinement flow
3. ✅ E2E test for full user journey
4. ✅ Update documentation

---

## Cost Analysis

### Current (Re-generation)
- Each "refinement" = full new generation
- User uploads image back to Gemini
- Cost: ~$0.02-0.05 per generation

### New (Multi-turn)
- Refinement uses conversation context
- No image re-upload needed
- Cost: ~$0.005-0.01 per refinement (text-only input)

**Savings:** ~60-80% per refinement

### Business Model
| Tier | Free Refinements | After Limit |
|------|------------------|-------------|
| Free | 0 | N/A (can't refine) |
| Pro | 5/month | Counts as creation |
| Studio | Unlimited | Included |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gemini context expires | Medium | Medium | Store image in session, fall back to image-to-image |
| User abuses refinements | Low | Low | Rate limiting, usage tracking |
| Multi-turn API changes | Low | High | Abstract behind client interface |
| Session timeout during refine | Medium | Low | Extend TTL on refinement, warn user |

---

## Success Metrics

1. **Adoption:** % of generations that use refinement
2. **Satisfaction:** Refinement → "Satisfied" conversion rate
3. **Cost Savings:** Reduction in per-user generation costs
4. **Retention:** Users who refine vs. users who don't

---

## Summary

✅ **IMPLEMENTATION COMPLETE**

The coach refinement flow has been fully implemented:

### Backend Components
- `backend/services/nano_banana_client.py` - Multi-turn conversation support
- `backend/services/coach/models.py` - Session fields for refinement tracking
- `backend/services/usage_limit_service.py` - Refinements feature type
- `backend/api/schemas/coach.py` - RefineImageRequest/Response schemas
- `backend/api/routes/coach.py` - POST /sessions/{id}/refine endpoint
- `backend/workers/generation_worker.py` - Refinement job handling
- `backend/database/migrations/052_coach_refinements.sql` - Database migration

### Frontend Components
- `tsx/packages/api-client/src/types/coach.ts` - TypeScript types
- `tsx/packages/api-client/src/client.ts` - coach.refineImage() method
- `tsx/apps/web/src/components/coach/generation/RefinementChoice.tsx` - UI buttons
- `tsx/apps/web/src/components/coach/generation/RefineInput.tsx` - Input component
- `tsx/apps/web/src/components/coach/generation/useRefinement.ts` - State management hook
- `tsx/apps/web/src/components/coach/generation/GenerationResultWithRefinement.tsx` - Combined flow
- `tsx/apps/web/src/components/coach/generation/InlineGenerationCard.tsx` - Updated integration

### Tier Access
| Tier | Free Refinements | After Limit |
|------|------------------|-------------|
| Free | 0 | N/A (can't refine) |
| Pro | 5/month | Counts as creation |
| Studio | Unlimited | Included |

**Cost Savings:** ~60-80% per refinement vs full regeneration
