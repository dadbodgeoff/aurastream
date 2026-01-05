# 🎨 CANVAS STUDIO MASTER SCHEMA
## Complete Implementation Guide for "3 Clicks to Pro" Experience

**Version:** 1.0.0  
**Last Updated:** January 4, 2026  
**Goal:** Make graphic design so easy a 7-year-old can create professional assets in under 3 minutes

---

## TABLE OF CONTENTS

1. [Media Asset Types Inventory](#1-media-asset-types-inventory)
2. [Output Canvas Types](#2-output-canvas-types)
3. [Template Library](#3-template-library)
4. [Smart Placement Rules](#4-smart-placement-rules)
5. [Implementation Phases](#5-implementation-phases)
6. [Technical Architecture](#6-technical-architecture)
7. [File Structure](#7-file-structure)
8. [Database Schema](#8-database-schema)
9. [API Endpoints](#9-api-endpoints)
10. [Component Specifications](#10-component-specifications)

---

## 1. MEDIA ASSET TYPES INVENTORY

### User-Uploadable Assets (14 types)

| Type | Icon | Purpose | Auto BG Remove | Typical Use in Canvas |
|------|------|---------|----------------|----------------------|
| `logo` | 🎨 | Brand logos | ✅ Yes | Corner placement, watermarks |
| `face` | 😊 | User faces | ✅ Yes | Center focus, thumbnails |
| `character` | 🧑‍🎤 | Avatars/personas | ✅ Yes | Main subject, mascots |
| `game_skin` | 🎮 | Game characters | ✅ Yes | Featured element |
| `object` | 📦 | Props/items | ✅ Yes | Decorative, supporting |
| `background` | 🖼️ | Custom backgrounds | ❌ No | Full canvas fill |
| `reference` | 📐 | Style references | ❌ No | Not placed (style guide) |
| `overlay` | ✨ | Stream overlays | ❌ No | Full canvas layer |
| `emote` | 💬 | Channel emotes | ✅ Yes | Decorative, reactions |
| `badge` | 🏅 | Sub badges | ✅ Yes | Small decorative |
| `panel` | 📋 | Channel panels | ❌ No | Full panel fill |
| `alert` | 🔔 | Alert images | ❌ No | Centered, animated |
| `facecam_frame` | 📹 | Facecam borders | ❌ No | Frame overlay |
| `stinger` | 🎬 | Transitions | ❌ No | Full screen |

### Asset Categories for Templates

```typescript
// Groupings for template slot compatibility
const ASSET_CATEGORIES = {
  // Primary subjects - main focus of composition
  subjects: ['face', 'character', 'game_skin'],
  
  // Branding elements
  branding: ['logo', 'badge', 'emote'],
  
  // Supporting elements
  props: ['object', 'emote', 'badge'],
  
  // Full-canvas elements
  backgrounds: ['background', 'overlay'],
  
  // Decorative
  decorative: ['emote', 'badge', 'object'],
};
```

---

## 2. OUTPUT CANVAS TYPES

### Platform-Specific Dimensions

#### YouTube (3 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `youtube_thumbnail` | 1280×720 | 16:9 | Video thumbnails |
| `youtube_banner` | 2560×1440 | 16:9 | Channel art |
| `youtube_profile` | 800×800 | 1:1 | Profile picture |

#### Twitch (7 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `twitch_emote` | 112×112 | 1:1 | Channel emotes |
| `twitch_badge` | 72×72 | 1:1 | Sub badges |
| `twitch_panel` | 320×160 | 2:1 | Info panels |
| `twitch_banner` | 1200×480 | 2.5:1 | Profile banner |
| `twitch_offline` | 1920×1080 | 16:9 | Offline screen |
| `twitch_overlay` | 1920×1080 | 16:9 | Stream overlay |
| `twitch_schedule` | 1200×480 | 2.5:1 | Schedule graphic |

#### TikTok (3 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `tiktok_emote` | 300×300 | 1:1 | TikTok emotes |
| `tiktok_story` | 1080×1920 | 9:16 | Story graphics |
| `tiktok_profile` | 200×200 | 1:1 | Profile picture |

#### Instagram (4 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `instagram_story` | 1080×1920 | 9:16 | Stories |
| `instagram_reel` | 1080×1920 | 9:16 | Reels cover |
| `instagram_post` | 1080×1080 | 1:1 | Feed posts |
| `instagram_profile` | 320×320 | 1:1 | Profile picture |

#### Discord (3 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `discord_emoji` | 128×128 | 1:1 | Server emojis |
| `discord_banner` | 960×540 | 16:9 | Server banner |
| `discord_icon` | 512×512 | 1:1 | Server icon |

#### General (4 types)
| Type | Dimensions | Aspect | Use Case |
|------|------------|--------|----------|
| `profile_picture` | 512×512 | 1:1 | Universal profile |
| `clip_cover` | 1080×1080 | 1:1 | Clip thumbnails |
| `story_graphic` | 1080×1920 | 9:16 | Generic story |
| `custom` | User-defined | Any | Custom dimensions |

---

## 3. TEMPLATE LIBRARY

### Template Structure

```typescript
interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  targetCanvas: string[];           // Which canvas types this works for
  thumbnail: string;                // Preview image URL
  isPremium: boolean;               // Pro/Studio only?
  
  // Slot definitions
  slots: TemplateSlot[];
  
  // Pre-configured sketch elements (shapes, text placeholders)
  sketchElements: AnySketchElement[];
  
  // Style presets
  colorScheme: 'brand' | 'dark' | 'light' | 'vibrant';
  
  // Tags for search
  tags: string[];
}

interface TemplateSlot {
  id: string;
  label: string;                    // "Main Subject", "Logo", etc.
  acceptedTypes: MediaAssetType[];  // What can go here
  required: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  
  // Smart defaults
  defaultOpacity: number;
  autoFit: 'contain' | 'cover' | 'fill';
}
```


### Template Categories & Counts

#### YouTube Thumbnails (12 templates)
| Template | Slots | Best For |
|----------|-------|----------|
| `yt_reaction` | Face (center), Logo (corner), Text (bottom) | Reaction videos |
| `yt_gaming` | Character (left), Game skin (right), Text (top) | Gaming content |
| `yt_tutorial` | Face (left), Object (right), Text (center) | How-to videos |
| `yt_versus` | Face×2 (left/right), VS text (center) | Comparison videos |
| `yt_listicle` | Number (left), Object (center), Text (right) | Top 10 lists |
| `yt_drama` | Face (center-large), Emoji (corners), Text (bottom) | Drama/tea content |
| `yt_unboxing` | Object (center), Face (corner), Text (top) | Unboxing videos |
| `yt_collab` | Face×2 (side-by-side), Logos (bottom) | Collaborations |
| `yt_announcement` | Logo (center), Text (large), Decorative (corners) | Announcements |
| `yt_minimal` | Face (center), Text (bottom) | Clean/minimal style |
| `yt_podcast` | Face×2 (left/right), Logo (center-bottom) | Podcast episodes |
| `yt_highlight` | Character (center), Emotes (scattered), Text (top) | Highlight reels |

#### Twitch Graphics (15 templates)
| Template | Slots | Best For |
|----------|-------|----------|
| `tw_offline_gaming` | Character (center), Logo (top), Schedule (bottom) | Gaming channels |
| `tw_offline_just_chatting` | Face (center), Social links (bottom) | Just Chatting |
| `tw_offline_minimal` | Logo (center), Text (bottom) | Clean/minimal |
| `tw_panel_about` | Face (left), Text area (right) | About me panel |
| `tw_panel_schedule` | Calendar icon, Days/times layout | Schedule panel |
| `tw_panel_social` | Social icons grid | Social links |
| `tw_panel_rules` | Numbered list layout | Chat rules |
| `tw_panel_donate` | Heart icon, Text | Donation panel |
| `tw_banner_gaming` | Character (left), Logo (center), Game art (right) | Gaming banner |
| `tw_banner_variety` | Face (center), Decorative (sides) | Variety streamer |
| `tw_emote_pog` | Face (full), Expression overlay | Hype emote |
| `tw_emote_sad` | Face (full), Tear effect | Sad emote |
| `tw_emote_love` | Face (full), Hearts | Love emote |
| `tw_badge_tier1` | Logo (center), Border style 1 | Tier 1 badge |
| `tw_badge_tier2` | Logo (center), Border style 2 | Tier 2 badge |

#### Story Graphics (8 templates)
| Template | Slots | Best For |
|----------|-------|----------|
| `story_announcement` | Logo (top), Text (center), CTA (bottom) | Announcements |
| `story_going_live` | Face (center), "LIVE" badge, Platform icons | Going live alerts |
| `story_highlight` | Character (center), Decorative frame | Stream highlights |
| `story_question` | Text (top), Answer area (center) | Q&A stories |
| `story_poll` | Question (top), Options (center) | Polls |
| `story_countdown` | Number (center-large), Event text (bottom) | Countdowns |
| `story_collab` | Face×2 (top), Details (bottom) | Collab announcements |
| `story_milestone` | Achievement badge, Number, Celebration | Milestones |

#### Profile Pictures (6 templates)
| Template | Slots | Best For |
|----------|-------|----------|
| `pfp_face_circle` | Face (center), Circular crop | Face-focused |
| `pfp_character` | Character (center), Background | Avatar style |
| `pfp_logo` | Logo (center), Background | Brand-focused |
| `pfp_gaming` | Character + game elements | Gaming profiles |
| `pfp_minimal` | Simple icon/logo | Minimal style |
| `pfp_gradient` | Face/logo on gradient | Modern style |

#### Emotes (10 templates)
| Template | Slots | Best For |
|----------|-------|----------|
| `emote_pog` | Face, Mouth open wide | Hype/excitement |
| `emote_sadge` | Face, Sad expression | Sadness |
| `emote_love` | Face, Heart eyes | Love/appreciation |
| `emote_rage` | Face, Angry expression | Anger/frustration |
| `emote_lul` | Face, Laughing | Humor |
| `emote_think` | Face, Thinking pose | Contemplation |
| `emote_wave` | Character, Waving hand | Greetings |
| `emote_gg` | Text "GG", Decorative | Good game |
| `emote_hype` | Character, Action pose | Excitement |
| `emote_cozy` | Character, Blanket/comfort | Cozy vibes |

---

## 4. SMART PLACEMENT RULES

### Auto-Layout Engine Rules

```typescript
interface PlacementRule {
  assetType: MediaAssetType;
  canvasType: string;
  defaultPosition: { x: number; y: number };
  defaultSize: { width: number; height: number };
  zIndex: number;
  constraints: PlacementConstraints;
}

interface PlacementConstraints {
  minSize: number;          // Minimum % of canvas
  maxSize: number;          // Maximum % of canvas
  safeZone: {               // Keep away from edges
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  snapToGrid: boolean;
  snapToCenter: boolean;
  snapToThirds: boolean;    // Rule of thirds
}
```

### Default Placement by Asset Type

| Asset Type | Default Position | Default Size | Z-Index | Notes |
|------------|-----------------|--------------|---------|-------|
| `face` | Center (50, 45) | 40-60% | 10 | Slightly above center |
| `character` | Center-left (35, 50) | 50-70% | 10 | Room for text on right |
| `logo` | Top-right (85, 10) | 10-15% | 20 | Watermark position |
| `background` | Center (50, 50) | 100% | 1 | Always bottom layer |
| `object` | Center-right (65, 50) | 20-30% | 8 | Supporting element |
| `emote` | Bottom-right (80, 80) | 8-12% | 15 | Decorative |
| `badge` | Top-left (15, 10) | 5-8% | 18 | Small accent |
| `game_skin` | Center (50, 50) | 45-65% | 10 | Main focus |
| `overlay` | Center (50, 50) | 100% | 25 | Top layer |

### Collision Detection & Auto-Arrange

```typescript
// When assets overlap, auto-arrange based on priority
const ASSET_PRIORITY = {
  face: 100,        // Highest - never obscure faces
  character: 90,
  game_skin: 85,
  logo: 70,         // Important but can be smaller
  object: 50,
  emote: 30,
  badge: 20,
  background: 1,    // Lowest - always behind
};

// Auto-arrange algorithm
function autoArrange(assets: PlacedAsset[]): PlacedAsset[] {
  // 1. Sort by priority
  // 2. Place highest priority first at optimal position
  // 3. Detect collisions with placed assets
  // 4. Nudge lower priority assets to avoid overlap
  // 5. Ensure all assets remain in safe zone
  return arrangedAssets;
}
```


---

## 5. IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
**Goal:** Template system + Easy Mode toggle

#### Tasks:
- [ ] Create template data structure and types
- [ ] Build 10 starter templates (most popular use cases)
- [ ] Implement TemplateSelector component
- [ ] Add Easy/Pro mode toggle to header
- [ ] Create QuickStartWizard (3-step flow)
- [ ] Add template preview on hover

#### Deliverables:
```
canvas-studio/
├── templates/
│   ├── types.ts
│   ├── data/
│   │   ├── youtube-thumbnails.ts
│   │   ├── twitch-graphics.ts
│   │   └── index.ts
│   ├── TemplateSelector.tsx
│   ├── TemplatePreview.tsx
│   └── useTemplates.ts
├── modes/
│   ├── EasyMode.tsx
│   └── ProMode.tsx
└── components/
    └── QuickStartWizard.tsx
```

### Phase 2: Smart Tools (Week 3-4)
**Goal:** Auto-layout + Magic toolbar

#### Tasks:
- [ ] Implement auto-layout engine
- [ ] Create collision detection system
- [ ] Build MagicToolbar component
- [ ] Add "Auto Balance" feature
- [ ] Add "Auto Color" (brand kit matching)
- [ ] Implement smart suggestions panel

#### Deliverables:
```
canvas-studio/
├── magic/
│   ├── AutoLayout.ts
│   ├── CollisionDetection.ts
│   ├── AutoColor.ts
│   └── Suggestions.ts
├── components/
│   ├── MagicToolbar.tsx
│   └── SuggestionsPanel.tsx
└── hooks/
    ├── useAutoLayout.ts
    └── useSuggestions.ts
```

### Phase 3: Guided Experience (Week 5-6)
**Goal:** Drop zones + Visual guides

#### Tasks:
- [ ] Create visual drop zone system
- [ ] Implement snap-to guides
- [ ] Add "slot" highlighting when dragging
- [ ] Build guided tour for first-time users
- [ ] Add contextual tooltips
- [ ] Implement keyboard shortcuts overlay

#### Deliverables:
```
canvas-studio/
├── guides/
│   ├── DropZones.tsx
│   ├── SnapGuides.tsx
│   ├── SlotHighlight.tsx
│   └── GuidedTour.tsx
├── components/
│   └── KeyboardShortcuts.tsx
└── hooks/
    └── useGuidedMode.ts
```

### Phase 4: Speed Features (Week 7-8)
**Goal:** Quick actions + Instant preview

#### Tasks:
- [ ] Build QuickActionsBar (floating)
- [ ] Implement instant preview panel
- [ ] Add one-click export variants
- [ ] Create export presets per platform
- [ ] Add "Copy to clipboard" feature
- [ ] Implement share link generation

#### Deliverables:
```
canvas-studio/
├── components/
│   ├── QuickActionsBar.tsx
│   ├── InstantPreview.tsx
│   └── ExportPanel.tsx
├── export/
│   ├── ExportPresets.ts
│   ├── PlatformExport.ts
│   └── ShareLink.ts
└── hooks/
    └── useExport.ts
```

### Phase 5: Delight & Polish (Week 9-10)
**Goal:** Celebrations + Undo system + Final polish

#### Tasks:
- [ ] Add celebration animations (confetti, badges)
- [ ] Implement visual undo/redo with thumbnails
- [ ] Add progress tracking ("5 designs created!")
- [ ] Create achievement system
- [ ] Add sound effects (optional)
- [ ] Final accessibility audit
- [ ] Performance optimization

#### Deliverables:
```
canvas-studio/
├── delight/
│   ├── Celebrations.tsx
│   ├── Achievements.ts
│   └── SoundEffects.ts
├── history/
│   ├── UndoRedo.tsx
│   ├── HistoryThumbnails.tsx
│   └── useHistory.ts
└── components/
    └── ProgressBadges.tsx
```

---

## 6. TECHNICAL ARCHITECTURE

### State Management

```typescript
// Main canvas studio state (in useCanvasStudio.ts)
interface CanvasStudioState {
  // Mode
  mode: 'easy' | 'pro';
  editorMode: 'placement' | 'sketch';
  
  // Template
  activeTemplate: CanvasTemplate | null;
  templateSlots: Map<string, PlacedAsset>;
  
  // Assets
  assets: MediaAsset[];
  placements: AssetPlacement[];
  
  // Sketch
  sketchElements: AnySketchElement[];
  
  // Selection
  selectedId: string | null;
  
  // History
  history: HistoryState[];
  historyIndex: number;
  
  // UI
  showSuggestions: boolean;
  showGuides: boolean;
  showPreview: boolean;
}

// History entry for undo/redo
interface HistoryState {
  timestamp: number;
  thumbnail: string;        // Base64 mini preview
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
  label: string;            // "Moved logo", "Added text", etc.
}
```

### Event Flow

```
User Action
    ↓
┌─────────────────────────────────────────┐
│           useCanvasStudio               │
│  ┌─────────────────────────────────┐    │
│  │  State Update + History Push    │    │
│  └─────────────────────────────────┘    │
│              ↓                          │
│  ┌─────────────────────────────────┐    │
│  │  Auto-Layout Check              │    │
│  │  (collision, bounds, snap)      │    │
│  └─────────────────────────────────┘    │
│              ↓                          │
│  ┌─────────────────────────────────┐    │
│  │  Suggestions Update             │    │
│  │  (AI tips based on state)       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
    ↓
UI Re-render
    ↓
Preview Update
```

### Component Hierarchy

```
CanvasStudioModal
├── CanvasStudioHeader
│   ├── ModeToggle (Easy/Pro)
│   └── EditorModeToggle (Placement/Sketch)
├── MainContent
│   ├── LeftSidebar (Pro mode only)
│   │   ├── SketchToolbar
│   │   └── LayersPanel
│   ├── CanvasArea
│   │   ├── DropZones (Easy mode)
│   │   ├── PlacementCanvas / SketchCanvas
│   │   ├── SnapGuides
│   │   └── InstantPreview
│   └── RightSidebar
│       ├── TemplateSelector (if no template)
│       ├── ControlsPanel
│       └── SuggestionsPanel
├── QuickActionsBar (floating)
├── CanvasStudioFooter
└── SubModals
    ├── AssetPickerModal
    ├── ExportPanel
    └── KeyboardShortcuts
```


---

## 7. FILE STRUCTURE

### Complete Directory Structure

```
tsx/apps/web/src/components/media-library/canvas-studio/
├── index.ts                          # Re-exports
├── CanvasStudioModal.tsx             # Main orchestrator (~150 lines)
├── useCanvasStudio.ts                # Core state management (~400 lines)
├── types.ts                          # All type definitions
├── utils.ts                          # Conversion utilities
├── icons.tsx                         # Icon components
├── constants.ts                      # Magic numbers, defaults
│
├── components/                       # UI Components
│   ├── index.ts
│   ├── CanvasStudioHeader.tsx
│   ├── CanvasStudioFooter.tsx
│   ├── CanvasArea.tsx
│   ├── ControlsPanel.tsx
│   ├── AssetPickerModal.tsx
│   ├── QuickActionsBar.tsx
│   ├── InstantPreview.tsx
│   ├── ExportPanel.tsx
│   └── KeyboardShortcuts.tsx
│
├── modes/                            # Easy vs Pro mode
│   ├── index.ts
│   ├── EasyMode.tsx                  # Simplified UI wrapper
│   ├── ProMode.tsx                   # Full-featured UI
│   └── ModeToggle.tsx
│
├── templates/                        # Template system
│   ├── index.ts
│   ├── types.ts                      # Template interfaces
│   ├── TemplateSelector.tsx          # Grid picker
│   ├── TemplatePreview.tsx           # Hover preview
│   ├── TemplateEngine.ts             # Apply template logic
│   ├── useTemplates.ts               # Template hooks
│   └── data/                         # Template definitions
│       ├── index.ts
│       ├── youtube-thumbnails.ts
│       ├── twitch-graphics.ts
│       ├── story-graphics.ts
│       ├── profile-pictures.ts
│       └── emotes.ts
│
├── magic/                            # Smart features
│   ├── index.ts
│   ├── AutoLayout.ts                 # Smart positioning
│   ├── CollisionDetection.ts         # Overlap handling
│   ├── AutoColor.ts                  # Brand color matching
│   ├── Suggestions.ts                # AI suggestions engine
│   └── SmartDefaults.ts              # Context-aware defaults
│
├── guides/                           # Visual guides
│   ├── index.ts
│   ├── DropZones.tsx                 # Visual drop targets
│   ├── SnapGuides.tsx                # Alignment guides
│   ├── SlotHighlight.tsx             # Template slot highlighting
│   ├── SafeZone.tsx                  # Edge safety indicators
│   └── GuidedTour.tsx                # First-time user tour
│
├── history/                          # Undo/Redo system
│   ├── index.ts
│   ├── useHistory.ts                 # History management hook
│   ├── HistoryPanel.tsx              # Visual history browser
│   └── HistoryThumbnail.tsx          # Mini preview generator
│
├── export/                           # Export system
│   ├── index.ts
│   ├── ExportPresets.ts              # Platform-specific presets
│   ├── PlatformExport.ts             # Multi-format export
│   ├── ShareLink.ts                  # Shareable link generation
│   └── ClipboardExport.ts            # Copy to clipboard
│
├── delight/                          # Celebration & engagement
│   ├── index.ts
│   ├── Celebrations.tsx              # Confetti, animations
│   ├── Achievements.ts               # Progress tracking
│   ├── SoundEffects.ts               # Optional audio feedback
│   └── ProgressBadges.tsx            # Visual progress indicators
│
└── hooks/                            # Shared hooks
    ├── index.ts
    ├── useAutoLayout.ts
    ├── useSuggestions.ts
    ├── useGuidedMode.ts
    ├── useExport.ts
    └── useKeyboardShortcuts.ts
```

---

## 8. DATABASE SCHEMA

### New Tables

#### `canvas_templates` (System templates)
```sql
CREATE TABLE canvas_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  target_canvas_types TEXT[] NOT NULL,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Template data (JSON)
  slots JSONB NOT NULL,
  sketch_elements JSONB DEFAULT '[]',
  color_scheme TEXT DEFAULT 'brand',
  tags TEXT[] DEFAULT '{}',
  
  -- Metrics
  use_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON canvas_templates(category);
CREATE INDEX idx_templates_canvas_types ON canvas_templates USING GIN(target_canvas_types);
```

#### `user_templates` (User-created templates)
```sql
CREATE TABLE user_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_canvas_types TEXT[] NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  
  -- Template data
  slots JSONB NOT NULL,
  sketch_elements JSONB DEFAULT '[]',
  
  -- Metrics
  use_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_templates_user ON user_templates(user_id);
```

#### `canvas_projects` (Already exists - extend)
```sql
-- Add columns to existing canvas_projects table
ALTER TABLE canvas_projects ADD COLUMN IF NOT EXISTS
  template_id UUID REFERENCES canvas_templates(id),
  user_template_id UUID REFERENCES user_templates(id),
  mode TEXT DEFAULT 'pro',  -- 'easy' or 'pro'
  history JSONB DEFAULT '[]';
```

#### `user_achievements` (Progress tracking)
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_data JSONB DEFAULT '{}',
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_type)
);

CREATE INDEX idx_achievements_user ON user_achievements(user_id);
```

---

## 9. API ENDPOINTS

### Template Endpoints

```
GET    /api/v1/canvas/templates
       Query: category, canvas_type, is_premium
       Returns: List of system templates

GET    /api/v1/canvas/templates/{id}
       Returns: Single template with full data

POST   /api/v1/canvas/templates/{id}/use
       Body: { project_id }
       Returns: Applied template data
       Side effect: Increments use_count

GET    /api/v1/canvas/user-templates
       Returns: User's saved templates

POST   /api/v1/canvas/user-templates
       Body: { name, description, slots, sketch_elements, target_canvas_types }
       Returns: Created template

DELETE /api/v1/canvas/user-templates/{id}
       Returns: Success
```

### Suggestions Endpoint

```
POST   /api/v1/canvas/suggestions
       Body: { 
         canvas_type, 
         placements, 
         brand_kit_id?,
         context? 
       }
       Returns: {
         suggestions: [
           { type: 'layout', message: '...', action: {...} },
           { type: 'color', message: '...', action: {...} },
           { type: 'text', message: '...', action: {...} }
         ]
       }
```

### Export Endpoints

```
POST   /api/v1/canvas/export
       Body: { 
         project_id,
         format: 'png' | 'jpg' | 'webp',
         quality?: number,
         platform?: 'twitch' | 'youtube' | 'discord' | etc
       }
       Returns: { url, expires_at }

POST   /api/v1/canvas/share
       Body: { project_id, expires_in?: number }
       Returns: { share_url, share_id }
```

### Achievement Endpoints

```
GET    /api/v1/canvas/achievements
       Returns: User's achievements and progress

POST   /api/v1/canvas/achievements/check
       Body: { action_type, metadata }
       Returns: { new_achievements: [...] }
```


---

## 10. COMPONENT SPECIFICATIONS

### 10.1 TemplateSelector

```typescript
interface TemplateSelectorProps {
  canvasType: string;
  onSelect: (template: CanvasTemplate) => void;
  onSkip: () => void;  // Start blank
}

// Features:
// - Grid of template thumbnails (3 columns)
// - Category tabs at top
// - Hover shows preview + "Use This" button
// - "Start Blank" option at bottom
// - Premium badge on pro templates
// - Search/filter by tags
```

### 10.2 EasyMode

```typescript
interface EasyModeProps {
  children: React.ReactNode;  // Wraps existing canvas
}

// Features:
// - Hides: Layer controls, precise inputs, advanced tools
// - Shows: Big action buttons, preset positions, emoji feedback
// - Simplified toolbar: Add Image, Add Text, Change Color, Done
// - Drop zones visible by default
// - Larger touch targets (mobile-friendly)
```

### 10.3 QuickActionsBar

```typescript
interface QuickActionsBarProps {
  onAction: (action: QuickAction) => void;
}

type QuickAction = 
  | 'add_text'
  | 'add_image'
  | 'change_colors'
  | 'auto_layout'
  | 'preview'
  | 'export';

// Features:
// - Floating bar at bottom of canvas
// - 4-6 most common actions
// - Expands on hover to show labels
// - Keyboard shortcuts shown
// - Collapses when not in use
```

### 10.4 SuggestionsPanel

```typescript
interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
  onDismiss: (id: string) => void;
}

interface Suggestion {
  id: string;
  type: 'layout' | 'color' | 'text' | 'tip';
  message: string;
  priority: 'high' | 'medium' | 'low';
  action?: () => void;  // One-click apply
}

// Features:
// - Collapsible panel in right sidebar
// - Max 3 suggestions shown at once
// - "Apply" button for actionable suggestions
// - "Dismiss" to hide suggestion
// - AI-powered based on current canvas state
```

### 10.5 DropZones

```typescript
interface DropZonesProps {
  template: CanvasTemplate | null;
  onDrop: (slotId: string, asset: MediaAsset) => void;
}

// Features:
// - Visual rectangles showing where assets can go
// - Highlights on drag-over
// - Shows accepted asset types as icons
// - Label: "Drop Logo Here", "Add Your Face", etc.
// - Pulses gently to draw attention
// - Disappears once filled
```

### 10.6 InstantPreview

```typescript
interface InstantPreviewProps {
  width: number;
  height: number;
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
}

// Features:
// - Small preview in corner (toggleable)
// - Shows exact export output
// - Updates in real-time
// - Click to expand full-screen preview
// - Shows platform context (e.g., YouTube thumbnail in search results)
```

### 10.7 HistoryPanel

```typescript
interface HistoryPanelProps {
  history: HistoryState[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

// Features:
// - Horizontal strip of thumbnails
// - Current state highlighted
// - Click to restore any state
// - Shows action label on hover
// - Keyboard: Cmd+Z / Cmd+Shift+Z
// - Max 50 states, auto-prunes old ones
```

---

## 11. EASY MODE VS PRO MODE

### Feature Comparison

| Feature | Easy Mode | Pro Mode |
|---------|-----------|----------|
| Templates | ✅ Prominent | ✅ Available |
| Drop Zones | ✅ Always visible | ❌ Hidden |
| Layer Controls | ❌ Hidden | ✅ Full control |
| Precise Positioning | ❌ Presets only | ✅ Pixel-perfect |
| Sketch Tools | ✅ Basic (pen, text) | ✅ Full suite |
| Auto-Layout | ✅ Automatic | ✅ Optional |
| Suggestions | ✅ Always shown | ✅ Collapsible |
| Keyboard Shortcuts | ✅ Basic | ✅ Full |
| Export Options | ✅ One-click | ✅ Advanced |
| History | ✅ Simple undo | ✅ Visual history |

### Easy Mode UI Simplifications

```typescript
// Components hidden in Easy Mode
const EASY_MODE_HIDDEN = [
  'LayersPanel',
  'PrecisePositionInputs',
  'ZIndexControls',
  'OpacitySlider',
  'RotationInput',
  'AdvancedSketchTools',
  'BlendModes',
  'Filters',
];

// Components shown only in Easy Mode
const EASY_MODE_ONLY = [
  'DropZones',
  'BigActionButtons',
  'PresetPositions',
  'SimplifiedToolbar',
  'EmojiReactions',
];
```

---

## 12. KEYBOARD SHORTCUTS

### Universal Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Toggle preview |
| `Delete` / `Backspace` | Remove selected |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + E` | Export |
| `Escape` | Deselect / Close modal |
| `?` | Show shortcuts |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Select next element |
| `Shift + Tab` | Select previous |
| `Arrow keys` | Nudge selected (1px) |
| `Shift + Arrow` | Nudge (10px) |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Reset zoom |

### Tool Shortcuts (Pro Mode)

| Shortcut | Action |
|----------|--------|
| `V` | Select tool |
| `P` | Pen tool |
| `T` | Text tool |
| `R` | Rectangle |
| `E` | Ellipse |
| `L` | Line |

---

## 13. ACHIEVEMENT SYSTEM

### Achievement Types

| Achievement | Trigger | Badge |
|-------------|---------|-------|
| `first_design` | Complete first design | 🎨 |
| `template_master` | Use 10 different templates | 📋 |
| `speed_demon` | Complete design in < 60 seconds | ⚡ |
| `prolific_creator` | Create 50 designs | 🏆 |
| `brand_consistent` | Use brand kit in 10 designs | 🎯 |
| `social_butterfly` | Share 5 designs | 🦋 |
| `perfectionist` | Use undo 100 times | 🔄 |
| `minimalist` | Create design with 2 elements | ✨ |
| `maximalist` | Create design with 10+ elements | 🎪 |

---

## 14. SUCCESS METRICS

### KPIs to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first design | < 3 minutes | Analytics |
| Template usage rate | > 60% | Template use_count |
| Easy mode adoption | > 40% new users | Mode toggle tracking |
| Design completion rate | > 80% | Started vs saved |
| Export rate | > 70% of saved | Export events |
| Return usage | > 50% within 7 days | User sessions |

---

## 15. ROLLOUT PLAN

### Week 1-2: Foundation
- [ ] Template system (10 templates)
- [ ] Easy/Pro mode toggle
- [ ] QuickStartWizard

### Week 3-4: Smart Tools
- [ ] Auto-layout engine
- [ ] Suggestions panel
- [ ] MagicToolbar

### Week 5-6: Guided Experience
- [ ] Drop zones
- [ ] Snap guides
- [ ] Guided tour

### Week 7-8: Speed Features
- [ ] QuickActionsBar
- [ ] Instant preview
- [ ] Export panel

### Week 9-10: Polish
- [ ] Celebrations
- [ ] Achievements
- [ ] Performance optimization
- [ ] Accessibility audit

---

*This schema is the complete implementation guide for Canvas Studio 2.0. Each phase builds on the previous, with the goal of making professional design accessible to everyone.*
