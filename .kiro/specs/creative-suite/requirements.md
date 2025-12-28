# AuraStream Creative Suite - Requirements Specification
**Features:** Vibe Branding + The Aura Lab
**Version:** 1.0.0
**Status:** DRAFT - Awaiting Implementation
**Created:** December 28, 2025
**Priority:** HIGH - Differentiating Features

---

## OVERVIEW

This spec covers two major features that work together:

1. **Vibe Branding** - Extract brand identity from any image (solves onboarding)
2. **The Aura Lab** - Fusion reactor for emote experimentation (drives retention & virality)

**Execution Order:** Vibe Branding first (simpler), then Aura Lab (complex).

---

# PART 1: VIBE BRANDING

## 1. EXECUTIVE SUMMARY

### 1.1 Problem Statement
New users face the "Blank Page Problem" - they don't know what colors, fonts, or style to choose when creating a brand kit. This friction causes:
- High drop-off during onboarding
- Low brand kit creation rates
- Users defaulting to AI defaults instead of personalized branding

### 1.2 Solution
**Vibe Branding** allows users to upload a screenshot of any streamer, thumbnail, or aesthetic they admire. Gemini Vision analyzes the image and extracts:
- Color palette (primary + accent)
- Typography style
- Brand tone
- Style keywords
- Lighting mood

The system auto-creates a Brand Kit and optionally generates a sample asset immediately.

### 1.3 Value Proposition
- **Marketing Hook:** "Steal The Look. Keep The Clout."
- **User Value:** Zero-friction brand kit creation in 10 seconds
- **Differentiation:** Solves blank page problem using existing visuals as the prompt

---

## 2. FUNCTIONAL REQUIREMENTS

### 2.1 Core User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTRY POINTS                                                   │
│  1. Dashboard sidebar: "Vibe Branding" nav item                │
│  2. Brand Kits page: "Import from Image" button                │
│  3. Quick Create: "Steal a Vibe" option                        │
│  4. Onboarding: Step after signup                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: UPLOAD                                                 │
│  - Drag & drop zone                                            │
│  - Click to browse                                             │
│  - Paste URL option                                            │
│  - Accepted: PNG, JPG, JPEG, WebP (max 10MB)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: ANALYZING (Terminal Animation)                        │
│  - "GEMINI VISION ACTIVE" header                               │
│  - Fake terminal logs for perceived value:                     │
│    > Extracting hex values...                                  │
│    > Identifying font weights...                               │
│    > Analyzing lighting models...                              │
│    > Cloning aesthetic DNA...                                  │
│    > Constructing Brand Kit...                                 │
│  - Blinking cursor animation                                   │
│  - Duration: ~4-8 seconds (real API call)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: SUCCESS (The Payoff)                                  │
│  - Confetti animation                                          │
│  - "Aesthetic Extracted Successfully" message                  │
│  - Color palette visualization (interactive swatches)          │
│  - Detected vibe + lighting mood                               │
│  - Typography preview                                          │
│  - Style keywords as tags                                      │
│  - CTAs:                                                       │
│    [Save to Brand Kits] [Generate Assets Now →]               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: INSTANT PAYOFF (Optional)                             │
│  - Redirect to /dashboard/create?vibe_kit={kit_id}            │
│  - Pre-select Thumbnail asset type                             │
│  - Pre-select the new Brand Kit                                │
│  - Auto-fill prompt from style_reference                       │
│  - One-click generation                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Gemini Vision Analysis Output

The API must return ALL fields required for brand kit creation:

