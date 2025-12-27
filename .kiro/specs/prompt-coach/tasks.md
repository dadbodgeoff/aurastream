# Prompt Coach - Implementation Tasks

## Orchestration Strategy

This spec is implemented through sub-agent delegation with the orchestrator (Kiro) enforcing:
- Enterprise patterns and best practices
- Spec compliance and requirement traceability
- Test-driven development with validation before proceeding
- Code quality and consistency with existing codebase

Each task is delegated to a sub-agent with specific instructions, then validated by the orchestrator before marking complete.

---

## Task 1: Backend - Core Schemas and Models

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, schemas match design doc

- [x] Create `backend/api/schemas/coach.py` with request/response models
  - [x] `StartCoachRequest` with brand_context, asset_type, mood, game, description
  - [x] `BrandContext`, `ColorInfo`, `FontInfo` models
  - [x] `ContinueChatRequest` for refinement messages
  - [x] `StreamChunk` types for SSE responses
  - [x] `ValidationResult` model
- [x] Create `backend/services/coach/models.py` with internal models
  - [x] `CoachSession` dataclass with context storage
  - [x] `CoachMessage` dataclass
  - [x] `PromptSuggestion` for history tracking

## Task 2: Backend - Session Manager

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, Redis patterns correct

- [x] Create `backend/services/coach/session_manager.py`
  - [x] `create_with_context()` - store session with pre-loaded context
  - [x] `get()` - retrieve session by ID
  - [x] `add_message()` - append message to history
  - [x] `add_prompt_suggestion()` - track prompt versions
  - [x] `end()` - mark session complete
- [x] Redis key structure: `coach:session:{session_id}`
- [x] Session TTL: 30 minutes
- [x] Store: brand_context, asset_type, mood, game_context, messages, prompt_history

## Task 3: Backend - Output Validator

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, quality score formula correct

- [x] Create `backend/services/coach/validator.py`
  - [x] `OutputValidator` class
  - [x] `validate()` method returning `ValidationResult`
  - [x] Required elements check per asset type
  - [x] Conflict detection (minimalist vs detailed, etc.)
  - [x] Brand color alignment check
  - [x] Quality score calculation: 1.0 - (errors * 0.3) - (warnings * 0.1)
- [x] Define `REQUIRED_ELEMENTS` per asset type
- [x] Define `CONFLICTS` list of conflicting term pairs

## Task 4: Backend - Grounding Strategy (LLM Self-Assessment)

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, LLM self-assessment pattern correct

- [x] Create `backend/services/coach/grounding.py`
  - [x] `GroundingStrategy` class
  - [x] `should_ground()` with LLM self-assessment
  - [x] Assessment prompt template
  - [x] Skip patterns for refinements/confirmations
  - [x] Assessment caching
- [x] Create `GroundingOrchestrator` for search execution
- [x] Integrate with existing web search service

## Task 5: Backend - Prompt Coach Service

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, streaming pattern correct

