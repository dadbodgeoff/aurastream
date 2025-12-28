# 🎯 PROMPT COACH MASTER SCHEMA
## Comprehensive Technical Reference for AuraStream's AI Coaching System

**Version:** 2.0.0  
**Last Updated:** December 28, 2025  
**Purpose:** Complete reference for the Prompt Coach (Creative Director) system

---

## QUICK REFERENCE

### System Identity
- **Name:** Prompt Coach / Creative Director
- **Purpose:** AI-powered assistant that helps streamers articulate their creative vision
- **Key Principle:** Helps users describe WHAT they want, NOT HOW to prompt
- **Premium Feature:** Studio tier only (with 1 free trial for Free/Pro users)

### Key Directories
```
backend/services/coach/       → Core coach services
backend/api/routes/coach.py   → API endpoints
backend/api/schemas/coach.py  → Pydantic schemas
backend/workers/              → Background workers
tsx/apps/web/src/hooks/       → Frontend hooks
tsx/apps/web/src/components/coach/ → UI components
```

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  CoachChatIntegrated.tsx                                                     │
│  ├── SessionContextBar (turns, timeout, brand kit display)                  │
│  ├── EnhancedCoachMessage (streaming messages with cards)                   │
│  ├── ThinkingIndicator / ChainOfThought (streaming UX)                      │
│  ├── CoachInput (suggestions, reference images)                             │
│  └── GenerationProgress / GenerationResult (inline generation)              │
│                                                                              │
│  useCoachChat.ts (SSE streaming, token batching, state management)          │
│  useCoachContext.ts (session context provider)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ SSE (Server-Sent Events)
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/api/routes/coach.py                                                 │
│  ├── GET  /coach/tips          → Static tips (all tiers)                    │
│  ├── GET  /coach/access        → Check tier access + trial status           │
│  ├── POST /coach/start         → Start session (SSE stream)                 │
│  ├── POST /coach/sessions/{id}/messages → Continue chat (SSE stream)        │
│  ├── GET  /coach/sessions/{id} → Get session state                          │
│  ├── POST /coach/sessions/{id}/end → End session                            │
│  ├── POST /coach/sessions/{id}/generate → Inline generation                 │
│  ├── GET  /coach/sessions/{id}/assets → Get session assets                  │
│  └── GET  /coach/sessions      → List user sessions                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  CreativeDirectorService (coach_service.py)                                  │
│  ├── start_with_context()  → Start session with brand/asset context         │
│  ├── continue_chat()       → Continue conversation                          │
│  ├── end_session()         → End and return final intent                    │
│  └── _perform_search()     → Web search for grounding                       │
│                                                                              │
│  SessionManager (session_manager.py)                                         │
│  ├── create_with_context() → Create Redis session                           │
│  ├── add_message()         → Track conversation                             │
│  ├── add_prompt_suggestion() → Track prompt evolution                       │
│  └── check_limits()        → Enforce turn/token limits                      │
│                                                                              │
│  GroundingStrategy (grounding.py)                                            │
│  ├── should_ground()       → LLM self-assessment for search need            │
│  └── _assess_grounding_need() → Ask LLM if it needs current info            │
│                                                                              │
│  CoachLLMClient (llm_client.py)                                              │
│  ├── stream_chat()         → Basic streaming                                │
│  └── stream_chat_with_usage() → Streaming + token counting                  │
│                                                                              │
│  OutputValidator (validator.py)                                              │
│  └── validate()            → Check prompt quality before generation         │
│                                                                              │
│  StaticTipsService (tips_service.py)                                         │
│  └── get_tips_for_asset_type() → Curated tips for free users                │
│                                                                              │
│  WebSearchService (search_service.py)                                        │
│  └── search()              → DuckDuckGo/Mock web search                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Redis (Primary - Real-time)        │  PostgreSQL (Secondary - Persistence) │
│  ├── Session state (30min TTL)      │  ├── coach_sessions table             │
│  ├── Conversation history           │  ├── Session history                  │
│  ├── Prompt evolution               │  └── User trial tracking              │
│  └── Token usage tracking           │                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## DATA MODELS

### Session Model (Redis + PostgreSQL)

