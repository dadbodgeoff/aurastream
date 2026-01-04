# 🎨 Canvas Studio Roadmap
## Complete Feature Design Document

**Version:** 1.0.0  
**Last Updated:** January 3, 2026  
**Author:** Kiro AI  
**Status:** Planning Phase

---

## Executive Summary

This document outlines 6 major features to complete the Canvas Studio system in AuraStream. These features transform Canvas Studio from a drawing tool into a full composition platform that reduces AI generation costs by 50%+ while making asset creation accessible to users of all skill levels—including a 5-year-old.

---

## Current State

### What's Built ✅
1. **Canvas Export Foundation** - Renders placements to exportable images at 2x resolution
2. **Sketch Tools** - 8 tools (Select, Pen, Rectangle, Circle, Line, Arrow, Text, Eraser)
3. **Kid-Friendly Modes** - Easy mode, Region labels, Pro mode
4. **Smart Description Generator** - Converts visual sketches to AI-friendly text
5. **Backend Snapshot API** - `POST /api/v1/canvas-snapshot` for temporary uploads

### What's Missing 🔜
The `useCanvasGeneration` hook exists but isn't wired into the actual generation flow. The 6 features below complete the system.

---

## Feature 1: Canvas Snapshot Integration

### Purpose
Wire up the existing `useCanvasGeneration` hook to actually use canvas snapshots in generation requests. This is the "last mile" that enables the 50%+ cost savings.

### Why It Matters
- **Cost Reduction**: Send 1 image instead of 2-3 separate assets to AI
- **Better Composition**: AI sees exact placement, not just "put face in corner"
- **Sketch Context**: AI understands annotations and region labels


### Technical Design

#### Files to Modify
```
tsx/apps/web/src/components/create/CreatePageContent.tsx  # Add useCanvasGeneration
tsx/apps/web/src/components/media-library/MediaAssetPicker.tsx  # Add "Use Canvas Mode" toggle
tsx/packages/api-client/src/hooks/useGenerateAsset.ts  # Accept canvas params
```

#### Data Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     USER FLOW                                   │
├─────────────────────────────────────────────────────────────────┤
│  1. User opens Canvas Studio                                    │
│  2. Places assets, draws sketches, adds regions                 │
│  3. Clicks "Generate with Canvas"                               │
│  4. System exports canvas at 2x resolution                      │
│  5. Uploads to /api/v1/canvas-snapshot                          │
│  6. Passes snapshot_url + description to /api/v1/generate       │
│  7. Worker downloads snapshot, uses as reference image          │
└─────────────────────────────────────────────────────────────────┘
```

#### API Changes
```typescript
// MediaAssetPicker.tsx - Add canvas mode toggle
interface MediaAssetPickerProps {
  // ... existing props
  enableCanvasMode?: boolean;  // NEW: Enable canvas snapshot generation
  onCanvasReady?: (data: {
    snapshotUrl: string;
    description: string;
  }) => void;
}

// CreatePageContent.tsx - Use canvas in generation
const handleGenerate = async () => {
  let canvasData = null;
  
  // If canvas mode enabled and has content
  if (enableCanvasMode && (mediaAssetPlacements.length > 0 || sketchElements.length > 0)) {
    const { prepareCanvasForGeneration } = useCanvasGeneration({
      width: dimensions.width,
      height: dimensions.height,
      assetType: selectedAssetType,
    });
    
    canvasData = await prepareCanvasForGeneration(
      mediaAssetPlacements,
      sketchElements,
      labeledRegions
    );
  }
  
  await generateMutation.mutateAsync({
    assetType: selectedAssetType,
    customPrompt: prompt,
    // Use canvas snapshot if available, otherwise fall back to placements
    canvasSnapshotUrl: canvasData?.snapshotUrl,
    canvasSnapshotDescription: canvasData?.description,
    // Only send placements if NOT using canvas mode
    mediaAssetPlacements: canvasData ? undefined : serializedPlacements,
  });
};
```

#### UI Changes
1. Add "🎨 Canvas Mode" toggle in MediaAssetPicker when `enableCanvasStudio` is true
2. Show preview of what will be sent to AI
3. Display cost savings indicator: "Using canvas mode saves ~50% on generation costs"

### Complexity: Medium
- 2-3 days of work
- Mostly wiring existing pieces together
- Need to handle edge cases (empty canvas, failed upload, etc.)

---

## Feature 2: Canvas Templates/Presets

### Purpose
Pre-made layouts for common compositions. Users pick a template, swap in their assets, done.

### Why It Matters
- **Speed**: Skip the composition step entirely
- **Consistency**: Professional layouts every time
- **Accessibility**: Perfect for beginners who don't know composition rules


### Technical Design

#### Template Structure
```typescript
// tsx/apps/web/src/components/media-library/templates/types.ts

interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;  // Preview image URL
  
  // Canvas dimensions this template is designed for
  targetAssetType: string;  // 'thumbnail', 'twitch_emote', etc.
  
  // Placeholder slots for user assets
  slots: TemplateSlot[];
  
  // Pre-defined sketch elements (decorations, frames, etc.)
  decorations: AnySketchElement[];
  
  // Pre-defined regions with labels
  regions: LabeledRegion[];
  
  // Suggested prompt additions
  promptHints: string[];
}

interface TemplateSlot {
  id: string;
  label: string;  // "Your Face", "Logo", "Background"
  acceptedTypes: MediaAssetType[];  // ['face'], ['logo'], ['background']
  position: { x: number; y: number };  // Percentage
  size: { width: number; height: number };  // Percentage
  zIndex: number;
  required: boolean;
  placeholder: string;  // Placeholder image URL
}

type TemplateCategory = 
  | 'gaming'      // Gaming thumbnails, emotes
  | 'reaction'    // Reaction faces, expressions
  | 'tutorial'    // How-to, educational
  | 'vlog'        // Personal, lifestyle
  | 'minimal'     // Clean, simple layouts
  | 'dramatic'    // High-impact, bold
  | 'custom';     // User-created templates
```

#### Template Examples
```typescript
const BUILT_IN_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'gaming-victory',
    name: 'Victory Moment',
    description: 'Perfect for win screens and clutch plays',
    category: 'gaming',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Reaction',
        acceptedTypes: ['face'],
        position: { x: 70, y: 60 },
        size: { width: 35, height: 45 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face.png',
      },
      {
        id: 'logo',
        label: 'Channel Logo',
        acceptedTypes: ['logo'],
        position: { x: 5, y: 5 },
        size: { width: 15, height: 15 },
        zIndex: 3,
        required: false,
        placeholder: '/templates/placeholders/logo.png',
      },
    ],
    decorations: [
      // Pre-drawn arrow pointing to face
      {
        id: 'arrow-1',
        type: 'arrow',
        startX: 30, startY: 50,
        endX: 65, endY: 55,
        color: '#EAB308',
        strokeWidth: 6,
        opacity: 100,
        zIndex: 1,
      },
    ],
    regions: [
      { id: 'r1', x: 5, y: 70, width: 50, height: 25, label: 'game action', color: '#3B82F6' },
    ],
    promptHints: ['victory', 'celebration', 'winning moment'],
  },
  
  {
    id: 'reaction-shocked',
    name: 'Shocked Reaction',
    description: 'Big reaction face with dramatic framing',
    category: 'reaction',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'face',
        label: 'Your Face',
        acceptedTypes: ['face'],
        position: { x: 25, y: 20 },
        size: { width: 50, height: 60 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/face-large.png',
      },
    ],
    decorations: [
      // Exclamation marks
      {
        id: 'text-1',
        type: 'text',
        x: 80, y: 20,
        text: '!?',
        fontSize: 48,
        fontFamily: 'Impact, sans-serif',
        color: '#EF4444',
        strokeWidth: 0,
        opacity: 100,
        zIndex: 3,
      },
    ],
    regions: [],
    promptHints: ['shocked', 'surprised', 'dramatic reaction'],
  },
  
  {
    id: 'minimal-clean',
    name: 'Clean & Simple',
    description: 'Minimalist layout with logo focus',
    category: 'minimal',
    targetAssetType: 'thumbnail',
    slots: [
      {
        id: 'logo',
        label: 'Logo',
        acceptedTypes: ['logo'],
        position: { x: 35, y: 35 },
        size: { width: 30, height: 30 },
        zIndex: 2,
        required: true,
        placeholder: '/templates/placeholders/logo-center.png',
      },
    ],
    decorations: [],
    regions: [
      { id: 'r1', x: 10, y: 75, width: 80, height: 15, label: 'title text', color: '#FFFFFF' },
    ],
    promptHints: ['clean', 'minimal', 'professional'],
  },
];
```


#### New Files
```
tsx/apps/web/src/components/media-library/templates/
├── types.ts                    # Template type definitions
├── constants.ts                # Built-in templates
├── TemplateGallery.tsx         # Template browser/picker
├── TemplatePreview.tsx         # Template preview card
├── TemplateSlotFiller.tsx      # UI for filling template slots
├── useTemplateStore.ts         # Zustand store for template state
└── index.ts                    # Exports
```

#### UI Flow
```
┌─────────────────────────────────────────────────────────────────┐
│  TEMPLATE SELECTION FLOW                                        │
├─────────────────────────────────────────────────────────────────┤
│  1. User clicks "Use Template" in Canvas Studio                 │
│  2. TemplateGallery opens with categories                       │
│  3. User browses/filters templates                              │
│  4. User clicks template → TemplatePreview shows details        │
│  5. User clicks "Use This Template"                             │
│  6. TemplateSlotFiller opens                                    │
│  7. User drags assets into slots (or picks from library)        │
│  8. Template applies: placements + decorations + regions        │
│  9. User can still edit/adjust in Canvas Studio                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Integration Points
- Add "📋 Templates" button in CanvasComposer header
- Add "Start from Template" option in CanvasStudioModal
- Templates auto-filter by current asset type

