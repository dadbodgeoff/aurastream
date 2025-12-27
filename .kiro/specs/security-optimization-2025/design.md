# Security & Optimization Improvements 2025 - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY LAYER ADDITIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/api/middleware/                                                     │
│  ├── security_headers.py    # NEW: CSP, X-Frame-Options, HSTS               │
│  └── gzip.py                # NEW: Response compression                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/services/                                                           │
│  ├── jwt_service.py         # MODIFIED: Reuse detection                     │
│  ├── token_store.py         # NEW: Redis token tracking                     │
│  └── webhook_queue.py       # NEW: Event queuing                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER ADDITIONS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/database/migrations/                                                │
│  └── 013_rls_indexes.sql    # NEW: Performance indexes for RLS              │
│  └── 014_token_tracking.sql # NEW: Refresh token tracking table             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Designs

### 1. Security Headers Middleware

```python
# backend/api/middleware/security_headers.py

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses.
    
    Headers added:
    - Content-Security-Policy: Prevent XSS attacks
    - X-Frame-Options: Prevent clickjacking
    - X-Content-Type-Options: Prevent MIME sniffing
    - Strict-Transport-Security: Force HTTPS
    - X-XSS-Protection: Legacy XSS protection
    - Referrer-Policy: Control referrer information
    - Permissions-Policy: Control browser features
    """
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Content Security Policy
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self' https://api.stripe.com; "
            "frame-ancestors 'none';"
        )
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Force HTTPS (1 year)
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        
        return response
```

### 2. JWT Refresh Token Reuse Detection

```python
# backend/services/token_store.py

from datetime import datetime, timedelta
from typing import Optional
import redis
import logging

logger = logging.getLogger(__name__)

class TokenStore:
    """
    Redis-backed token tracking for refresh token reuse detection.
    
    Security Pattern:
    1. On token creation: Store token_id -> user_id mapping
    2. On token use: Check if token was already used
    3. If reused: Invalidate ALL user tokens (potential theft)
    4. On successful use: Mark token as used, issue new token
    
    Keys:
    - refresh_token:{jti} -> {user_id, used_at, replaced_by}
    - user_tokens:{user_id} -> Set of active token JTIs
    """
    
    TOKEN_PREFIX = "refresh_token:"
    USER_TOKENS_PREFIX = "user_tokens:"
    TOKEN_TTL_DAYS = 30
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def register_token(
        self,
        jti: str,
        user_id: str,
        expires_at: datetime,
    ) -> None:
        """Register a new refresh token."""
        key = f"{self.TOKEN_PREFIX}{jti}"
        ttl = int((expires_at - datetime.utcnow()).total_seconds())
        
        self.redis.hset(key, mapping={
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "used": "false",
        })
        self.redis.expire(key, ttl)
        
        # Add to user's token set
        user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
        self.redis.sadd(user_key, jti)
        self.redis.expire(user_key, self.TOKEN_TTL_DAYS * 86400)
    
    async def use_token(
        self,
        jti: str,
        user_id: str,
    ) -> tuple[bool, Optional[str]]:
        """
        Attempt to use a refresh token.
        
        Returns:
            (success, error_reason)
            - (True, None) if token is valid and unused
            - (False, "reused") if token was already used (SECURITY ALERT)
            - (False, "invalid") if token doesn't exist
        """
        key = f"{self.TOKEN_PREFIX}{jti}"
        token_data = self.redis.hgetall(key)
        
        if not token_data:
            return (False, "invalid")
        
        # Check if already used - SECURITY ALERT
        if token_data.get(b"used", b"false") == b"true":
            logger.warning(
                "SECURITY: Refresh token reuse detected!",
                extra={
                    "jti": jti,
                    "user_id": user_id,
                    "original_used_at": token_data.get(b"used_at"),
                }
            )
            # Invalidate ALL user tokens
            await self.invalidate_all_user_tokens(user_id)
            return (False, "reused")
        
        # Mark as used
        self.redis.hset(key, mapping={
            "used": "true",
            "used_at": datetime.utcnow().isoformat(),
        })
        
        return (True, None)
    
    async def invalidate_all_user_tokens(self, user_id: str) -> int:
        """
        Invalidate all refresh tokens for a user.
        Called on reuse detection or explicit logout-all.
        
        Returns:
            Number of tokens invalidated
        """
        user_key = f"{self.USER_TOKENS_PREFIX}{user_id}"
        token_jtis = self.redis.smembers(user_key)
        
        count = 0
        for jti in token_jtis:
            key = f"{self.TOKEN_PREFIX}{jti.decode()}"
            self.redis.delete(key)
            count += 1
        
        self.redis.delete(user_key)
        
        logger.info(
            "Invalidated all user tokens",
            extra={"user_id": user_id, "count": count}
        )
        
        return count
```

