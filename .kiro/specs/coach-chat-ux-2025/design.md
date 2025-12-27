# Coach Chat UX 2025 - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COACH CHAT UX 2025 LAYER                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Image Lightbox  │  │  AI Assistant   │  │  Inline Gen     │             │
│  │ (zoom-pan-pinch)│  │     Cards       │  │   Preview       │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────▼────────────────────▼────────────────────▼────────┐             │
│  │                    COACH COMPONENTS                        │             │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │             │
│  │  │CoachMessage  │ │PromptCard    │ │GenerationCard│       │             │
│  │  │(enhanced)    │ │(new)         │ │(new)         │       │             │
│  │  └──────────────┘ └──────────────┘ └──────────────┘       │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ Streaming UX    │  │  Context Bar    │  │  Suggestion     │             │
│  │ (skeleton+dots) │  │  (sticky)       │  │  Chips          │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                    │                       │
│  ┌────────▼────────────────────▼────────────────────▼────────┐             │
│  │                    HOOKS LAYER                             │             │
│  │  useImageLightbox, useCoachStreaming, useSuggestionChips  │             │
│  │  useInlineGeneration, useSessionContext                   │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────┐             │
│  │                    STORES (Zustand)                        │             │
│  │  lightboxStore, coachStreamingStore, suggestionStore      │             │
│  └────────────────────────────────────────────────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Module 1: Enhanced Streaming UX

### File Structure
```
tsx/apps/web/src/components/coach/
├── streaming/
│   ├── ThinkingIndicator.tsx      # Animated "Coach is thinking..."
│   ├── StreamingSkeleton.tsx      # Skeleton for expected response
│   ├── ChainOfThought.tsx         # Optional reasoning display
│   └── index.ts
```

### ThinkingIndicator Component
```typescript
interface ThinkingIndicatorProps {
  stage: 'thinking' | 'analyzing' | 'crafting' | 'validating';
  className?: string;
}

// Stage messages:
// thinking: "Coach is thinking..."
// analyzing: "Analyzing your brand context..."
// crafting: "Crafting your prompt..."
// validating: "Validating quality..."
```

### StreamingSkeleton Component
```typescript
interface StreamingSkeletonProps {
  expectedType: 'text' | 'prompt_card' | 'validation';
  className?: string;
}

// Renders skeleton that matches expected response structure
// - text: 3-4 lines of varying width
// - prompt_card: Card skeleton with header, body, footer
// - validation: List skeleton with icons
```

### Streaming State Machine
```typescript
type StreamingStage = 
  | 'idle'
  | 'connecting'
  | 'thinking'
  | 'streaming'
  | 'validating'
  | 'complete'
  | 'error';

interface StreamingState {
  stage: StreamingStage;
  tokens: string[];
  metadata: {
    intentReady?: boolean;
    groundingUsed?: boolean;
    validationResult?: ValidationResult;
  };
}
```

---

## Module 2: Image Lightbox System

### Dependencies
```json
{
  "react-zoom-pan-pinch": "^3.4.0"
}
```

### File Structure
```
tsx/apps/web/src/components/lightbox/
├── ImageLightbox.tsx              # Main lightbox component
├── LightboxOverlay.tsx            # Backdrop with blur
├── LightboxControls.tsx           # Action buttons
├── LightboxZoom.tsx               # Zoom/pan wrapper
├── useLightbox.ts                 # Lightbox hook
├── lightboxStore.ts               # Lightbox state
└── index.ts
```

### Lightbox Store
```typescript
interface LightboxStore {
  isOpen: boolean;
  currentImage: {
    src: string;
    alt: string;
    assetId?: string;
    assetType?: string;
    width?: number;
    height?: number;
  } | null;
  gallery: Array<{ src: string; alt: string; assetId?: string }>;
  currentIndex: number;
  
  open: (image: LightboxImage, gallery?: LightboxImage[]) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  setIndex: (index: number) => void;
}
```

### ImageLightbox Component
```typescript
interface ImageLightboxProps {
  // Controlled by store, no props needed
}

// Features:
// - TransformWrapper from react-zoom-pan-pinch
// - Backdrop blur with click-to-close
// - Action bar: Download, Share, Copy Link, Regenerate
// - Gallery navigation (if multiple images)
// - Keyboard: Escape, Left/Right arrows
// - Mobile: Pinch-to-zoom, swipe-to-dismiss
// - Focus trap for accessibility
```

### LightboxControls Component
```typescript
interface LightboxControlsProps {
  onDownload: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  onRegenerate?: () => void;
  assetType?: string;
}

// Renders action buttons with icons
// Positioned at bottom of lightbox
// Responsive: Stack on mobile
```

---

## Module 3: AI Assistant Cards

### File Structure
```
tsx/apps/web/src/components/coach/cards/
├── PromptCard.tsx                 # Refined prompt display
├── ValidationCard.tsx             # Validation results
├── SuggestionCard.tsx             # Clickable suggestions
├── CardBase.tsx                   # Shared card styling
└── index.ts
```

