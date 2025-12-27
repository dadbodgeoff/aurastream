# Frontend Modernization 2025 - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODERNIZATION LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 1: Foundation                                            │
│  ├── Tailwind v4 (Rust engine, @starting-style, container-q)   │
│  ├── Zustand v5 (concurrent mode, smaller bundle)              │
│  └── React 19 patterns (useOptimistic, useFormStatus)          │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 2: CSS-Native Animations                                 │
│  ├── scroll-driven animations (animation-timeline: view())     │
│  ├── @starting-style (enter animations without JS)             │
│  └── View Transitions API (document.startViewTransition)       │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 3: Component Enhancements                                │
│  ├── Motion library (hybrid engine, GPU-accelerated)           │
│  ├── Shadcn/UI extensions (ButtonGroup, InputGroup)            │
│  └── Micro-interactions system (feedback on every action)      │
├─────────────────────────────────────────────────────────────────┤
│  PHASE 4: Performance Patterns                                  │
│  └── Streaming SSR + Suspense boundaries                       │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Design

### 1. Tailwind CSS v4.0 Migration

**Current State:** v3.4.0
**Target State:** v4.0.x

**Key Changes:**
- CSS-first configuration (no tailwind.config.js)
- Native cascade layers
- Built-in container queries
- @starting-style support
- 3D transform utilities

**Migration Strategy:**
```css
/* globals.css - v4 style */
@import "tailwindcss";

@theme {
  --color-background: #0F172A;
  --color-foreground: #F8FAFC;
  --color-violet-500: #8B5CF6;
  --color-purple-500: #A855F7;
  --color-pink-500: #EC4899;
}
```

**Files Affected:**
- `tsx/apps/web/package.json`
- `tsx/apps/web/src/app/globals.css`
- `tsx/apps/web/tailwind.config.ts` → migrate to CSS
- `tsx/apps/web/postcss.config.js`

---

### 2. Zustand v5 Upgrade

**Current State:** v4.5.0
**Target State:** v5.x

**Key Improvements:**
- Better concurrent rendering support
- Reduced package size
- Improved TypeScript inference

**Migration:**
```typescript
// No API changes required - drop-in upgrade
// Verify all stores work with React concurrent features
```

**Files Affected:**
- `tsx/apps/web/package.json`
- `tsx/packages/shared/src/stores/*.ts` (verify compatibility)

---

### 3. React 19 Hooks Patterns

**Current State:** React 18.2
**Target State:** React 19 patterns (can implement patterns now)

**New Hooks to Implement:**
```typescript
// useOptimistic pattern
export function useOptimisticUpdate<T>(
  currentState: T,
  updateFn: (state: T, optimisticValue: Partial<T>) => T
): [T, (value: Partial<T>) => void]

// useFormStatus pattern  
export function useFormStatus(): {
  pending: boolean;
  data: FormData | null;
  method: string | null;
  action: string | null;
}
```

**Files to Create:**
- `tsx/packages/shared/src/hooks/useOptimisticUpdate.ts`
- `tsx/packages/shared/src/hooks/useFormStatus.ts`

---

### 4. CSS Scroll-Driven Animations

**Implementation:**
```css
/* Reveal on scroll - pure CSS */
@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.scroll-reveal {
  animation: reveal-up linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* Parallax effect */
.parallax-slow {
  animation: parallax-move linear both;
  animation-timeline: scroll();
}

@keyframes parallax-move {
  from { transform: translateY(0); }
  to { transform: translateY(-50px); }
}
```

**Files Affected:**
- `tsx/apps/web/src/app/globals.css`
- `tsx/apps/web/src/components/landing/*.tsx`

---

### 5. @starting-style CSS Rule

**Implementation:**
```css
/* Modal enter animation - no JS */
.modal-overlay {
  opacity: 1;
  transition: opacity 200ms ease-out;
  
  @starting-style {
    opacity: 0;
  }
}

.modal-content {
  transform: scale(1) translateY(0);
  transition: transform 200ms ease-out;
  
  @starting-style {
    transform: scale(0.95) translateY(10px);
  }
}

/* Drawer slide-in */
.drawer {
  transform: translateX(0);
  transition: transform 300ms ease-out;
  
  @starting-style {
    transform: translateX(100%);
  }
}
```

