# Phase 5: Mobile Components Update

## Objective
Update all mobile app components to use the shared design tokens. Remove all glow effects, purple/cyan colors, and ensure consistency with web.

## Scope
All files in tsx/apps/mobile/src/

## Key Changes

### Color Replacements
The constants.ts file now imports from shared tokens, so components using `colors.*` will automatically get the new values:
- `colors.primary` → Now `#2563EB` (blue) instead of `#8B5CF6` (purple)
- `colors.accent` → Now `#D97706` (amber) instead of `#00D9FF` (cyan)
- `colors.backgroundBase` → Now `#0F172A` (slate) instead of `#0D0D12`

### Patterns to Remove

#### Glow Effects
- Remove `avatarGlow` styles with opacity animations
- Remove any `shadowColor` with purple/cyan
- Remove any `backgroundColor` with opacity for glow effect

#### Hardcoded Colors
- Any remaining hardcoded `#8B5CF6`, `#7C3AED` → use `colors.primary`
- Any remaining hardcoded `#00D9FF` → use `colors.accent`
- Any remaining hardcoded `#0D0D12`, `#1A1A24` → use `colors.backgroundBase/Surface`

## Files to Update

### Coach Components (High Priority)
1. tsx/apps/mobile/src/components/coach/components/MessageBubble.tsx
   - Remove avatarGlow styles
   - Update any hardcoded colors

2. tsx/apps/mobile/src/components/coach/components/PulsingDot.tsx
   - Change pulsing color from cyan to amber

3. tsx/apps/mobile/src/components/coach/components/PromptBlock.tsx
   - Update accent color usage

4. tsx/apps/mobile/src/components/coach/components/GlassCard.tsx
   - Remove any glow/gradient effects

5. tsx/apps/mobile/src/components/coach/components/EmptyState.tsx
   - Update icon/accent colors

6. tsx/apps/mobile/src/components/coach/components/GroundingStatus.tsx
   - Update indicator colors

7. tsx/apps/mobile/src/components/coach/components/QualityMeter.tsx
   - Update progress colors

8. tsx/apps/mobile/src/components/coach/CoachChatView.tsx
   - Update any direct color references

9. tsx/apps/mobile/src/components/coach/CoachContextSheet.tsx
   - Update any direct color references

### App Screens
10. tsx/apps/mobile/src/app/index.tsx
    - Update to use colors from constants (already imports tokens)

11. tsx/apps/mobile/src/app/(tabs)/_layout.tsx
    - Update tab bar colors

12. tsx/apps/mobile/src/app/(auth)/login.tsx
    - Update button and link colors

13. tsx/apps/mobile/src/app/(auth)/signup.tsx
    - Update button and link colors

## Specific Style Changes

### MessageBubble.tsx
Remove these glow styles:
```typescript
// REMOVE
avatarGlow: {
  position: 'absolute',
  width: 40,
  height: 40,
  borderRadius: 20,
  top: -2,
  left: -2,
  opacity: 0.4,
},
avatarGlowUser: {
  backgroundColor: colors.primary,
},
avatarGlowAssistant: {
  backgroundColor: colors.accent,
},
```

### PulsingDot.tsx
Change animation color from cyan to amber:
```typescript
// Change from cyan (#00D9FF) to amber
backgroundColor: colors.accent, // Now amber
```

## Acceptance Criteria
- [ ] No glow effects (avatarGlow, shadowColor with opacity)
- [ ] No hardcoded purple hex codes
- [ ] No hardcoded cyan hex codes
- [ ] All colors reference `colors.*` from constants
- [ ] TypeScript compiles without errors
- [ ] Tests pass

## Verification
After implementation:
1. Run `npx tsc --noEmit` in tsx/apps/mobile
2. Run `npm test` in tsx/apps/mobile
3. Grep for any remaining purple/cyan colors