### 3. Webhook Queue Service

```python
# backend/services/webhook_queue.py

from datetime import datetime, timezone, timedelta
from typing import Optional
import json
import redis
import logging

logger = logging.getLogger(__name__)

class WebhookQueueService:
    """
    Redis-backed webhook event queue for race condition prevention.
    
    Pattern:
    1. Receive webhook -> Validate signature
    2. Check timestamp (reject if >5 min old)
    3. Persist event ID BEFORE processing (idempotency)
    4. Queue event for processing
    5. Process with retry logic
    
    Keys:
    - webhook_events:{event_id} -> Event data (for idempotency)
    - webhook_queue -> Sorted set by timestamp
    - webhook_processing:{event_id} -> Lock during processing
    """
    
    EVENT_PREFIX = "webhook_events:"
    QUEUE_KEY = "webhook_queue"
    LOCK_PREFIX = "webhook_processing:"
    MAX_AGE_SECONDS = 300  # 5 minutes
    LOCK_TTL_SECONDS = 60
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def validate_event_age(self, event_timestamp: int) -> bool:
        """
        Validate event is not too old (replay attack prevention).
        
        Args:
            event_timestamp: Unix timestamp from Stripe event
            
        Returns:
            True if event is within acceptable age
        """
        now = datetime.now(timezone.utc).timestamp()
        age = now - event_timestamp
        
        if age > self.MAX_AGE_SECONDS:
            logger.warning(
                "Webhook event too old, rejecting",
                extra={"age_seconds": age, "max_age": self.MAX_AGE_SECONDS}
            )
            return False
        
        return True
    
    async def persist_event(
        self,
        event_id: str,
        event_type: str,
        event_data: dict,
    ) -> bool:
        """
        Persist event BEFORE processing for idempotency.
        
        Returns:
            True if event was persisted (new event)
            False if event already exists (duplicate)
        """
        key = f"{self.EVENT_PREFIX}{event_id}"
        
        # Use SETNX for atomic check-and-set
        was_set = self.redis.setnx(key, json.dumps({
            "event_type": event_type,
            "received_at": datetime.now(timezone.utc).isoformat(),
            "status": "pending",
        }))
        
        if was_set:
            # Set TTL (keep for 7 days for debugging)
            self.redis.expire(key, 7 * 86400)
            return True
        
        logger.info(
            "Duplicate webhook event, skipping",
            extra={"event_id": event_id}
        )
        return False
    
    async def acquire_processing_lock(self, event_id: str) -> bool:
        """Acquire lock for processing an event."""
        lock_key = f"{self.LOCK_PREFIX}{event_id}"
        return bool(self.redis.set(
            lock_key,
            datetime.now(timezone.utc).isoformat(),
            nx=True,
            ex=self.LOCK_TTL_SECONDS,
        ))
    
    async def release_processing_lock(self, event_id: str) -> None:
        """Release processing lock."""
        lock_key = f"{self.LOCK_PREFIX}{event_id}"
        self.redis.delete(lock_key)
    
    async def mark_event_processed(
        self,
        event_id: str,
        success: bool,
        error: Optional[str] = None,
    ) -> None:
        """Mark event as processed."""
        key = f"{self.EVENT_PREFIX}{event_id}"
        self.redis.hset(key, mapping={
            "status": "processed" if success else "failed",
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "error": error or "",
        })
```

