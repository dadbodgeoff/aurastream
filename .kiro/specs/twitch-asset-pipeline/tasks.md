# Twitch Asset Generation Pipeline - Implementation Tasks

## Overview

This document breaks down the Twitch Asset Pipeline into discrete, testable implementation tasks. Each task is designed to be completed by a sub-agent with clear acceptance criteria and verification steps.

## Implementation Order

The tasks are ordered by dependency - each phase builds on the previous:

1. **Phase 1: Foundation** - Dimension specs, types, schemas
2. **Phase 2: Context Engine** - Brand kit data extraction
3. **Phase 3: Prompt Constructor** - Mega-prompt building
4. **Phase 4: Asset Pipeline** - Post-processing factory
5. **Phase 5: QC Gate** - Quality validation
6. **Phase 6: API Routes** - HTTP endpoints
7. **Phase 7: Pack Generation** - One-click suites
8. **Phase 8: Frontend Integration** - UI components

---

## Phase 1: Foundation

### Task 1.1: Dimension Specifications Module
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Create:**
- `backend/services/twitch/dimensions.py`

**Acceptance Criteria:**
- [ ] DimensionSpec dataclass with generation_size, export_size, aspect_ratio
- [ ] DIMENSION_SPECS dict with all asset types from design doc
- [ ] ASSET_TYPE_DIRECTIVES dict with all directives
- [ ] Helper function `get_dimension_spec(asset_type: str) -> DimensionSpec`
- [ ] Unit tests for all dimension specs

**Verification:**
```bash
pytest backend/tests/unit/test_dimensions.py -v
```

### Task 1.2: Twitch Asset Types and Schemas
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Create:**
- `backend/api/schemas/twitch.py`

**Acceptance Criteria:**
- [ ] TwitchAssetType literal type
- [ ] PackType literal type
- [ ] TwitchGenerateRequest schema
- [ ] PackGenerateRequest schema
- [ ] AssetResponse schema
- [ ] PackResponse schema
- [ ] DimensionSpecResponse schema

**Verification:**
```bash
pytest backend/tests/unit/test_twitch_schemas.py -v
```

---

## Phase 2: Context Engine

### Task 2.1: Context Engine Core
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/services/twitch/context_engine.py`

**Acceptance Criteria:**
- [ ] GenerationContext dataclass with all fields from design
- [ ] ContextEngine class with build_context() method
- [ ] Extract colors from colors_extended
- [ ] Extract typography hierarchy
- [ ] Extract voice (tone, personality, tagline)
- [ ] Extract logos (primary, watermark)
- [ ] Get style_reference
- [ ] Inject asset_directive based on asset_type

**Verification:**
```bash
pytest backend/tests/unit/test_context_engine.py -v
```

### Task 2.2: Game Meta Integration
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Create:**
- `backend/services/twitch/game_meta.py`

**Acceptance Criteria:**
- [ ] GameMetaService class
- [ ] fetch_game_meta(game_id) with 24h caching
- [ ] Graceful fallback when meta unavailable
- [ ] Integration with ContextEngine

**Verification:**
```bash
pytest backend/tests/unit/test_game_meta.py -v
```

---

## Phase 3: Prompt Constructor

### Task 3.1: Prompt Constructor Core
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/services/twitch/prompt_constructor.py`

**Acceptance Criteria:**
- [ ] PromptConstructor class
- [ ] build_mega_prompt() following formula: [Style Anchor] + [Subject] + [Meta] + [Colors] + [Directives]
- [ ] _build_style_anchor() from tone and style_reference
- [ ] _build_subject_reference() from logo
- [ ] _build_meta_context() from game/season
- [ ] _build_color_directive() with hex codes
- [ ] QUALITY_DIRECTIVES constant

**Verification:**
```bash
pytest backend/tests/unit/test_prompt_constructor.py -v
```

### Task 3.2: Input Sanitization
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Modify:**
- `backend/services/twitch/prompt_constructor.py`

**Acceptance Criteria:**
- [ ] sanitize_input() method
- [ ] MAX_CUSTOM_PROMPT_LENGTH = 500
- [ ] INJECTION_PATTERNS list
- [ ] Remove dangerous characters
- [ ] Remove injection patterns
- [ ] Normalize whitespace
- [ ] Property test: output always differs from raw input

**Verification:**
```bash
pytest backend/tests/unit/test_prompt_sanitization.py -v
```

---

## Phase 4: Asset Pipeline

### Task 4.1: Background Removal Integration
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Create:**
- `backend/services/twitch/asset_pipeline.py`

