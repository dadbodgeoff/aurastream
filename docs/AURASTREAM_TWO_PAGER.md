# AuraStream — Executive Two-Pager
**AI-Powered Asset Generation for Content Creators**

---

## What Is AuraStream?

AuraStream is a SaaS platform that lets Twitch streamers, YouTubers, and content creators generate professional streaming assets (emotes, thumbnails, banners, overlays) in seconds using AI. No design skills required.

**Tagline:** "Your stream. Your brand. Every platform."

**Target Market:** 11M+ active Twitch streamers, 50M+ YouTube creators

---

## Core Features

| Feature | Description | Differentiator |
|---------|-------------|----------------|
| **AI Asset Generation** | Generate platform-specific assets (emotes, thumbnails, banners, overlays, badges) | One-click generation with brand consistency |
| **Brand Kits** | Save colors, fonts, logos, and style preferences | Auto-applied to all generations |
| **Prompt Coach** | AI assistant that refines creative vision through conversation | No prompt engineering required |
| **Multi-Platform** | Twitch, YouTube, TikTok, Kick support | Correct dimensions automatically |
| **Asset Library** | Organize, download, share generated assets | Shareable links, public/private toggle |

---

## Business Model

| Tier | Price | Generations | Coach Access | Key Features |
|------|-------|-------------|--------------|--------------|
| **Free** | $0 | 3/month | 1 trial session | Basic brand kit, 30-day storage |
| **Pro** | $9.99/mo | 50/month | Unlimited | Priority queue, 3 platform connections |
| **Studio** | $29.99/mo | Unlimited | Unlimited + Grounding | Custom branding, unlimited platforms |

**Revenue Drivers:** Subscription upgrades, usage-based upsells, potential API access

---

## Technology Stack

```
Frontend:  Next.js 14 + TypeScript + TailwindCSS
Backend:   FastAPI (Python) + PostgreSQL (Supabase) + Redis
AI:        Google Gemini (text) + Image generation APIs
Payments:  Stripe (subscriptions, webhooks)
Hosting:   Docker + DigitalOcean + Nginx
```

**Architecture Highlights:**
- 40+ REST API endpoints with JWT auth
- Real-time streaming (SSE) for Coach and generation progress
- Row-level security on all database tables
- 4-worker job queue for parallel generation

---

## Current State (December 2025)

**Production Status:** ✅ Live at aurastream.shop

**User Metrics:**
- 50 test users created
- 10 accounts with login activity
- 0 assets generated (beta testing phase)

**Recent Additions:**
- Site analytics dashboard (visitor tracking, funnels)
- Coach trial system for free users
- Stripe coupon code support
- OAuth temporarily disabled (in progress)

---

## Key Differentiators

1. **Prompt Coach** — Users describe what they want in plain language; AI handles the technical prompt engineering. No "prompt hacking" required.

2. **Brand Consistency** — Brand kits ensure every asset matches the creator's style automatically.

3. **Platform-Aware** — Generates assets at correct dimensions for each platform (Twitch emotes at 112×112, YouTube thumbnails at 1280×720, etc.)

4. **Creator-First UX** — Keyboard shortcuts, command palette, undo system, celebration milestones, onboarding tour.

---

## Technical Highlights

**Database Schema (6 core tables):**
- `users` — Accounts with subscription tracking
- `brand_kits` — Saved branding configurations
- `generation_jobs` — Asset generation queue
- `assets` — Generated assets with CDN URLs
- `subscriptions` — Stripe subscription state
- `coach_sessions` — Persisted AI conversations

**API Modules:**
- Authentication (14 endpoints) — JWT, OAuth, password reset
- Brand Kits (15 endpoints) — CRUD, colors, typography, logos
- Generation (8 endpoints) — Create, status, Twitch packs
- Coach (6 endpoints) — SSE streaming, session management
- Subscriptions (4 endpoints) — Checkout, portal, status

**Security:**
- JWT tokens with refresh rotation
- Row-level security (RLS) on all tables
- Rate limiting on auth endpoints
- HTTPS only in production

---

## Roadmap Priorities

**Immediate (Q1 2025):**
- [ ] Fix OAuth integration (Google, Twitch, Discord)
- [ ] Launch beta to test users
- [ ] Implement actual image generation (currently mocked)
- [ ] Add email notifications

**Near-term (Q2 2025):**
- [ ] Mobile app (React Native/Expo)
- [ ] Twitch extension integration
- [ ] Team/agency accounts
- [ ] API access for developers

**Future:**
- [ ] Video asset generation (animated overlays)
- [ ] AI-powered brand kit creation from existing content
- [ ] Marketplace for asset templates

---

## Team Requirements

**Current:** Solo developer + AI assistance

**To Scale:**
- 1 Frontend Engineer (React/Next.js)
- 1 Backend Engineer (Python/FastAPI)
- 1 ML Engineer (image generation fine-tuning)
- 1 Designer (UI/UX, marketing assets)
- 1 Growth/Marketing (creator partnerships)

---

## Key Metrics to Track

| Metric | Current | Target (6mo) |
|--------|---------|--------------|
| Monthly Active Users | 0 | 1,000 |
| Paid Subscribers | 0 | 100 |
| Assets Generated | 0 | 10,000 |
| MRR | $0 | $2,000 |
| Conversion (Free→Paid) | N/A | 5% |

---

## Contact & Resources

- **Production:** https://aurastream.shop
- **Documentation:** `/docs/AURASTREAM_USER_GUIDE.md`
- **Technical Spec:** `/AURASTREAM_MASTER_SCHEMA.md`
- **Codebase Overview:** `/AURASTREAM_CODEBASE_OVERVIEW.md`

---

*Last Updated: December 28, 2025*
