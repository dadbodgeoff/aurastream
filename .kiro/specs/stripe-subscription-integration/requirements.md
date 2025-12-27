# Stripe Subscription Integration - Requirements

## Overview
Implement enterprise-grade Stripe subscription billing for AuraStream with three tiers: Free, Pro ($9.99/mo), and Studio ($29.99/mo).

## Functional Requirements

### FR-1: Checkout Flow
1. Users can initiate subscription checkout from the app
2. System creates Stripe Checkout Session with correct price ID
3. User is redirected to Stripe-hosted checkout page
4. On success, user is redirected back with session ID
5. System verifies session and activates subscription

### FR-2: Subscription Management
1. Users can view their current subscription status
2. Users can upgrade from Free → Pro → Studio
3. Users can downgrade (takes effect at period end)
4. Users can cancel subscription (access until period end)
5. Users can access Stripe Customer Portal for billing management

### FR-3: Webhook Handling
1. System receives and verifies Stripe webhook signatures
2. Handle `checkout.session.completed` - activate subscription
3. Handle `customer.subscription.updated` - sync tier changes
4. Handle `customer.subscription.deleted` - deactivate subscription
5. Handle `invoice.paid` - confirm renewal
6. Handle `invoice.payment_failed` - mark as past_due
7. Idempotent processing (handle duplicate webhooks)

### FR-4: Tier Enforcement
1. Free tier: 5 assets/month, basic features
2. Pro tier: 100 assets/month, all features except Coach
3. Studio tier: Unlimited assets, full Coach access
4. Enforce limits at generation time
5. Show upgrade prompts when limits reached

## Non-Functional Requirements

### NFR-1: Security
- Webhook signature verification required
- No sensitive data in client-side code
- HTTPS only for all Stripe communication
- Audit logging for all subscription changes

### NFR-2: Reliability
- Idempotent webhook processing
- Graceful handling of Stripe API failures
- Retry logic for transient errors
- Database transactions for state changes

### NFR-3: Performance
- Webhook processing < 5 seconds
- Checkout session creation < 2 seconds
- Subscription status cached in JWT

## API Endpoints

```
POST   /api/v1/subscriptions/checkout     # Create checkout session
POST   /api/v1/subscriptions/portal       # Create billing portal session
GET    /api/v1/subscriptions/status       # Get current subscription
POST   /api/v1/subscriptions/cancel       # Cancel at period end
POST   /api/v1/webhooks/stripe            # Stripe webhook handler
```

## Data Model

### Users Table (existing fields)
- `subscription_tier`: 'free' | 'pro' | 'studio'
- `subscription_status`: 'active' | 'past_due' | 'canceled' | 'none'
- `stripe_customer_id`: Stripe customer ID

### Subscriptions Table (new)
- `id`: UUID primary key
- `user_id`: FK to users
- `stripe_subscription_id`: Stripe subscription ID
- `stripe_price_id`: Current price ID
- `tier`: 'pro' | 'studio'
- `status`: 'active' | 'past_due' | 'canceled' | 'trialing'
- `current_period_start`: Timestamp
- `current_period_end`: Timestamp
- `cancel_at_period_end`: Boolean
- `created_at`, `updated_at`: Timestamps

## Environment Variables
```
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_STUDIO=price_xxx
FRONTEND_URL=https://app.aurastream.io
```

## Success Criteria
1. Users can subscribe to Pro/Studio via Stripe Checkout
2. Subscription status syncs correctly via webhooks
3. Tier limits are enforced at generation time
4. Users can manage billing via Stripe Portal
5. All subscription changes are audit logged
6. 100% webhook signature verification
7. Zero duplicate subscription activations
