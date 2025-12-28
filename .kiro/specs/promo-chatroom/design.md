# 🎤 Promo Chatroom - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  tsx/apps/web                          │  tsx/packages/api-client            │
│  ├── /promo (chatroom page)            │  ├── hooks/usePromoChat.ts          │
│  ├── /promo/success (payment callback) │  ├── hooks/useLeaderboard.ts        │
│  └── components/promo/*                │  └── types/promo.ts                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/api/routes/                   │  backend/api/schemas/               │
│  ├── promo.py                          │  └── promo.py                       │
│  └── webhooks.py (extend)              │                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/services/                                                           │
│  ├── promo_service.py           # Message & leaderboard logic               │
│  └── stripe_service.py          # Extend for promo payments                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
backend/
├── api/
│   ├── routes/
│   │   └── promo.py              # Promo chatroom endpoints
│   └── schemas/
│       └── promo.py              # Pydantic models
├── services/
│   └── promo_service.py          # Promo business logic
└── database/
    └── migrations/
        └── 022_promo_chatroom.sql

tsx/
├── packages/
│   └── api-client/
│       └── src/
│           ├── types/
│           │   └── promo.ts
│           └── hooks/
│               ├── usePromoChat.ts
│               └── useLeaderboard.ts
└── apps/
    └── web/
        └── src/
            ├── app/
            │   └── promo/
            │       ├── page.tsx
            │       └── success/page.tsx
            └── components/
                └── promo/
                    ├── PromoChatroom.tsx
                    ├── PromoMessageCard.tsx
                    ├── PromoLeaderboard.tsx
                    ├── PromoComposeModal.tsx
                    ├── PinnedKingMessage.tsx
                    ├── UserBadges.tsx
                    └── LinkPreviewCard.tsx
```


---

## Backend Design

### 1. Pydantic Schemas (`backend/api/schemas/promo.py`)

```python
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field

# Enums
PromoPaymentStatus = Literal["pending", "completed", "failed", "refunded"]

# Request Schemas
class PromoCheckoutRequest(BaseModel):
    """Request to create a checkout session for posting a message."""
    content: str = Field(..., min_length=1, max_length=500)
    link_url: Optional[str] = Field(None, max_length=500)
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class PromoMessageCreate(BaseModel):
    """Internal: Create message after payment confirmed."""
    content: str
    link_url: Optional[str] = None
    payment_id: str

# Response Schemas
class PromoCheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    pending_message_id: str

class UserBadges(BaseModel):
    tier: Literal["free", "pro", "studio"]
    is_king: bool = False
    is_top_ten: bool = False
    is_verified: bool = False
    message_count_badge: Optional[Literal["10+", "50+", "100+"]] = None

class PromoMessageAuthor(BaseModel):
    id: str
    display_name: str
    avatar_url: Optional[str]
    badges: UserBadges

class LinkPreview(BaseModel):
    url: str
    title: Optional[str]
    description: Optional[str]
    image_url: Optional[str]

class PromoMessageResponse(BaseModel):
    id: str
    author: PromoMessageAuthor
    content: str
    link_url: Optional[str]
    link_preview: Optional[LinkPreview]
    is_pinned: bool
    reactions: dict[str, int]  # {"🔥": 12, "👑": 3, ...}
    created_at: datetime
    expires_at: datetime

class PromoMessagesListResponse(BaseModel):
    messages: list[PromoMessageResponse]
    pinned_message: Optional[PromoMessageResponse]
    total_count: int
    has_more: bool
    next_cursor: Optional[str]

class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    avatar_url: Optional[str]
    total_donations_cents: int
    message_count: int
    is_king: bool

class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    current_user_rank: Optional[int]
    current_user_total: Optional[int]
    updated_at: datetime
```


### 2. Promo Service (`backend/services/promo_service.py`)

```python
class PromoService:
    """
    Promo chatroom business logic.
    
    Handles:
    - Message creation after payment
    - Leaderboard calculation (7-day rolling window)
    - King of the Hill determination
    - Link preview fetching
    - Rate limiting checks
    """
    
    def __init__(self, supabase_client=None, redis_client=None):
        self._supabase = supabase_client
        self._redis = redis_client
    
    async def create_pending_message(
        self,
        user_id: str,
        content: str,
        link_url: Optional[str],
        checkout_session_id: str,
    ) -> str:
        """Create pending message before payment."""
    
    async def confirm_message(
        self,
        checkout_session_id: str,
        payment_intent_id: str,
    ) -> PromoMessageResponse:
        """Confirm message after successful payment."""
    
    async def get_messages(
        self,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> PromoMessagesListResponse:
        """Get paginated messages with pinned message."""
    
    async def get_pinned_message(self) -> Optional[PromoMessageResponse]:
        """Get current King's pinned message."""
    
    async def get_leaderboard(
        self,
        user_id: Optional[str] = None,
    ) -> LeaderboardResponse:
        """Get 7-day rolling leaderboard."""
    
    async def recalculate_king(self) -> Optional[str]:
        """Recalculate and update King of the Hill."""
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check if user can post (max 10/hour)."""
    
    async def fetch_link_preview(self, url: str) -> Optional[LinkPreview]:
        """Fetch Open Graph data for link preview."""
    
    async def delete_message(
        self,
        message_id: str,
        user_id: str,
    ) -> bool:
        """Soft delete a message (owner only)."""
```

### 3. Routes (`backend/api/routes/promo.py`)

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from backend.api.deps import get_current_user
from backend.api.schemas.promo import *
from backend.services.promo_service import PromoService

router = APIRouter(prefix="/promo", tags=["Promo Chatroom"])

@router.post("/checkout", response_model=PromoCheckoutResponse)
async def create_promo_checkout(
    data: PromoCheckoutRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> PromoCheckoutResponse:
    """Create Stripe checkout session for $1 message."""

@router.get("/messages", response_model=PromoMessagesListResponse)
async def get_messages(
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
) -> PromoMessagesListResponse:
    """Get paginated promo messages (public, no auth required)."""

@router.get("/messages/pinned", response_model=Optional[PromoMessageResponse])
async def get_pinned_message() -> Optional[PromoMessageResponse]:
    """Get current King's pinned message."""

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Delete own message (no refund)."""

@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    current_user: Optional[TokenPayload] = Depends(get_current_user_optional),
) -> LeaderboardResponse:
    """Get 7-day rolling leaderboard."""

@router.get("/leaderboard/me")
async def get_my_rank(
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Get current user's leaderboard position."""

@router.get("/stream")
async def message_stream(
    request: Request,
) -> StreamingResponse:
    """SSE stream for real-time message updates."""
```


---

## Database Design

### Migration: `022_promo_chatroom.sql`

```sql
-- ============================================================================
-- PROMO CHATROOM TABLES
-- ============================================================================

-- Promo payments tracking
CREATE TABLE IF NOT EXISTS promo_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    stripe_checkout_session_id TEXT UNIQUE,
    stripe_payment_intent_id TEXT UNIQUE,
    
    amount_cents INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    
    -- Pending message content (stored before payment)
    pending_content TEXT,
    pending_link_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Promo messages
CREATE TABLE IF NOT EXISTS promo_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES promo_payments(id),
    
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    link_url TEXT CHECK (char_length(link_url) <= 500),
    link_preview JSONB,  -- {title, description, image_url}
    
    is_pinned BOOLEAN DEFAULT FALSE,
    reactions JSONB DEFAULT '{"🔥": 0, "👑": 0, "💜": 0, "🎮": 0}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Leaderboard cache (materialized for performance)
CREATE TABLE IF NOT EXISTS promo_leaderboard_cache (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_donations_cents INTEGER NOT NULL DEFAULT 0,
    message_count INTEGER NOT NULL DEFAULT 0,
    last_donation_at TIMESTAMPTZ,
    rank INTEGER,
    is_king BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hall of Fame (historical Kings)
CREATE TABLE IF NOT EXISTS promo_hall_of_fame (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    reign_start TIMESTAMPTZ NOT NULL,
    reign_end TIMESTAMPTZ,
    total_donated_cents INTEGER NOT NULL,
    pinned_message_id UUID REFERENCES promo_messages(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_promo_payments_user_id ON promo_payments(user_id);
CREATE INDEX idx_promo_payments_status ON promo_payments(status);
CREATE INDEX idx_promo_payments_checkout_session ON promo_payments(stripe_checkout_session_id);

CREATE INDEX idx_promo_messages_user_id ON promo_messages(user_id);
CREATE INDEX idx_promo_messages_created_at ON promo_messages(created_at DESC);
CREATE INDEX idx_promo_messages_is_pinned ON promo_messages(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX idx_promo_messages_active ON promo_messages(created_at DESC) 
    WHERE deleted_at IS NULL AND expires_at > NOW();

CREATE INDEX idx_promo_leaderboard_rank ON promo_leaderboard_cache(rank);
CREATE INDEX idx_promo_leaderboard_total ON promo_leaderboard_cache(total_donations_cents DESC);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE promo_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Payments: users can only see their own
CREATE POLICY promo_payments_user_policy ON promo_payments
    FOR ALL USING (user_id = auth.uid());

-- Messages: anyone can read active messages, only owner can delete
CREATE POLICY promo_messages_read_policy ON promo_messages
    FOR SELECT USING (deleted_at IS NULL AND expires_at > NOW());

CREATE POLICY promo_messages_delete_policy ON promo_messages
    FOR UPDATE USING (user_id = auth.uid());

-- Leaderboard: public read
CREATE POLICY promo_leaderboard_read_policy ON promo_leaderboard_cache
    FOR SELECT USING (TRUE);

-- Hall of Fame: public read
CREATE POLICY promo_hall_of_fame_read_policy ON promo_hall_of_fame
    FOR SELECT USING (TRUE);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Recalculate leaderboard (7-day rolling window)
CREATE OR REPLACE FUNCTION recalculate_promo_leaderboard()
RETURNS void AS $$
DECLARE
    cutoff_date TIMESTAMPTZ := NOW() - INTERVAL '7 days';
BEGIN
    -- Clear and rebuild leaderboard cache
    DELETE FROM promo_leaderboard_cache;
    
    INSERT INTO promo_leaderboard_cache (
        user_id, total_donations_cents, message_count, last_donation_at, rank, is_king, updated_at
    )
    SELECT 
        p.user_id,
        SUM(p.amount_cents) as total_donations_cents,
        COUNT(DISTINCT m.id) as message_count,
        MAX(p.completed_at) as last_donation_at,
        ROW_NUMBER() OVER (ORDER BY SUM(p.amount_cents) DESC, MIN(p.completed_at) ASC) as rank,
        FALSE as is_king,
        NOW() as updated_at
    FROM promo_payments p
    LEFT JOIN promo_messages m ON m.payment_id = p.id AND m.deleted_at IS NULL
    WHERE p.status = 'completed'
      AND p.completed_at >= cutoff_date
    GROUP BY p.user_id;
    
    -- Mark the King
    UPDATE promo_leaderboard_cache SET is_king = TRUE WHERE rank = 1;
END;
$$ LANGUAGE plpgsql;

-- Get current King's user_id
CREATE OR REPLACE FUNCTION get_current_king()
RETURNS UUID AS $$
    SELECT user_id FROM promo_leaderboard_cache WHERE is_king = TRUE LIMIT 1;
$$ LANGUAGE sql;

-- Update pinned message when King changes
CREATE OR REPLACE FUNCTION update_pinned_message()
RETURNS void AS $$
DECLARE
    king_user_id UUID;
    king_message_id UUID;
BEGIN
    -- Get current King
    SELECT user_id INTO king_user_id FROM promo_leaderboard_cache WHERE is_king = TRUE;
    
    -- Unpin all messages
    UPDATE promo_messages SET is_pinned = FALSE WHERE is_pinned = TRUE;
    
    -- Pin King's most recent message
    IF king_user_id IS NOT NULL THEN
        SELECT id INTO king_message_id 
        FROM promo_messages 
        WHERE user_id = king_user_id 
          AND deleted_at IS NULL 
          AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1;
        
        IF king_message_id IS NOT NULL THEN
            UPDATE promo_messages SET is_pinned = TRUE WHERE id = king_message_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;
```


---

## Frontend Design

### Types (`tsx/packages/api-client/src/types/promo.ts`)

```typescript
// Enums
export type PromoPaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// Request Types
export interface PromoCheckoutRequest {
  content: string;
  linkUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
}

// Response Types
export interface PromoCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
  pendingMessageId: string;
}

export interface UserBadges {
  tier: 'free' | 'pro' | 'studio';
  isKing: boolean;
  isTopTen: boolean;
  isVerified: boolean;
  messageCountBadge: '10+' | '50+' | '100+' | null;
}

export interface PromoMessageAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  badges: UserBadges;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
}

export interface PromoMessage {
  id: string;
  author: PromoMessageAuthor;
  content: string;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  isPinned: boolean;
  reactions: Record<string, number>;
  createdAt: string;
  expiresAt: string;
}

export interface PromoMessagesListResponse {
  messages: PromoMessage[];
  pinnedMessage: PromoMessage | null;
  totalCount: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  totalDonationsCents: number;
  messageCount: number;
  isKing: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
  currentUserTotal: number | null;
  updatedAt: string;
}
```

### Hooks (`tsx/packages/api-client/src/hooks/usePromoChat.ts`)

```typescript
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

export function usePromoMessages() {
  return useInfiniteQuery({
    queryKey: ['promo', 'messages'],
    queryFn: async ({ pageParam }) => {
      const response = await fetch(
        `/api/v1/promo/messages${pageParam ? `?cursor=${pageParam}` : ''}`
      );
      return response.json() as Promise<PromoMessagesListResponse>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    staleTime: 30_000, // 30 seconds
  });
}

export function usePinnedMessage() {
  return useQuery({
    queryKey: ['promo', 'pinned'],
    queryFn: async () => {
      const response = await fetch('/api/v1/promo/messages/pinned');
      return response.json() as Promise<PromoMessage | null>;
    },
    staleTime: 60_000, // 1 minute
  });
}

export function usePromoCheckout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PromoCheckoutRequest) => {
      const response = await fetch('/api/v1/promo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: data.content,
          link_url: data.linkUrl,
          success_url: data.successUrl,
          cancel_url: data.cancelUrl,
        }),
      });
      return response.json() as Promise<PromoCheckoutResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo'] });
    },
  });
}

export function useDeletePromoMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (messageId: string) => {
      await fetch(`/api/v1/promo/messages/${messageId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo', 'messages'] });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['promo', 'leaderboard'],
    queryFn: async () => {
      const response = await fetch('/api/v1/promo/leaderboard');
      return response.json() as Promise<LeaderboardResponse>;
    },
    staleTime: 60_000, // 1 minute (cached in Redis)
  });
}

// SSE hook for real-time updates
export function usePromoStream() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const eventSource = new EventSource('/api/v1/promo/stream');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_message') {
        queryClient.invalidateQueries({ queryKey: ['promo', 'messages'] });
      } else if (data.type === 'new_king') {
        queryClient.invalidateQueries({ queryKey: ['promo', 'pinned'] });
        queryClient.invalidateQueries({ queryKey: ['promo', 'leaderboard'] });
      }
    };
    
    return () => eventSource.close();
  }, [queryClient]);
}
```


---

## Component Design

### PromoChatroom.tsx (Main Container)

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { usePromoMessages, usePinnedMessage, usePromoStream, useLeaderboard } from '@aurastream/api-client';
import { PinnedKingMessage } from './PinnedKingMessage';
import { PromoMessageCard } from './PromoMessageCard';
import { PromoLeaderboard } from './PromoLeaderboard';
import { PromoComposeModal } from './PromoComposeModal';
import { EmptyState } from '../empty-states';

export function PromoChatroom() {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  
  // Real-time updates
  usePromoStream();
  
  // Data fetching
  const { data: pinnedMessage } = usePinnedMessage();
  const { data: messagesData, fetchNextPage, hasNextPage, isFetchingNextPage } = usePromoMessages();
  const { data: leaderboard } = useLeaderboard();
  
  const messages = messagesData?.pages.flatMap(p => p.messages) ?? [];
  
  return (
    <div className="flex h-full bg-background-base">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Promo Chatroom</h1>
            <p className="text-sm text-text-secondary">Promote your stream • $1 per message</p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium',
              'bg-accent-600 hover:bg-accent-700 text-white',
              'transition-colors'
            )}
          >
            Post Message ($1)
          </button>
        </header>
        
        {/* Pinned King Message */}
        {pinnedMessage && (
          <PinnedKingMessage message={pinnedMessage} />
        )}
        
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Be the first to promote your stream!"
              action={{ label: 'Post Message', onClick: () => setIsComposeOpen(true) }}
            />
          ) : (
            <>
              {messages.map((message) => (
                <PromoMessageCard key={message.id} message={message} />
              ))}
              
              {hasNextPage && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="w-full py-3 text-sm text-text-secondary hover:text-text-primary"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Leaderboard Sidebar */}
      <aside className="w-80 border-l border-border-default hidden lg:block">
        <PromoLeaderboard data={leaderboard} />
      </aside>
      
      {/* Compose Modal */}
      <PromoComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
      />
    </div>
  );
}
```

### PromoMessageCard.tsx

```tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { UserBadges } from './UserBadges';
import { LinkPreviewCard } from './LinkPreviewCard';
import { formatRelativeTime } from '@aurastream/shared';
import type { PromoMessage } from '@aurastream/api-client';