### Complexity: Medium-High
- 3-4 days of work
- Need to design 10-15 good templates
- Template slot filling UX needs polish

---

## Feature 3: Stickers/Stamps Library

### Purpose
Quick-add common elements: emojis, shapes, icons, effects. One click to add, drag to position.

### Why It Matters
- **Fun Factor**: Makes composition playful and engaging
- **Speed**: No need to draw common elements
- **Consistency**: Professional-looking decorations
- **Kid-Friendly**: Perfect for the "5-year-old could do it" goal

### Technical Design

#### Sticker Structure
```typescript
// tsx/apps/web/src/components/media-library/stickers/types.ts

interface Sticker {
  id: string;
  name: string;
  category: StickerCategory;
  
  // Sticker can be SVG, emoji, or image
  type: 'svg' | 'emoji' | 'image';
  
  // Content based on type
  content: string;  // SVG string, emoji character, or image URL
  
  // Default size (percentage of canvas)
  defaultSize: { width: number; height: number };
  
  // Can user change color?
  colorizable: boolean;
  
  // Tags for search
  tags: string[];
}

type StickerCategory =
  | 'emoji'       // 😀 🔥 ⭐ 💯
  | 'arrows'      // → ↗ ⬆ curved arrows
  | 'shapes'      // Stars, hearts, badges
  | 'effects'     // Sparkles, explosions, speed lines
  | 'frames'      // Borders, corners
  | 'gaming'      // Controllers, health bars, XP
  | 'social'      // Like, subscribe, bell icons
  | 'text'        // "NEW!", "LIVE", "WIN"
  | 'custom';     // User-uploaded stickers
```