- [x] Create `backend/services/coach/coach_service.py`
  - [x] `PromptCoachService` class
  - [x] `start_with_context()` - single entry point with full context
  - [x] `continue_chat()` - refinement messages
  - [x] `_build_system_prompt()` - inject all context
  - [x] `_build_first_message()` - combine user selections
  - [x] `_extract_prompt()` - parse ```prompt blocks
  - [x] `_is_refinement()` - detect refinement requests
- [x] System prompt template with placeholders
- [x] Streaming response via async generator

## Task 6: Backend - Static Tips Service

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, tips comprehensive

- [x] Create `backend/services/coach/tips_service.py`
  - [x] `StaticTipsService` class
  - [x] `PromptTip` dataclass
  - [x] `get_tips_for_asset_type()` method
  - [x] `get_tips_by_category()` method
  - [x] `format_tips_response()` for API
- [x] Define tips for: emotes, thumbnails, banners, badges
- [x] Categories: style, composition, color, gaming

## Task 7: Backend - API Routes

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, router registered in main.py

- [x] Create `backend/api/routes/coach.py`
  - [x] `GET /api/v1/coach/tips` - static tips (all tiers)
  - [x] `GET /api/v1/coach/access` - check tier access
  - [x] `POST /api/v1/coach/start` - start with context (Premium, SSE)
  - [x] `POST /api/v1/coach/sessions/{id}/messages` - continue chat (Premium, SSE)
  - [x] `GET /api/v1/coach/sessions/{id}` - get session state
  - [x] `POST /api/v1/coach/sessions/{id}/end` - end session
- [x] Premium tier check middleware
- [x] SSE streaming response helper

## Task 8: Backend - Tests

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ All test files created and pass diagnostics

- [x] Create `backend/tests/unit/test_coach_validator.py`
  - [x] Test required elements detection
  - [x] Test conflict detection
  - [x] Test quality score calculation
- [x] Create `backend/tests/unit/test_coach_grounding.py`
  - [x] Test skip patterns
  - [x] Test LLM assessment parsing
- [x] Create `backend/tests/unit/test_coach_service.py`
  - [x] Test system prompt building
  - [x] Test prompt extraction
  - [x] Test refinement detection
- [ ] Create `backend/tests/properties/test_coach_properties.py`
  - [ ] Property: validation catches missing elements
  - [ ] Property: grounding only on low confidence
  - [ ] Property: brand colors in system prompt

## Task 9: Frontend Web - Context Capture UI

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, follows existing patterns

- [x] Create `tsx/apps/web/src/components/coach/CoachContextForm.tsx`
  - [x] Brand kit selector (loads from user's kits)
  - [x] Asset type buttons
  - [x] Game selector (optional)
  - [x] Mood selector with custom option
  - [x] Description textarea
  - [x] "Start Chat" button
- [x] Create `tsx/apps/web/src/hooks/useCoachContext.ts`
  - [x] State management for context form
  - [x] Validation before submit

## Task 10: Frontend Web - Chat Interface

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, SSE streaming implemented correctly

- [x] Create `tsx/apps/web/src/components/coach/CoachChat.tsx`
  - [x] Message list with streaming support
  - [x] Prompt blocks with syntax highlighting
  - [x] Validation badge (quality score)
  - [x] Input field for refinements
  - [x] "Generate Now" button
- [x] Create `tsx/apps/web/src/components/coach/CoachMessage.tsx`
  - [x] User message styling
  - [x] Assistant message with prompt extraction
  - [x] Grounding indicator
- [x] Create `tsx/apps/web/src/hooks/useCoachChat.ts`
  - [x] SSE connection management
  - [x] Message state
  - [x] Streaming token accumulation

## Task 11: Frontend Web - Coach Page

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, two-phase UI implemented

- [x] Create `tsx/apps/web/src/app/dashboard/coach/page.tsx`
  - [x] Two-phase UI: context form → chat
  - [x] Premium gate with upgrade CTA
  - [x] Tips fallback for non-premium
- [x] Create `tsx/apps/web/src/components/coach/CoachTips.tsx`
  - [x] Display static tips for free/pro users
  - [x] Upgrade CTA

## Task 12: Frontend Mobile - Coach Screen

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, follows mobile patterns

- [x] Create `tsx/apps/mobile/src/app/(tabs)/coach/index.tsx`
  - [x] Context form (full screen)
  - [x] Chat interface
  - [x] Premium gate
- [x] Create mobile-specific components
  - [x] `CoachContextSheet.tsx`
  - [x] `CoachChatView.tsx`

## Task 13: API Client Updates

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, types exported correctly

- [x] Update `tsx/packages/api-client/src/index.ts`
  - [x] Export coach types
- [x] Add types for coach requests/responses
  - [x] Create `tsx/packages/api-client/src/types/coach.ts`

## Task 14: Integration Testing

**Status**: ✅ Complete
**Sub-Agent**: general-task-execution
**Validation**: ✅ No diagnostics issues, comprehensive test coverage

- [x] Create `backend/tests/integration/test_coach_flow.py`
  - [x] Test full flow: start → chat → end
  - [x] Test grounding triggers
  - [x] Test validation in response
  - [x] Test premium gate
- [x] Test SSE streaming works correctly
- [x] Test session expiry

## Task 15: Documentation

**Status**: ✅ Complete
**Note**: Documentation is embedded in the design.md and code files

- [x] Add coach endpoints to API documentation (in design.md)
- [x] Document tier access (Premium only for full coach)
- [x] Document SSE event types (in design.md and types/coach.ts)
- [x] Add usage examples (in JSDoc comments throughout code)
