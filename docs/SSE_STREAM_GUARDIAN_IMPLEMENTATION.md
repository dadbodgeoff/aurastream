# SSE Stream Guardian - Complete Implementation Plan

## Executive Summary

This document provides a complete audit of all SSE streaming in AuraStream and a one-shot implementation plan for the SSE Stream Guardian system - an enterprise-grade reliability layer that ensures streaming events complete properly and handles failures gracefully.

---

## PART 1: COMPLETE SSE STREAMING AUDIT

### Backend SSE Endpoints (5 Total)

| # | Endpoint | Method | File | Lines | Purpose |
|---|----------|--------|------|-------|---------|
| 1 | `/api/v1/jobs/{job_id}/stream` | GET | `backend/api/routes/generation.py` | 433-537 | Asset generation progress |
| 2 | `/api/v1/coach/start` | POST | `backend/api/routes/coach.py` | 349-465 | Start coach session |
| 3 | `/api/v1/coach/sessions/{id}/messages` | POST | `backend/api/routes/coach.py` | 527-585 | Continue coach chat |
| 4 | `/api/v1/profile-creator/start` | POST | `backend/api/routes/profile_creator.py` | 155-205 | Start profile creator |
| 5 | `/api/v1/profile-creator/sessions/{id}/messages` | POST | `backend/api/routes/profile_creator.py` | 208-260 | Continue profile creator |

### Event Types by Endpoint