### PromptCard Component
```typescript
interface PromptCardProps {
  prompt: string;
  qualityScore: number;
  isEditable?: boolean;
  onCopy: () => void;
  onEdit?: (newPrompt: string) => void;
  onUse: () => void;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ ✨ Refined Prompt                   │
// ├─────────────────────────────────────┤
// │ [Prompt text here...]               │
// │                                     │
// ├─────────────────────────────────────┤
// │ Copy | Edit     Quality: 85% ████░░ │
// └─────────────────────────────────────┘
```

### ValidationCard Component
```typescript
interface ValidationCardProps {
  result: {
    isValid: boolean;
    isGenerationReady: boolean;
    qualityScore: number;
    issues: Array<{
      severity: 'error' | 'warning' | 'info';
      code: string;
      message: string;
      suggestion?: string;
    }>;
  };
  onApplyFix?: (issueCode: string) => void;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ ✓ Validation Results                │
// ├─────────────────────────────────────┤
// │ ⚠ Warning: Could add more detail    │
// │   → Add specific character pose     │
// │ ℹ Info: Consider style reference    │
// │   → Try "pixel art" or "anime"      │
// ├─────────────────────────────────────┤
// │ Quality Score: 85%                  │
// └─────────────────────────────────────┘
```

### SuggestionCard Component
```typescript
interface SuggestionCardProps {
  title: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  onSelect: (optionId: string) => void;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ 💡 Quick Refinements                │
// ├─────────────────────────────────────┤
// │ [Make it more vibrant]              │
// │ [Add more energy]                   │
// │ [Simplify the style]                │
// └─────────────────────────────────────┘
```

---

## Module 4: Contextual Input Methods

### File Structure
```
tsx/apps/web/src/components/coach/input/
├── SuggestionChips.tsx            # Chip buttons
├── CoachInput.tsx                 # Enhanced input area
├── useSuggestionContext.ts        # Context-aware suggestions
└── index.ts
```

### Suggestion Context Hook
```typescript
interface UseSuggestionContextOptions {
  conversationStage: 'initial' | 'refining' | 'post_generation';
  assetType: string;
  currentPrompt?: string;
  lastMessage?: string;
}

interface SuggestionContextResult {
  suggestions: Array<{
    id: string;
    label: string;
    action: string; // Message to send
  }>;
  isLoading: boolean;
}

// Suggestions by stage:
// initial: ["Hype energy", "Cozy vibes", "Minimalist", "Retro style"]
// refining: ["More vibrant", "Add energy", "Simplify", "Change colors"]
// post_generation: ["Try another style", "Adjust colors", "New concept"]
```

### SuggestionChips Component
```typescript
interface SuggestionChipsProps {
  suggestions: Array<{ id: string; label: string; action: string }>;
  onSelect: (action: string) => void;
  disabled?: boolean;
  className?: string;
}

// Features:
// - Horizontal scroll on mobile
// - Keyboard navigation (Tab + Enter)
// - Animated appearance
// - Disabled state during streaming
```

### CoachInput Component (Enhanced)
```typescript
interface CoachInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onSuggestionSelect: (action: string) => void;
  suggestions: Array<{ id: string; label: string; action: string }>;
  isStreaming: boolean;
  isGenerationReady: boolean;
  onGenerateNow?: () => void;
  placeholder?: string;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ [Chip] [Chip] [Chip] [Chip]    →    │ (scrollable)
// ├─────────────────────────────────────┤
// │ [Generate Now ✨]                   │ (if ready)
// ├─────────────────────────────────────┤
// │ [Input textarea...          ] [→]  │
// │ Press Enter to send                 │
// └─────────────────────────────────────┘
```

---

## Module 5: Inline Generation Preview

### File Structure
```
tsx/apps/web/src/components/coach/generation/
├── InlineGenerationCard.tsx       # Generation progress/result
├── GenerationProgress.tsx         # Progress bar + status
├── GenerationResult.tsx           # Completed asset display
├── useInlineGeneration.ts         # Generation hook
└── index.ts
```

### InlineGenerationCard Component
```typescript
interface InlineGenerationCardProps {
  jobId: string;
  sessionId: string;
  onComplete?: (asset: Asset) => void;
  onError?: (error: string) => void;
  className?: string;
}

// States:
// - queued: "Starting generation..."
// - processing: Progress bar + "Creating your asset..."
// - completed: Image preview + actions
// - failed: Error message + retry button
```

### GenerationProgress Component
```typescript
interface GenerationProgressProps {
  status: 'queued' | 'processing';
  progress?: number; // 0-100
  statusMessage?: string;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ [Skeleton image placeholder]        │
// │                                     │
// │     Creating your asset...          │
// │     ████████████░░░░░░░░ 60%        │
// └─────────────────────────────────────┘
```