#### Built-in Stickers
```typescript
const BUILT_IN_STICKERS: Sticker[] = [
  // Emojis (most popular)
  { id: 'emoji-fire', name: 'Fire', category: 'emoji', type: 'emoji', content: '🔥', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['hot', 'trending', 'lit'] },
  { id: 'emoji-star', name: 'Star', category: 'emoji', type: 'emoji', content: '⭐', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['rating', 'favorite', 'best'] },
  { id: 'emoji-100', name: '100', category: 'emoji', type: 'emoji', content: '💯', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['perfect', 'score'] },
  { id: 'emoji-crown', name: 'Crown', category: 'emoji', type: 'emoji', content: '👑', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['king', 'winner', 'best'] },
  { id: 'emoji-rocket', name: 'Rocket', category: 'emoji', type: 'emoji', content: '🚀', defaultSize: { width: 10, height: 10 }, colorizable: false, tags: ['launch', 'fast', 'growth'] },
  
  // Arrows (colorizable SVGs)
  { 
    id: 'arrow-curved-right', 
    name: 'Curved Arrow', 
    category: 'arrows', 
    type: 'svg', 
    content: '<svg viewBox="0 0 100 100"><path d="M20 80 Q50 20 80 50" stroke="currentColor" stroke-width="8" fill="none"/><polygon points="75,40 90,55 70,60" fill="currentColor"/></svg>',
    defaultSize: { width: 15, height: 15 },
    colorizable: true,
    tags: ['point', 'direction', 'look here'],
  },
  
  // Effects
  {
    id: 'effect-sparkles',
    name: 'Sparkles',
    category: 'effects',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><!-- sparkle SVG --></svg>',
    defaultSize: { width: 20, height: 20 },
    colorizable: true,
    tags: ['magic', 'shine', 'special'],
  },
  {
    id: 'effect-explosion',
    name: 'Explosion',
    category: 'effects',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><!-- explosion SVG --></svg>',
    defaultSize: { width: 25, height: 25 },
    colorizable: true,
    tags: ['boom', 'impact', 'action'],
  },
  
  // Gaming
  {
    id: 'gaming-controller',
    name: 'Controller',
    category: 'gaming',
    type: 'svg',
    content: '<svg viewBox="0 0 100 100"><!-- controller SVG --></svg>',
    defaultSize: { width: 15, height: 12 },
    colorizable: true,
    tags: ['game', 'play', 'console'],
  },
  
  // Social
  {
    id: 'social-subscribe',
    name: 'Subscribe Button',
    category: 'social',
    type: 'svg',
    content: '<svg viewBox="0 0 100 40"><rect rx="5" fill="#EF4444" width="100" height="40"/><text x="50" y="28" text-anchor="middle" fill="white" font-size="16" font-weight="bold">SUBSCRIBE</text></svg>',
    defaultSize: { width: 20, height: 8 },
    colorizable: false,
    tags: ['youtube', 'follow', 'cta'],
  },
  
  // Text badges
  {
    id: 'text-new',
    name: 'NEW Badge',
    category: 'text',
    type: 'svg',
    content: '<svg viewBox="0 0 60 30"><rect rx="4" fill="#22C55E" width="60" height="30"/><text x="30" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold">NEW!</text></svg>',
    defaultSize: { width: 12, height: 6 },
    colorizable: false,
    tags: ['badge', 'label', 'announcement'],
  },
  {
    id: 'text-live',
    name: 'LIVE Badge',
    category: 'text',
    type: 'svg',
    content: '<svg viewBox="0 0 60 30"><rect rx="4" fill="#EF4444" width="60" height="30"/><circle cx="12" cy="15" r="5" fill="white"/><text x="38" y="22" text-anchor="middle" fill="white" font-size="14" font-weight="bold">LIVE</text></svg>',
    defaultSize: { width: 12, height: 6 },
    colorizable: false,
    tags: ['streaming', 'live', 'broadcast'],
  },
];
```

#### New Files
```
tsx/apps/web/src/components/media-library/stickers/
├── types.ts                    # Sticker type definitions
├── constants.ts                # Built-in stickers
├── StickerPicker.tsx           # Sticker browser with categories
├── StickerPreview.tsx          # Individual sticker preview
├── StickerElement.tsx          # Rendered sticker on canvas
├── useStickerStore.ts          # Recently used, favorites
└── index.ts                    # Exports
```


#### UI Design
```
┌─────────────────────────────────────────────────────────────────┐
│  STICKER PICKER (Slide-out panel)                               │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Search stickers...                                          │
│                                                                 │
│  ⭐ Recently Used                                               │
│  [🔥] [⭐] [💯] [👑]                                            │
│                                                                 │
│  😀 Emoji                                                       │
│  [🔥] [⭐] [💯] [👑] [🚀] [💪] [🎮] [🏆]                        │
│                                                                 │
│  → Arrows                                                       │
│  [→] [↗] [⬆] [↩] [curved] [double]                             │
│                                                                 │
│  ✨ Effects                                                     │
│  [sparkles] [explosion] [speed lines] [glow]                    │
│                                                                 │
│  🎮 Gaming                                                      │
│  [controller] [health bar] [XP] [coin]                          │
│                                                                 │
│  📱 Social                                                      │
│  [subscribe] [like] [bell] [share]                              │
│                                                                 │
│  💬 Text Badges                                                 │
│  [NEW!] [LIVE] [WIN] [#1]                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Integration
- Add "🎨 Stickers" button in SketchToolbar
- Click sticker → adds to canvas center
- Drag sticker → adds at drop position
- Stickers become sketch elements (can be moved, resized, deleted)

### Complexity: Medium
- 2-3 days of work
- Need to create/source ~50 quality stickers
- SVG colorization needs careful implementation

---

## Feature 4: Visual Layer Panel

### Purpose
A proper layer management UI showing all elements with thumbnails, visibility toggles, and drag-to-reorder.

### Why It Matters
- **Clarity**: See all elements at a glance
- **Control**: Easy reordering without hunting for elements
- **Professional**: Standard in all design tools
- **Debugging**: Quickly find and fix overlapping issues

### Technical Design

#### Layer Panel Structure
```typescript
// tsx/apps/web/src/components/media-library/layers/types.ts