```python
@dataclass
class CoachSession:
    session_id: str              # UUID
    user_id: str                 # Owner
    status: str                  # "active" | "ended" | "expired"
    
    # Context (from initial request)
    brand_context: Dict[str, Any]  # Brand kit data
    asset_type: str              # Target asset type
    mood: str                    # Selected mood
    game_context: str            # Web search results (if grounded)
    
    # Conversation
    messages: List[CoachMessage] # Full history
    turns_used: int              # User messages count
    
    # Token tracking (for billing)
    tokens_in_total: int         # Input tokens consumed
    tokens_out_total: int        # Output tokens generated
    
    # Grounding tracking
    grounding_calls: int         # Web searches performed
    
    # Prompt evolution
    prompt_history: List[PromptSuggestion]  # All versions
    current_prompt_draft: str    # Latest refined description
    
    # Timestamps
    created_at: float
    updated_at: float
```

### Message Model

```python
@dataclass
class CoachMessage:
    role: str           # "user" | "assistant"
    content: str        # Message text
    timestamp: float    # Unix timestamp
    grounding_used: bool = False
    tokens_in: int = 0
    tokens_out: int = 0
```

### Prompt Suggestion Model

```python
@dataclass
class PromptSuggestion:
    version: int                    # 1, 2, 3...
    prompt: str                     # The refined description
    timestamp: float
    refinement_request: str         # What user asked to change
    changes_made: List[str]         # ["Added: sparkles", "Removed: dark"]
    brand_elements_used: List[str]  # ["color:sunset orange", "tone:competitive"]
```

### Creative Intent (Output)

```python
@dataclass
class CreativeIntent:
    description: str              # User's refined description
    subject: str                  # Main subject
    action: str                   # What's happening
    emotion: str                  # Emotional tone
    elements: List[str]           # Additional elements
    confidence_score: float       # 0.0 - 1.0
```

---

## INPUT DATA (What the Coach Receives)

### StartCoachRequest

```python
class StartCoachRequest(BaseModel):
    brand_context: Optional[BrandContext]  # OPTIONAL - users can proceed without
    asset_type: AssetTypeEnum              # Required
    mood: MoodEnum                         # Required
    custom_mood: Optional[str]             # If mood='custom'
    game_id: Optional[str]                 # For grounding
    game_name: Optional[str]               # For grounding
    description: str                       # User's initial idea (5-500 chars)
```

### BrandContext (Optional)

```python
class BrandContext(BaseModel):
    brand_kit_id: Optional[str]     # UUID or None
    colors: List[ColorInfo]         # [{hex: "#FF5733", name: "Sunset Orange"}]
    tone: str = "professional"      # Brand voice
    fonts: Optional[FontInfo]       # {headline: "Montserrat", body: "Inter"}
    logo_url: Optional[str]         # Logo URL if available
```

### Supported Asset Types

```python
AssetTypeEnum = Literal[
    # General
    "thumbnail", "overlay", "banner", "story_graphic", "clip_cover",
    # Twitch-specific
    "twitch_emote", "twitch_badge", "twitch_panel", "twitch_offline",
    # Legacy/extended
    "youtube_thumbnail", "twitch_banner", "tiktok_story",
    "instagram_story", "instagram_reel"
]
```

### Supported Moods

```python
MoodEnum = Literal["hype", "cozy", "rage", "chill", "custom"]
```

---

## OUTPUT DATA (What the Coach Returns)

### SSE Stream Chunk Types

```python
StreamChunkTypeEnum = Literal[
    "token",              # Individual response token
    "intent_ready",       # Intent is clear enough for generation
    "grounding",          # Starting web search
    "grounding_complete", # Web search finished
    "done",               # Stream complete
    "error",              # Error occurred
    "trial_started"       # Trial session started (free/pro users)
]
```

### Stream Chunk Structure

```json
{
  "type": "token",
  "content": "Here's what I understand...",
  "metadata": null
}

{
  "type": "intent_ready",
  "content": "",
  "metadata": {
    "is_ready": true,
    "confidence": 0.85,
    "refined_description": "A vibrant victory emote with raised fists...",
    "turn": 3
  }
}

{
  "type": "done",
  "content": "",
  "metadata": {
    "session_id": "uuid-here",
    "turns_used": 3,
    "turns_remaining": 7,
    "tokens_in": 150,
    "tokens_out": 200
  }
}
```

### End Session Response

```python
class CoachOutput:
    refined_intent: CreativeIntent    # Final user intent
    metadata: Dict[str, Any]          # Session stats
    suggested_asset_type: str         # Recommended type
    keywords: List[str]               # Extracted keywords
```

---

## TIER ACCESS & LIMITS

### Tier Configuration