**Files Affected:**
- `tsx/apps/web/src/app/globals.css`
- `tsx/apps/web/src/components/dashboard/modals/Modal.tsx`
- `tsx/apps/web/src/components/mobile/MobileDrawer.tsx`

---

### 6. View Transitions API

**Implementation:**
```typescript
// hooks/useViewTransition.ts
export function useViewTransition() {
  const router = useRouter();
  
  const navigateWithTransition = useCallback((href: string) => {
    if (!document.startViewTransition) {
      router.push(href);
      return;
    }
    
    document.startViewTransition(() => {
      router.push(href);
    });
  }, [router]);
  
  return { navigateWithTransition };
}
```

**CSS for transitions:**
```css
::view-transition-old(root) {
  animation: fade-out 150ms ease-out;
}

::view-transition-new(root) {
  animation: fade-in 150ms ease-in;
}

/* Named transitions for specific elements */
.hero-image {
  view-transition-name: hero;
}
```

**Files to Create:**
- `tsx/apps/web/src/hooks/useViewTransition.ts`
- Update `globals.css` with view-transition styles

---

### 7. Motion Library Upgrade

**Current:** framer-motion (if used)
**Target:** motion (rebranded, hybrid engine)

**Key Features:**
- 120fps GPU-accelerated animations
- Smaller bundle via tree-shaking
- Hybrid JS + native browser APIs

**Files Affected:**
- `tsx/apps/web/package.json`
- All components using framer-motion imports

---

### 8. Shadcn/UI New Components

**Components to Add:**

```typescript
// ButtonGroup.tsx
interface ButtonGroupProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

// InputGroup.tsx
interface InputGroupProps {
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
}
```

**Files to Create:**
- `tsx/apps/web/src/components/ui/ButtonGroup.tsx`
- `tsx/apps/web/src/components/ui/InputGroup.tsx`

---

### 9. Micro-Interactions System

**Design Principles:**
- Every action gets feedback
- Subtle, not distracting
- Respects reduced motion

**Implementation:**
```typescript
// hooks/useMicroInteraction.ts
export function useMicroInteraction() {
  const triggerSuccess = () => { /* subtle scale + color flash */ };
  const triggerError = () => { /* shake + red flash */ };
  const triggerLoading = () => { /* pulse effect */ };
  const triggerHover = () => { /* lift + shadow */ };
  
  return { triggerSuccess, triggerError, triggerLoading, triggerHover };
}
```

**CSS Classes:**
```css
.micro-success { animation: micro-success 300ms ease-out; }
.micro-error { animation: micro-shake 300ms ease-out; }
.micro-loading { animation: micro-pulse 1s infinite; }
.micro-hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
```

---

### 10. Streaming SSR with Suspense

**Implementation Pattern:**
```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>
      
      <Suspense fallback={<AssetGridSkeleton />}>
        <RecentAssets />
      </Suspense>
      
      <Suspense fallback={<JobsListSkeleton />}>
        <ActiveJobs />
      </Suspense>
    </DashboardShell>
  );
}
```

**Files Affected:**
- Dashboard pages
- Generation pages
- Any data-fetching pages

---

## Testing Strategy

### Unit Tests
- All new hooks must have tests
- CSS utilities tested via visual regression

### Integration Tests
- View transitions work across routes
- Scroll animations trigger correctly
- Suspense boundaries load progressively

### Accessibility Tests
- All animations respect prefers-reduced-motion
- Focus management preserved during transitions
- Screen reader announcements for loading states

---

## Rollback Plan

Each phase can be rolled back independently:
1. Tailwind: Revert package.json, restore tailwind.config.ts
2. Zustand: Downgrade to v4.5
3. CSS animations: Remove new keyframes, components unchanged
4. View Transitions: Graceful degradation built-in