interface LayerItem {
  id: string;
  type: 'asset' | 'sketch' | 'sticker' | 'region';
  name: string;
  thumbnail: string | null;  // Data URL for preview
  visible: boolean;
  locked: boolean;
  zIndex: number;
  
  // Reference to actual element
  elementRef: AssetPlacement | AnySketchElement | LabeledRegion;
}

interface LayerGroup {
  id: string;
  name: string;
  collapsed: boolean;
  layers: LayerItem[];
}
```

#### Layer Panel UI
```
┌─────────────────────────────────────────────────────────────────┐
│  LAYERS                                            [+] [⋮]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 Assets (2)                                         [▼]      │
│  ├─ [👁] [🔒] [thumb] My Face              z:3        [⋮]      │
│  └─ [👁] [🔒] [thumb] Channel Logo         z:2        [⋮]      │
│                                                                 │
│  📁 Sketches (4)                                       [▼]      │
│  ├─ [👁] [🔒] [■] Rectangle                z:4        [⋮]      │
│  ├─ [👁] [🔒] [→] Arrow                    z:3        [⋮]      │
│  ├─ [👁] [🔒] [T] "EPIC!"                  z:2        [⋮]      │
│  └─ [👁] [🔒] [~] Freehand                 z:1        [⋮]      │
│                                                                 │
│  📁 Regions (2)                                        [▼]      │
│  ├─ [👁] [🔒] [□] "sky"                    z:1        [⋮]      │
│  └─ [👁] [🔒] [□] "person"                 z:0        [⋮]      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  Background                                                     │
│  [👁] [🔒] Transparent ▼                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
[👁] = Visibility toggle (eye icon)
[🔒] = Lock toggle (prevents editing)
[thumb] = Thumbnail preview
[⋮] = Context menu (duplicate, delete, etc.)
[▼] = Collapse/expand group
```


#### New Files
```
tsx/apps/web/src/components/media-library/layers/
├── types.ts                    # Layer type definitions
├── LayerPanel.tsx              # Main layer panel component
├── LayerItem.tsx               # Individual layer row
├── LayerGroup.tsx              # Collapsible layer group
├── LayerThumbnail.tsx          # Thumbnail generator
├── LayerContextMenu.tsx        # Right-click menu
├── useLayerStore.ts            # Layer visibility/lock state
└── index.ts                    # Exports
```

#### Features
1. **Drag-to-Reorder**: Drag layers up/down to change z-index
2. **Visibility Toggle**: Hide elements without deleting
3. **Lock Toggle**: Prevent accidental edits
4. **Thumbnails**: Auto-generated previews for each element
5. **Context Menu**: Duplicate, delete, bring to front, send to back
6. **Groups**: Collapsible groups by type (assets, sketches, regions)
7. **Selection Sync**: Clicking layer selects element on canvas

#### Integration
- Replace current "Asset Thumbnails" strip in CanvasStudioModal
- Add as collapsible panel in CanvasComposer
- Sync with sketch store for element selection

### Complexity: Medium-High
- 3-4 days of work
- Drag-and-drop reordering needs careful UX
- Thumbnail generation for sketch elements is tricky

---

## Feature 5: Touch/Mobile Optimization

### Purpose
Make Canvas Studio work beautifully on tablets and phones. Touch gestures, larger hit targets, mobile-friendly UI.

### Why It Matters
- **Accessibility**: Many creators work on tablets
- **Flexibility**: Quick edits on the go
- **Market**: Mobile-first users are a huge segment
- **Kid-Friendly**: Kids often use tablets

### Technical Design

#### Touch Gesture Support
```typescript
// tsx/apps/web/src/components/media-library/touch/useTouchGestures.ts