```typescript
interface VibeBrandingAnalysis {
  // REQUIRED - Maps directly to brand_kits table
  primary_colors: string[];      // 5 hex codes (#RRGGBB), dominant to accent
  accent_colors: string[];       // 3 hex codes
  fonts: {
    headline: SupportedFont;     // Must be from SUPPORTED_FONTS list
    body: SupportedFont;
  };
  tone: BrandTone;               // competitive|casual|educational|comedic|professional
  style_reference: string;       // 2-3 sentence description for prompt injection
  
  // EXTENDED - For UI display and enhanced generation
  lighting_mood: LightingMood;   // neon|natural|dramatic|cozy|high-contrast
  style_keywords: string[];      // 3-5 descriptive terms
  text_vibe?: string;            // "Aggressive All-Caps", "Playful Lowercase", etc.
  confidence: number;            // 0-1 extraction confidence
  
  // METADATA
  source_image_hash: string;     // For caching
  analyzed_at: string;           // ISO timestamp
}

type SupportedFont = 
  | 'Inter' | 'Roboto' | 'Montserrat' | 'Open Sans' | 'Poppins'
  | 'Lato' | 'Oswald' | 'Raleway' | 'Nunito' | 'Playfair Display'
  | 'Merriweather' | 'Source Sans Pro' | 'Ubuntu' | 'Rubik' | 'Work Sans'
  | 'Fira Sans' | 'Barlow' | 'Quicksand' | 'Karla' | 'Mulish';

type BrandTone = 'competitive' | 'casual' | 'educational' | 'comedic' | 'professional';

type LightingMood = 'neon' | 'natural' | 'dramatic' | 'cozy' | 'high-contrast';
```

### 2.3 Brand Kit Creation

When `auto_create_kit: true`, the system creates a brand kit with:

| Field | Source | Notes |
|-------|--------|-------|
| `name` | User input OR auto-generated | Default: "Vibe from {date}" |
| `primary_colors` | `analysis.primary_colors` | Direct mapping |
| `accent_colors` | `analysis.accent_colors` | Direct mapping |
| `fonts.headline` | `analysis.fonts.headline` | Validated against SUPPORTED_FONTS |
| `fonts.body` | `analysis.fonts.body` | Validated against SUPPORTED_FONTS |
| `tone` | `analysis.tone` | Direct mapping |
| `style_reference` | `analysis.style_reference` | Used for prompt injection |
| `extracted_from` | `"vibe_branding"` | New field to track source |
| `source_image_hash` | `analysis.source_image_hash` | For deduplication |

### 2.4 Tier Gating

| Tier | Vibe Branding Access |
|------|---------------------|
| Free | 1 analysis (trial) |
| Pro | 5 analyses/month |
| Studio | Unlimited |

Track usage in `users` table: `vibe_analyses_this_month` (INT, default 0)

---

## 3. NON-FUNCTIONAL REQUIREMENTS

### 3.1 Performance
- Analysis must complete in < 10 seconds
- Image upload max: 10MB
- Response caching: Hash uploaded images, cache results for 24 hours

### 3.2 Security
- Gemini safety settings: Block MEDIUM_AND_ABOVE for all harm categories
- Validate image MIME types server-side
- Rate limit: 10 requests/minute per user
- No PII extraction from images

### 3.3 Error Handling
| Error | User Message | Recovery |
|-------|--------------|----------|
| Invalid image format | "Please upload a PNG, JPG, or WebP image" | Show upload again |
| Image too large | "Image must be under 10MB" | Show upload again |
| Analysis failed | "Couldn't extract the vibe. Try a different image." | Show upload again |
| Content policy | "This image can't be analyzed" | Show upload again |
| Rate limited | "You've used all your Vibe analyses this month" | Show upgrade CTA |

---

## 4. API SPECIFICATION

### 4.1 Endpoints