### 4. RLS Index Migration

```sql
-- backend/database/migrations/013_rls_indexes.sql

-- =============================================================================
-- RLS Performance Indexes
-- =============================================================================
-- These indexes optimize RLS policy evaluation by ensuring fast lookups
-- on columns used in auth.uid() comparisons.

-- Users table (base table, already has PK index)
-- No additional index needed

-- Brand Kits - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id 
ON brand_kits(user_id);

-- Generation Jobs - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_id 
ON generation_jobs(user_id);

-- Assets - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_assets_user_id 
ON assets(user_id);

-- Subscriptions - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions(user_id);

-- Subscription Events - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
ON subscription_events(user_id);

-- Auth Tokens - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id 
ON auth_tokens(user_id);

-- Coach Sessions - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_coach_sessions_user_id 
ON coach_sessions(user_id);

-- Platform Connections - user_id used in RLS
CREATE INDEX IF NOT EXISTS idx_platform_connections_user_id 
ON platform_connections(user_id);

-- =============================================================================
-- Composite Indexes for Common Query Patterns
-- =============================================================================

-- Jobs by user and status (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_generation_jobs_user_status 
ON generation_jobs(user_id, status);

-- Assets by user and type (common gallery query)
CREATE INDEX IF NOT EXISTS idx_assets_user_type 
ON assets(user_id, asset_type);

-- Subscriptions by stripe_subscription_id (webhook lookups)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id 
ON subscriptions(stripe_subscription_id);

-- =============================================================================
-- Analyze tables after index creation
-- =============================================================================
ANALYZE brand_kits;
ANALYZE generation_jobs;
ANALYZE assets;
ANALYZE subscriptions;
ANALYZE subscription_events;
ANALYZE auth_tokens;
ANALYZE coach_sessions;
ANALYZE platform_connections;
```

### 5. SSE State Machine (Frontend)

```typescript
// tsx/packages/shared/src/hooks/useSSEStream.ts

export type SSEState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

export interface SSEStreamOptions<T> {
  url: string;
  body?: unknown;
  onToken?: (token: string) => void;
  onChunk?: (chunk: T) => void;
  onComplete?: (data: T) => void;
  onError?: (error: Error) => void;
  batchInterval?: number; // ms between DOM updates
}

export interface SSEStreamState<T> {
  state: SSEState;
  data: T | null;
  partialData: string;
  error: Error | null;
  retry: () => void;
}

export function useSSEStream<T>(options: SSEStreamOptions<T>): SSEStreamState<T> {
  const [state, setState] = useState<SSEState>('idle');
  const [data, setData] = useState<T | null>(null);
  const [partialData, setPartialData] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  
  const tokenBuffer = useRef<string[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Batch DOM updates to prevent janky rendering
  const flushTokenBuffer = useCallback(() => {
    if (tokenBuffer.current.length > 0) {
      const tokens = tokenBuffer.current.join('');
      tokenBuffer.current = [];
      setPartialData(prev => prev + tokens);
      options.onToken?.(tokens);
    }
  }, [options]);
  
  const startStream = useCallback(async () => {
    setState('connecting');
    setError(null);
    setPartialData('');
    
    try {
      const response = await fetch(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      setState('streaming');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        
        if (done) {
          flushTokenBuffer();
          setState('complete');
          break;
        }
        
        const text = decoder.decode(value, { stream: true });
        // Parse SSE format
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'token') {
              tokenBuffer.current.push(data.content);
              
              // Batch updates every 50ms
              if (!batchTimeoutRef.current) {
                batchTimeoutRef.current = setTimeout(() => {
                  flushTokenBuffer();
                  batchTimeoutRef.current = null;
                }, options.batchInterval ?? 50);
              }
            } else if (data.type === 'done') {
              flushTokenBuffer();
              setData(data.content);
              options.onComplete?.(data.content);
            } else if (data.type === 'error') {
              throw new Error(data.content);
            }
          }
        }
      }
    } catch (err) {
      // Save partial data on failure
      flushTokenBuffer();
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setState('error');
      options.onError?.(error);
    }
  }, [options, flushTokenBuffer]);
  
  const retry = useCallback(() => {
    startStream();
  }, [startStream]);
  
  return { state, data, partialData, error, retry };
}
```

