# 🎤 Promo Chatroom - Requirements

## Overview

A premium $1-per-message promotional chatroom where AuraStream users can promote their streams, channels, and content. Features a "King of the Hill" mechanic where the top donor in the last 7 days gets their message pinned at the top.

## Business Goals

1. **Revenue Generation** - $1 per message creates sustainable micro-transaction revenue
2. **Community Building** - Connects content creators, fosters networking
3. **Engagement** - Gamified "King of the Hill" drives competitive donations
4. **Visibility** - Gives creators a platform to promote their content

---

## Functional Requirements

### FR-1: Message Posting (Paid)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | Users must pay $1 to post a promotional message | P0 |
| FR-1.2 | Payment processed via Stripe Checkout (existing integration) | P0 |
| FR-1.3 | Message appears immediately after successful payment | P0 |
| FR-1.4 | Messages support text (max 500 chars) + optional link | P0 |
| FR-1.5 | Messages display user avatar, display name, tier badge | P0 |
| FR-1.6 | Messages auto-expire after 30 days | P1 |
| FR-1.7 | Users can delete their own messages (no refund) | P2 |

### FR-2: King of the Hill System

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | Track total donations per user over rolling 7-day window | P0 |
| FR-2.2 | Top donor's most recent message pinned at top of chat | P0 |
| FR-2.3 | "King" badge displayed on pinned message and user | P0 |
| FR-2.4 | Tie-breaker: first to reach amount wins | P1 |
| FR-2.5 | King status updates in real-time when surpassed | P1 |
| FR-2.6 | Crown animation when new King is crowned | P2 |

### FR-3: Leaderboard

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Display top 10 donors in last 7 days | P0 |
| FR-3.2 | Show rank, avatar, name, donation total | P0 |
| FR-3.3 | Highlight current user's position if in top 50 | P1 |
| FR-3.4 | Real-time updates when rankings change | P1 |
| FR-3.5 | Historical "Hall of Fame" for past Kings | P2 |

### FR-4: Chat Feed

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Display messages in reverse chronological order | P0 |
| FR-4.2 | Infinite scroll with pagination (50 messages per page) | P0 |
| FR-4.3 | Real-time new message notifications | P0 |
| FR-4.4 | User tier badges (free, pro, studio) displayed | P0 |
| FR-4.5 | Clickable links with preview cards | P1 |
| FR-4.6 | Message reactions (🔥, 👑, 💜, 🎮) | P2 |

### FR-5: User Labels & Badges

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Subscription tier badge (Free/Pro/Studio) | P0 |
| FR-5.2 | "King" crown badge for current top donor | P0 |
| FR-5.3 | "Top 10" badge for leaderboard members | P1 |
| FR-5.4 | "Verified Creator" badge (linked Twitch/YouTube) | P1 |
| FR-5.5 | Message count badge (10+, 50+, 100+ messages) | P2 |

---

## Non-Functional Requirements

### NFR-1: Security

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1.1 | All payments via Stripe (PCI compliant) | P0 |
| NFR-1.2 | JWT authentication required for posting | P0 |
| NFR-1.3 | Rate limiting: max 10 messages per hour per user | P0 |
| NFR-1.4 | Content moderation: profanity filter | P1 |
| NFR-1.5 | Admin ability to remove messages | P1 |
| NFR-1.6 | RLS policies on all database tables | P0 |

### NFR-2: Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-2.1 | Message feed loads in < 500ms | P0 |
| NFR-2.2 | Real-time updates via SSE or WebSocket | P0 |
| NFR-2.3 | Leaderboard cached in Redis (5-min TTL) | P1 |
| NFR-2.4 | Support 1000+ concurrent viewers | P1 |

### NFR-3: Accessibility

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-3.1 | WCAG 2.1 AA compliant | P0 |
| NFR-3.2 | Keyboard navigation support | P0 |
| NFR-3.3 | Screen reader announcements for new messages | P1 |
| NFR-3.4 | Reduced motion support | P1 |

---

## API Endpoints