#### POST /api/v1/vibe-branding/analyze/upload
Upload an image file for analysis.

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: binary (required)
auto_create_kit: boolean (default: true)
kit_name: string (optional, max 100 chars)
```

**Response (200):**
```json
{
  "analysis": {
    "primary_colors": ["#6441A5", "#9146FF", "#772CE8", "#BF94FF", "#E6D5FF"],
    "accent_colors": ["#FF6B6B", "#FFE66D", "#4ECDC4"],
    "fonts": {
      "headline": "Oswald",
      "body": "Inter"
    },
    "tone": "competitive",
    "style_reference": "High-energy esports aesthetic with deep purple gradients, neon accents, and aggressive typography. Dark backgrounds with vibrant color pops.",
    "lighting_mood": "neon",
    "style_keywords": ["esports", "cyberpunk", "aggressive", "purple"],
    "text_vibe": "Bold All-Caps",
    "confidence": 0.87,
    "source_image_hash": "sha256:abc123...",
    "analyzed_at": "2025-12-28T10:30:00Z"
  },
  "brand_kit_id": "550e8400-e29b-41d4-a716-446655440000",
  "cached": false
}
```

#### POST /api/v1/vibe-branding/analyze/url
Analyze an image from URL.

**Request:**
```json
{
  "image_url": "https://example.com/screenshot.png",
  "auto_create_kit": true,
  "kit_name": "xQc Vibe"
}
```

**Response:** Same as upload endpoint.

#### GET /api/v1/vibe-branding/usage
Get user's vibe branding usage.

**Response:**
```json
{
  "used": 3,
  "limit": 5,
  "resets_at": "2026-01-01T00:00:00Z"
}
```

---

## 5. DATABASE CHANGES

### 5.1 Migration: Add vibe_analyses_this_month to users

```sql
-- Migration: 021_vibe_branding_usage.sql
ALTER TABLE users 
ADD COLUMN vibe_analyses_this_month INTEGER DEFAULT 0;

-- Add index for monthly reset queries
CREATE INDEX idx_users_vibe_analyses ON users(vibe_analyses_this_month) 
WHERE vibe_analyses_this_month > 0;
```

### 5.2 Migration: Add extracted_from to brand_kits

```sql
-- Migration: 022_brand_kit_source.sql
ALTER TABLE brand_kits 
ADD COLUMN extracted_from TEXT DEFAULT NULL;

ALTER TABLE brand_kits 
ADD COLUMN source_image_hash TEXT DEFAULT NULL;

-- Track vibe branding sources
COMMENT ON COLUMN brand_kits.extracted_from IS 
  'Source of brand kit: NULL (manual), "vibe_branding", "asset_extraction"';
```

### 5.3 New Table: vibe_analysis_cache

```sql
-- Migration: 023_vibe_analysis_cache.sql
CREATE TABLE vibe_analysis_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_hash TEXT UNIQUE NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_vibe_cache_hash ON vibe_analysis_cache(image_hash);
CREATE INDEX idx_vibe_cache_expires ON vibe_analysis_cache(expires_at);

-- Auto-cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_vibe_cache() RETURNS void AS $$
BEGIN
  DELETE FROM vibe_analysis_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---


---

# PART 2: THE AURA LAB

## 6. EXECUTIVE SUMMARY

### 6.1 Problem Statement
After users create assets, they leave. There's no "playground" that keeps them experimenting, sharing, and coming back. Current generation flow is transactional, not experiential.

### 6.2 Solution
**The Aura Lab** is a visual laboratory where streamers experiment with their brand identity. Users upload their PFP/logo once ("Test Subject"), then drag elements from a "Periodic Table" onto it to create fused variations.

Key mechanics:
- **Fusion Reactor** - Drag element onto subject → instant transformation
- **Rarity System** - AI-scored results (Common/Rare/Mythic)
- **Discovery System** - "First to discover" badges for new combinations
- **Squad Fusion** - Fuse two streamers together (viral referral vector)

### 6.3 Value Proposition
- **Marketing Hook:** "The Laboratory Where Streamers Experiment on Their Brand"
- **User Value:** 30-45 min play sessions, collectible results
- **Virality:** Squad Fusion requires friend signup to complete

---

## 7. FUNCTIONAL REQUIREMENTS

