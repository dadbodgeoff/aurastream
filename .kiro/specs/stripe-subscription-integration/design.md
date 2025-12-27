# Stripe Subscription Integration - Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  tsx/apps/web                          │  tsx/packages/api-client            │
│  ├── /dashboard/settings (billing UI)  │  ├── hooks/useSubscription.ts       │
│  ├── /billing/success (callback)       │  ├── types/subscription.ts          │
│  └── components/billing/*              │  └── client.ts (subscriptions ns)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND API                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/api/routes/                   │  backend/api/schemas/               │
│  ├── subscriptions.py                  │  └── subscription.py                │
│  └── webhooks.py                       │                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  backend/services/                                                           │
│  ├── stripe_service.py      # Stripe API wrapper                            │
│  └── subscription_service.py # Business logic                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐    ┌──────────────────────────────┐
│         STRIPE API           │    │      SUPABASE (PostgreSQL)   │
│  - Checkout Sessions         │    │  - users table               │
│  - Customer Portal           │    │  - subscriptions table       │
│  - Subscriptions             │    │  - subscription_events table │
│  - Webhooks                  │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

## File Structure

```
backend/
├── api/
│   ├── routes/
│   │   ├── subscriptions.py      # Subscription endpoints
│   │   └── webhooks.py           # Stripe webhook handler
│   └── schemas/
│       └── subscription.py       # Pydantic models
├── services/
│   ├── stripe_service.py         # Stripe API integration
│   └── subscription_service.py   # Subscription business logic
└── database/
    └── migrations/
        └── 011_subscriptions.sql # Subscriptions table

tsx/
├── packages/
│   └── api-client/
│       └── src/
│           ├── types/
│           │   └── subscription.ts
│           └── hooks/
│               └── useSubscription.ts
└── apps/
    └── web/
        └── src/
            ├── app/
            │   └── dashboard/
            │       └── settings/
            │           └── page.tsx  # Add billing section
            └── components/
                └── billing/
                    ├── PricingCard.tsx
                    ├── SubscriptionStatus.tsx
                    └── BillingSection.tsx
```

## Backend Design

### 1. Stripe Service (`backend/services/stripe_service.py`)

```python
class StripeService:
    """
    Stripe API integration service.
    
    Handles all direct communication with Stripe API:
    - Checkout session creation
    - Customer portal sessions
    - Subscription management
    - Webhook signature verification
    """
    
    def __init__(self, secret_key: str, webhook_secret: str):
        stripe.api_key = secret_key
        self.webhook_secret = webhook_secret
    
    async def create_checkout_session(
        self,
        user_id: str,
        user_email: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        customer_id: Optional[str] = None,
    ) -> CheckoutSession
    
    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str,
    ) -> PortalSession
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True,
    ) -> Subscription
    
    def verify_webhook_signature(
        self,
        payload: bytes,
        signature: str,
    ) -> Event
```

### 2. Subscription Service (`backend/services/subscription_service.py`)

```python
class SubscriptionService:
    """
    Subscription business logic service.
    
    Handles subscription state management:
    - Activating/deactivating subscriptions
    - Syncing with Stripe events
    - Tier enforcement
    - Usage tracking
    """
    
    async def activate_subscription(
        self,
        user_id: str,
        stripe_subscription_id: str,
        stripe_customer_id: str,
        price_id: str,
        current_period_end: datetime,
    ) -> Subscription
    
    async def deactivate_subscription(
        self,
        stripe_subscription_id: str,
    ) -> None
    
    async def update_subscription_status(
        self,
        stripe_subscription_id: str,
        status: str,
        cancel_at_period_end: bool,
    ) -> Subscription
    
    async def get_user_subscription(
        self,
        user_id: str,
    ) -> Optional[Subscription]
    
    async def check_tier_access(
        self,
        user_id: str,
        required_tier: str,
    ) -> bool
```

### 3. Schemas (`backend/api/schemas/subscription.py`)

```python
# Request Schemas
class CheckoutRequest(BaseModel):
    plan: Literal["pro", "studio"]
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None

class PortalRequest(BaseModel):
    return_url: Optional[str] = None

# Response Schemas
class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str

class PortalResponse(BaseModel):
    portal_url: str

class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    tier: Literal["free", "pro", "studio"]
    status: Literal["active", "past_due", "canceled", "none"]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    can_upgrade: bool
    can_downgrade: bool
```

### 4. Routes (`backend/api/routes/subscriptions.py`)

```python
router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    data: CheckoutRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> CheckoutResponse:
    """Create Stripe Checkout session for subscription."""

@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    data: PortalRequest,
    current_user: TokenPayload = Depends(get_current_user),
) -> PortalResponse:
    """Create Stripe Customer Portal session."""

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_status(
    current_user: TokenPayload = Depends(get_current_user),
) -> SubscriptionStatusResponse:
    """Get current subscription status."""

@router.post("/cancel")
async def cancel_subscription(
    current_user: TokenPayload = Depends(get_current_user),
) -> dict:
    """Cancel subscription at end of billing period."""
```

### 5. Webhook Handler (`backend/api/routes/webhooks.py`)

```python
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
) -> dict:
    """
    Handle Stripe webhook events.
    
    Events handled:
    - checkout.session.completed
    - customer.subscription.created
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.paid
    - invoice.payment_failed
    """
```

## Database Design

### Migration: `011_subscriptions.sql`

```sql
-- Subscriptions table for tracking active subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    stripe_price_id TEXT NOT NULL,
    
    tier TEXT NOT NULL CHECK (tier IN ('pro', 'studio')),
    status TEXT NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- Subscription events for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    stripe_event_id TEXT UNIQUE NOT NULL,
    
    old_tier TEXT,
    new_tier TEXT,
    old_status TEXT,
    new_status TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_user_policy ON subscriptions
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY subscription_events_user_policy ON subscription_events
    FOR ALL USING (user_id = auth.uid());
```

## Frontend Design

### Types (`tsx/packages/api-client/src/types/subscription.ts`)

```typescript
export type SubscriptionTier = 'free' | 'pro' | 'studio';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'none';

export interface CheckoutRequest {
  plan: 'pro' | 'studio';
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface PortalResponse {
  portalUrl: string;
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
}
```

### API Client Extension

```typescript
// Add to APIClient class
subscriptions = {
  createCheckout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    return this.request<CheckoutResponse>('POST', '/api/v1/subscriptions/checkout', {
      body: { plan: data.plan, success_url: data.successUrl, cancel_url: data.cancelUrl },
      requiresAuth: true,
    });
  },

  createPortal: async (returnUrl?: string): Promise<PortalResponse> => {
    return this.request<PortalResponse>('POST', '/api/v1/subscriptions/portal', {
      body: { return_url: returnUrl },
      requiresAuth: true,
    });
  },

  getStatus: async (): Promise<SubscriptionStatusResponse> => {
    return this.request<SubscriptionStatusResponse>('GET', '/api/v1/subscriptions/status', {
      requiresAuth: true,
    });
  },

  cancel: async (): Promise<{ message: string }> => {
    return this.request<{ message: string }>('POST', '/api/v1/subscriptions/cancel', {
      requiresAuth: true,
    });
  },
};
```

## Webhook Flow

```
Stripe Event → POST /api/v1/webhooks/stripe
                        │
                        ▼
              Verify Signature
                        │
                        ▼
              Check Idempotency (stripe_event_id)
                        │
                        ▼
              Route by event.type
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
checkout.session   subscription.*   invoice.*
   .completed           │               │
        │               │               │
        ▼               ▼               ▼
  Activate Sub    Update Status    Update Status
        │               │               │
        ▼               ▼               ▼
  Update User      Update User     Send Email
     Tier             Tier         (if failed)
        │               │               │
        └───────────────┴───────────────┘
                        │
                        ▼
              Log to subscription_events
                        │
                        ▼
              Return 200 OK
```

## Security Considerations

1. **Webhook Verification**: Always verify Stripe-Signature header
2. **Idempotency**: Store stripe_event_id to prevent duplicate processing
3. **No Client Secrets**: Never expose STRIPE_SECRET_KEY to frontend
4. **HTTPS Only**: All Stripe communication over HTTPS
5. **Audit Trail**: Log all subscription changes to subscription_events

## Error Handling

| Error | HTTP Code | Response |
|-------|-----------|----------|
| Invalid plan | 400 | `{"error": "INVALID_PLAN", "message": "Plan must be 'pro' or 'studio'"}` |
| No customer | 400 | `{"error": "NO_STRIPE_CUSTOMER", "message": "User has no Stripe customer"}` |
| No subscription | 400 | `{"error": "NO_SUBSCRIPTION", "message": "No active subscription to cancel"}` |
| Webhook signature invalid | 400 | `{"error": "INVALID_SIGNATURE", "message": "Invalid webhook signature"}` |
| Stripe API error | 502 | `{"error": "STRIPE_ERROR", "message": "Payment provider error"}` |