### Promo Messages

```
POST   /api/v1/promo/checkout          # Create Stripe checkout for message
POST   /api/v1/promo/messages          # Post message (after payment webhook)
GET    /api/v1/promo/messages          # Get paginated messages
GET    /api/v1/promo/messages/pinned   # Get current King's pinned message
DELETE /api/v1/promo/messages/{id}     # Delete own message
```

### Leaderboard

```
GET    /api/v1/promo/leaderboard       # Get top 10 donors (7-day rolling)
GET    /api/v1/promo/leaderboard/me    # Get current user's rank
GET    /api/v1/promo/hall-of-fame      # Historical Kings
```

### Real-time

```
GET    /api/v1/promo/stream            # SSE stream for new messages
```

### Webhooks

```
POST   /api/v1/webhooks/promo          # Stripe webhook for promo payments
```

---

## Database Schema

### promo_messages

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
content TEXT NOT NULL (max 500 chars)
link_url TEXT (optional)
link_preview JSONB (title, description, image)
is_pinned BOOLEAN DEFAULT FALSE
payment_id UUID NOT NULL REFERENCES promo_payments(id)
created_at TIMESTAMPTZ DEFAULT NOW()
expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
deleted_at TIMESTAMPTZ (soft delete)
```

### promo_payments

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
stripe_payment_intent_id TEXT UNIQUE NOT NULL
stripe_checkout_session_id TEXT
amount_cents INTEGER NOT NULL DEFAULT 100
status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
message_id UUID REFERENCES promo_messages(id)
created_at TIMESTAMPTZ DEFAULT NOW()
completed_at TIMESTAMPTZ
```

### promo_leaderboard_cache

```sql
user_id UUID PRIMARY KEY REFERENCES users(id)
total_donations_cents INTEGER NOT NULL DEFAULT 0
message_count INTEGER NOT NULL DEFAULT 0
last_donation_at TIMESTAMPTZ
rank INTEGER
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## UI/UX Requirements

### 2026-Ready Enterprise Chat Design

1. **Glass Morphism Cards** - Frosted glass effect for message cards
2. **Gradient Accents** - Brand-aligned gradient highlights
3. **Micro-interactions** - Subtle hover states, smooth transitions
4. **Dark Mode First** - Optimized for dark theme (streamer preference)
5. **Responsive Layout** - Mobile-first, adapts to all screen sizes
6. **Skeleton Loading** - Content-aware loading states
7. **Empty States** - Engaging illustrations when no messages

### User Identification

- Avatar (40px, rounded)
- Display name (bold, primary color)
- Tier badge (colored pill: Free=gray, Pro=blue, Studio=purple)
- King crown (animated gold icon for current King)
- Verified badge (checkmark for linked platforms)
- Timestamp (relative: "2h ago")

### Message Card Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 👑 PINNED - King of the Hill                                │
├─────────────────────────────────────────────────────────────┤
│ [Avatar] DisplayName [Studio] [👑] [✓]           2h ago    │
│                                                             │
│ Check out my stream! We're doing a 24-hour charity marathon │
│ for Extra Life. Come hang out! 🎮                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔗 twitch.tv/username                                   │ │
│ │ Live: Playing Elden Ring | 1.2K viewers                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🔥 12  👑 3  💜 8  🎮 5                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points

1. **Stripe** - Existing integration for $1 payments
2. **Supabase** - PostgreSQL + RLS for data storage
3. **Redis** - Leaderboard caching, rate limiting
4. **SSE** - Real-time message streaming (existing pattern from Coach)
5. **Platform Connections** - Twitch/YouTube verification for badges

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Messages per day | 100+ |
| Unique posters per week | 50+ |
| Average session duration | 5+ minutes |
| King competition (multiple contenders) | 3+ users in top 5 |
| Revenue per month | $3,000+ |

---

## Out of Scope (v1)

- Direct messaging between users
- Message threading/replies
- Image uploads in messages
- Video embeds
- Gifting messages to other users
- Subscription-based unlimited posting