### 7.1 Core User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ENTRY POINT                                                    │
│  /dashboard/aura-lab (dedicated page)                          │
│  Sidebar: "The Aura Lab" with beaker/flask icon                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  THE FUSION INTERFACE                                           │
│                                                                 │
│  ┌─────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ TEST SUBJECT│    │  FUSION CORE    │    │ ELEMENT GRID   │  │
│  │             │    │                 │    │                │  │
│  │  [Upload]   │───▶│   ◉ ◉ ◉        │◀───│ 🔥 🧊 🤡 🗿   │  │
│  │  [Lock In]  │    │  (Spinning)     │    │ 🤖 🧟 👑 👻   │  │
│  │             │    │                 │    │ 🎮 💀 🌈 ⚡   │  │
│  │  Stays      │    │   [FUSE!]       │    │                │  │
│  │  locked     │    │                 │    │ Drag onto core │  │
│  └─────────────┘    └─────────────────┘    └────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  FUSION ANIMATION (3-5 seconds)                                 │
│  - Core spins up (CSS animation)                               │
│  - Sound: Metallic clank → energy buildup → burst              │
│  - Particle effects around core                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  THE REVEAL                                                     │
│  - Particle burst                                              │
│  - Result card slides in with holographic effect               │
│  - Rarity tier announced:                                      │
│    • COMMON (grey border)                                      │
│    • RARE (blue glow) - "Nice pull!"                          │
│    • MYTHIC (gold animated border) - "CRITICAL SUCCESS!"      │
│  - If first discovery: "NEW RECIPE DISCOVERED" badge          │
│  - Buttons: [Keep] [Trash] [Share]                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  INVENTORY / GALLERY                                            │
│  - Grid of all kept fusions                                    │
│  - Filter by rarity, element                                   │
│  - Download as Twitch emote (112/56/28px)                     │
│  - "Pokedex" completion percentage                            │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Element System

#### Starter Elements (Free, Always Available)
| ID | Icon | Name | Transformation |
|----|------|------|----------------|
| `fire` | 🔥 | Fire | Blue flames, glowing eyes |
| `ice` | 🧊 | Ice | Frozen, crystalline, frost |
| `clown` | 🤡 | Clown | Rainbow hair, red nose, makeup |
| `gigachad` | 🗿 | GigaChad | Chiseled jaw, sigma energy |
| `mecha` | 🤖 | Mecha | Robotic armor, LED eyes |
| `zombie` | 🧟 | Zombie | Green skin, rotting, undead |
| `gold` | 👑 | Gold | Solid gold statue, luxury |
| `ghost` | 👻 | Ghost | Translucent, ethereal, spooky |
| `pixel` | 🎮 | Pixel | 16-bit retro game style |
| `skull` | 💀 | Skull | Skeletal, Day of the Dead |
| `rainbow` | 🌈 | Rainbow | Pride colors, sparkles |
| `electric` | ⚡ | Electric | Lightning, neon, energy |

#### Premium Elements (Pro/Studio or Unlock via Share)
| ID | Icon | Name | Transformation |
|----|------|------|----------------|
| `cyberpunk` | 🌃 | Cyberpunk | Neon city, chrome, implants |
| `8bit` | 👾 | 8-Bit | NES-style pixel art |
| `noir` | 🎬 | Noir | Black & white, film grain |
| `vaporwave` | 🌴 | Vaporwave | Pink/cyan, glitch, aesthetic |
| `anime` | 🎌 | Anime | Cel-shaded, big eyes |
| `horror` | 🩸 | Horror | Gore, creepy, unsettling |
| `steampunk` | ⚙️ | Steampunk | Brass, gears, Victorian |
| `hologram` | 💠 | Hologram | Translucent blue, scan lines |

### 7.3 Rarity System

Rarity is determined by Gemini scoring the output:

```typescript
interface RarityScores {
  visual_impact: number;    // 1-10: Bold, eye-catching
  creativity: number;       // 1-10: Unexpected combination
  meme_potential: number;   // 1-10: Would people share this?
  technical_quality: number; // 1-10: Clean lines, composition
}

// Rarity calculation
const total = impact + creativity + meme + quality; // Max 40
if (total >= 36) return 'mythic';   // 90%+ average
if (total >= 28) return 'rare';     // 70%+ average
return 'common';
```

### 7.4 Discovery System

Track "first to discover" for element combinations:

```sql
-- When user fuses Fire + their specific brand vibe
-- Check if this exact combination exists
-- If not, they get "NEW RECIPE DISCOVERED" badge
```