### 6. Query Key Factory Pattern

```typescript
// tsx/packages/api-client/src/queryKeys.ts

import { QueryKey } from '@tanstack/react-query';

/**
 * Query Key Factory Pattern
 * 
 * Benefits:
 * - Type-safe query keys
 * - Consistent invalidation
 * - Bundled with queryFn and options
 */

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
  },
  
  // Brand Kits
  brandKits: {
    all: ['brandKits'] as const,
    lists: () => [...queryKeys.brandKits.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.brandKits.lists(), filters] as const,
    details: () => [...queryKeys.brandKits.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.brandKits.details(), id] as const,
    active: () => [...queryKeys.brandKits.all, 'active'] as const,
  },
  
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters?: { status?: string; limit?: number }) =>
      [...queryKeys.jobs.lists(), filters] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    assets: (id: string) => [...queryKeys.jobs.detail(id), 'assets'] as const,
  },
  
  // Assets
  assets: {
    all: ['assets'] as const,
    lists: () => [...queryKeys.assets.all, 'list'] as const,
    list: (filters?: { assetType?: string; limit?: number }) =>
      [...queryKeys.assets.lists(), filters] as const,
    details: () => [...queryKeys.assets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.assets.details(), id] as const,
  },
  
  // Subscriptions
  subscriptions: {
    all: ['subscriptions'] as const,
    status: () => [...queryKeys.subscriptions.all, 'status'] as const,
  },
  
  // Coach
  coach: {
    all: ['coach'] as const,
    access: () => [...queryKeys.coach.all, 'access'] as const,
    tips: (assetType: string) => [...queryKeys.coach.all, 'tips', assetType] as const,
    sessions: () => [...queryKeys.coach.all, 'sessions'] as const,
    session: (id: string) => [...queryKeys.coach.sessions(), id] as const,
  },
} as const;

// Type helper for extracting query key types
export type QueryKeys = typeof queryKeys;
```

## File Changes Summary

### New Files
- `backend/api/middleware/security_headers.py`
- `backend/services/token_store.py`
- `backend/services/webhook_queue.py`
- `backend/database/migrations/013_rls_indexes.sql`
- `backend/database/migrations/014_token_tracking.sql`
- `tsx/packages/api-client/src/queryKeys.ts`
- `tsx/packages/shared/src/hooks/useSSEStream.ts`
- `.kiro/specs/security-optimization-2025/upgrade-paths/react-native.md`
- `.kiro/specs/security-optimization-2025/upgrade-paths/redis-timeseries.md`

### Modified Files
- `backend/api/main.py` - Add security headers middleware
- `backend/services/jwt_service.py` - Add reuse detection
- `backend/api/routes/auth.py` - Integrate token store
- `backend/api/routes/webhooks.py` - Add queue service, timestamp validation
- `tsx/packages/api-client/src/hooks/*.ts` - Use query key factories
- `tsx/apps/web/src/hooks/useCoachContext.ts` - Use SSE state machine
- `package.json` (tsx/apps/web) - Check Next.js version

## Testing Strategy

### Unit Tests
- Token store reuse detection
- Webhook queue idempotency
- Security headers presence
- Query key factory types

### Integration Tests
- Full refresh token rotation flow
- Webhook processing with race conditions
- RLS query performance (before/after indexes)

### Security Tests
- Replay attack prevention (old events)
- Token reuse detection and invalidation
- Header presence verification