### GenerationResult Component
```typescript
interface GenerationResultProps {
  asset: {
    id: string;
    url: string;
    assetType: string;
    width: number;
    height: number;
  };
  onDownload: () => void;
  onShare: () => void;
  onRegenerate: () => void;
  onViewFullscreen: () => void;
  className?: string;
}

// Layout:
// ┌─────────────────────────────────────┐
// │ [Asset image with hover overlay]    │
// │     [🔍 View Full]                  │
// ├─────────────────────────────────────┤
// │ [Download] [Share] [Regenerate]     │
// └─────────────────────────────────────┘
```

### useInlineGeneration Hook
```typescript
interface UseInlineGenerationOptions {
  sessionId: string;
  onComplete?: (asset: Asset) => void;
}

interface UseInlineGenerationResult {
  triggerGeneration: (options: GenerateOptions) => Promise<string>; // Returns jobId
  jobId: string | null;
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  asset: Asset | null;
  error: string | null;
  reset: () => void;
}
```

---

## Module 6: Session Context Display

### File Structure
```
tsx/apps/web/src/components/coach/context/
├── SessionContextBar.tsx          # Sticky context bar
├── SessionBadge.tsx               # Asset type badge
├── TurnsIndicator.tsx             # Turns remaining
├── useSessionContext.ts           # Context hook
└── index.ts
```

### SessionContextBar Component
```typescript
interface SessionContextBarProps {
  sessionId: string;
  assetType: string;
  brandKitName?: string;
  turnsUsed: number;
  turnsRemaining: number;
  onEndSession?: () => void;
  onViewHistory?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

// Layout (expanded):
// ┌─────────────────────────────────────────────────────┐
// │ Creating: [Twitch Emote] with [My Brand Kit]        │
// │ Turns: 3/10 remaining          [End] [History] [−]  │
// └─────────────────────────────────────────────────────┘

// Layout (collapsed):
// ┌─────────────────────────────────────────────────────┐
// │ [Twitch Emote] • 3 turns left                   [+] │
// └─────────────────────────────────────────────────────┘
```

### TurnsIndicator Component
```typescript
interface TurnsIndicatorProps {
  used: number;
  total: number;
  className?: string;
}

// Visual: Progress dots or bar showing turns used/remaining
// Warning state when < 3 turns remaining
```

---

## Integration: Enhanced CoachChat Component

### Updated CoachChat Structure
```typescript
// tsx/apps/web/src/components/coach/CoachChat.tsx

interface CoachChatProps {
  assetType: string;
  brandKitId?: string;
  onGenerateComplete?: (asset: Asset) => void;
  className?: string;
}

// Component structure:
// <CoachChat>
//   <SessionContextBar />           {/* Sticky top */}
//   <MessageList>
//     <CoachMessage />              {/* Enhanced with cards */}
//     <InlineGenerationCard />      {/* When generating */}
//   </MessageList>
//   <CoachInput>
//     <SuggestionChips />           {/* Above input */}
//     <GenerateNowButton />         {/* When ready */}
//     <TextInput />                 {/* Main input */}
//   </CoachInput>
// </CoachChat>
// <ImageLightbox />                 {/* Portal, global */}
```

---

## Implementation Order

### Phase 1: Foundation (Tasks 1-2)
1. Image Lightbox System (standalone, high impact)
2. Enhanced Streaming UX (improves existing flow)

### Phase 2: Cards & Input (Tasks 3-4)
3. AI Assistant Cards (structured responses)
4. Contextual Input Methods (suggestion chips)

### Phase 3: Generation & Context (Tasks 5-6)
5. Inline Generation Preview (complete flow)
6. Session Context Display (polish)

### Phase 4: Integration & Testing (Tasks 7-8)
7. Full Integration (wire everything together)
8. Testing & Accessibility Audit

---

## Testing Strategy

### Unit Tests
- All stores: State transitions, persistence
- All hooks: Return values, side effects
- All components: Rendering, interactions
- Lightbox: Zoom/pan calculations

### Integration Tests
- Streaming flow: Connect → Think → Stream → Complete
- Generation flow: Trigger → Progress → Complete → Display
- Lightbox flow: Open → Zoom → Actions → Close

### E2E Tests
- Complete coach session with generation
- Mobile gesture testing (pinch-to-zoom)
- Keyboard-only navigation

### Accessibility Tests
- Focus trap in lightbox
- Screen reader announcements
- Reduced motion support
- Color contrast verification

---

## Performance Considerations

### Image Lightbox
- Lazy load high-res images
- Use CSS transforms for zoom (GPU accelerated)
- Debounce zoom/pan events
- Preload adjacent gallery images

### Streaming
- Use requestAnimationFrame for token rendering
- Batch DOM updates
- Virtualize long message lists

### Suggestions
- Memoize suggestion calculations
- Debounce context changes
- Cache common suggestions

---

## Rollout Strategy

1. Feature flag: `coach_ux_2025`
2. Internal testing first
3. Beta users (Studio tier)
4. General availability
5. Analytics tracking for engagement