**Acceptance Criteria:**
- [ ] AssetPipeline class
- [ ] BG_REMOVAL_TYPES set
- [ ] _remove_background() using rembg
- [ ] Output has alpha channel (RGBA)
- [ ] Works for emotes and badges

**Verification:**
```bash
pytest backend/tests/unit/test_bg_removal.py -v
```

### Task 4.2: Color Grading
**Status:** Not Started
**Estimated Time:** 20 minutes

**Files to Modify:**
- `backend/services/twitch/asset_pipeline.py`

**Acceptance Criteria:**
- [ ] _apply_color_grading() method
- [ ] 20% vibrance boost
- [ ] 10% contrast boost
- [ ] Uses PIL ImageEnhance

**Verification:**
```bash
pytest backend/tests/unit/test_color_grading.py -v
```

### Task 4.3: Text Rendering with PIL
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Modify:**
- `backend/services/twitch/asset_pipeline.py`

**Acceptance Criteria:**
- [ ] _render_text() method
- [ ] Uses Brand Kit fonts (headline_font)
- [ ] Font size = 8% of image height
- [ ] Supports top/center/bottom positions
- [ ] Text shadow for readability
- [ ] Uses brand primary color
- [ ] 100% spelling accuracy (OCR verified)

**Verification:**
```bash
pytest backend/tests/unit/test_text_rendering.py -v
```

### Task 4.4: Downscaling and Export
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Modify:**
- `backend/services/twitch/asset_pipeline.py`

**Acceptance Criteria:**
- [ ] _downscale() using Lanczos
- [ ] _export() with correct format per asset type
- [ ] PNG for transparency types
- [ ] JPEG for thumbnails
- [ ] WebP for web
- [ ] Preserve transparency for emotes

**Verification:**
```bash
pytest backend/tests/unit/test_downscale_export.py -v
```

---

## Phase 5: QC Gate

### Task 5.1: QC Gate Core
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/services/twitch/qc_gate.py`

**Acceptance Criteria:**
- [ ] QCGate class
- [ ] FILE_SIZE_LIMITS dict
- [ ] validate() method returning (passed, error, data)
- [ ] Dimension validation
- [ ] File size validation with compression fallback
- [ ] Format validation

**Verification:**
```bash
pytest backend/tests/unit/test_qc_gate.py -v
```

### Task 5.2: OCR Gibberish Detection
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Modify:**
- `backend/services/twitch/qc_gate.py`

**Acceptance Criteria:**
- [ ] _check_gibberish() using pytesseract
- [ ] GIBBERISH_PATTERNS list
- [ ] _blur_regions() for detected gibberish
- [ ] Only runs on thumbnails/banners

**Verification:**
```bash
pytest backend/tests/unit/test_gibberish_detection.py -v
```

---

## Phase 6: API Routes

### Task 6.1: Twitch Generation Endpoint
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/api/routes/twitch.py`

**Acceptance Criteria:**
- [ ] POST /api/v1/twitch/generate endpoint
- [ ] Requires authentication
- [ ] Validates brand_kit_id ownership
- [ ] Returns job ID for async processing
- [ ] Proper error handling

**Verification:**
```bash
pytest backend/tests/integration/test_twitch_generate.py -v
```

### Task 6.2: Pack Generation Endpoint
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Modify:**
- `backend/api/routes/twitch.py`

**Acceptance Criteria:**
- [ ] POST /api/v1/twitch/packs endpoint
- [ ] GET /api/v1/twitch/packs/{id} endpoint
- [ ] Tracks pack as single job with multiple assets
- [ ] Returns progress percentage

**Verification:**
```bash
pytest backend/tests/integration/test_twitch_packs.py -v
```

### Task 6.3: Utility Endpoints
**Status:** Not Started
**Estimated Time:** 20 minutes

**Files to Modify:**
- `backend/api/routes/twitch.py`

**Acceptance Criteria:**
- [ ] GET /api/v1/twitch/dimensions endpoint
- [ ] GET /api/v1/twitch/game-meta/{game_id} endpoint
- [ ] Returns dimension specs for all asset types

**Verification:**
```bash
pytest backend/tests/integration/test_twitch_utils.py -v
```

---

## Phase 7: Pack Generation Service

