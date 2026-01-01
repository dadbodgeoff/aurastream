# AuraStream — Complete Product Overview
**AI-Powered Creative Suite for Content Creators**

---

## What Is AuraStream?

AuraStream is a SaaS platform that gives Twitch streamers, YouTubers, and content creators the power to generate professional streaming assets instantly using AI. No Photoshop. No designers. No waiting.

**The Problem:** Creators spend 5-10 hours per week on graphics—time that should go to content. Hiring designers costs $50-500 per asset. Canva templates look generic. The result? Creators either burn out or settle for mediocre branding.

**The Solution:** AuraStream generates on-brand thumbnails, emotes, overlays, banners, and more in seconds. Upload your vibe, describe what you want, and AI handles the rest.

**Live at:** aurastream.shop

---

## Core Product Suite

### 1. Create Studio — Asset Generation Engine
The heart of AuraStream. Generate platform-specific assets with AI:

| Asset Type | Platforms | Use Case |
|------------|-----------|----------|
| Thumbnails | YouTube, TikTok | Click-worthy video covers |
| Emotes | Twitch, Discord | Custom subscriber emotes |
| Banners | Twitch, YouTube, Twitter | Channel branding |
| Overlays | All streaming | Live stream graphics |
| Panels | Twitch | About/schedule/social panels |
| Badges | Twitch | Subscriber loyalty badges |
| Offline Screens | Twitch | "Stream offline" graphics |
| Alerts | All streaming | Follow/sub/donation alerts |
| Profile Pictures | All platforms | AI-generated avatars |

**How it works:**
1. Select asset type and platform
2. Describe what you want (or use Prompt Coach)
3. AI generates 4 variations in ~30 seconds
4. Download, share, or regenerate

### 2. Brand Kits — Your Visual DNA
Save your brand identity once, apply it everywhere:

- **Colors:** Primary palette + accent colors
- **Typography:** Headline and body fonts
- **Logos:** Primary, secondary, icon, monochrome, watermark variants
- **Voice:** Tone and personality guidelines
- **Style Reference:** Upload inspiration images

Every asset generated automatically matches your brand. No more inconsistent graphics.

### 3. Prompt Coach — AI Creative Director (Studio Tier)
Most creators don't know how to write AI prompts. Prompt Coach solves this:

- **Conversational:** Describe your vision in plain English
- **Guided:** Coach asks clarifying questions (mood, style, references)
- **Refined:** Outputs optimized prompts without exposing technical details
- **Contextual:** Understands your brand kit and past preferences

Example conversation:
> **You:** "I need a thumbnail for my Valorant clutch video"
> **Coach:** "Nice! What's the vibe—hype and intense, or clean and minimal? Any specific agent or moment you want to highlight?"
> **You:** "Intense, featuring Jett, the 1v5 clutch moment"
> **Coach:** "Got it. I'm thinking dynamic angle, Jett mid-dash, enemy team silhouettes, your brand colors as accents. Ready to generate?"

### 4. Intel Hub — Creator Intelligence
Data-driven insights to level up your content:

- **Thumbnail Intel:** Analyze what's working in your niche
- **Title Ideas:** AI-generated video title suggestions
- **Trend Radar:** Spot emerging topics before they peak
- **Clip Radar:** Auto-detect viral moments from your streams
- **Weekly Playbook:** Personalized content calendar

### 5. Aura Lab — Creative Playground
Experimental feature for discovering new styles:

- **Element Fusion:** Combine visual elements to create unique aesthetics
- **Style Discovery:** AI suggests styles based on your content
- **Inventory System:** Collect and remix visual "ingredients"

### 6. Community Gallery
Showcase and discover:

- **Public Gallery:** Share your best assets
- **Creator Spotlight:** Featured creator profiles
- **Promo Board:** Cross-promote with other creators
- **Social Hub:** Connect, message, and collaborate

---

## Business Model

### Pricing Tiers

| Feature | Free | Pro ($9.99/mo) | Studio ($29.99/mo) |
|---------|------|----------------|-------------------|
| Asset Generations | 3/month | 50/month | Unlimited |
| Prompt Coach | 1 trial session | Tips only | Full access |
| Brand Kits | 1 basic | 3 advanced | Unlimited |
| Platform Connections | 1 | 3 | Unlimited |
| Asset Storage | 30 days | Unlimited | Unlimited |
| Priority Queue | No | Yes | Yes |
| Vibe Branding | 1 analysis | 10/month | Unlimited |
| Profile Creator | 1 generation | 5/month | Unlimited |
| Aura Lab Fusions | 2/month | 25/month | Unlimited |