interface TouchGestureConfig {
  // Single finger
  onTap: (point: Point) => void;
  onDoubleTap: (point: Point) => void;
  onLongPress: (point: Point) => void;
  onDrag: (start: Point, current: Point, delta: Point) => void;
  onDragEnd: (start: Point, end: Point) => void;
  
  // Two finger
  onPinch: (scale: number, center: Point) => void;
  onRotate: (angle: number, center: Point) => void;
  onTwoFingerPan: (delta: Point) => void;
}

// Gesture mappings
const GESTURE_ACTIONS = {
  tap: 'select element / place element',
  doubleTap: 'edit text / open properties',
  longPress: 'show context menu',
  drag: 'move element / draw',
  pinch: 'zoom canvas',
  twoFingerPan: 'pan canvas',
};
```

#### Mobile UI Adaptations
```typescript
// Responsive breakpoints
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

// Mobile-specific UI changes
const mobileAdaptations = {
  // Larger touch targets
  toolButtonSize: '48px',  // vs 36px on desktop
  layerRowHeight: '56px',  // vs 40px on desktop
  
  // Simplified toolbar
  visibleTools: ['select', 'pen', 'rectangle', 'text', 'eraser'],
  hiddenTools: ['circle', 'line', 'arrow'],  // In overflow menu
  
  // Bottom sheet instead of side panel
  controlsPosition: 'bottom-sheet',  // vs 'side-panel' on desktop
  
  // Floating action button for common actions
  fabActions: ['undo', 'redo', 'stickers', 'templates'],
};
```


#### Mobile Layout
```
┌─────────────────────────────────────────────────────────────────┐
│  MOBILE CANVAS STUDIO                                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                         │    │
│  │                                                         │    │
│  │                    CANVAS AREA                          │    │
│  │                  (Full screen)                          │    │
│  │                                                         │    │
│  │                                                         │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [Select] [Pen] [Rect] [Text] [Eraser] [⋮ More]        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Color: [🔴][🟠][🟡][🟢][🔵][🟣][⚪]  Size: [S][M][L]  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│                                              [↩️] [↪️]  [✓ Done] │
└─────────────────────────────────────────────────────────────────┘

Floating buttons:
[📋] Templates (top-left)
[🎨] Stickers (top-right)
```

#### New Files
```
tsx/apps/web/src/components/media-library/touch/
├── useTouchGestures.ts         # Touch gesture detection
├── useResponsiveCanvas.ts      # Responsive layout hook
├── MobileToolbar.tsx           # Mobile-optimized toolbar
├── MobileControlSheet.tsx      # Bottom sheet for controls
├── TouchFeedback.tsx           # Visual feedback for touches
└── index.ts                    # Exports
```

#### Key Considerations
1. **Prevent Scroll**: Canvas should capture all touch events
2. **Palm Rejection**: Ignore accidental palm touches
3. **Haptic Feedback**: Vibrate on element selection (if supported)
4. **Undo Gesture**: Two-finger tap to undo
5. **Zoom Limits**: Prevent over-zooming on small screens

### Complexity: High
- 4-5 days of work
- Touch gesture handling is complex
- Need extensive testing on real devices
- May need separate mobile component variants

---

## Feature 6: Canvas History Persistence

### Purpose
Save and load canvas compositions. Users can save their work, come back later, or reuse compositions.

### Why It Matters
- **Safety**: Don't lose work if browser crashes
- **Reusability**: Save templates for future use
- **Workflow**: Work on compositions over multiple sessions
- **Sharing**: Export/import compositions

### Technical Design

#### Storage Structure
```typescript
// tsx/apps/web/src/components/media-library/history/types.ts

interface SavedCanvas {
  id: string;
  name: string;
  description?: string;
  
  // Canvas metadata
  assetType: string;
  width: number;
  height: number;
  