### 7.5 Squad Fusion (Viral Feature)

```
┌─────────────────────────────────────────────────────────────────┐
│  SQUAD FUSION MODE                                              │
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐                       │
│  │  YOUR PFP   │   ⚡    │ FRIEND PFP  │                       │
│  │             │  FUSE   │             │                       │
│  │  [Locked]   │ ──────▶ │  [Invite]   │                       │
│  └─────────────┘         └─────────────┘                       │
│                                                                 │
│  Output: 50/50 hybrid of both streamers                        │
│  Share: "Yo @StreamerB, look what happens if we fuse"         │
│  Viral: Friend must sign up to see/complete the fusion        │
└─────────────────────────────────────────────────────────────────┘
```

### 7.6 Tier Gating

| Tier | Daily Fusions | Elements | Squad Fusion |
|------|---------------|----------|--------------|
| Free | 5/day | 12 starter | ❌ |
| Pro | 20/day | All 20 | ✅ |
| Studio | Unlimited | All 20 | ✅ |

---

## 8. NON-FUNCTIONAL REQUIREMENTS

### 8.1 Performance
- Fusion must complete in < 10 seconds
- Test subject image cached for session
- Results gallery lazy-loaded

### 8.2 Sound Design (Critical for UX)
| Event | Sound |
|-------|-------|
| Element drag start | Soft "pick up" |
| Element drop on core | Heavy metallic clank |
| Fusion processing | Energy buildup hum |
| Result reveal | Particle burst whoosh |
| Mythic result | Epic fanfare |
| First discovery | Achievement chime |

### 8.3 Animations
- Core spin: CSS keyframes, 2s loop
- Particle effects: Canvas or CSS particles
- Card reveal: Slide up + scale + glow
- Holographic effect: CSS gradient animation on rare/mythic

---

## 9. API SPECIFICATION

### 9.1 Endpoints

#### POST /api/v1/aura-lab/set-subject
Lock in the test subject for the session.

**Request:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}

file: binary (required)
```

**Response (200):**
```json
{
  "subject_id": "uuid",
  "image_url": "https://cdn.../subject.png",
  "expires_at": "2025-12-28T12:00:00Z"
}
```

#### POST /api/v1/aura-lab/fuse
Perform a fusion.

**Request:**
```json
{
  "subject_id": "uuid",
  "element_id": "fire"
}
```

**Response (200):**
```json
{
  "fusion_id": "uuid",
  "image_url": "https://cdn.../fusion.png",
  "rarity": "rare",
  "scores": {
    "visual_impact": 8,
    "creativity": 7,
    "meme_potential": 8,
    "technical_quality": 7
  },
  "is_first_discovery": true,
  "recipe_id": "uuid"
}
```

#### POST /api/v1/aura-lab/keep
Save a fusion to inventory.

**Request:**
```json
{
  "fusion_id": "uuid"
}
```

#### GET /api/v1/aura-lab/inventory
Get user's saved fusions.

**Response:**
```json
{
  "fusions": [
    {
      "id": "uuid",
      "image_url": "...",
      "element_id": "fire",
      "rarity": "mythic",
      "created_at": "..."
    }
  ],
  "total": 15,
  "mythic_count": 2,
  "rare_count": 5,
  "common_count": 8
}
```

#### POST /api/v1/aura-lab/squad/invite
Generate squad fusion invite.

**Request:**
```json
{
  "subject_id": "uuid"
}
```

**Response:**
```json
{
  "invite_code": "abc123",
  "invite_url": "https://aurastream.shop/squad/abc123",
  "expires_at": "2025-12-29T12:00:00Z"
}
```

#### POST /api/v1/aura-lab/squad/accept
Accept squad fusion invite (requires auth).

**Request:**
```json
{
  "invite_code": "abc123",
  "my_subject_id": "uuid"
}
```

**Response:**
```json
{
  "fusion_id": "uuid",
  "image_url": "...",
  "rarity": "rare",
  "partner_display_name": "StreamerA"
}
```

#### GET /api/v1/aura-lab/usage
Get daily fusion usage.

**Response:**
```json
{
  "used_today": 3,
  "limit": 5,
  "remaining": 2,
  "resets_at": "2025-12-29T00:00:00Z"
}
```

---

## 10. DATABASE CHANGES

### 10.1 Migration: Aura Lab Tables

```sql
-- Migration: 024_aura_lab.sql