interface PromoMessageCardProps {
  message: PromoMessage;
  className?: string;
}

export const PromoMessageCard = memo(function PromoMessageCard({
  message,
  className,
}: PromoMessageCardProps) {
  const { author, content, linkUrl, linkPreview, reactions, createdAt, isPinned } = message;
  
  return (
    <article
      className={cn(
        'group relative rounded-xl p-4',
        'bg-background-surface/50 backdrop-blur-sm',
        'border border-border-default',
        'hover:border-border-hover transition-colors',
        isPinned && 'ring-2 ring-yellow-500/30 border-yellow-500/50',
        className
      )}
    >
      {/* Author Row */}
      <div className="flex items-center gap-3 mb-3">
        {/* Avatar */}
        <div className="relative">
          <img
            src={author.avatarUrl || '/default-avatar.png'}
            alt={author.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
          {author.badges.isKing && (
            <span className="absolute -top-1 -right-1 text-lg">👑</span>
          )}
        </div>
        
        {/* Name & Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-text-primary truncate">
              {author.displayName}
            </span>
            <UserBadges badges={author.badges} />
          </div>
          <span className="text-xs text-text-tertiary">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <p className="text-text-primary whitespace-pre-wrap break-words mb-3">
        {content}
      </p>
      
      {/* Link Preview */}
      {linkPreview && (
        <LinkPreviewCard preview={linkPreview} className="mb-3" />
      )}
      
      {/* Reactions */}
      <div className="flex items-center gap-2">
        {Object.entries(reactions).map(([emoji, count]) => (
          count > 0 && (
            <button
              key={emoji}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-sm',
                'bg-background-elevated hover:bg-background-hover',
                'transition-colors'
              )}
            >
              <span>{emoji}</span>
              <span className="text-text-secondary">{count}</span>
            </button>
          )
        ))}
      </div>
    </article>
  );
});
```


### UserBadges.tsx

```tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { UserBadges as UserBadgesType } from '@aurastream/api-client';

