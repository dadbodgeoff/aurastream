# Coach Service Architecture

## Overview

The Prompt Coach service helps users articulate their creative vision through conversation. It's a Premium-only feature (Studio tier) that guides users to describe WHAT they want, not HOW to prompt for it.

## Architecture (v2 - Enterprise Refactor)

The service was refactored into clear, single-responsibility components after a bug where placeholder text was being passed to image generation instead of the refined description.

```
┌─────────────────────────────────────────────────────────────────┐
│                    CreativeDirectorServiceV2                     │
│                    (Main Orchestrator)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ PromptBuilder │   │ IntentExtractor │   │ResponseProcessor│
│               │   │                 │   │                 │
│ - System      │   │ - Pattern       │   │ - Coordinates   │
│   prompts     │   │   matching      │   │   extraction    │
│ - User        │   │ - Confidence    │   │ - Session       │
│   messages    │   │   scoring       │   │   updates       │
│ - Context     │   │ - Validation    │   │ - Metadata      │
│   formatting  │   │                 │   │   extraction    │
└───────────────┘   └─────────────────┘   └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  SessionManager │
                    │                 │
                    │ - Redis storage │
                    │ - PostgreSQL    │
                    │   persistence   │
                    │ - TTL handling  │
                    └─────────────────┘
```

## Components

### IntentExtractor (`intent_extractor.py`)

**Responsibility:** Extract the refined creative description from LLM responses.

**Key Features:**
- Pattern-based extraction with priority ordering
- Confidence scoring based on extraction method
- Validation to catch placeholder text
- Fallback handling with logging

**Critical Patterns:**
```python
# These patterns match common coach response formats
"✨ Ready! A vibrant thumbnail..."  → ready_marker (0.90 confidence)
"Perfect! A sleek banner..."        → perfect_marker (0.90 confidence)
"Here's what I've got: ..."         → heres_what (0.85 confidence)
"So we're going for ..."            → going_for (0.80 confidence)
```

**Bug Prevention:**
The `CreativeIntent.is_valid()` method checks for placeholder patterns:
- "help me describe"
- "custom mood, custom mood"
- "Help me figure out"

### PromptBuilder (`prompt_builder.py`)

**Responsibility:** Construct system prompts and user messages for the LLM.

**Key Features:**
- Centralized prompt templates
- Context formatting (brand, colors, mood)
- Session state reconstruction
- Asset type name mapping

### ResponseProcessor (`response_processor.py`)

**Responsibility:** Coordinate response processing and session updates.

**Key Features:**
- Orchestrates intent extraction
- Updates session state
- Extracts metadata (keywords, brand elements)
- Creates stream chunks for the API

### SessionManager (`session_manager.py`)

**Responsibility:** Manage session storage and retrieval.

**Key Features:**
- Redis-backed with TTL (30 minutes)
- PostgreSQL persistence for history
- Message and prompt history tracking
- Limit enforcement (turns, tokens)

## Data Flow

### Starting a Session

```
1. User provides context (brand kit, asset type, mood, description)
2. PromptBuilder creates system prompt and first message
3. SessionManager creates new session in Redis
4. LLM streams response
5. IntentExtractor extracts refined description
6. ResponseProcessor updates session and creates stream chunks
7. API returns session_id and intent status
```

### Continuing a Conversation

```
1. User sends message
2. SessionManager retrieves session
3. PromptBuilder builds conversation messages
4. LLM streams response
5. IntentExtractor extracts refined intent
6. ResponseProcessor updates session
7. API returns updated intent status
```

## Testing

### Unit Tests (`test_intent_extractor.py`)

30 tests covering:
- Pattern matching for all extraction patterns
- Confidence calculation
- Placeholder rejection
- Conversation continuation
- Edge cases (multiline, empty, etc.)

### Regression Tests

Specific tests for the placeholder bug:
- `test_real_world_fortnite_thumbnail_case` - The exact bug scenario
- `test_placeholder_validation_catches_bug` - Validation safety net
- `test_multiple_placeholder_patterns_rejected` - All placeholder variants

## Migration Path

The v2 service (`CreativeDirectorServiceV2`) is available alongside the legacy service. To migrate:

1. Import from the new module:
   ```python
   from backend.services.coach import get_coach_service_v2
   ```

2. The API is identical to the legacy service

3. The legacy service (`coach_service.py`) has been patched with the same intent extraction fixes

## Files

```
backend/services/coach/
├── __init__.py              # Package exports
├── coach_service.py         # Legacy service (patched)
├── coach_service_v2.py      # Refactored service
├── intent_extractor.py      # Intent extraction (NEW)
├── prompt_builder.py        # Prompt construction (NEW)
├── response_processor.py    # Response processing (NEW)
├── session_manager.py       # Session storage
├── models.py                # Data models
├── validator.py             # Output validation
├── grounding.py             # Web search decisions
├── llm_client.py            # Gemini API client
├── search_service.py        # Web search
└── tips_service.py          # Static tips

backend/tests/unit/
└── test_intent_extractor.py # Intent extractor tests (NEW)
```

## Lessons Learned

1. **Regex patterns must match actual LLM output** - The original patterns didn't match "✨ Ready!" format
2. **Validation is a safety net** - Even if extraction fails, validation should catch bad data
3. **Logging helps debugging** - The extractor logs when fallback is used
4. **Tests prevent regression** - 30 tests ensure the bug can't recur
5. **Single responsibility** - Separating extraction from orchestration makes testing easier