-- User's locked test subjects (session-based)
CREATE TABLE aura_lab_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

CREATE INDEX idx_aura_subjects_user ON aura_lab_subjects(user_id);
CREATE INDEX idx_aura_subjects_expires ON aura_lab_subjects(expires_at);

-- Fusion results
CREATE TABLE aura_lab_fusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES aura_lab_subjects(id) ON DELETE CASCADE,
  element_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'mythic')),
  scores JSONB NOT NULL,
  is_kept BOOLEAN DEFAULT FALSE,
  recipe_id UUID REFERENCES aura_lab_recipes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aura_fusions_user ON aura_lab_fusions(user_id);
CREATE INDEX idx_aura_fusions_kept ON aura_lab_fusions(user_id, is_kept) WHERE is_kept = TRUE;

-- Recipe discovery tracking
CREATE TABLE aura_lab_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id TEXT NOT NULL,
  first_user_id UUID REFERENCES users(id),
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  times_used INTEGER DEFAULT 1,
  UNIQUE(element_id)
);

-- Squad fusion invites
CREATE TABLE aura_lab_squad_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inviter_subject_id UUID NOT NULL REFERENCES aura_lab_subjects(id),
  accepter_id UUID REFERENCES users(id),
  accepter_subject_id UUID REFERENCES aura_lab_subjects(id),
  fusion_id UUID REFERENCES aura_lab_fusions(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

CREATE INDEX idx_squad_invites_code ON aura_lab_squad_invites(invite_code);

-- Daily usage tracking
ALTER TABLE users ADD COLUMN aura_lab_fusions_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN aura_lab_last_fusion_date DATE;

-- Function to check/reset daily usage
CREATE OR REPLACE FUNCTION check_aura_lab_usage(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_date DATE;
  v_count INTEGER;
BEGIN
  SELECT aura_lab_last_fusion_date, aura_lab_fusions_today
  INTO v_last_date, v_count
  FROM users WHERE id = p_user_id;
  
  -- Reset if new day
  IF v_last_date IS NULL OR v_last_date < v_today THEN
    UPDATE users SET 
      aura_lab_fusions_today = 0,
      aura_lab_last_fusion_date = v_today
    WHERE id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage
CREATE OR REPLACE FUNCTION increment_aura_lab_usage(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE users SET 
    aura_lab_fusions_today = aura_lab_fusions_today + 1,
    aura_lab_last_fusion_date = CURRENT_DATE
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. PROMPT ENGINEERING

### 11.1 Fusion Prompt

```yaml
# backend/prompts/aura-lab/fusion_v1.yaml

name: aura_lab_fusion
version: "1.0"
model: gemini-1.5-pro
temperature: 0.7

prompt: |
  You are a visual alchemist specializing in identity transformation.
  
  INPUT A (Base Identity): [Attached Image]
  INPUT B (Element): {element_name} - {element_description}
  
  TASK:
  Transform INPUT A using the essence of INPUT B to create a "Twitch Emote" style sticker.
  
  CRITICAL RULES:
  
  1. IDENTITY PRESERVATION (Non-negotiable):
     - The facial features, hair shape, and key accessories of INPUT A must be clearly recognizable
     - If Input A is a person, the result must look like that person
     - If Input A is a logo, preserve the overall silhouette and key symbols
     - The result should pass the "squint test" - recognizable at 28px
  
  2. MATERIAL TRANSFORMATION:
     - The texture, color palette, and physical substance must be 100% derived from INPUT B
     - Examples:
       - If B is "Gold", make A look like a solid gold statue
       - If B is "Zombie", make A have green skin and rotting flesh, but same face
       - If B is "Fire", make A appear to be made of blue flames with glowing eyes
       - If B is "Pixel", render A in 16-bit retro game style
  
  3. STYLE REQUIREMENTS:
     - Thick white sticker outline (3-4px)
     - Vector illustration style
     - High contrast for chat readability
     - Expressive, exaggerated features
     - Clean edges, no fine details that disappear at small sizes
  
  4. OUTPUT:
     - Single square image
     - Transparent or solid green background (for easy removal)
     - Centered composition
     - No text unless specified

elements:
  fire:
    name: "Fire"
    description: "Blue flames, glowing ember eyes, heat distortion, phoenix energy"
  ice:
    name: "Ice"
    description: "Frozen solid, crystalline structure, frost particles, cold blue tones"
  clown:
    name: "Clown"
    description: "Rainbow afro hair, red nose, white face paint, colorful makeup, circus energy"
  gigachad:
    name: "GigaChad"
    description: "Chiseled jawline, intense gaze, sigma male energy, black and white aesthetic"
  mecha:
    name: "Mecha"
    description: "Robotic armor plating, LED eyes, chrome finish, transformer aesthetic"
  zombie:
    name: "Zombie"
    description: "Green rotting skin, exposed bones, undead eyes, horror movie style"
  gold:
    name: "Gold"
    description: "Solid 24k gold statue, luxury shine, trophy aesthetic, metallic reflections"
  ghost:
    name: "Ghost"
    description: "Translucent ethereal form, floating, spooky glow, paranormal energy"
  pixel:
    name: "Pixel"
    description: "16-bit retro game style, limited color palette, NES/SNES aesthetic"
  skull:
    name: "Skull"
    description: "Skeletal face, Day of the Dead decorations, bone white, gothic"
  rainbow:
    name: "Rainbow"
    description: "Pride flag colors, sparkles, glitter, celebration energy"
  electric:
    name: "Electric"
    description: "Lightning bolts, neon glow, energy crackling, storm power"
  cyberpunk:
    name: "Cyberpunk"
    description: "Neon city reflections, chrome implants, rain, Blade Runner aesthetic"
  8bit:
    name: "8-Bit"
    description: "NES-style pixel art, 8-color palette, chunky pixels, retro gaming"
  noir:
    name: "Noir"
    description: "Black and white, film grain, dramatic shadows, detective movie style"
  vaporwave:
    name: "Vaporwave"
    description: "Pink and cyan, glitch effects, 80s aesthetic, palm trees, sunset"
  anime:
    name: "Anime"
    description: "Cel-shaded, big expressive eyes, speed lines, Japanese animation style"
  horror:
    name: "Horror"
    description: "Gore, blood splatter, creepy smile, unsettling, nightmare fuel"
  steampunk:
    name: "Steampunk"
    description: "Brass gears, Victorian goggles, steam pipes, clockwork mechanisms"
  hologram:
    name: "Hologram"
    description: "Translucent blue projection, scan lines, futuristic, sci-fi"
```

### 11.2 Rarity Scoring Prompt

```yaml
# backend/prompts/aura-lab/rarity_v1.yaml

name: aura_lab_rarity
version: "1.0"
model: gemini-1.5-pro
temperature: 0.2

prompt: |
  You are an art critic evaluating a generated emote/sticker.
  
  Rate this image on a scale of 1-10 for each category:
  
  1. VISUAL IMPACT: How bold and eye-catching is it? Does it pop?
  2. CREATIVITY: How unexpected or clever is the combination?
  3. MEME POTENTIAL: Would people share this? Is it funny/cool/cursed?
  4. TECHNICAL QUALITY: Are the lines clean? Is the composition good?
  
  Return ONLY valid JSON:
  {
    "visual_impact": X,
    "creativity": X,
    "meme_potential": X,
    "technical_quality": X,
    "commentary": "One sentence reaction"
  }
  
  Be honest but generous. Most results should score 5-7 average.
  Reserve 9-10 for truly exceptional outputs.
```

---

*End of Part 2: The Aura Lab Requirements*