```python
TIER_ACCESS = {
    "free": {
        "coach_access": False,
        "feature": "tips_only",
        "grounding": False,
        "trial_eligible": True    # 1 free trial session
    },
    "pro": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": False,
        "trial_eligible": False
    },
    "studio": {
        "coach_access": True,
        "feature": "full_coach",
        "grounding": True         # Web search enabled
    }
}
```

### Session Limits

```python
SESSION_TTL = 1800          # 30 minutes
MAX_TURNS = 10              # Messages per session
MAX_TOKENS_IN = 5000        # Input token limit
MAX_TOKENS_OUT = 2000       # Output token limit
```

### Rate Limits

```python
# Session creation: 20 sessions per user per hour
# Messages: 10 messages per user per minute
```

---

## GROUNDING SYSTEM (Web Search)

### When Grounding Triggers

1. **Game Detection:** Mentions of frequently-updating games (Fortnite, Apex, Valorant, etc.)
2. **Time-Sensitive Keywords:** "current", "latest", "new", "season", "chapter", "update"
3. **LLM Self-Assessment:** LLM determines if it needs current information

### Grounding Flow

```
User mentions "Fortnite Chapter 5"
         │
         ▼
┌─────────────────────────────┐
│ GroundingStrategy.should_ground()
│ - Check if game is in FREQUENTLY_UPDATING_GAMES
│ - Check for time-sensitive keywords
│ - Ask LLM if it needs current info
└─────────────────────────────┘
         │
         ▼ (if should_ground=true)
┌─────────────────────────────┐
│ WebSearchService.search()
│ - DuckDuckGo search
│ - Max 3 results
│ - Rate limited (1 req/sec)
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Format results for context
│ "Current information from web search:
│  - Fortnite Chapter 5 Season 1..."
└─────────────────────────────┘
         │
         ▼
Inject into system prompt
```

### Frequently Updating Games

```python
FREQUENTLY_UPDATING_GAMES = [
    "fortnite", "apex legends", "valorant", "league of legends",
    "overwatch", "call of duty", "warzone", "destiny", "genshin impact",
    "minecraft", "roblox", "pokemon", "fifa", "madden", "nba 2k"
]
```

---

## VALIDATION SYSTEM

### Validation Checks

1. **Length:** 10-500 characters
2. **Required Elements:** Subject, emotion/action, mood, composition (varies by asset type)
3. **Conflicts:** Detects contradictory terms (e.g., "minimalist" + "detailed")
4. **Asset Compatibility:** Warns about text in emotes, low contrast in thumbnails
5. **Brand Alignment:** Checks if colors match brand palette

### Quality Score Calculation

```python
quality_score = 1.0 - (errors * 0.3) - (warnings * 0.1)
# Minimum: 0.0, Maximum: 1.0
```

### Validation Issue Severities

```python
ValidationSeverity = Literal["error", "warning", "info"]
# error: Will fail generation
# warning: Might produce poor results
# info: Suggestion for improvement
```

---

## FRONTEND INTEGRATION

### useCoachChat Hook

```typescript
interface UseCoachChatReturn {
  // State
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingStage: StreamingStage;  // 'idle'|'connecting'|'thinking'|'streaming'|'validating'|'complete'|'error'
  sessionId: string | null;
  refinedDescription: string | null;
  isGenerationReady: boolean;
  confidence: number;
  error: string | null;
  isGrounding: boolean;
  groundingQuery: string | null;
  
  // Actions
  startSession: (request: StartCoachRequest) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  endSession: () => Promise<void>;
  reset: () => void;
}
```

### Token Batching (Performance Optimization)

```typescript
// Instead of updating state on every token (causes ~100 re-renders),
// tokens are batched and flushed every 100ms
const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
const tokenBufferRef = useRef<string>('');

// Flush every 100ms
flushIntervalRef.current = setInterval(() => {
  if (tokenBufferRef.current) {
    // Single state update with all accumulated tokens
    updateMessage(tokenBufferRef.current);
    tokenBufferRef.current = '';
  }
}, 100);
```

### Session Timeout Display

```typescript
// SessionContextBar shows countdown with warning states
// Yellow: ≤5 minutes remaining
// Red: ≤2 minutes remaining
function useSessionTimeout(sessionStartTime?: Date, timeoutMinutes: number = 30) {
  // Updates every minute
  // Returns minutes remaining
}
```

---

## BACKGROUND WORKERS

### Coach Cleanup Worker

