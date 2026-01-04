# Coach → NanoBanana Prompt Flow Audit

## Executive Summary

After a deep audit of the Coach → NanoBanana flow, I found **several inconsistencies and areas for improvement**. The flow works but has redundant code, unclear separation of concerns, and some potential quality issues.

---

## Current Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (User Input)                              │
│  - Asset type, mood, game, description                                       │
│  - Brand kit context (colors, tone, logo)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COACH SERVICE (coach_service.py)                          │
│  1. Builds system prompt with brand context                                  │
│  2. Streams LLM response (Gemini text model)                                 │
│  3. Extracts "intent" from response                                          │
│  4. Returns refined description (NOT a prompt)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GENERATION SERVICE (generation_service.py)                │
│  1. Receives custom_prompt (coach's refined intent)                          │
│  2. Builds final prompt using prompt_engine                                  │
│  3. Creates job record with prompt stored                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    GENERATION WORKER (generation_worker.py)                  │
│  1. Reads job.prompt from database                                           │
│  2. Prepares context (canvas, media assets, etc.)                            │
│  3. Builds GenerationRequest                                                 │
│  4. Calls NanoBanana with STRICT_CONTENT_CONSTRAINT prepended                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NANO BANANA CLIENT (nano_banana_client.py)                │
│  1. Prepends STRICT_CONTENT_CONSTRAINT (28 rules!)                           │
│  2. Adds grounding (Google Search) if enabled                                │
│  3. Calls Gemini 3 Pro Image Preview API                                     │
│  4. Returns generated image                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Issues Found

### 1. **Duplicate Intent Extraction Code** ⚠️

There are TWO implementations of intent extraction:

**File 1: `coach_service.py`**
```python
def _extract_intent(self, response, original_description, mood):
    # 5 regex patterns
    summary_patterns = [...]
```

**File 2: `intent_extractor.py`**
```python
class IntentExtractor:
    EXTRACTION_PATTERNS = [...]  # 8 regex patterns
```

The `intent_extractor.py` is more robust (has validation, confidence scoring, better patterns) but `coach_service.py` uses its own inline implementation!

**Recommendation:** Remove duplicate code from `coach_service.py` and use `IntentExtractor` exclusively.

---

### 2. **Inconsistent Grounding Implementation** ⚠️

**Coach Grounding (for text LLM):**
- Uses `GroundingStrategy` class
- Performs web search via `search_service.py`
- Injects search results into system prompt

**NanoBanana Grounding (for image generation):**
- Uses Gemini's built-in `google_search` tool
- Enabled by default now (after our fix)
- Different mechanism entirely

**Issue:** The coach might search for "Fortnite Battlewood Boulevard" and inject context, then NanoBanana ALSO searches for it. This is redundant and costs extra API calls.

**Recommendation:** Coordinate grounding - if coach already grounded, pass that context to NanoBanana instead of having it search again.

---

### 3. **STRICT_CONTENT_CONSTRAINT is Massive** ⚠️

The constraint prepended to every prompt is **28 rules** and ~2000 characters. This:
- Consumes tokens on every request
- May confuse the model with too many instructions
- Some rules contradict each other (e.g., "be creative with style" vs "render ONLY what is described")

**Current constraint preview:**
```
STRICT CONTENT RULES - YOU MUST FOLLOW THESE:

## REFERENCE IMAGE / CANVAS LAYOUT - HIGHEST PRIORITY
0. If a reference image or canvas layout is provided...

## TEXT RENDERING - HIGHEST PRIORITY
1. If the prompt includes ANY text...
...
28 rules total
```

**Recommendation:** Simplify to 5-10 essential rules. Test if quality improves.

---

### 4. **Prompt Logging is Scattered** ⚠️

Logging happens in multiple places with different loggers:
- `coach_service.py`: `prompt_logger.info("=== COACH LLM REQUEST ===")`
- `generation_service.py`: `generation_prompt_logger.info("=== GENERATION PROMPT ===")`
- `nano_banana_client.py`: `logger.info("[CANVAS DEBUG]...")`

**Recommendation:** Centralize prompt logging with a single `PromptAuditLogger` that captures the full chain.

---

### 5. **CreativeIntent Defined Twice** ⚠️

```python
# coach_service.py
@dataclass
class CreativeIntent:
    description: str
    subject: Optional[str] = None
    ...

# intent_extractor.py
@dataclass
class CreativeIntent:
    description: str
    subject: Optional[str] = None
    ...
```

Same class defined in two files!

**Recommendation:** Keep only in `intent_extractor.py` and import elsewhere.

---

### 6. **No Prompt Versioning** ⚠️

When you change `STRICT_CONTENT_CONSTRAINT` or `SYSTEM_PROMPT_BASE`, there's no way to:
- Track which version generated which asset
- A/B test different prompts
- Roll back if quality degrades

**Recommendation:** Add prompt versioning:
```python
PROMPT_VERSION = "2.1.0"
# Store in asset metadata
```

---

## Verifying Grounding is Working

### Method 1: Check Logs
After deploying, look for this log line in the worker:
```
[GROUNDING] Google Search grounding enabled for this generation request
```

### Method 2: Check API Response
The Gemini API returns `groundingMetadata` when grounding is used:
```json
{
  "candidates": [...],
  "groundingMetadata": {
    "webSearchQueries": ["Fortnite Battlewood Boulevard Chapter 7"],
    "groundingChunks": [...]
  }
}
```

We're not currently capturing this in the response. To verify:

```python
# Add to nano_banana_client.py _extract_image_data():
grounding_metadata = data.get("groundingMetadata")
if grounding_metadata:
    logger.info(f"[GROUNDING] Search queries used: {grounding_metadata.get('webSearchQueries')}")
```

### Method 3: Test with Current Event
Generate an image about something that happened recently (after model training cutoff):
- "Create a thumbnail about the latest Fortnite update"
- If grounding works, it should know current season details
- If not, it will hallucinate or be vague

---

## Dev Logging Audit

### Current State
```typescript
// tsx/packages/shared/src/utils/devLogger.ts
const SUPPRESS_DEV_LOGS = true;  // Production default
```

### Issues:
1. **Confusing naming**: `SUPPRESS_DEV_LOGS = true` means logs are OFF. Double negative is confusing.
2. **No runtime toggle**: Must rebuild to change
3. **No log levels**: Can't enable just errors or just specific components

### Recommended Improvements:

```typescript
// Clearer naming
const DEV_LOGGING_ENABLED = false;  // false = off, true = on

// Or better: use log levels
type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';
const LOG_LEVEL: LogLevel = 'error';  // Only errors in prod

// Runtime toggle via localStorage (for debugging prod issues)
const getLogLevel = (): LogLevel => {
  if (typeof window !== 'undefined') {
    const override = localStorage.getItem('AURASTREAM_LOG_LEVEL');
    if (override) return override as LogLevel;
  }
  return LOG_LEVEL;
};
```

---

## Senior Engineer Recommendations

If I were a senior engineer on this project, I would:

### High Priority (Quality Impact)

1. **Consolidate Intent Extraction**
   - Delete duplicate code in `coach_service.py`
   - Use `IntentExtractor` class exclusively
   - Add unit tests for all extraction patterns

2. **Simplify STRICT_CONTENT_CONSTRAINT**
   - Reduce from 28 rules to 10 essential ones
   - A/B test to measure quality impact
   - Version the constraint

3. **Add Grounding Metadata Capture**
   - Log what searches Gemini performed
   - Store in asset metadata for debugging
   - Helps verify grounding is working

### Medium Priority (Developer Experience)

4. **Centralize Prompt Logging**
   - Single `PromptAuditService` that logs the full chain
   - Include: coach input → coach output → generation prompt → NanoBanana prompt
   - Make it easy to debug "why did this image look wrong?"

5. **Fix Dev Logger Naming**
   - Rename `SUPPRESS_DEV_LOGS` to `DEV_LOGGING_ENABLED`
   - Add localStorage override for runtime debugging
   - Add log levels (error, warn, info, debug)

6. **Remove Duplicate CreativeIntent**
   - Keep in `intent_extractor.py` only
   - Import in `coach_service.py`

### Low Priority (Nice to Have)

7. **Prompt Versioning**
   - Track which prompt version generated each asset
   - Enable A/B testing of prompts
   - Easy rollback if quality degrades

8. **Coordinate Coach + NanoBanana Grounding**
   - If coach already searched, pass context to NanoBanana
   - Avoid redundant API calls
   - Save costs

---

## Quick Wins (Can Do Now)

1. ✅ **Grounding enabled** - Already done in this session

2. **Add grounding verification logging:**
```python
# In nano_banana_client.py, after getting response
grounding_meta = data.get("groundingMetadata")
if grounding_meta:
    queries = grounding_meta.get("webSearchQueries", [])
    logger.info(f"[GROUNDING] Gemini searched: {queries}")
```

3. **Fix dev logger naming:**
```typescript
// Change from confusing double-negative
const SUPPRESS_DEV_LOGS = true;
// To clear positive
const DEV_LOGGING_ENABLED = false;
```

---

## Files to Modify

| File | Change |
|------|--------|
| `backend/services/nano_banana_client.py` | Add grounding metadata logging |
| `backend/services/coach/coach_service.py` | Remove duplicate intent extraction |
| `tsx/packages/shared/src/utils/devLogger.ts` | Rename flag, add log levels |
| `backend/services/coach/intent_extractor.py` | Keep as single source of truth |

---

## Conclusion

The Coach → NanoBanana flow works but has accumulated technical debt:
- Duplicate code (intent extraction, CreativeIntent class)
- Inconsistent patterns (grounding, logging)
- Overly complex constraints (28 rules)

The grounding feature we just added will help with accuracy for current game content. To verify it's working, check for `[GROUNDING]` log lines or test with a recent event prompt.

Would you like me to implement any of these recommendations?