### Task 7.1: Pack Generation Service
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/services/twitch/pack_service.py`

**Acceptance Criteria:**
- [ ] PackGenerationService class
- [ ] PACK_DEFINITIONS dict
- [ ] generate_pack() method
- [ ] Parallel asset generation
- [ ] Same brand kit context for all assets
- [ ] Same style anchor for consistency

**Verification:**
```bash
pytest backend/tests/integration/test_pack_service.py -v
```

### Task 7.2: Worker Integration
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Create:**
- `backend/workers/twitch_worker.py`

**Acceptance Criteria:**
- [ ] process_twitch_generation() task
- [ ] process_pack_generation() task
- [ ] Progress tracking
- [ ] Error handling and retry logic

**Verification:**
```bash
pytest backend/tests/integration/test_twitch_worker.py -v
```

---

## Phase 8: Frontend Integration

### Task 8.1: API Client Extensions
**Status:** Not Started
**Estimated Time:** 30 minutes

**Files to Modify:**
- `tsx/packages/api-client/src/client.ts`
- `tsx/packages/api-client/src/types/twitch.ts`

**Acceptance Criteria:**
- [ ] Twitch types (TwitchAssetType, PackType, etc.)
- [ ] apiClient.twitch.generate() method
- [ ] apiClient.twitch.generatePack() method
- [ ] apiClient.twitch.getPackStatus() method
- [ ] apiClient.twitch.getDimensions() method

**Verification:**
```bash
npm test --workspace=@streamer-studio/api-client
```

### Task 8.2: Web Dashboard - Twitch Generation Page
**Status:** Not Started
**Estimated Time:** 60 minutes

**Files to Create:**
- `tsx/apps/web/src/app/dashboard/twitch/page.tsx`
- `tsx/apps/web/src/app/dashboard/twitch/components/`

**Acceptance Criteria:**
- [ ] Asset type selector
- [ ] Brand kit selector
- [ ] Custom prompt input (500 char limit)
- [ ] Game context selector
- [ ] Generate button with loading state
- [ ] Result preview with download

**Verification:**
Manual testing + component tests

### Task 8.3: Mobile - Twitch Generation Screen
**Status:** Not Started
**Estimated Time:** 60 minutes

**Files to Create:**
- `tsx/apps/mobile/src/app/(tabs)/twitch/`

**Acceptance Criteria:**
- [ ] TwitchGenerateScreen component
- [ ] Asset type picker
- [ ] Brand kit picker
- [ ] Generation flow
- [ ] Result display

**Verification:**
Manual testing + component tests

---

## Property-Based Tests

### Task P.1: Correctness Properties Tests
**Status:** Not Started
**Estimated Time:** 60 minutes

**Files to Create:**
- `backend/tests/properties/test_twitch_properties.py`

**Acceptance Criteria:**
- [ ] Property 1: Dimension Consistency
- [ ] Property 2: Context Extraction Completeness
- [ ] Property 3: Asset Type Directive Injection
- [ ] Property 4: Prompt Never Contains Raw User Input
- [ ] Property 5: Prompt Contains Brand Colors
- [ ] Property 6: Custom Prompt Length Limit
- [ ] Property 7: Background Removal for Emotes
- [ ] Property 8: Text Rendering Accuracy
- [ ] Property 9: Downscale Uses Lanczos
- [ ] Property 10: Export Dimensions Match Spec
- [ ] Property 11: File Size Within Limits
- [ ] Property 12: Pack Contains Correct Asset Count
- [ ] Property 13: Pack Uses Same Brand Kit
- [ ] Property 14: Brand Kit Required for Generation
- [ ] Property 15: Twitch Emote Multi-Size Output

**Verification:**
```bash
pytest backend/tests/properties/test_twitch_properties.py -v --hypothesis-show-statistics
```

---

## Integration Tests

### Task I.1: End-to-End Generation Flow
**Status:** Not Started
**Estimated Time:** 45 minutes

**Files to Create:**
- `backend/tests/integration/test_twitch_e2e.py`

**Acceptance Criteria:**
- [ ] Test complete flow: request → context → prompt → generate → pipeline → QC → response
- [ ] Test with real brand kit data
- [ ] Test error scenarios
- [ ] Test rate limiting

**Verification:**
```bash
pytest backend/tests/integration/test_twitch_e2e.py -v
```

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Foundation | 2 | 1 hour |
| Phase 2: Context Engine | 2 | 1.25 hours |
| Phase 3: Prompt Constructor | 2 | 1.25 hours |
| Phase 4: Asset Pipeline | 4 | 2 hours |
| Phase 5: QC Gate | 2 | 1.25 hours |
| Phase 6: API Routes | 3 | 1.5 hours |
| Phase 7: Pack Generation | 2 | 1.25 hours |
| Phase 8: Frontend | 3 | 2.5 hours |
| Property Tests | 1 | 1 hour |
| Integration Tests | 1 | 0.75 hours |
| **Total** | **22 tasks** | **~14 hours** |