```python
# backend/workers/coach_cleanup_worker.py
# Runs hourly to expire stale sessions

CLEANUP_INTERVAL = 3600        # 1 hour
STALE_THRESHOLD_MINUTES = 30   # Sessions inactive for 30+ min

# Usage:
# Continuous: python -m backend.workers.coach_cleanup_worker
# Single run: python -m backend.workers.coach_cleanup_worker --once
# Dry run:    python -m backend.workers.coach_cleanup_worker --once --dry-run
```

---

## API ENDPOINTS REFERENCE

| Endpoint | Method | Auth | Tier | Description |
|----------|--------|------|------|-------------|
| `/coach/tips` | GET | Yes | All | Get static tips for asset type |
| `/coach/access` | GET | Yes | All | Check access level + trial status |
| `/coach/start` | POST | Yes | Studio/Trial | Start session (SSE) |
| `/coach/sessions/{id}/messages` | POST | Yes | Studio/Trial | Continue chat (SSE) |
| `/coach/sessions/{id}` | GET | Yes | Studio | Get session state |
| `/coach/sessions/{id}/end` | POST | Yes | Studio | End session |
| `/coach/sessions/{id}/generate` | POST | Yes | Studio | Trigger inline generation |
| `/coach/sessions/{id}/assets` | GET | Yes | Studio | Get session's generated assets |
| `/coach/sessions` | GET | Yes | Studio | List user's sessions |

---

## SYSTEM PROMPT

```python
SYSTEM_PROMPT_BASE = '''You help streamers create {asset_type} assets.

RULE #1: Do what the user asks. If they request changes, make them. If they ask questions, answer them.

Context: {brand_context} | {game_context} | {mood_context}
Brand colors: {color_list}

Gather (only what's missing): subject, style/mood, any text to include.

Keep responses to 2-3 sentences. Confirm any text spelling. When ready:
"✨ Ready! [summary] [INTENT_READY]"
'''
```

---

## STATIC TIPS (Free/Pro Users)

### Tip Categories
- **style:** Art style references, quality keywords
- **color:** Brand colors, color mood, contrast
- **composition:** Layout, focal points, spacing
- **gaming:** Game aesthetics, current seasons

### Example Tips

```python
PromptTip(
    id="emote_001",
    title="Keep Emotes Simple",
    description="Emotes are viewed at tiny sizes (28x28 pixels). Simple, bold designs work best.",
    example_prompt="Simple expressive face, bold outlines, single emotion, sticker style",
    asset_types=["twitch_emote"],
    category="composition",
)
```

---

## ERROR HANDLING

### Session Errors

```python
class SessionNotFoundError(Exception):
    # Session doesn't exist or user doesn't own it
    
class SessionExpiredError(Exception):
    # Session TTL exceeded (30 minutes)
    
class SessionLimitExceededError(Exception):
    # Turns or tokens exceeded
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 401 | Authentication required |
| 403 | Upgrade required (tier access) |
| 404 | Session not found |
| 410 | Session expired |
| 422 | Validation error |
| 429 | Rate limit exceeded |

---

## TESTING

### Backend Tests

```bash
# Run all coach tests (122 tests)
python3 -m pytest backend/tests/unit/test_coach*.py -v

# Run specific test file
python3 -m pytest backend/tests/unit/test_coach_service.py -v
python3 -m pytest backend/tests/unit/test_coach_grounding.py -v
python3 -m pytest backend/tests/unit/test_coach_validator.py -v
```

### Linting

```bash
python3 -m ruff check backend/services/coach/ backend/workers/coach_cleanup_worker.py
```

---

## ENVIRONMENT VARIABLES

```bash
# LLM Configuration
GOOGLE_GEMINI_API_KEY=xxx      # or GOOGLE_API_KEY
COACH_LLM_MODEL=gemini-3-flash-preview

# Search Configuration
COACH_SEARCH_PROVIDER=duckduckgo  # or "mock" or "none"

# Database
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
REDIS_URL=xxx
```

---

## CHECKLIST FOR CHANGES

Before modifying the coach system:

- [ ] Backend schema matches frontend type
- [ ] SSE chunk types are consistent
- [ ] Token counting is preserved
- [ ] Session limits are enforced
- [ ] Grounding triggers correctly
- [ ] Validation rules are complete
- [ ] Rate limits are respected
- [ ] Tests pass (122 unit tests)
- [ ] Linting passes

---

*This schema is the definitive reference for the AuraStream Prompt Coach system.*