### Revenue Model
- **Primary:** Monthly subscriptions (Pro + Studio)
- **Secondary:** Usage-based upsells (generation packs)
- **Future:** API access, team/agency plans, marketplace

---

## Technology Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js 14 • TypeScript • TailwindCSS • TanStack Query        │
│  ─────────────────────────────────────────────────────────────  │
│  Landing • Dashboard • Create Studio • Intel Hub • Community   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                             │
│  FastAPI (Python) • 50+ REST Endpoints • JWT Auth • SSE        │
│  ─────────────────────────────────────────────────────────────  │
│  Auth • Brand Kits • Generation • Coach • Analytics • Billing  │
└─────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │      Redis       │  │   Google Gemini  │
│   (Supabase)     │  │   (Cache/Queue)  │  │   (AI/LLM)       │
│   ────────────   │  │   ────────────   │  │   ────────────   │
│   Users          │  │   Job Queue      │  │   Prompt Coach   │
│   Brand Kits     │  │   Session Cache  │  │   Text Gen       │
│   Assets         │  │   Rate Limiting  │  │   Vision         │
│   Jobs           │  │   Analytics      │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Key Technical Features
- **Real-time Streaming:** SSE for Coach conversations and generation progress
- **Job Queue:** 4-worker parallel processing for fast generation
- **Row-Level Security:** Users only access their own data
- **Optimistic UI:** Instant feedback with automatic rollback
- **Smart Caching:** Redis for session state and rate limiting

---

## User Experience Highlights

### Onboarding Flow
1. Sign up (email or OAuth)
2. 5-step guided tour
3. Create first brand kit (or skip)
4. Generate first asset (free)
5. Explore dashboard

### Power User Features
- **Command Palette (⌘K):** Quick navigation
- **Keyboard Shortcuts:** N (new), B (brand kits), A (assets), ? (help)
- **Smart Defaults:** Remembers your preferences
- **Undo System:** 5-second window for destructive actions
- **Celebrations:** Milestone achievements (1st, 10th, 50th, 100th asset)

### Mobile Support
- Responsive web design
- React Native app (in development)
- Touch-optimized interfaces

---

## Market Opportunity

### Target Audience
- **Primary:** 11M+ active Twitch streamers
- **Secondary:** 50M+ YouTube creators
- **Tertiary:** TikTok, Kick, and emerging platform creators

### Creator Pain Points We Solve
1. **Time:** 5-10 hours/week on graphics → minutes
2. **Cost:** $50-500/asset for designers → $10-30/month unlimited
3. **Consistency:** Mismatched branding → unified visual identity
4. **Skill Gap:** "I'm not a designer" → AI handles complexity

### Competitive Advantages
1. **Creator-Native:** Built specifically for streamers, not generic design
2. **AI-First:** Not templates—truly generative
3. **Brand System:** Automatic consistency across all assets
4. **Prompt Coach:** No prompt engineering required
5. **Speed:** Seconds, not days

---

## Current Status & Roadmap

### Live Now (January 2026)
- ✅ Full asset generation pipeline
- ✅ Brand kit system
- ✅ Prompt Coach (Studio tier)
- ✅ Intel Hub (thumbnails, titles, trends)
- ✅ Community gallery
- ✅ Stripe billing integration
- ✅ OAuth (Google, Twitch, Discord)

### Q1 2026
- [ ] Mobile app launch (iOS/Android)
- [ ] Twitch extension integration
- [ ] Video asset generation (animated overlays)
- [ ] Team/agency accounts

### Q2 2026
- [ ] API access for developers
- [ ] Marketplace for templates
- [ ] AI brand kit creation from existing content
- [ ] Advanced analytics dashboard

---

## Key Metrics (Targets)

| Metric | Current | 6-Month Target |
|--------|---------|----------------|
| Monthly Active Users | Beta | 1,000 |
| Paid Subscribers | 0 | 100 |
| Assets Generated | Testing | 10,000 |
| MRR | $0 | $2,000 |
| Free→Paid Conversion | N/A | 5% |

---

## Team & Contact

**Current:** Solo founder + AI development assistance

**Scaling Needs:**
- Frontend Engineer (React/Next.js)
- ML Engineer (image generation)
- Growth Marketing (creator partnerships)

**Production:** https://aurastream.shop

---

*AuraStream: Your stream. Your brand. Every platform.*

*Last Updated: January 2026*
