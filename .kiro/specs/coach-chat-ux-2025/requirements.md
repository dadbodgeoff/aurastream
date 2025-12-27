# Coach Chat UX 2025 - Requirements

## Overview
Enterprise-grade enhancement of the AuraStream Prompt Coach chat experience to match 2025 AI chat interface standards. This spec covers streaming UX improvements, image lightbox functionality, AI assistant cards, contextual input methods, inline generation preview, and session context display. Based on research from Smashing Magazine, MultitaskAI, IntuitionLabs, and analysis of ChatGPT, Claude, Gemini, and DeepSeek interfaces.

## Business Requirements

### BR-1: Enhanced Streaming UX
- Users must see intelligent loading states during AI response generation
- Streaming must show semantic chunks (thinking → suggestions → validation)
- Users must understand what the coach is doing at each stage
- Perceived wait time must be minimized through progressive disclosure

### BR-2: Image Lightbox System
- Generated assets must be viewable in full-screen lightbox
- Mobile users must be able to pinch-to-zoom on images
- Quick actions (download, share, regenerate) must be accessible from lightbox
- Keyboard navigation must work (Escape to close, arrows for gallery)

### BR-3: AI Assistant Cards
- Structured coach responses must use card-based layout
- Refined prompts must be displayed in copyable, editable cards
- Quality scores and validation must be visually prominent
- Cards must support inline actions (copy, edit, use)

### BR-4: Contextual Input Methods
- Smart suggestion chips must appear based on conversation context
- Quick refinement options must reduce typing burden
- Input must adapt to conversation stage (initial vs refinement)
- Suggestions must be keyboard navigable

### BR-5: Inline Generation Preview
- Asset generation must happen within the chat flow
- Progress must be visible with meaningful status updates
- Completed assets must appear inline with quick actions
- Users must not need to leave coach to see results

### BR-6: Session Context Display
- Active session context must be persistently visible
- Asset type, brand kit, and turns remaining must be shown
- Context bar must be collapsible on mobile
- Session state must sync with backend

## Functional Requirements

### FR-1: Enhanced Streaming UX
- Skeleton loading must match expected response structure
- Typing indicator must show "Coach is thinking..." with animated dots
- Chain-of-thought transparency must show reasoning stages
- Token streaming must be smooth with no jank
- Error states must be clear and recoverable

### FR-2: Image Lightbox
- Trigger: Click on any generated asset image
- Features: Full-screen modal, backdrop blur, zoom/pan
- Mobile: Pinch-to-zoom, swipe to dismiss
- Actions: Download, Share, Copy Link, Regenerate
- Keyboard: Escape to close, Tab for actions
- Accessibility: Focus trap, screen reader announcements

### FR-3: AI Assistant Cards
- Card types: Refined Prompt, Validation Result, Suggestion
- Refined Prompt Card: Copyable text, quality score, edit button
- Validation Card: Issues list, severity indicators, fix suggestions
- Suggestion Card: Clickable options, keyboard selectable
- All cards must have consistent styling with brand colors

### FR-4: Contextual Input Methods
- Suggestion chips: Dynamic based on conversation stage
- Initial stage: Mood suggestions, style options
- Refinement stage: "More vibrant", "Add energy", "Simplify"
- Post-generation: "Try another style", "Adjust colors"
- Chips must be keyboard navigable (Tab + Enter)

### FR-5: Inline Generation Preview
- Trigger: "Generate Now" button in coach chat
- Progress states: Queued → Processing → Completed/Failed
- Processing: Skeleton with progress bar and status text
- Completed: Image preview with action overlay
- Failed: Error message with retry option
- Asset must link to session for tracking

### FR-6: Session Context Display
- Position: Top of chat area, sticky
- Content: Asset type badge, brand kit name, turns remaining
- Collapsible: Toggle on mobile to save space
- Real-time: Updates as session progresses
- Actions: End session, View history

## Non-Functional Requirements

### NFR-1: Performance
- Lightbox open: <100ms
- Streaming first token: <500ms
- Suggestion chips render: <16ms
- Image zoom: 60fps smooth
- No layout shift during streaming (CLS < 0.1)

### NFR-2: Accessibility
- All features WCAG 2.1 AA compliant
- Lightbox must trap focus correctly
- Screen reader announcements for all state changes
- Reduced motion support for all animations
- Keyboard navigation for all interactive elements

### NFR-3: Mobile Experience
- Touch gestures: Pinch-to-zoom, swipe-to-dismiss
- Responsive layout: Cards stack on mobile
- Context bar: Collapsible on small screens
- Input: Full-width on mobile with sticky position

### NFR-4: Testing
- Unit tests for all new hooks and components
- Integration tests for streaming and generation flows
- E2E tests for complete coach session with generation
- Accessibility audits passing
- Mobile gesture testing

### NFR-5: Browser Support
- Chrome 90+, Firefox 90+, Safari 14+, Edge 90+
- Mobile Safari iOS 14+, Chrome Android 90+
- Touch events for mobile browsers

## Success Criteria
- [ ] Streaming shows intelligent loading states
- [ ] Lightbox opens with zoom/pan functionality
- [ ] AI Assistant Cards display structured responses
- [ ] Suggestion chips appear contextually
- [ ] Inline generation shows progress and result
- [ ] Session context bar displays correctly
- [ ] All keyboard navigation works
- [ ] Mobile gestures work correctly
- [ ] All tests passing
- [ ] Lighthouse accessibility score > 95
- [ ] No performance regressions

## Dependencies
- Existing coach backend (SSE streaming)
- Existing generation service
- Existing CelebrationOverlay system
- react-zoom-pan-pinch package (new)