  // Content
  placements: AssetPlacement[];
  sketchElements: AnySketchElement[];
  labeledRegions: LabeledRegion[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Preview
  thumbnailDataUrl: string;
  
  // User info
  userId: string;
}

interface CanvasHistoryEntry {
  id: string;
  canvasId: string;
  timestamp: string;
  action: string;
  snapshot: SavedCanvas;
}
```


#### Storage Options

**Option A: LocalStorage (Simple, Offline)**
```typescript
// Pros: Works offline, no backend changes
// Cons: Limited to ~5MB, device-specific

const STORAGE_KEY = 'aurastream_saved_canvases';
const MAX_SAVED_CANVASES = 20;

function saveCanvas(canvas: SavedCanvas): void {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  saved.unshift(canvas);
  if (saved.length > MAX_SAVED_CANVASES) saved.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}
```

**Option B: Backend API (Robust, Cross-Device)**
```python
# backend/api/routes/canvas_compositions.py

# New endpoints:
# POST   /api/v1/canvas-compositions        - Save composition
# GET    /api/v1/canvas-compositions        - List user's compositions
# GET    /api/v1/canvas-compositions/{id}   - Get composition
# PUT    /api/v1/canvas-compositions/{id}   - Update composition
# DELETE /api/v1/canvas-compositions/{id}   - Delete composition

# New database table:
# canvas_compositions (
#   id UUID PRIMARY KEY,
#   user_id UUID NOT NULL REFERENCES users(id),
#   name TEXT NOT NULL,
#   description TEXT,
#   asset_type TEXT NOT NULL,
#   width INTEGER NOT NULL,
#   height INTEGER NOT NULL,
#   content JSONB NOT NULL,  -- placements, sketches, regions
#   thumbnail_url TEXT,
#   created_at TIMESTAMPTZ DEFAULT NOW(),
#   updated_at TIMESTAMPTZ DEFAULT NOW()
# )
```

**Recommendation: Hybrid Approach**
- Auto-save to localStorage every 30 seconds (crash recovery)
- Manual "Save to Cloud" for permanent storage
- Sync on app load if user is logged in

#### UI Design
```
┌─────────────────────────────────────────────────────────────────┐
│  SAVED CANVASES                                    [+ New]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 Recent (Auto-saved)                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │                           │
│  │ Untitled│ │ Untitled│ │ Untitled│                           │
│  │ 2m ago  │ │ 1h ago  │ │ 3h ago  │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
│                                                                 │
│  ☁️ Saved to Cloud                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ [thumb] │ │ [thumb] │ │ [thumb] │                           │
│  │ Victory │ │ Reaction│ │ Tutorial│                           │
│  │ Jan 2   │ │ Dec 28  │ │ Dec 15  │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
│                                                                 │
│  [Import from File]                                             │
└─────────────────────────────────────────────────────────────────┘
```

#### New Files
```
tsx/apps/web/src/components/media-library/history/
├── types.ts                    # History type definitions
├── useCanvasHistory.ts         # Auto-save, load, sync
├── SavedCanvasGallery.tsx      # Browse saved canvases
├── SaveCanvasModal.tsx         # Save dialog
├── CanvasExportImport.tsx      # JSON export/import
└── index.ts                    # Exports

backend/api/routes/canvas_compositions.py  # Backend API
backend/api/schemas/canvas_compositions.py # Pydantic schemas
backend/database/migrations/XXX_canvas_compositions.sql
```

#### Features
1. **Auto-Save**: Save to localStorage every 30 seconds
2. **Crash Recovery**: Prompt to restore on next visit
3. **Cloud Save**: Manual save to backend (Pro/Studio)
4. **Export/Import**: Download/upload as JSON file
5. **Thumbnails**: Auto-generate preview images
6. **Versioning**: Keep last 5 versions of each canvas

### Complexity: Medium-High
- 3-4 days of work
- Backend changes needed for cloud storage
- Need to handle large JSON payloads efficiently

---


## Implementation Priority Matrix

| Feature | Impact | Effort | Priority | Dependencies |
|---------|--------|--------|----------|--------------|
| 1. Canvas Snapshot Integration | 🔥 High | Medium | **P0** | None |
| 2. Templates/Presets | High | Medium-High | **P1** | Feature 1 |
| 3. Stickers/Stamps | Medium | Medium | **P2** | None |
| 4. Layer Panel | Medium | Medium-High | **P2** | None |
| 5. Touch/Mobile | Medium | High | **P3** | Features 1-4 |
| 6. History Persistence | Medium | Medium-High | **P3** | None |

### Recommended Implementation Order

```
Week 1: Feature 1 (Canvas Snapshot Integration)
        └── This unlocks the cost savings immediately
        
Week 2: Feature 3 (Stickers) + Feature 4 (Layer Panel)
        └── These can be built in parallel
        └── Stickers make Easy Mode more fun
        └── Layer Panel improves Pro Mode
        
Week 3: Feature 2 (Templates)
        └── Builds on stickers and layers
        └── Major UX improvement
        
Week 4: Feature 6 (History Persistence)
        └── Safety net for all the new features
        
Week 5-6: Feature 5 (Touch/Mobile)
        └── Polish pass after core features are stable
```

---

## Success Metrics

### Feature 1: Canvas Snapshot Integration
- [ ] Generation cost reduced by 40%+ when using canvas mode
- [ ] Canvas mode used in 30%+ of generations with media assets

### Feature 2: Templates
- [ ] 15+ built-in templates across all categories
- [ ] 50%+ of new users try a template in first session
- [ ] Template-based generations have higher completion rate

### Feature 3: Stickers
- [ ] 50+ built-in stickers
- [ ] Stickers used in 40%+ of canvas compositions
- [ ] "Recently Used" shows engagement

### Feature 4: Layer Panel
- [ ] Reduces "element not found" support tickets
- [ ] Users can reorder layers without confusion

### Feature 5: Touch/Mobile
- [ ] Canvas Studio usable on iPad/tablets
- [ ] Touch gestures feel native
- [ ] No accidental actions from palm touches

### Feature 6: History Persistence
- [ ] Zero data loss from browser crashes
- [ ] Users save 2+ compositions on average
- [ ] Cloud sync works reliably

---

## Technical Debt & Considerations

### Performance
- Large canvases with many elements may lag
- Consider virtualization for layer panel with 50+ items
- Thumbnail generation should be debounced

### Accessibility
- All features need keyboard navigation
- Screen reader support for layer panel
- High contrast mode for sketch tools

### Testing
- Each feature needs unit tests
- E2E tests for critical flows
- Visual regression tests for canvas rendering

### Documentation
- Update README for each feature
- Add JSDoc comments to all new hooks
- Create user-facing help content

---

## Appendix: File Structure After All Features

```
tsx/apps/web/src/components/media-library/
├── canvas-export/           # Existing
├── placement/               # Existing
├── sketch/                  # Existing
├── templates/               # NEW: Feature 2
│   ├── types.ts
│   ├── constants.ts
│   ├── TemplateGallery.tsx
│   ├── TemplatePreview.tsx
│   ├── TemplateSlotFiller.tsx
│   ├── useTemplateStore.ts
│   └── index.ts
├── stickers/                # NEW: Feature 3
│   ├── types.ts
│   ├── constants.ts
│   ├── StickerPicker.tsx
│   ├── StickerPreview.tsx
│   ├── StickerElement.tsx
│   ├── useStickerStore.ts
│   └── index.ts
├── layers/                  # NEW: Feature 4
│   ├── types.ts
│   ├── LayerPanel.tsx
│   ├── LayerItem.tsx
│   ├── LayerGroup.tsx
│   ├── LayerThumbnail.tsx
│   ├── LayerContextMenu.tsx
│   ├── useLayerStore.ts
│   └── index.ts
├── touch/                   # NEW: Feature 5
│   ├── useTouchGestures.ts
│   ├── useResponsiveCanvas.ts
│   ├── MobileToolbar.tsx
│   ├── MobileControlSheet.tsx
│   ├── TouchFeedback.tsx
│   └── index.ts
├── history/                 # NEW: Feature 6
│   ├── types.ts
│   ├── useCanvasHistory.ts
│   ├── SavedCanvasGallery.tsx
│   ├── SaveCanvasModal.tsx
│   ├── CanvasExportImport.tsx
│   └── index.ts
├── CanvasComposer.tsx       # Updated for all features
├── CanvasStudioModal.tsx    # Updated for all features
├── MediaAssetPicker.tsx     # Updated for Feature 1
└── index.ts                 # Updated exports
```

---

*This roadmap represents a comprehensive plan for completing the Canvas Studio system. Each feature is designed to work independently while building toward a cohesive whole. The priority order ensures maximum value delivery with each iteration.*