interface UserBadgesProps {
  badges: UserBadgesType;
  size?: 'sm' | 'md';
}

const TIER_COLORS = {
  free: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  pro: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  studio: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
} as const;

const TIER_LABELS = {
  free: 'Free',
  pro: 'Pro',
  studio: 'Studio',
} as const;

export const UserBadges = memo(function UserBadges({
  badges,
  size = 'sm',
}: UserBadgesProps) {
  const { tier, isKing, isTopTen, isVerified, messageCountBadge } = badges;
  
  const badgeClass = cn(
    'inline-flex items-center gap-1 rounded-full border font-medium',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  );
  
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Tier Badge */}
      <span className={cn(badgeClass, TIER_COLORS[tier])}>
        {TIER_LABELS[tier]}
      </span>
      
      {/* King Badge */}
      {isKing && (
        <span className={cn(badgeClass, 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30')}>
          👑 King
        </span>
      )}
      
      {/* Top 10 Badge */}
      {isTopTen && !isKing && (
        <span className={cn(badgeClass, 'bg-orange-500/20 text-orange-400 border-orange-500/30')}>
          🏆 Top 10
        </span>
      )}
      
      {/* Verified Badge */}
      {isVerified && (
        <span className={cn(badgeClass, 'bg-green-500/20 text-green-400 border-green-500/30')}>
          ✓ Verified
        </span>
      )}
      
      {/* Message Count Badge */}
      {messageCountBadge && (
        <span className={cn(badgeClass, 'bg-pink-500/20 text-pink-400 border-pink-500/30')}>
          💬 {messageCountBadge}
        </span>
      )}
    </div>
  );
});
```

### PromoLeaderboard.tsx

```tsx
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { LeaderboardResponse } from '@aurastream/api-client';