#### 1. Generation Stream (`/api/v1/jobs/{job_id}/stream`)
```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT TYPE    │ TERMINAL │ DATA SCHEMA                         │
├───────────────┼──────────┼─────────────────────────────────────┤
│ progress      │ No       │ {type, status, progress, message}   │
│ completed     │ YES      │ {type, status, progress, asset}     │
│ failed        │ YES      │ {type, status, progress, error}     │
│ heartbeat     │ No       │ {type}                              │
│ timeout       │ YES      │ {type, error}                       │
│ error         │ YES      │ {type, error}                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. Coach Start (`/api/v1/coach/start`)
```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT TYPE    │ TERMINAL │ DATA SCHEMA                         │
├───────────────┼──────────┼─────────────────────────────────────┤
│ usage_info    │ No       │ {type, content, metadata}           │
│ token         │ No       │ {type, content}                     │
│ grounding     │ No       │ {type, content, metadata}           │
│ grounding_complete │ No  │ {type, content}                     │
│ intent_ready  │ No       │ {type, content, metadata}           │
│ done          │ YES      │ {type, content, metadata}           │
│ error         │ YES      │ {type, content, metadata}           │
└─────────────────────────────────────────────────────────────────┘
```

#### 3. Coach Continue (`/api/v1/coach/sessions/{id}/messages`)
```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT TYPE    │ TERMINAL │ DATA SCHEMA                         │
├───────────────┼──────────┼─────────────────────────────────────┤
│ token         │ No       │ {type, content}                     │
│ intent_ready  │ No       │ {type, content, metadata}           │
│ done          │ YES      │ {type, content, metadata}           │
│ error         │ YES      │ {type, content, metadata}           │
└─────────────────────────────────────────────────────────────────┘
```

#### 4. Profile Creator Start (`/api/v1/profile-creator/start`)
```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT TYPE    │ TERMINAL │ DATA SCHEMA                         │
├───────────────┼──────────┼─────────────────────────────────────┤
│ token         │ No       │ {type, content, metadata?}          │
│ intent_ready  │ No       │ {type, content, metadata}           │
│ done          │ YES      │ {type, content, metadata}           │
│ error         │ YES      │ {type, content}                     │
└─────────────────────────────────────────────────────────────────┘
```

#### 5. Profile Creator Continue (`/api/v1/profile-creator/sessions/{id}/messages`)
```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT TYPE    │ TERMINAL │ DATA SCHEMA                         │
├───────────────┼──────────┼─────────────────────────────────────┤
│ token         │ No       │ {type, content, metadata?}          │
│ intent_ready  │ No       │ {type, content, metadata}           │
│ done          │ YES      │ {type, content, metadata}           │
│ error         │ YES      │ {type, content}                     │
└─────────────────────────────────────────────────────────────────┘
```

### Frontend SSE Consumers (4 Total)

| # | File | Type | Used By |
|---|------|------|---------|
| 1 | `tsx/packages/shared/src/hooks/useSSEStream.ts` | Generic hook | Shared |
| 2 | `tsx/apps/web/src/hooks/useCoachChat.ts` | Domain hook | Coach UI |
| 3 | `tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx` | Inline SSE | Profile Creator |
| 4 | `tsx/apps/mobile/src/components/coach/utils.ts` | Utility | Mobile Coach |

### Current Gaps Identified

1. **No stream registration** - Backend doesn't track active streams
2. **No orphan detection** - Stalled streams aren't detected
3. **No completion storage** - If client disconnects, completion state is lost
4. **Inconsistent heartbeats** - Only generation endpoint has heartbeats
5. **No Last-Event-ID** - Clients can't resume from where they left off
6. **No circuit breaker** - No fallback when streaming repeatedly fails

---

## PART 2: SSE STREAM GUARDIAN ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    SSE STREAM GUARDIAN                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │ Stream Registry │    │ Completion Store│    │ Guardian    │ │
│  │ (Redis)         │◄──►│ (Redis)         │◄──►│ Worker      │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬──────┘ │
│           │                      │                    │        │
│           ▼                      ▼                    ▼        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Redis Keys                               ││
│  │  sse:stream:{stream_id}     - Active stream metadata        ││
│  │  sse:user:{user_id}:streams - User's active streams         ││
│  │  sse:completion:{stream_id} - Completion state for resume   ││
│  │  sse:events:{stream_id}     - Event log for replay          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION POINTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend Routes (5 endpoints):                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Register stream on connection                            ││
│  │ 2. Heartbeat on each event                                  ││
│  │ 3. Store completion state on terminal events                ││
│  │ 4. Unregister on clean close                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Frontend Consumers (4 files):                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Send Last-Event-ID on reconnect                          ││
│  │ 2. Check completion store on connect                        ││
│  │ 3. Exponential backoff retry                                ││
│  │ 4. Circuit breaker fallback to polling                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Orchestrator Integration:                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Guardian runs every 10s in orchestrator tick             ││
│  │ 2. Detects orphaned streams (no heartbeat > 30s)            ││
│  │ 3. Stores completion for orphans if job finished            ││
│  │ 4. Alerts on anomalies (high orphan rate)                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PART 3: FILES TO CREATE/MODIFY

### New Files (7)

| # | File | Purpose |
|---|------|---------|
| 1 | `backend/services/sse/__init__.py` | Package init |
| 2 | `backend/services/sse/registry.py` | Stream registration & tracking |
| 3 | `backend/services/sse/completion_store.py` | Store completion state for reconnect |
| 4 | `backend/services/sse/guardian.py` | Orphan detection & recovery |
| 5 | `backend/services/sse/types.py` | Shared types & enums |
| 6 | `backend/api/routes/sse_recovery.py` | Recovery endpoints |
| 7 | `tsx/packages/api-client/src/sse/ResilientEventSource.ts` | Client reconnection |

### Modified Files (9)

| # | File | Changes |
|---|------|---------|
| 1 | `backend/api/routes/generation.py` | Add stream registration |
| 2 | `backend/api/routes/coach.py` | Add stream registration (2 endpoints) |
| 3 | `backend/api/routes/profile_creator.py` | Add stream registration (2 endpoints) |
| 4 | `backend/workers/orchestrator/orchestrator.py` | Add guardian to tick loop |
| 5 | `backend/workers/orchestrator/types.py` | Add SSE worker type |
| 6 | `tsx/packages/shared/src/hooks/useSSEStream.ts` | Add reconnection support |
| 7 | `tsx/apps/web/src/hooks/useCoachChat.ts` | Use ResilientEventSource |
| 8 | `tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx` | Use ResilientEventSource |
| 9 | `tsx/apps/mobile/src/components/coach/utils.ts` | Add reconnection support |

---

## PART 4: IMPLEMENTATION SCHEMA FOR SUBAGENTS

### Subagent 1: Backend SSE Service Layer
**Files:** `backend/services/sse/*`

```yaml
task: Create SSE service layer
files:
  - path: backend/services/sse/__init__.py
    action: create
    content: |
      Export StreamRegistry, CompletionStore, StreamGuardian, types
      
  - path: backend/services/sse/types.py
    action: create
    content: |
      - StreamType enum: GENERATION, COACH_START, COACH_CONTINUE, PROFILE_START, PROFILE_CONTINUE
      - StreamState enum: ACTIVE, COMPLETED, FAILED, ORPHANED, EXPIRED
      - StreamMetadata dataclass: stream_id, stream_type, user_id, started_at, last_heartbeat, state, metadata
      - CompletionData dataclass: stream_id, terminal_event_type, terminal_event_data, completed_at
      - TERMINAL_EVENTS dict mapping stream types to their terminal event types
      
  - path: backend/services/sse/registry.py
    action: create
    content: |
      class StreamRegistry:
        Redis keys:
          - sse:stream:{stream_id} -> StreamMetadata (hash, TTL 1hr)
          - sse:user:{user_id}:streams -> set of stream_ids
          - sse:active -> sorted set by last_heartbeat timestamp
        
        Methods:
          - async register(stream_id, stream_type, user_id, metadata) -> None
          - async heartbeat(stream_id) -> None
          - async get_stream(stream_id) -> StreamMetadata | None
          - async get_user_streams(user_id) -> List[StreamMetadata]
          - async get_stale_streams(threshold_seconds=30) -> List[StreamMetadata]
          - async unregister(stream_id) -> None
          - async update_state(stream_id, state) -> None
          
  - path: backend/services/sse/completion_store.py
    action: create
    content: |
      class CompletionStore:
        Redis keys:
          - sse:completion:{stream_id} -> CompletionData (hash, TTL 5min)
          - sse:events:{stream_id} -> list of events (for replay, TTL 5min)
        
        Methods:
          - async store_completion(stream_id, event_type, event_data) -> None
          - async get_completion(stream_id) -> CompletionData | None
          - async store_event(stream_id, event_id, event_data) -> None
          - async get_events_after(stream_id, last_event_id) -> List[event]
          - async clear_completion(stream_id) -> None
          
  - path: backend/services/sse/guardian.py
    action: create
    content: |
      class StreamGuardian:
        Dependencies: StreamRegistry, CompletionStore
        
        Methods:
          - async check_orphaned_streams() -> List[OrphanedStream]
            1. Get stale streams from registry (no heartbeat > 30s)
            2. For each stale stream:
               - If GENERATION: check job status, store completion if done
               - If COACH/PROFILE: mark as orphaned, store last state
            3. Return list of orphaned streams for alerting
            
          - async recover_stream(stream_id) -> CompletionData | None
            1. Check completion store
            2. If found, return completion data
            3. If not, check underlying job/session status
            4. Store and return completion if available
            
          - async cleanup_expired() -> int
            1. Remove streams older than 1 hour
            2. Return count of cleaned streams
            
          - async get_health_metrics() -> dict
            1. Active streams count
            2. Orphaned streams count (last hour)
            3. Average stream duration
            4. Completion rate
```

### Subagent 2: Backend Route Integration
**Files:** `backend/api/routes/generation.py`, `backend/api/routes/coach.py`, `backend/api/routes/profile_creator.py`, `backend/api/routes/sse_recovery.py`

```yaml
task: Integrate SSE services into routes
files:
  - path: backend/api/routes/sse_recovery.py
    action: create
    content: |
      Router with prefix /api/v1/sse
      
      Endpoints:
        GET /recovery/{stream_id}
          - Check if completion data exists
          - Return completion data or 404
          
        GET /events/{stream_id}
          - Query param: last_event_id
          - Return events after last_event_id for replay
          
        GET /health
          - Return guardian health metrics
          
  - path: backend/api/routes/generation.py
    action: modify
    changes: |
      In stream_job_progress():
      1. Generate stream_id = f"gen:{job_id}:{uuid4()[:8]}"
      2. Register stream at start: await registry.register(stream_id, StreamType.GENERATION, user_id, {"job_id": job_id})
      3. Add event_id to each event: event_id = f"{stream_id}:{counter}"
      4. Heartbeat on each event: await registry.heartbeat(stream_id)
      5. Store completion on terminal events: await completion_store.store_completion(...)
      6. Unregister on clean close: await registry.unregister(stream_id)
      7. Add X-Stream-ID header to response
      
  - path: backend/api/routes/coach.py
    action: modify
    changes: |
      In start_coach() and continue_chat():
      1. Generate stream_id = f"coach:{session_id}:{uuid4()[:8]}"
      2. Register stream at start
      3. Add event_id to each event
      4. Heartbeat on each event
      5. Store completion on terminal events
      6. Unregister on clean close
      7. Add X-Stream-ID header
      
  - path: backend/api/routes/profile_creator.py
    action: modify
    changes: |
      In start_session() and continue_session():
      1. Generate stream_id = f"profile:{session_id}:{uuid4()[:8]}"
      2. Register stream at start
      3. Add event_id to each event
      4. Heartbeat on each event
      5. Store completion on terminal events
      6. Unregister on clean close
      7. Add X-Stream-ID header
```

### Subagent 3: Orchestrator Integration
**Files:** `backend/workers/orchestrator/orchestrator.py`, `backend/workers/orchestrator/types.py`

```yaml
task: Add StreamGuardian to orchestrator
files:
  - path: backend/workers/orchestrator/types.py
    action: modify
    changes: |
      Add to WorkerType enum:
        SSE = "sse"
        
  - path: backend/workers/orchestrator/orchestrator.py
    action: modify
    changes: |
      1. Import StreamGuardian
      
      2. In _register_all_workers(), add:
         self._workers["sse_guardian"] = WorkerConfig(
             name="sse_guardian",
             worker_type=WorkerType.SSE,
             execution_mode=WorkerExecutionMode.SCHEDULED,
             interval_seconds=10,  # Run every 10 seconds
             timeout_seconds=30,
             expected_duration_ms=5000,
             priority=JobPriority.HIGH,
             handler=self._run_sse_guardian,
         )
         
      3. Add handler method:
         async def _run_sse_guardian(self) -> Dict[str, Any]:
             from backend.services.sse import StreamGuardian
             guardian = StreamGuardian()
             
             orphaned = await guardian.check_orphaned_streams()
             cleaned = await guardian.cleanup_expired()
             metrics = await guardian.get_health_metrics()
             
             return {
                 "success": True,
                 "metrics": {
                     "orphaned_streams": len(orphaned),
                     "cleaned_streams": cleaned,
                     "active_streams": metrics["active_count"],
                     "completion_rate": metrics["completion_rate"],
                 },
             }
```

### Subagent 4: Frontend ResilientEventSource
**Files:** `tsx/packages/api-client/src/sse/ResilientEventSource.ts`

```yaml
task: Create resilient SSE client
files:
  - path: tsx/packages/api-client/src/sse/ResilientEventSource.ts
    action: create
    content: |
      export interface ResilientSSEOptions {
        url: string;
        method?: 'GET' | 'POST';
        body?: unknown;
        headers?: Record<string, string>;
        onMessage: (event: SSEEvent) => void;
        onError?: (error: Error) => void;
        onReconnect?: (attempt: number) => void;
        onComplete?: () => void;
        maxRetries?: number;  // default 3
        retryDelay?: number;  // default 1000ms
        maxRetryDelay?: number;  // default 30000ms
        heartbeatTimeout?: number;  // default 35000ms
      }
      
      export interface SSEEvent {
        id?: string;
        type: string;
        data: unknown;
      }
      
      export class ResilientEventSource {
        private options: ResilientSSEOptions;
        private abortController: AbortController | null = null;
        private lastEventId: string | null = null;
        private retryCount = 0;
        private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
        private streamId: string | null = null;
        
        constructor(options: ResilientSSEOptions) { ... }
        
        async connect(): Promise<void> {
          1. Check for existing completion via /api/v1/sse/recovery/{streamId}
          2. If completion exists, emit completion event and return
          3. Otherwise, establish SSE connection
          4. Add Last-Event-ID header if available
          5. Parse X-Stream-ID from response headers
          6. Start heartbeat timeout timer
          7. Process events, updating lastEventId
          8. Reset heartbeat timer on each event
          9. On error, attempt reconnect with exponential backoff
        }
        
        private async reconnect(): Promise<void> {
          1. If retryCount >= maxRetries, emit error and stop
          2. Calculate delay with exponential backoff
          3. Call onReconnect callback
          4. Wait for delay
          5. Increment retryCount
          6. Call connect()
        }
        
        abort(): void {
          1. Abort current connection
          2. Clear heartbeat timer
          3. Reset state
        }
        
        private resetHeartbeatTimer(): void {
          1. Clear existing timer
          2. Set new timer for heartbeatTimeout
          3. On timeout, trigger reconnect
        }
      }
      
      // Convenience hook
      export function useResilientSSE(options: ResilientSSEOptions) {
        const [state, setState] = useState<'idle' | 'connecting' | 'streaming' | 'reconnecting' | 'complete' | 'error'>('idle');
        const [error, setError] = useState<Error | null>(null);
        const sourceRef = useRef<ResilientEventSource | null>(null);
        
        const connect = useCallback(() => { ... }, [options]);
        const abort = useCallback(() => { ... }, []);
        
        useEffect(() => {
          return () => sourceRef.current?.abort();
        }, []);
        
        return { state, error, connect, abort };
      }
```

### Subagent 5: Frontend Consumer Updates
**Files:** `tsx/packages/shared/src/hooks/useSSEStream.ts`, `tsx/apps/web/src/hooks/useCoachChat.ts`, `tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx`

```yaml
task: Update frontend consumers to use ResilientEventSource
files:
  - path: tsx/packages/shared/src/hooks/useSSEStream.ts
    action: modify
    changes: |
      1. Import ResilientEventSource
      2. Replace manual fetch with ResilientEventSource
      3. Add reconnection state to SSEState: 'reconnecting'
      4. Pass lastEventId on reconnect
      5. Handle completion recovery automatically
      
  - path: tsx/apps/web/src/hooks/useCoachChat.ts
    action: modify
    changes: |
      1. Import useResilientSSE or ResilientEventSource
      2. Replace streamSSE calls with ResilientEventSource
      3. Add reconnecting state to StreamingStage
      4. Show reconnection UI feedback
      5. Handle completion recovery
      
  - path: tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx
    action: modify
    changes: |
      1. Import ResilientEventSource
      2. Replace inline fetch SSE with ResilientEventSource
      3. Add reconnection handling
      4. Show reconnection UI feedback
```

### Subagent 6: Mobile Updates
**Files:** `tsx/apps/mobile/src/components/coach/utils.ts`

```yaml
task: Update mobile SSE utilities
files:
  - path: tsx/apps/mobile/src/components/coach/utils.ts
    action: modify
    changes: |
      1. Add lastEventId parameter to streamSSE
      2. Add reconnection logic with exponential backoff
      3. Add completion recovery check before streaming
      4. Export reconnection utilities
```

---

## PART 5: EXECUTION ORDER

```
Phase 1: Backend Foundation (Subagent 1)
├── Create backend/services/sse/types.py
├── Create backend/services/sse/registry.py
├── Create backend/services/sse/completion_store.py
├── Create backend/services/sse/guardian.py
└── Create backend/services/sse/__init__.py

Phase 2: Backend Integration (Subagent 2 + 3)
├── Create backend/api/routes/sse_recovery.py
├── Modify backend/api/routes/generation.py
├── Modify backend/api/routes/coach.py
├── Modify backend/api/routes/profile_creator.py
├── Modify backend/workers/orchestrator/types.py
└── Modify backend/workers/orchestrator/orchestrator.py

Phase 3: Frontend Foundation (Subagent 4)
└── Create tsx/packages/api-client/src/sse/ResilientEventSource.ts

Phase 4: Frontend Integration (Subagent 5 + 6)
├── Modify tsx/packages/shared/src/hooks/useSSEStream.ts
├── Modify tsx/apps/web/src/hooks/useCoachChat.ts
├── Modify tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx
└── Modify tsx/apps/mobile/src/components/coach/utils.ts
```

---

## PART 6: TESTING CHECKLIST

### Backend (Completed ✅)
- [x] Stream registration creates Redis entries
- [x] Heartbeat updates last_heartbeat timestamp
- [x] Terminal events store completion data
- [x] Guardian detects orphaned streams after 30s
- [x] Guardian stores completion for orphaned generation streams
- [x] Recovery endpoint returns completion data
- [x] Orchestrator runs guardian every 10s

### Frontend (Completed ✅)
- [x] ResilientEventSource created with reconnection support
- [x] Client reconnects with Last-Event-ID
- [x] Client recovers completion on reconnect
- [x] Exponential backoff works correctly
- [x] useSSEStream updated with 'reconnecting' state
- [x] useCoachChat updated with ResilientEventSource
- [x] ProfileCreatorCore updated with ResilientEventSource
- [x] Mobile utils updated with reconnection support

### Integration Testing (Manual)
- [ ] End-to-end stream registration and recovery
- [ ] Network interruption recovery
- [ ] Health metrics are accurate

---

## PART 7: REDIS KEY SCHEMA

```
# Active stream tracking
sse:stream:{stream_id}          HASH    TTL=1hr
  - stream_type: string
  - user_id: string
  - started_at: ISO timestamp
  - last_heartbeat: ISO timestamp
  - state: string (active|completed|failed|orphaned)
  - metadata: JSON string

# User's active streams
sse:user:{user_id}:streams      SET     TTL=1hr
  - member: stream_id

# Global active streams sorted by heartbeat
sse:active                      ZSET    no TTL
  - member: stream_id
  - score: heartbeat timestamp

# Completion data for recovery
sse:completion:{stream_id}      HASH    TTL=5min
  - event_type: string
  - event_data: JSON string
  - completed_at: ISO timestamp

# Event log for replay
sse:events:{stream_id}          LIST    TTL=5min
  - element: JSON {id, type, data, timestamp}
```

---

*This implementation plan accounts for 100% of SSE streaming in AuraStream and provides enterprise-grade reliability.*


---

## PART 8: SUBAGENT EXECUTION SCHEMA

This schema is designed for parallel subagent execution where possible.

```yaml
# =============================================================================
# SUBAGENT EXECUTION SCHEMA
# =============================================================================

execution_plan:
  name: "SSE Stream Guardian Implementation"
  total_subagents: 6
  parallel_groups: 3

# =============================================================================
# GROUP 1: Backend Foundation (Can run in parallel)
# =============================================================================

group_1:
  name: "Backend Foundation"
  parallel: true
  
  subagent_1:
    name: "SSE Service Layer"
    prompt: |
      Create the SSE service layer for AuraStream. This is the foundation for 
      stream tracking and recovery.
      
      Create these files in backend/services/sse/:
      
      1. types.py - Define:
         - StreamType enum: GENERATION, COACH_START, COACH_CONTINUE, PROFILE_START, PROFILE_CONTINUE
         - StreamState enum: ACTIVE, COMPLETED, FAILED, ORPHANED, EXPIRED
         - StreamMetadata dataclass with: stream_id, stream_type, user_id, started_at, last_heartbeat, state, metadata dict
         - CompletionData dataclass with: stream_id, terminal_event_type, terminal_event_data, completed_at
         - TERMINAL_EVENTS constant mapping each StreamType to its terminal event types
         
      2. registry.py - StreamRegistry class:
         - Uses Redis async client
         - register(stream_id, stream_type, user_id, metadata) - creates hash at sse:stream:{id}, adds to user set and active zset
         - heartbeat(stream_id) - updates last_heartbeat in hash and zset score
         - get_stream(stream_id) -> StreamMetadata | None
         - get_user_streams(user_id) -> List[StreamMetadata]
         - get_stale_streams(threshold_seconds=30) -> List[StreamMetadata] - uses ZRANGEBYSCORE
         - unregister(stream_id) - removes from all keys
         - update_state(stream_id, state) - updates state field
         
      3. completion_store.py - CompletionStore class:
         - store_completion(stream_id, event_type, event_data) - hash with 5min TTL
         - get_completion(stream_id) -> CompletionData | None
         - store_event(stream_id, event_id, event_data) - RPUSH to list with 5min TTL
         - get_events_after(stream_id, last_event_id) -> List[dict]
         - clear_completion(stream_id)
         
      4. guardian.py - StreamGuardian class:
         - check_orphaned_streams() - finds stale streams, checks job/session status, stores completion
         - recover_stream(stream_id) -> CompletionData | None
         - cleanup_expired() -> int - removes old streams
         - get_health_metrics() -> dict with active_count, orphaned_count, completion_rate
         
      5. __init__.py - Export all classes
      
      Use existing Redis patterns from backend/services/ for consistency.
      Follow the dataclass patterns from backend/services/provenance/models.py.
      
    files_to_create:
      - backend/services/sse/__init__.py
      - backend/services/sse/types.py
      - backend/services/sse/registry.py
      - backend/services/sse/completion_store.py
      - backend/services/sse/guardian.py

# =============================================================================
# GROUP 2: Backend Integration (Depends on Group 1)
# =============================================================================

group_2:
  name: "Backend Integration"
  depends_on: ["group_1"]
  parallel: true
  
  subagent_2:
    name: "Route Integration"
    prompt: |
      Integrate SSE stream tracking into all 5 SSE endpoints.
      
      First, create backend/api/routes/sse_recovery.py:
      - Router with prefix /api/v1/sse
      - GET /recovery/{stream_id} - returns completion data or 404
      - GET /events/{stream_id}?last_event_id=X - returns events for replay
      - GET /health - returns guardian health metrics
      - Add to backend/api/routes/__init__.py
      
      Then modify these files to add stream tracking:
      
      1. backend/api/routes/generation.py (stream_job_progress function ~line 433):
         - Import StreamRegistry, CompletionStore from backend.services.sse
         - Generate stream_id = f"gen:{job_id}:{uuid4().hex[:8]}"
         - At start: await registry.register(stream_id, StreamType.GENERATION, current_user.sub, {"job_id": job_id})
         - Add event_counter, include "id": f"{stream_id}:{event_counter}" in each event
         - After each yield: await registry.heartbeat(stream_id)
         - On terminal events (completed, failed, timeout, error): await completion_store.store_completion(...)
         - In finally block: await registry.unregister(stream_id)
         - Add header "X-Stream-ID": stream_id to StreamingResponse
         
      2. backend/api/routes/coach.py (start_coach ~line 349, continue_chat ~line 527):
         - Same pattern with stream_id = f"coach:{session_id}:{uuid4().hex[:8]}"
         - StreamType.COACH_START or COACH_CONTINUE
         - Terminal events: done, error
         
      3. backend/api/routes/profile_creator.py (start_session ~line 155, continue_session ~line 208):
         - Same pattern with stream_id = f"profile:{session_id}:{uuid4().hex[:8]}"
         - StreamType.PROFILE_START or PROFILE_CONTINUE
         - Terminal events: done, error
      
      Wrap the event generator in try/finally to ensure unregister happens.
      
    files_to_create:
      - backend/api/routes/sse_recovery.py
    files_to_modify:
      - backend/api/routes/generation.py
      - backend/api/routes/coach.py
      - backend/api/routes/profile_creator.py

  subagent_3:
    name: "Orchestrator Integration"
    prompt: |
      Add SSE Stream Guardian to the orchestrator.
      
      1. Modify backend/workers/orchestrator/types.py:
         - Add SSE = "sse" to WorkerType enum
         
      2. Modify backend/workers/orchestrator/orchestrator.py:
         - Import StreamGuardian from backend.services.sse
         
         - In _register_all_workers() method, add after the maintenance workers section:
           ```python
           # SSE GUARDIAN
           self._workers["sse_guardian"] = WorkerConfig(
               name="sse_guardian",
               worker_type=WorkerType.SSE,
               execution_mode=WorkerExecutionMode.SCHEDULED,
               interval_seconds=10,
               timeout_seconds=30,
               expected_duration_ms=5000,
               priority=JobPriority.HIGH,
               handler=self._run_sse_guardian,
           )
           ```
           
         - Add handler method after _run_coach_cleanup:
           ```python
           async def _run_sse_guardian(self) -> Dict[str, Any]:
               """Run SSE stream guardian to detect orphaned streams."""
               from backend.services.sse import StreamGuardian
               try:
                   guardian = StreamGuardian()
                   orphaned = await guardian.check_orphaned_streams()
                   cleaned = await guardian.cleanup_expired()
                   metrics = await guardian.get_health_metrics()
                   
                   return {
                       "success": True,
                       "metrics": {
                           "orphaned_streams": len(orphaned),
                           "cleaned_streams": cleaned,
                           "active_streams": metrics.get("active_count", 0),
                           "completion_rate": metrics.get("completion_rate", 0),
                       },
                   }
               except Exception as e:
                   return {"success": False, "error": str(e)}
           ```
           
    files_to_modify:
      - backend/workers/orchestrator/types.py
      - backend/workers/orchestrator/orchestrator.py

# =============================================================================
# GROUP 3: Frontend (Can start after Group 1, parallel with Group 2)
# =============================================================================

group_3:
  name: "Frontend"
  depends_on: ["group_1"]
  parallel: true
  
  subagent_4:
    name: "ResilientEventSource"
    prompt: |
      Create a resilient SSE client for the frontend that handles reconnection,
      completion recovery, and exponential backoff.
      
      Create tsx/packages/api-client/src/sse/ResilientEventSource.ts:
      
      ```typescript
      export interface ResilientSSEOptions {
        url: string;
        method?: 'GET' | 'POST';
        body?: unknown;
        headers?: Record<string, string>;
        onMessage: (event: SSEEvent) => void;
        onError?: (error: Error) => void;
        onReconnect?: (attempt: number) => void;
        onComplete?: () => void;
        maxRetries?: number;
        retryDelay?: number;
        maxRetryDelay?: number;
        heartbeatTimeout?: number;
      }
      
      export interface SSEEvent {
        id?: string;
        type: string;
        data: unknown;
      }
      
      export class ResilientEventSource {
        // Implementation with:
        // - Automatic reconnection with exponential backoff
        // - Last-Event-ID tracking for resume
        // - Completion recovery check via /api/v1/sse/recovery/{streamId}
        // - Heartbeat timeout detection
        // - X-Stream-ID header parsing
      }
      
      // React hook wrapper
      export function useResilientSSE(options: Omit<ResilientSSEOptions, 'onMessage'>) {
        // Returns { state, error, messages, connect, abort }
      }
      ```
      
      Key behaviors:
      1. On connect, first check /api/v1/sse/recovery/{streamId} if streamId known
      2. If completion exists, emit it and don't connect
      3. Include Last-Event-ID header on reconnect
      4. Parse X-Stream-ID from response headers
      5. Start heartbeat timer (35s default), reconnect on timeout
      6. Exponential backoff: delay = min(retryDelay * 2^attempt, maxRetryDelay)
      7. After maxRetries, emit error and stop
      
      Also create tsx/packages/api-client/src/sse/index.ts to export.
      
    files_to_create:
      - tsx/packages/api-client/src/sse/ResilientEventSource.ts
      - tsx/packages/api-client/src/sse/index.ts

  subagent_5:
    name: "Web Frontend Updates"
    prompt: |
      Update web frontend SSE consumers to use ResilientEventSource.
      
      1. Modify tsx/packages/shared/src/hooks/useSSEStream.ts:
         - Import ResilientEventSource from @aurastream/api-client/sse
         - Add 'reconnecting' to SSEState type
         - Replace manual fetch logic with ResilientEventSource
         - Add streamId tracking
         - Handle reconnection callbacks
         
      2. Modify tsx/apps/web/src/hooks/useCoachChat.ts:
         - Import ResilientEventSource
         - Add 'reconnecting' to StreamingStage type
         - Replace streamSSE usage with ResilientEventSource
         - Track streamId from X-Stream-ID header
         - Add reconnection UI state
         - Handle completion recovery
         
      3. Modify tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx:
         - Import ResilientEventSource
         - Replace inline fetch SSE in startSession and sendMessage
         - Add reconnection state and UI feedback
         - Handle completion recovery
         
      For all files:
      - Show "Reconnecting..." UI when in reconnecting state
      - Preserve partial data during reconnection
      - Reset retry count on successful connection
      
    files_to_modify:
      - tsx/packages/shared/src/hooks/useSSEStream.ts
      - tsx/apps/web/src/hooks/useCoachChat.ts
      - tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx

  subagent_6:
    name: "Mobile Updates"
    prompt: |
      Update mobile SSE utilities for reconnection support.
      
      Modify tsx/apps/mobile/src/components/coach/utils.ts:
      
      1. Add lastEventId parameter to streamSSE function
      2. Add streamId tracking from X-Stream-ID header
      3. Add checkCompletion function to check /api/v1/sse/recovery/{streamId}
      4. Add reconnection wrapper with exponential backoff:
         ```typescript
         export async function* streamSSEWithRetry(
           url: string,
           body: object,
           accessToken: string | null,
           options?: {
             maxRetries?: number;
             onReconnect?: (attempt: number) => void;
           }
         ): AsyncGenerator<StreamChunk> {
           // Implementation with retry logic
         }
         ```
      5. Export new utilities
      
    files_to_modify:
      - tsx/apps/mobile/src/components/coach/utils.ts

# =============================================================================
# EXECUTION SUMMARY
# =============================================================================

summary:
  total_files_to_create: 8
  total_files_to_modify: 9
  
  files_created:
    - backend/services/sse/__init__.py
    - backend/services/sse/types.py
    - backend/services/sse/registry.py
    - backend/services/sse/completion_store.py
    - backend/services/sse/guardian.py
    - backend/api/routes/sse_recovery.py
    - tsx/packages/api-client/src/sse/ResilientEventSource.ts
    - tsx/packages/api-client/src/sse/index.ts
    
  files_modified:
    - backend/api/routes/generation.py
    - backend/api/routes/coach.py
    - backend/api/routes/profile_creator.py
    - backend/workers/orchestrator/types.py
    - backend/workers/orchestrator/orchestrator.py
    - tsx/packages/shared/src/hooks/useSSEStream.ts
    - tsx/apps/web/src/hooks/useCoachChat.ts
    - tsx/apps/web/src/components/profile-creator/ProfileCreatorCore.tsx
    - tsx/apps/mobile/src/components/coach/utils.ts
```

---

## PART 9: QUICK REFERENCE

### Terminal Events by Stream Type

| Stream Type | Terminal Events |
|-------------|-----------------|
| GENERATION | completed, failed, timeout, error |
| COACH_START | done, error |
| COACH_CONTINUE | done, error |
| PROFILE_START | done, error |
| PROFILE_CONTINUE | done, error |

### Redis TTLs

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| sse:stream:{id} | 1 hour | Active stream tracking |
| sse:user:{id}:streams | 1 hour | User's streams |
| sse:completion:{id} | 5 minutes | Completion recovery |
| sse:events:{id} | 5 minutes | Event replay |

### Client Reconnection Timing

| Attempt | Delay |
|---------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4+ | 8s (capped) |

### Heartbeat Timeouts

| Component | Timeout |
|-----------|---------|
| Backend heartbeat interval | 5s (generation only) |
| Client heartbeat timeout | 35s |
| Guardian stale threshold | 30s |