interface PromoLeaderboardProps {
  data: LeaderboardResponse | undefined;
}

export const PromoLeaderboard = memo(function PromoLeaderboard({
  data,
}: PromoLeaderboardProps) {
  if (!data) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-background-elevated rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  
  const { entries, currentUserRank, currentUserTotal } = data;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          🏆 Leaderboard
          <span className="text-xs font-normal text-text-tertiary">7-day</span>
        </h2>
      </div>
      
      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              entry.isKing && 'bg-yellow-500/10 border border-yellow-500/30',
              entry.rank <= 3 && !entry.isKing && 'bg-background-elevated'
            )}
          >
            {/* Rank */}
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
              entry.rank === 1 && 'bg-yellow-500 text-black',
              entry.rank === 2 && 'bg-gray-400 text-black',
              entry.rank === 3 && 'bg-orange-600 text-white',
              entry.rank > 3 && 'bg-background-surface text-text-secondary'
            )}>
              {entry.rank}
            </div>
            
            {/* Avatar */}
            <img
              src={entry.avatarUrl || '/default-avatar.png'}
              alt={entry.displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
            
            {/* Name & Stats */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-medium text-text-primary truncate text-sm">
                  {entry.displayName}
                </span>
                {entry.isKing && <span>👑</span>}
              </div>
              <span className="text-xs text-text-tertiary">
                {entry.messageCount} messages
              </span>
            </div>
            
            {/* Total */}
            <span className="text-sm font-semibold text-accent-400">
              ${(entry.totalDonationsCents / 100).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      
      {/* Current User Position */}
      {currentUserRank && currentUserRank > 10 && (
        <div className="px-4 py-3 border-t border-border-default bg-background-elevated">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Your rank</span>
            <span className="font-medium text-text-primary">
              #{currentUserRank} • ${((currentUserTotal || 0) / 100).toFixed(0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
```


---

## Webhook Integration

### Extend `backend/api/routes/webhooks.py`

```python
@router.post("/promo")
async def promo_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
) -> dict:
    """
    Handle Stripe webhook events for promo payments.
    
    Events handled:
    - checkout.session.completed (promo payment)
    """
    payload = await request.body()
    
    try:
        event = stripe_service.verify_webhook_signature(payload, stripe_signature)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        # Check if this is a promo payment (via metadata)
        if session.get("metadata", {}).get("type") == "promo_message":
            await promo_service.confirm_message(
                checkout_session_id=session["id"],
                payment_intent_id=session["payment_intent"],
            )
            
            # Recalculate leaderboard
            await promo_service.recalculate_king()
            
            # Broadcast new message via SSE
            await broadcast_promo_event({
                "type": "new_message",
                "checkout_session_id": session["id"],
            })
    
    return {"received": True}
```

---

## SSE Streaming

### Real-time Updates (`backend/api/routes/promo.py`)

```python
from fastapi.responses import StreamingResponse
from asyncio import Queue
import json

# Global message queue for SSE
promo_event_queues: list[Queue] = []

async def broadcast_promo_event(event: dict):
    """Broadcast event to all connected SSE clients."""
    for queue in promo_event_queues:
        await queue.put(event)

@router.get("/stream")
async def message_stream(request: Request) -> StreamingResponse:
    """SSE stream for real-time promo updates."""
    
    async def event_generator():
        queue: Queue = Queue()
        promo_event_queues.append(queue)
        
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Wait for events
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Send keepalive
                    yield f": keepalive\n\n"
        finally:
            promo_event_queues.remove(queue)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

---

## Security Considerations

1. **Payment Verification** - Only create messages after Stripe webhook confirms payment
2. **Rate Limiting** - Max 10 messages per hour per user (Redis counter)
3. **Content Validation** - Max 500 chars, sanitize HTML, validate URLs
4. **RLS Policies** - Users can only delete their own messages
5. **Idempotency** - Track `stripe_checkout_session_id` to prevent duplicates
6. **CSRF Protection** - Include CSRF token in checkout requests
7. **Link Safety** - Validate URLs, consider link scanning service

---

## Performance Optimizations

1. **Leaderboard Caching** - Redis cache with 5-min TTL
2. **Message Pagination** - Cursor-based, 50 per page
3. **Link Preview Caching** - Cache OG data for 24 hours
4. **SSE Connection Pooling** - Limit concurrent connections per user
5. **Database Indexes** - Optimized for common queries
6. **CDN for Avatars** - Serve via Supabase Storage CDN

---

## Testing Strategy

### Backend Tests

```
backend/tests/unit/test_promo_service.py
backend/tests/integration/test_promo_endpoints.py
backend/tests/integration/test_promo_webhooks.py
```

### Frontend Tests

```
tsx/apps/web/src/components/promo/__tests__/PromoChatroom.test.tsx
tsx/apps/web/src/components/promo/__tests__/PromoMessageCard.test.tsx
tsx/apps/web/src/components/promo/__tests__/PromoLeaderboard.test.tsx
```

---

## Implementation Tasks

1. [ ] Create database migration `022_promo_chatroom.sql`
2. [ ] Implement `backend/api/schemas/promo.py`
3. [ ] Implement `backend/services/promo_service.py`
4. [ ] Implement `backend/api/routes/promo.py`
5. [ ] Extend webhook handler for promo payments
6. [ ] Create `tsx/packages/api-client/src/types/promo.ts`
7. [ ] Create `tsx/packages/api-client/src/hooks/usePromoChat.ts`
8. [ ] Build `PromoChatroom.tsx` and sub-components
9. [ ] Create `/promo` page route
10. [ ] Add navigation link to promo chatroom
11. [ ] Write unit and integration tests
12. [ ] Add analytics tracking for promo events
